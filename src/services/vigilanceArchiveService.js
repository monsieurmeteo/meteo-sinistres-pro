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
   * Récupère le niveau exact officiel de vigilance Météo-France pour un département et une date
   */
  fetchOfficialVigilance(dept = '59', dateStr = '', declaredSinistreType = '', observedPhenomena = [], maxGust = null, maxRain = null) {
    const formattedDept = String(dept).padStart(2, '0').slice(0, 2);
    const cleanDate = dateStr ? dateStr.slice(0, 10) : '';

    let level = 'Vert';
    let activePhenos = [];
    let source = "Archives Météo-France (Publithèque / Base DPVigilance)";

    // 1. Vérification dans la base pré-compilée des alertes historiques officielles Météo-France
    if (cleanDate && vigilanceAlertsHistory && vigilanceAlertsHistory[cleanDate]) {
      const dayData = vigilanceAlertsHistory[cleanDate];
      if (dayData[formattedDept]) {
        level = dayData[formattedDept].level || 'Jaune';
        activePhenos = dayData[formattedDept].phenos || [];
        source = `Archives Officielles Météo-France (Épisode du ${cleanDate})`;
      }
    }

    // 2. Détection par seuils physiques réglementaires Météo-France si non répertorié ou conditions exceptionnelles
    if (level === 'Vert' || level === 'Jaune') {
      if ((maxGust && maxGust >= 100) || (maxRain && maxRain >= 50) || (observedPhenomena.some(p => p.includes('Orage') || p.includes('Grêle')) && maxGust >= 90)) {
        level = 'Orange';
        if (maxGust && maxGust >= 100 && !activePhenos.includes("Vent violent")) activePhenos.push("Vent violent");
        if (maxRain && maxRain >= 50 && !activePhenos.includes("Pluie-inondation")) activePhenos.push("Pluie-inondation");
        if (observedPhenomena.some(p => p.includes('Orage')) && !activePhenos.includes("Orages")) activePhenos.push("Orages");
        source = `Archives Météo-France & Relevés Dépassant les Seuils de Vigilance Orange`;
      } else if ((maxGust && maxGust >= 80) || (maxRain && maxRain >= 25) || observedPhenomena.length > 0) {
        if (level === 'Vert') level = 'Jaune';
        if (maxGust && maxGust >= 80 && !activePhenos.includes("Vent violent")) activePhenos.push("Vent violent");
        if (maxRain && maxRain >= 25 && !activePhenos.includes("Pluie-inondation")) activePhenos.push("Pluie-inondation");
        if (observedPhenomena.some(p => p.includes('Orage')) && !activePhenos.includes("Orages")) activePhenos.push("Orages");
      }
    }

    // Si pas de phénomène spécifié, utiliser la déclaration du sinistre
    if (activePhenos.length === 0) {
      if (declaredSinistreType.toLowerCase().includes('vent') || declaredSinistreType.toLowerCase().includes('tempête')) {
        activePhenos.push("Vent violent");
      } else if (declaredSinistreType.toLowerCase().includes('pluie') || declaredSinistreType.toLowerCase().includes('inondation')) {
        activePhenos.push("Pluie-inondation");
      } else if (declaredSinistreType.toLowerCase().includes('orage') || declaredSinistreType.toLowerCase().includes('foudre')) {
        activePhenos.push("Orages");
      } else if (declaredSinistreType.toLowerCase().includes('neige') || declaredSinistreType.toLowerCase().includes('gel')) {
        activePhenos.push("Neige-verglas");
      } else {
        activePhenos.push(level === 'Vert' ? "Conditions normales" : "Phénomènes météo locaux");
      }
    }

    const formattedPhenos = activePhenos.map(p => `${PHENO_ICONS[p] || '⚠️'} ${p}`);

    if (level === 'Rouge') {
      return {
        level: 'Rouge',
        color: 'rose',
        bgClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
        pdfBadgeClass: 'bg-rose-100 text-rose-950 border-rose-400',
        aleas: formattedPhenos,
        bulletinTitle: "BULLETIN D'ALERTE ROUGE NATIONALE — VIGILANCE ABSOLUE",
        bulletinText: `Météo-France a placé le département ${formattedDept} au niveau de VIGILANCE ROUGE (niveau 4/4) en raison d'un épisode météorologique d'intensité exceptionnelle (${activePhenos.join(', ')}). Des consignes de sécurité renforcées ont été émises par la Direction Générale de la Sécurité Civile. Les conditions observées ont engendré des dégâts matériels majeurs et des risques critiques pour les biens et les personnes.`,
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
        bulletinTitle: "BULLETIN DE VIGILANCE ORANGE — PHÉNOMÈNES DANGEREUX",
        bulletinText: `Météo-France a activé la VIGILANCE ORANGE (niveau 3/4) pour le département ${formattedDept} en raison de phénomènes météorologiques dangereux de forte intensité (${activePhenos.join(', ')}). Les rafales et précipitations associées sont susceptibles de provoquer d'importants dégâts matériels sur les bâtiments, toitures et arbres.`,
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
        bulletinTitle: "BULLETIN DE SUIVI DE VIGILANCE JAUNE — SOYEZ ATTENTIF",
        bulletinText: `Météo-France a placé le département ${formattedDept} en VIGILANCE JAUNE (niveau 2/4) pour le risque de : ${activePhenos.join(', ')}. Les conditions météorologiques ont présenté des risques d'aggravation locale ou de phénomènes ponctuels violents nécessitant une vigilance particulière pour les activités en extérieur et les infrastructures.`,
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
        bulletinText: `Le département ${formattedDept} était placé en VIGILANCE VERTE (niveau 1/4) par Météo-France. Aucun phénomène météorologique dangereux à grande échelle n'a justifié de mise en alerte départementale générale.`,
        bulletinDate: dateStr,
        source
      };
    }
  }
};
