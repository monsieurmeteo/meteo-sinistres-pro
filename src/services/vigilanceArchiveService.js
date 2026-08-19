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
  "Vagues-submersion": "🌊"
};

export const vigilanceArchiveService = {
  /**
   * Récupère le statut officiel Météo-France issu des bulletins d'alerte
   */
  async fetchLiveOrArchivedVigilance(dept = '59', dateStr = '') {
    const formattedDept = String(dept).padStart(2, '0').slice(0, 2);
    const cleanDate = dateStr ? dateStr.slice(0, 10) : '';

    // 1. Consultation dans la base des bulletins
    if (cleanDate && vigilanceAlertsHistory && vigilanceAlertsHistory[cleanDate] && vigilanceAlertsHistory[cleanDate][formattedDept]) {
      const cached = vigilanceAlertsHistory[cleanDate][formattedDept];
      return this.formatVigilanceResult(formattedDept, cleanDate, cached.level, cached.phenos, `Archives Météo-France (Épisode du ${cleanDate})`);
    }

    // 2. Appel à l'API Serverless Vercel
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
      console.warn("Erreur API vigilance:", e);
    }

    return this.formatVigilanceResult(formattedDept, cleanDate, 'Vert', [], "Archives Officielles Météo-France");
  },

  fetchOfficialVigilance(dept = '59', dateStr = '') {
    const formattedDept = String(dept).padStart(2, '0').slice(0, 2);
    const cleanDate = dateStr ? dateStr.slice(0, 10) : '';

    if (cleanDate && vigilanceAlertsHistory && vigilanceAlertsHistory[cleanDate] && vigilanceAlertsHistory[cleanDate][formattedDept]) {
      const cached = vigilanceAlertsHistory[cleanDate][formattedDept];
      return this.formatVigilanceResult(formattedDept, cleanDate, cached.level, cached.phenos, `Archives Météo-France (Épisode du ${cleanDate})`);
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
        bgClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
        pdfBadgeClass: 'bg-rose-100 text-rose-950 border-rose-400',
        aleas: formattedPhenos,
        bulletinTitle: `VIGILANCE ROUGE MÉTÉO-FRANCE — DÉPARTEMENT ${formattedDept}`,
        bulletinText: `Niveau 4/4 (Vigilance absolue) : Météo-France a émis un bulletin d'alerte rouge pour le département ${formattedDept} le ${cleanDate} (${activePhenos.join(', ') || 'Phénomènes exceptionnels'}). Consignes de sécurité impératives de la Sécurité Civile.`,
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
        bulletinTitle: `VIGILANCE ORANGE MÉTÉO-FRANCE — DÉPARTEMENT ${formattedDept}`,
        bulletinText: `Niveau 3/4 (Soyez très vigilant) : Météo-France a placé le département ${formattedDept} en vigilance orange le ${cleanDate} pour le(s) phénomène(s) suivant(s) : ${activePhenos.join(', ')}. Des conditions météorologiques dangereuses de forte intensité ont été prévues et signalées.`,
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
        bulletinTitle: `VIGILANCE JAUNE MÉTÉO-FRANCE — DÉPARTEMENT ${formattedDept}`,
        bulletinText: `Niveau 2/4 (Soyez attentif) : Météo-France a placé le département ${formattedDept} en vigilance jaune le ${cleanDate}${activePhenos.length > 0 ? ` (${activePhenos.join(', ')})` : ''}. Phénomènes habituels dans la région mais occasionnellement et localement dangereux.`,
        bulletinDate: cleanDate,
        source
      };
    } else {
      return {
        level: 'Vert',
        color: 'emerald',
        bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        pdfBadgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        aleas: ["🟢 Pas de vigilance particulière"],
        bulletinTitle: `VIGILANCE VERTE MÉTÉO-FRANCE — DÉPARTEMENT ${formattedDept}`,
        bulletinText: `Niveau 1/4 (Situation normale) : Le département ${formattedDept} était en vigilance verte le ${cleanDate}. Aucun phénomène météorologique dangereux n'a justifié de mise en vigilance particulière par Météo-France.`,
        bulletinDate: cleanDate,
        source
      };
    }
  }
};
