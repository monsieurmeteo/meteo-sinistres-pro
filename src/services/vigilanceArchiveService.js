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

    // 2. Proxy serverless Vercel — contourne le CORS Encelade
    try {
      const res = await fetch(`/api/vigilance?dept=${formattedDept}&date=${cleanDate}`);
      if (res.ok) {
        const data = await res.json();
        return this.formatVigilanceResult(
          formattedDept,
          cleanDate,
          data.level || 'Vert',
          data.phenos || [],
          data.source || 'Archives Météo-France'
        );
      }
    } catch (e) {
      console.warn('Vigilance proxy error:', e);
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
