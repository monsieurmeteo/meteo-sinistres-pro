/**
 * MOTEUR DE DÉCISION & CONSIGNE DE GESTION ASSURANCE
 * Basé sur les règles contractuelles des compagnies (Generali, Suravenir, MACSF, AXA, Allianz...)
 * Analyse automatique sur 3 jours (J-1, Jour J, J+1) et verdict Favorable / Défavorable.
 */

export const DEFAULT_THRESHOLDS = {
  VENT: 100, // km/h
  PLUIE: 50, // mm sur 24h/épisode
  GEL: -5,   // °C
  FOUDRE: 1  // Présence d'activité orageuse
};

export const insuranceDecisionEngine = {
  /**
   * Calcule la fenêtre 3 jours (J-1, J, J+1) à partir d'une date ISO YYYY-MM-DD
   */
  get3DayWindow(dateStr) {
    if (!dateStr) return { start: '', middle: '', end: '', dates: [] };
    
    if (dateStr.includes(' au ')) {
      const parts = dateStr.split(' au ');
      return { start: parts[0], middle: parts[0], end: parts[1], dates: [parts[0], parts[1]] };
    }

    const d = new Date(dateStr + 'T12:00:00Z');
    if (isNaN(d.getTime())) {
      return { start: dateStr, middle: dateStr, end: dateStr, dates: [dateStr] };
    }

    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const prevISO = prev.toISOString().split('T')[0];
    const currISO = d.toISOString().split('T')[0];
    const nextISO = next.toISOString().split('T')[0];

    return {
      start: prevISO,
      middle: currISO,
      end: nextISO,
      dates: [prevISO, currISO, nextISO]
    };
  },

  /**
   * Analyse les données météorologiques et rend la consigne de gestion d'assurance
   */
  evaluateClaim(sinistre = {}, stationsData = [], customThreshold = null) {
    const claimType = (sinistre.sinistreType || '').toLowerCase();
    const commune = sinistre.commune || 'la commune déclarée';
    const cp = sinistre.codePostal || '';
    const dateSinistre = sinistre.dateSinistre || '';

    const validStations = (stationsData || []).filter(s => s.obs);
    const primary = validStations[0] || {};

    let category = 'VENT';
    if (claimType.includes('pluie') || claimType.includes('inondation') || claimType.includes('ruissellement') || claimType.includes('infiltration')) {
      category = 'PLUIE';
    } else if (claimType.includes('gel') || claimType.includes('froid') || claimType.includes('canalisation')) {
      category = 'GEL';
    } else if (claimType.includes('foudre') || claimType.includes('électrique') || claimType.includes('electrique')) {
      category = 'FOUDRE';
    } else if (claimType.includes('orage') || claimType.includes('grêle') || claimType.includes('grele')) {
      category = 'ORAGE';
    } else if (claimType.includes('neige') || claimType.includes('poids') || claimType.includes('chute de neige')) {
      category = 'NEIGE';
    } else if (claimType.includes('canicule') || claimType.includes('chaleur') || claimType.includes('chaud')) {
      category = 'CANICULE';
    } else if (claimType.includes('sécheresse') || claimType.includes('secheresse') || claimType.includes('retrait') || claimType.includes('rga')) {
      category = 'SECHERESSE';
    }

    const allGusts = validStations.map(s => s.obs?.fxi).filter(v => v !== null && v !== undefined);
    const allRains = validStations.map(s => s.obs?.rr).filter(v => v !== null && v !== undefined);
    const allTmins = validStations.map(s => s.obs?.tn).filter(v => v !== null && v !== undefined);

    const maxGust = allGusts.length > 0 ? Math.max(...allGusts) : null;
    const maxRain = allRains.length > 0 ? Math.max(...allRains) : null;
    const minTemp = allTmins.length > 0 ? Math.min(...allTmins) : null;

    const bestWindSt = validStations.find(s => s.obs?.fxi === maxGust) || primary;
    const bestRainSt = validStations.find(s => s.obs?.rr === maxRain) || primary;
    const bestGelSt = validStations.find(s => s.obs?.tn === minTemp) || primary;

    let isFavorable = false;
    let thresholdUsed = customThreshold;
    let ruleText = '';
    let observedSummary = '';
    let commentExpert = '';

    if (category === 'VENT') {
      const threshold = typeof customThreshold === 'number' ? customThreshold : DEFAULT_THRESHOLDS.VENT;
      thresholdUsed = threshold;
      isFavorable = maxGust !== null && maxGust >= threshold;
      ruleText = `Présence de rafales de vent ≥ ${threshold} km/h sur la période`;
      observedSummary = maxGust !== null ? `Rafale maximale observée : ${maxGust} km/h (${bestWindSt.name})` : 'Relevés anémométriques non disponibles';

      if (isFavorable) {
        commentExpert = `L'analyse des postes météorologiques à proximité de ${commune} (${cp}) le ${dateSinistre} permet de classer cet événement en tempête. En effet, les rafales maximales mesurées par les stations Météo-France sur la zone du sinistre ont atteint ${maxGust} km/h à ${bestWindSt.name}, dépassant le seuil contractuel de garantie de ${threshold} km/h.`;
      } else {
        commentExpert = `L'analyse des postes météorologiques à proximité de ${commune} (${cp}) le ${dateSinistre} ne permet pas de classer cet événement en tempête. En effet, les rafales maximales mesurées par les stations Météo-France sur la zone du sinistre (${maxGust !== null ? maxGust + ' km/h' : 'inférieures au seuil'}) n'ont pas atteint le seuil contractuel de garantie de ${threshold} km/h.`;
      }

    } else if (category === 'PLUIE') {
      const threshold = typeof customThreshold === 'number' ? customThreshold : DEFAULT_THRESHOLDS.PLUIE;
      thresholdUsed = threshold;
      isFavorable = maxRain !== null && maxRain >= threshold;
      ruleText = `Cumul pluviométrique ≥ ${threshold} mm sur l'épisode`;
      observedSummary = maxRain !== null ? `Cumul maximal observé : ${maxRain} mm (${bestRainSt.name})` : 'Relevés pluviométriques non disponibles';

      if (isFavorable) {
        commentExpert = `L'analyse des postes météorologiques à proximité de ${commune} (${cp}) met en évidence la présence de forts cumuls de précipitations atteignant ${maxRain} mm à ${bestRainSt.name} le ${dateSinistre}, confirmant le caractère exceptionnel des pluies au-delà du seuil de ${threshold} mm.`;
      } else {
        commentExpert = `L'analyse des postes météorologiques à proximité de ${commune} (${cp}) ne permet pas de classer cet événement en pluies exceptionnelles. Les cumuls enregistrés (${maxRain !== null ? maxRain + ' mm' : 'faibles'}) restent inférieurs au seuil contractuel de ${threshold} mm.`;
      }

    } else if (category === 'GEL') {
      const threshold = typeof customThreshold === 'number' ? customThreshold : DEFAULT_THRESHOLDS.GEL;
      thresholdUsed = threshold;
      isFavorable = minTemp !== null && minTemp <= threshold;
      ruleText = `Température sous abri ≤ ${threshold}°C`;
      observedSummary = minTemp !== null ? `Température minimale observée : ${minTemp}°C (${bestGelSt.name})` : 'Relevés thermométriques non disponibles';

      if (isFavorable) {
        commentExpert = `L'analyse des postes météorologiques à proximité de ${commune} (${cp}) permet de classer cet événement en gel sévère / vague de froid. Les températures observées (${minTemp}°C à ${bestGelSt.name}) ont pu occasionner des dommages par le gel et des ruptures de canalisations sous abri.`;
      } else {
        commentExpert = `L'analyse des postes météorologiques à proximité de ${commune} (${cp}) ne met pas en évidence de gel sévère destructeur. La température minimale relevée (${minTemp !== null ? minTemp + '°C' : 'positive'}) reste supérieure au seuil critique de ${threshold}°C.`;
      }

    } else if (category === 'NEIGE') {
      const threshold = typeof customThreshold === 'number' ? customThreshold : 20; // 20 mm eq. neige
      thresholdUsed = threshold;
      isFavorable = maxRain !== null && maxRain >= threshold;
      ruleText = `Précipitations neigeuses ≥ ${threshold} mm (équivalent eau) sur l'épisode`;
      observedSummary = maxRain !== null ? `Précipitations observées : ${maxRain} mm (${bestRainSt.name})` : 'Relevés non disponibles';
      commentExpert = isFavorable
        ? `L'analyse des postes météorologiques à proximité de ${commune} (${cp}) confirme un épisode neigeux significatif avec ${maxRain} mm d'équivalent eau le ${dateSinistre}, compatible avec un poids de neige dommageable.`
        : `L'examen des observations à proximité de ${commune} (${cp}) le ${dateSinistre} ne met pas en évidence d'épisode neigeux d'intensité suffisante pour caractériser un sinistre par poids de la neige.`;

    } else if (category === 'CANICULE') {
      const threshold = typeof customThreshold === 'number' ? customThreshold : 35;
      thresholdUsed = threshold;
      const maxTx = validStations.map(s => s.obs?.tx).filter(v => v != null).reduce((a, b) => Math.max(a, b), -Infinity);
      const bestTxSt = validStations.find(s => s.obs?.tx === maxTx) || primary;
      isFavorable = maxTx !== -Infinity && maxTx >= threshold;
      ruleText = `Température maximale ≥ ${threshold}°C (Forte chaleur)`;
      observedSummary = maxTx !== -Infinity ? `Température maximale observée : ${maxTx}°C (${bestTxSt.name})` : 'Relevés thermiques non disponibles';
      commentExpert = isFavorable
        ? `L'analyse des postes météorologiques à proximité de ${commune} (${cp}) confirme un épisode de forte chaleur avec ${maxTx}°C relevés le ${dateSinistre}, dépassant le seuil de ${threshold}°C.`
        : `L'examen des observations à proximité de ${commune} (${cp}) le ${dateSinistre} ne confirme pas de chaleur exceptionnelle au-delà du seuil de ${threshold}°C.`;

    } else if (category === 'SECHERESSE') {
      isFavorable = false;
      ruleText = `Épisode de sécheresse / Retrait-Gonflement des Argiles (RGA)`;
      observedSummary = `Données instrumentales insuffisantes — vérifier arrêté CatNat`;
      commentExpert = `L'analyse d'un sinistre Sécheresse/RGA requiert la vérification d'un arrêté de Catastrophe Naturelle reconnu par l'État pour la commune de ${commune} à la période du ${dateSinistre}.`;

    } else { // FOUDRE / ORAGE
      isFavorable = (maxGust !== null && maxGust >= 70) || (maxRain !== null && maxRain >= 20);
      ruleText = `Activité convective orageuse et rafales convectives associées`;
      observedSummary = `Conditions orageuses observées (Rafales ${maxGust || 'N/D'} km/h, Pluie ${maxRain || 'N/D'} mm)`;

      if (isFavorable) {
        commentExpert = `L'analyse des postes météorologiques à proximité de ${commune} (${cp}) confirme l'occurrence d'un phénomène orageux actif le ${dateSinistre}, avec des rafales convectives mesurées jusqu'à ${maxGust} km/h.`;
      } else {
        commentExpert = `L'examen des observations à proximité de ${commune} (${cp}) le ${dateSinistre} indique des conditions météorologiques calmes sans activité orageuse sévère mesurée sur le réseau instrumental.`;
      }
    }

    // INDÉTERMINÉ si aucune donnée mesurée disponible (API down, station sans données)
    const hasAnyData = maxGust !== null || maxRain !== null || minTemp !== null;
    if (!hasAnyData && category !== 'SECHERESSE') {
      return {
        category,
        isFavorable: null,
        decision: 'INDÉTERMINÉ — Données Insuffisantes',
        decisionShort: 'INDÉTERMINÉ',
        decisionSubtitle: 'Données météorologiques insuffisantes — expertise complémentaire requise',
        threshold: thresholdUsed,
        ruleText,
        observedSummary: 'Aucune observation instrumentale disponible pour la période',
        commentExpert: `L'interrogation des postes Météo-France dans le rayon de 30 km autour de ${commune} (${cp}) n'a pas permis de collecter de relevés instrumentaux pour la date du ${dateSinistre}. Une expertise complémentaire sur des sources alternatives (radar, réanalyse MERRA-2, témoignages) est nécessaire avant tout verdict définitif.`
      };
    }

    return {
      category,
      isFavorable,
      decision: isFavorable ? 'AVIS FAVORABLE' : 'AVIS DÉFAVORABLE',
      decisionShort: isFavorable ? 'FAVORABLE' : 'DÉFAVORABLE',
      decisionSubtitle: isFavorable ? 'Garantie contractuelle acquise au vu des relevés Météo-France' : 'Seuil contractuel de garantie non atteint',
      threshold: thresholdUsed,
      ruleText,
      observedSummary,
      commentExpert
    };
  }
};
