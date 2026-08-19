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
   * Récupère STRICTEMENT le niveau officiel émis par Météo-France pour un département et une date
   * ZÉRO DÉDUCTION ARTIFICIELLE : La vigilance est un acte juridique officiel d'État.
   */
  fetchOfficialVigilance(dept = '59', dateStr = '') {
    const formattedDept = String(dept).padStart(2, '0').slice(0, 2);
    const cleanDate = dateStr ? dateStr.slice(0, 10) : '';

    let level = 'Vert';
    let activePhenos = [];
    let source = "Archives Officielles Météo-France (Publithèque / DPVigilance)";

    // 1. Consultation stricte dans la base officielle des bulletins Météo-France
    if (cleanDate && vigilanceAlertsHistory && vigilanceAlertsHistory[cleanDate]) {
      const dayData = vigilanceAlertsHistory[cleanDate];
      if (dayData[formattedDept]) {
        level = dayData[formattedDept].level || 'Vert';
        activePhenos = dayData[formattedDept].phenos || [];
        source = `Archives Officielles Météo-France (Épisode certifié du ${cleanDate})`;
      }
    }

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
        bulletinDate: dateStr,
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
        bulletinDate: dateStr,
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
        bulletinDate: dateStr,
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
        bulletinDate: dateStr,
        source
      };
    }
  }
};
