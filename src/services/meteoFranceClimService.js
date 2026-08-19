import { meteoAuth } from './meteoFranceAuth';

const BASE_CLIM_URL = 'https://public-api.meteofrance.fr/public/DPClim/v1';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const meteoFranceClimService = {
  /**
   * Récupère l'historique officiel DPClim d'une station pour une période
   */
  async fetchStationHistory(stationId, startDate, endDate, onProgress = () => {}) {
    if (!stationId || !startDate || !endDate) return [];

    const todayISO = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split('T')[0];

    // Météo-France DPClim consolide ses données jusqu'à J-1
    let safeStart = startDate;
    let safeEnd = endDate;

    if (safeStart >= todayISO) {
      safeStart = yesterdayISO;
    }
    if (safeEnd >= todayISO) {
      safeEnd = yesterdayISO;
    }
    if (safeStart > safeEnd) {
      safeStart = safeEnd;
    }

    let token = await meteoAuth.getValidToken();
    const deb = safeStart + 'T00:00:00Z';
    const fin = safeEnd + 'T23:59:59Z';

    onProgress(`Interrogation station ${stationId}…`);

    const cmdUrl = `${BASE_CLIM_URL}/commande-station/quotidienne?id-station=${stationId}&date-deb-periode=${encodeURIComponent(deb)}&date-fin-periode=${encodeURIComponent(fin)}`;
    
    let cmdResp = await fetch(cmdUrl, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json'
      }
    });

    if (cmdResp.status === 401) {
      console.warn('[meteoFranceClimService] 401 reçu -> Rafraîchissement token...');
      token = await meteoAuth.generateToken();
      cmdResp = await fetch(cmdUrl, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/json'
        }
      });
    }

    if (!cmdResp.ok) {
      const errText = await cmdResp.text();
      throw new Error(`Erreur commande Météo-France (${cmdResp.status}): ${errText}`);
    }

    const cmdData = await cmdResp.json();
    const idCmde = cmdData?.elaboreProduitAvecDemandeResponse?.return;
    if (!idCmde) throw new Error('Identifiant de commande non retourné par Météo-France');

    onProgress(`Génération archive Météo-France…`);

    const fileUrl = `${BASE_CLIM_URL}/commande/fichier?id-cmde=${encodeURIComponent(idCmde)}`;
    let csvText = null;

    for (let attempt = 1; attempt <= 15; attempt++) {
      await sleep(1500);
      let fileResp = await fetch(fileUrl, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': '*/*'
        }
      });

      if (fileResp.status === 401) {
        token = await meteoAuth.generateToken();
        continue;
      }

      if (fileResp.status === 200 || fileResp.status === 201) {
        csvText = await fileResp.text();
        break;
      } else if (fileResp.status === 204) {
        onProgress(`Calcul en cours… (${attempt}/15)`);
      } else {
        console.warn(`[DPClim] Statut fichier ${fileResp.status} à la tentative ${attempt}`);
      }
    }

    if (!csvText) {
      throw new Error('Délai dépassé lors de la génération du fichier par Météo-France');
    }

    return this.parseDPClimCSV(csvText);
  },

  /**
   * Parser le CSV DPClim avec priorité FXI3S (Norme OMM 3 secondes)
   */
  parseDPClimCSV(csvText) {
    if (!csvText) return [];

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const headers = headerLine.split(';').map(h => h.trim().toUpperCase());

    const rows = [];

    const idxDate = headers.indexOf('DATE');
    const idxRR = headers.indexOf('RR');
    const idxTN = headers.indexOf('TN');
    const idxHTN = headers.indexOf('HTN');
    const idxTX = headers.indexOf('TX');
    const idxHTX = headers.indexOf('HTX');
    const idxTM = headers.indexOf('TM');
    const idxTAMPLI = headers.indexOf('TAMPLI');

    // Rafales : priorité FXI3S (OMM 3s), sinon FXI
    const idxFXI3S = headers.indexOf('FXI3S');
    const idxHXI3S = headers.indexOf('HXI3S');
    const idxDXI3S = headers.indexOf('DXI3S');
    const idxFXI = headers.indexOf('FXI');
    const idxHXI = headers.indexOf('HXI');
    const idxDXI = headers.indexOf('DXI');
    const idxFF = headers.indexOf('FF');

    // Phénomènes
    const idxOrag = headers.indexOf('ORAG');
    const idxGrele = headers.indexOf('GRELE');
    const idxNeig = headers.indexOf('NEIG');
    const idxGelee = headers.indexOf('GELEE');
    const idxBrou = headers.indexOf('BROU');

    const parseFloatFR = (val) => {
      if (!val || val === '' || val === 'null' || val === 'NaN') return null;
      const clean = val.replace(',', '.').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? null : num;
    };

    const formatHour = (val) => {
      if (!val || val === '' || val === 'null') return '';
      const s = String(val).trim();
      if (s.length === 4) {
        return `${s.substring(0, 2)}h${s.substring(2, 4)}`;
      } else if (s.length === 3) {
        return `0${s.substring(0, 1)}h${s.substring(1, 3)}`;
      }
      return s;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(';');
      const rawDate = cols[idxDate]?.trim();
      if (!rawDate || rawDate.length !== 8) continue;

      const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;

      // Rafale normalisée OMM (Conversion m/s -> km/h arrondi)
      let gustKmh = null;
      let gustHour = '';
      let gustDir = null;

      if (idxFXI3S !== -1 && cols[idxFXI3S]) {
        const ms = parseFloatFR(cols[idxFXI3S]);
        if (ms !== null) {
          gustKmh = Math.round(ms * 3.6);
          gustHour = formatHour(cols[idxHXI3S]);
          gustDir = parseFloatFR(cols[idxDXI3S]);
        }
      }

      if (gustKmh === null && idxFXI !== -1 && cols[idxFXI]) {
        const ms = parseFloatFR(cols[idxFXI]);
        if (ms !== null) {
          gustKmh = Math.round(ms * 3.6);
          gustHour = formatHour(cols[idxHXI]);
          gustDir = parseFloatFR(cols[idxDXI]);
        }
      }

      const row = {
        date: formattedDate,
        rr: idxRR !== -1 ? parseFloatFR(cols[idxRR]) : null,
        tn: idxTN !== -1 ? parseFloatFR(cols[idxTN]) : null,
        htn: idxHTN !== -1 ? formatHour(cols[idxHTN]) : '',
        tx: idxTX !== -1 ? parseFloatFR(cols[idxTX]) : null,
        htx: idxHTX !== -1 ? formatHour(cols[idxHTX]) : '',
        tm: idxTM !== -1 ? parseFloatFR(cols[idxTM]) : null,
        tampli: idxTAMPLI !== -1 ? parseFloatFR(cols[idxTAMPLI]) : null,
        fxi: gustKmh,
        hxi: gustHour,
        dxi: gustDir,
        ff: idxFF !== -1 ? (parseFloatFR(cols[idxFF]) !== null ? Math.round(parseFloatFR(cols[idxFF]) * 3.6) : null) : null,
        orag: idxOrag !== -1 && parseInt(cols[idxOrag], 10) === 1,
        grele: idxGrele !== -1 && parseInt(cols[idxGrele], 10) === 1,
        neig: idxNeig !== -1 && parseInt(cols[idxNeig], 10) === 1,
        gelee: idxGelee !== -1 && parseInt(cols[idxGelee], 10) === 1,
        brou: idxBrou !== -1 && parseInt(cols[idxBrou], 10) === 1
      };

      rows.push(row);
    }

    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  }
};
