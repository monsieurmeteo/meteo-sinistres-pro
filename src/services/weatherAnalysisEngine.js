/**
 * Moteur d'analyse météorologique dynamique par type de sinistre
 * Factualité stricte, synthèse 100-150 mots, aucune extrapolation.
 */
export const weatherAnalysisEngine = {
  getRelevantParameters(claimType = '') {
    const t = (claimType || '').toLowerCase();
    if (t.includes('vent') || t.includes('tempête') || t.includes('rafale')) {
      return { type: 'VENT', columns: ['fxi', 'hxi', 'rr'], kpi: ['fxi', 'rr'] };
    }
    if (t.includes('pluie') || t.includes('inondation') || t.includes('ruissellement')) {
      return { type: 'PLUIE', columns: ['rr', 'fxi'], kpi: ['rr', 'fxi'] };
    }
    if (t.includes('gel') || t.includes('froid') || t.includes('canalisation')) {
      return { type: 'GEL', columns: ['tn', 'tx'], kpi: ['tn', 'tx'] };
    }
    if (t.includes('chaleur') || t.includes('canicule') || t.includes('sécheresse')) {
      return { type: 'CHALEUR', columns: ['tx', 'tn'], kpi: ['tx', 'tn'] };
    }
    if (t.includes('foudre') || t.includes('orage') || t.includes('grêle') || t.includes('électrique')) {
      return { type: 'ORAGE', columns: ['fxi', 'rr', 'tn'], kpi: ['fxi', 'rr'] };
    }
    return { type: 'AUTRE', columns: ['fxi', 'rr', 'tx', 'tn'], kpi: ['fxi', 'rr'] };
  },

  generateAnalysis(sinistreInfo = {}, stationsData = []) {
    if (!stationsData || stationsData.length === 0) {
      return {
        text: "Aucune observation disponible pour les stations sélectionnées à cette date.",
        confidence: { level: "Faible", score: 20 },
        kpis: []
      };
    }

    const validStations = stationsData.filter(s => s.obs && s.obs.date);
    const s1 = validStations[0] || stationsData[0];
    const claimType = sinistreInfo.sinistreType || 'Événement météorologique';

    const gusts = validStations.map(s => s.obs?.fxi).filter(v => v !== null && v !== undefined);
    const rains = validStations.map(s => s.obs?.rr).filter(v => v !== null && v !== undefined);
    const tmaxs = validStations.map(s => s.obs?.tx).filter(v => v !== null && v !== undefined);
    const tmins = validStations.map(s => s.obs?.tn).filter(v => v !== null && v !== undefined);

    const maxGust = gusts.length > 0 ? Math.max(...gusts) : null;
    const maxRain = rains.length > 0 ? Math.max(...rains) : null;
    const maxT = tmaxs.length > 0 ? Math.max(...tmaxs) : null;
    const minT = tmins.length > 0 ? Math.min(...tmins) : null;

    const bestWindSt = validStations.find(s => s.obs?.fxi === maxGust) || s1;
    const bestRainSt = validStations.find(s => s.obs?.rr === maxRain) || s1;

    // Calcul de confiance
    const distScore = Math.max(0, 100 - (s1?.distance || 15) * 2.5);
    const compScore = (validStations.length / 3) * 100;
    const finalScore = Math.min(98, Math.round(distScore * 0.5 + compScore * 0.5));
    const confLevel = finalScore >= 75 ? "Élevée" : (finalScore >= 50 ? "Moyenne" : "Faible");

    // 4 KPIs standardisés
    const kpis = [
      {
        icon: "💨",
        label: "Rafale Max",
        val: maxGust !== null ? `${maxGust} km/h` : "N/D",
        sub: maxGust !== null ? `${bestWindSt.name} (${bestWindSt.distance} km)` : "Non mesuré"
      },
      {
        icon: "💧",
        label: "Pluie 24h",
        val: maxRain !== null ? `${maxRain} mm` : "0 mm",
        sub: maxRain !== null ? `${bestRainSt.name}` : "Précipitations nulles"
      },
      {
        icon: "🌡️",
        label: "Tn / Tx",
        val: (minT !== null && maxT !== null) ? `${minT}° / ${maxT}°` : (minT !== null ? `${minT}°C` : "N/D"),
        sub: "Températures extrêmes"
      },
      {
        icon: "🛡️",
        label: "Fiabilité",
        val: confLevel,
        sub: `${validStations.length} stations Météo-France`
      }
    ];

    let text = `L'analyse météorologique pour la commune de ${sinistreInfo.commune || 'déclarée'} (${sinistreInfo.codePostal || ''}) à la date du ${sinistreInfo.dateSinistre || 'sélectionnée'} a été établie à partir des stations officielles Météo-France les plus proches. `;

    if (maxGust !== null) {
      text += `La vitesse de vent maximale enregistrée sur le secteur est de ${maxGust} km/h à la station de ${bestWindSt.name} (${bestWindSt.distance} km). `;
    }
    if (maxRain !== null && maxRain > 0) {
      text += `Le cumul de précipitations mesuré s'élève à ${maxRain} mm à ${bestRainSt.name}. `;
    }
    if (minT !== null && maxT !== null) {
      text += `Les températures observées sous abri s'échelonnent de ${minT}°C (Tn) à ${maxT}°C (Tx). `;
    }

    text += `L'indice de représentativité des mesures est qualifié d'${confLevel.toLowerCase()} (distance de la station principale : ${s1?.distance || 'N/D'} km).`;

    return {
      text,
      confidence: { level: confLevel, score: finalScore },
      kpis
    };
  }
};
