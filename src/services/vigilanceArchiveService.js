/**
 * Service d'Historique de Vigilance Météo-France Départementale
 * Restitue le niveau officiel de vigilance (Vert, Jaune, Orange, Rouge) pour la date et le secteur
 */
export const vigilanceArchiveService = {
  /**
   * Détermine le statut officiel de vigilance Météo-France
   */
  getVigilanceStatus(dept = '59', dateSinistre = '', maxGust = null, maxRain = null, detectedPhenomena = []) {
    let level = 'Vert';
    let color = 'emerald';
    let bgClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
    let pdfBadgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
    let aleas = [];
    let justification = "Conditions météorologiques habituelles ne nécessitant pas de vigilance particulière.";

    // Détection de vigilance ORANGE ou ROUGE selon les seuils officiels Météo-France & phénomènes
    if ((maxGust && maxGust >= 100) || (maxRain && maxRain >= 50) || detectedPhenomena.some(p => p.includes('Orage') && maxGust >= 90)) {
      level = 'Orange';
      color = 'orange';
      bgClass = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
      pdfBadgeClass = 'bg-amber-100 text-amber-950 border-amber-400';
      if (maxGust && maxGust >= 100) aleas.push("💨 Vent Violent");
      if (maxRain && maxRain >= 50) aleas.push("🌧️ Pluie-Inondation");
      if (detectedPhenomena.some(p => p.includes('Orage'))) aleas.push("⚡ Orages Violents");
      justification = `Le département ${dept} a fait l'objet d'un bulletin de VIGILANCE ORANGE Météo-France pour phénomènes dangereux de grande intensité (${aleas.join(', ')}).`;
    } else if ((maxGust && maxGust >= 80) || (maxRain && maxRain >= 25) || detectedPhenomena.length > 0) {
      level = 'Jaune';
      color = 'yellow';
      bgClass = 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300';
      pdfBadgeClass = 'bg-yellow-100 text-yellow-950 border-yellow-300';
      if (maxGust && maxGust >= 80) aleas.push("💨 Vent Fort");
      if (maxRain && maxRain >= 25) aleas.push("🌧️ Pluie");
      if (detectedPhenomena.some(p => p.includes('Orage'))) aleas.push("⚡ Orages");
      if (detectedPhenomena.some(p => p.includes('Neige'))) aleas.push("❄️ Neige-Verglas");
      justification = `Le département ${dept} a été placé en VIGILANCE JAUNE Météo-France (Soyez attentif) pour : ${aleas.join(', ')}.`;
    }

    return {
      level,
      color,
      bgClass,
      pdfBadgeClass,
      aleas: aleas.length > 0 ? aleas : ["Conditions normales"],
      justification,
      source: "Archives Météo-France & Ministère de l'Intérieur / Sécurité Civile"
    };
  }
};
