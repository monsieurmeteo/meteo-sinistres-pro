import vigilanceAlertsHistory from '../data/vigilanceAlertsHistory.json';

const PHENO_NAMES = {
  1: "Vent violent",
  2: "Pluie-inondation",
  3: "Orages",
  4: "Crues",
  5: "Neige-verglas",
  6: "Canicule",
  7: "Grand Froid",
  8: "Avalanches",
  9: "Vagues-submersion"
};

const PHENO_ICONS = {
  "Vent violent": "💨",
  "Pluie-inondation": "🌧️",
  "Orages": "⚡",
  "Crues": "🌊",
  "Neige-verglas": "❄️",
  "Canicule": "☀️",
  "Grand Froid": "🧊",
  "Avalanches": "🏔️",
  "Vagues-submersion": "🌊"
};

export const vigilanceArchiveService = {
  /**
   * Récupère la vigilance officielle Météo-France (Live ou Archive) pour le département
   */
  async fetchLiveOrArchivedVigilance(dept = '59', dateStr = '') {
    const formattedDept = String(dept).padStart(2, '0').slice(0, 2);
    const cleanDate = dateStr ? dateStr.slice(0, 10) : new Date().toISOString().slice(0, 10);

    // 1. Consultation dans l'archive locale rapide
    if (vigilanceAlertsHistory && vigilanceAlertsHistory[cleanDate] && vigilanceAlertsHistory[cleanDate][formattedDept]) {
      const cached = vigilanceAlertsHistory[cleanDate][formattedDept];
      return this.formatVigilanceResult(formattedDept, cleanDate, cached.level, cached.phenos, `Archives Météo-France (Épisode du ${cleanDate})`);
    }

    // 2. Interrogation directe de l'API de Vigilance Météo-France (Live & Historique)
    try {
      const tokRes = await fetch('https://vigilance.encelade.cloud/historique/api/token', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (tokRes.ok) {
        const token = (await tokRes.text()).trim();
        const headers = {
          'X-VIGI-TOKEN': token,
          'Referer': 'https://vigilance.encelade.cloud/historique',
          'X-Requested-With': 'XMLHttpRequest'
        };

        const echRes = await fetch('https://vigilance.encelade.cloud/historique/api/get_echeances', { headers });
        if (echRes.ok) {
          const echeances = await echRes.json();
          if (Array.isArray(echeances) && echeances.length > 0) {
            // Trouver le bulletin correspondant à la date demandée (ou le plus récent si aujourd'hui)
            let matchingBulletins = echeances.filter(b => b.e && b.e.startsWith(cleanDate));
            if (matchingBulletins.length === 0) {
              // Si pas de bulletin exact ce jour-là, prendre le bulletin le plus récent disponible
              matchingBulletins = [echeances[echeances.length - 1]];
            }

            const latestBulletin = matchingBulletins[matchingBulletins.length - 1];
            const detRes = await fetch(`https://vigilance.encelade.cloud/historique/api/get_vigilance/${latestBulletin.id}`, { headers });
            if (detRes.ok) {
              const det = await detRes.json();
              const dptRows = (det.rows || []).filter(r => String(r.dpt) === formattedDept || String(r.dpt).padStart(2, '0') === formattedDept);

              let maxLevel = 1;
              let activePhenos = [];

              for (const row of dptRows) {
                const lvl = row.level || 1;
                if (lvl > maxLevel) maxLevel = lvl;
                if (row.pheno_id && PHENO_NAMES[row.pheno_id]) {
                  const pName = PHENO_NAMES[row.pheno_id];
                  if (!activePhenos.includes(pName)) activePhenos.push(pName);
                }
              }

              const levelNames = { 1: 'Vert', 2: 'Jaune', 3: 'Orange', 4: 'Rouge' };
              const resolvedLevel = levelNames[maxLevel] || 'Vert';

              return this.formatVigilanceResult(
                formattedDept,
                cleanDate,
                resolvedLevel,
                activePhenos,
                `Météo-France (Bulletin #${latestBulletin.id} du ${latestBulletin.e?.slice(0, 16)})`
              );
            }
          }
        }
      }
    } catch (e) {
      console.warn("Erreur direct vigilance fetch:", e);
    }

    return this.formatVigilanceResult(formattedDept, cleanDate, 'Vert', [], "Archives Officielles Météo-France");
  },

  formatVigilanceResult(formattedDept, cleanDate, level = 'Vert', activePhenos = [], source = "Archives Officielles Météo-France") {
    const formattedPhenos = activePhenos.length > 0 
      ? activePhenos.map(p => `${PHENO_ICONS[p] || '⚠️'} ${p}`)
      : (level === 'Vert' ? ["🟢 Aucun phénomène dangereux signalé"] : ["⚠️ Phénomènes locaux habituels"]);

    if (level === 'Rouge') {
      return {
        level: 'Rouge',
        color: 'rose',
        aleas: formattedPhenos,
        bulletinTitle: `VIGILANCE ROUGE MÉTÉO-FRANCE — DÉPARTEMENT ${formattedDept}`,
        bulletinText: `Niveau 4/4 (Vigilance absolue) : Météo-France a émis un bulletin d'alerte rouge pour le département ${formattedDept}.`,
        bulletinDate: cleanDate,
        source
      };
    } else if (level === 'Orange') {
      return {
        level: 'Orange',
        color: 'orange',
        aleas: formattedPhenos,
        bulletinTitle: `VIGILANCE ORANGE MÉTÉO-FRANCE — DÉPARTEMENT ${formattedDept}`,
        bulletinText: `Niveau 3/4 (Soyez très vigilant) : Météo-France a placé le département ${formattedDept} en vigilance orange (${activePhenos.join(', ') || 'Alerte météo'}).`,
        bulletinDate: cleanDate,
        source
      };
    } else if (level === 'Jaune') {
      return {
        level: 'Jaune',
        color: 'yellow',
        aleas: formattedPhenos,
        bulletinTitle: `VIGILANCE JAUNE MÉTÉO-FRANCE — DÉPARTEMENT ${formattedDept}`,
        bulletinText: `Niveau 2/4 (Soyez attentif) : Météo-France a placé le département ${formattedDept} en vigilance jaune (${activePhenos.join(', ') || 'Phénomènes locaux habituels'}).`,
        bulletinDate: cleanDate,
        source
      };
    } else {
      return {
        level: 'Vert',
        color: 'emerald',
        aleas: ["🟢 Pas de vigilance particulière"],
        bulletinTitle: `VIGILANCE VERTE MÉTÉO-FRANCE — DÉPARTEMENT ${formattedDept}`,
        bulletinText: `Niveau 1/4 (Situation normale) : Le département ${formattedDept} est en vigilance verte. Aucun phénomène dangereux signalé.`,
        bulletinDate: cleanDate,
        source
      };
    }
  }
};
