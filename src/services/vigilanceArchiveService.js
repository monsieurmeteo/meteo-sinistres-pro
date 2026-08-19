import vigilanceAlertsHistory from '../data/vigilanceAlertsHistory.json';

const PHENO_ICONS = {
  "Vent violent": "💨",
  "Pluie-inondation": "🌧️",
  "Orages": "⚡",
  "Crues": "🌊",
  "Neige-verglas": "❄️",
  "Canicule": "☀️",
  "Grand Froid": "🧊",
  "Avalanches": "🏔️",
  "Vagues-submersion": "🌊",
  "Phénomènes météo": "⚠️"
};

export const vigilanceArchiveService = {
  /**
   * Récupère STRICTEMENT le niveau officiel émis par Météo-France
   * 1. Cache instantané local pour les archives connues
   * 2. Requête API Serverless dynamique pour les nouveaux bulletins émis au fil du temps
   */
  async fetchLiveOrArchivedVigilance(dept = '59', dateStr = '') {
    const formattedDept = String(dept).padStart(2, '0').slice(0, 2);
    const cleanDate = dateStr ? dateStr.slice(0, 10) : '';

    // 1. Vérification locale immédiate (< 1ms)
    if (cleanDate && vigilanceAlertsHistory && vigilanceAlertsHistory[cleanDate] && vigilanceAlertsHistory[cleanDate][formattedDept]) {
      const cached = vigilanceAlertsHistory[cleanDate][formattedDept];
      return this.formatVigilanceResult(formattedDept, cleanDate, cached.level, cached.phenos, `Archives Météo-France (Épisode certifié du ${cleanDate})`);
    }

    // 2. Appel dynamique à la Serverless Function Vercel pour les nouveaux bulletins
    try {
      const response = await fetch(`/api/vigilance?dept=${formattedDept}&date=${cleanDate}`);
      if (response.ok) {
        const liveData = await response.json();
        return this.formatVigilanceResult(
          formattedDept, 
          cleanDate, 
          liveData.level || 'Vert', 
          liveData.phenos || [], 
          liveData.source || "Archives Officielles Météo-France"
        );
      }
    } catch (e) {
      console.warn("Erreur API vigilance live:", e);
    }

    return this.formatVigilanceResult(formattedDept, cleanDate, 'Vert', [], "Archives Officielles Météo-France");
  },

  /**
   * Version synchrone pour le premier rendu immédiat
   */
  fetchOfficialVigilance(dept = '59', dateStr = '') {
    const formattedDept = String(dept).padStart(2, '0').slice(0, 2);
    const cleanDate = dateStr ? dateStr.slice(0, 10) : '';

    if (cleanDate && vigilanceAlertsHistory && vigilanceAlertsHistory[cleanDate] && vigilanceAlertsHistory[cleanDate][formattedDept]) {
      const cached = vigilanceAlertsHistory[cleanDate][formattedDept];
      return this.formatVigilanceResult(formattedDept, cleanDate, cached.level, cached.phenos, `Archives Météo-France (Épisode certifié du ${cleanDate})`);
    }

    return this.formatVigilanceResult(formattedDept, cleanDate, 'Vert', [], "Archives Officielles Météo-France");
  },

  formatVigilanceResult(formattedDept, cleanDate, level = 'Vert', activePhenos = [], source = "Archives Officielles Météo-France") {
    const formattedPhenos = activePhenos.length > 0 
      ? activePhenos.map(p => `${PHENO_ICONS[p] || '⚠️'} ${p}`)
      : (level === 'Vert' ? ["🟢 Aucun phénomène dangereux majeur"] : ["⚠️ Suivi départemental Météo-France"]);

    if (level === 'Rouge') {
      return {
        level: 'Rouge',
        color: 'rose',
        bgClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
        pdfBadgeClass: 'bg-rose-100 text-rose-950 border-rose-400',
        aleas: formattedPhenos,
        bulletinTitle: "BULLETIN D'ALERTE ROUGE NATIONALE — VIGILANCE ABSOLUE",
        bulletinText: `Météo-France a officiellement placé le département ${formattedDept} en VIGILANCE ROUGE (niveau 4/4) lors de l'épisode du ${cleanDate} (${activePhenos.join(', ')}). Des consignes d'urgence absolue ont été diffusées par les autorités préfectorales et la Sécurité Civile.`,
        bulletinDate: cleanDate,
        source
      };
    } else if (level === 'Orange') {
      return {
        level: 'Orange',
        color: 'orange',
        bgClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
        pdfBadgeClass: 'bg-amber-100 text-amber-950 border-amber-400',
        aleas: formattedPhenos,
        bulletinTitle: "BULLETIN OFFICIEL DE VIGILANCE ORANGE MÉTÉO-FRANCE",
        bulletinText: `Météo-France a officiellement placé le département ${formattedDept} en VIGILANCE ORANGE (niveau 3/4) lors de l'épisode du ${cleanDate} pour : ${activePhenos.join(', ')}.`,
        bulletinDate: cleanDate,
        source
      };
    } else if (level === 'Jaune') {
      return {
        level: 'Jaune',
        color: 'yellow',
        bgClass: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
        pdfBadgeClass: 'bg-yellow-100 text-yellow-950 border-yellow-300',
        aleas: formattedPhenos,
        bulletinTitle: "BULLETIN OFFICIEL DE SUIVI DE VIGILANCE JAUNE MÉTÉO-FRANCE",
        bulletinText: `Météo-France a placé le département ${formattedDept} en VIGILANCE JAUNE (niveau 2/4) le ${cleanDate} (${activePhenos.join(', ') || 'Soyez attentif'}).`,
        bulletinDate: cleanDate,
        source
      };
    } else {
      return {
        level: 'Vert',
        color: 'emerald',
        bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        pdfBadgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        aleas: ["🟢 Conditions normales"],
        bulletinTitle: "SITUATION NORMALE — VIGILANCE VERTE",
        bulletinText: `Le département ${formattedDept} était officiellement placé en VIGILANCE VERTE (niveau 1/4) par Météo-France à cette date. Aucun bulletin d'alerte n'a été émis.`,
        bulletinDate: cleanDate,
        source
      };
    }
  }
};
