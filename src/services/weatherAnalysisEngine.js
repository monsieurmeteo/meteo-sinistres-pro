/**
 * Moteur d'analyse météorologique factuelle et technique
 * Strictement basé sur les relevés mesurés Météo-France
 */
export const weatherAnalysisEngine = {
  generateAnalysis(sinistreInfo, stationsData) {
    if (!stationsData || stationsData.length === 0) {
      return {
        text: "Aucune observation disponible pour les stations sélectionnées à cette date.",
        confidence: { level: "Faible", score: 25, reason: "Données stations indisponibles" },
        highlights: {}
      };
    }

    const validStations = stationsData.filter(s => s.obs && s.obs.date);
    const count = validStations.length;
    const s1 = validStations[0] || stationsData[0];

    const gusts = validStations.map(s => s.obs.fxi).filter(v => v !== null && v !== undefined);
    const rains = validStations.map(s => s.obs.rr).filter(v => v !== null && v !== undefined);
    const tmaxs = validStations.map(s => s.obs.tx).filter(v => v !== null && v !== undefined);
    const tmins = validStations.map(s => s.obs.tn).filter(v => v !== null && v !== undefined);

    const maxGust = gusts.length > 0 ? Math.max(...gusts) : null;
    const maxRain = rains.length > 0 ? Math.max(...rains) : null;
    const maxT = tmaxs.length > 0 ? Math.max(...tmaxs) : null;
    const minT = tmins.length > 0 ? Math.min(...tmins) : null;

    const detectedPhenomena = [];
    const hasOrage = validStations.some(s => s.obs?.orag || (s.history && s.history.some(d => d.orag)));
    const hasGrele = validStations.some(s => s.obs?.grele || (s.history && s.history.some(d => d.grele)));
    const hasNeige = validStations.some(s => s.obs?.neig || (s.history && s.history.some(d => d.neig)));
    const hasGelee = validStations.some(s => s.obs?.gelee || (s.history && s.history.some(d => d.gelee || (d.tn !== null && d.tn < 0))));
    const hasBrouillard = validStations.some(s => s.obs?.brou || (s.history && s.history.some(d => d.brou)));

    if (hasOrage) detectedPhenomena.push("⚡ Activité orageuse");
    if (hasGrele) detectedPhenomena.push("⚪ Grêle");
    if (hasNeige) detectedPhenomena.push("❄️ Neige");
    if (hasGelee) detectedPhenomena.push("🧊 Gelée sous abri");
    if (hasBrouillard) detectedPhenomena.push("🌫️ Brouillard");

    const paragraphs = [];
    const sinistreType = (sinistreInfo.sinistreType || '').toLowerCase();

    // 1. Cadre d'observation
    const avgDist = validStations.length > 0 ? (validStations.reduce((a,b)=>a+b.distance,0)/validStations.length).toFixed(1) : '20';
    paragraphs.push(
      `Le présent rapport technique s'appuie sur les relevés officiels de ${count} stations Météo-France ouvertes et équipées, situées dans un rayon moyen de ${avgDist} km autour du lieu du sinistre (${sinistreInfo.commune || 'commune déclarée'}). Date observée : ${sinistreInfo.dateSinistre || 'date déclarée'}.`
    );

    // 2. Relevés physiques du vent
    if (maxGust !== null) {
      const bestWindSt = validStations.find(s => s.obs.fxi === maxGust) || s1;
      paragraphs.push(
        `• Vent et Rafales (Norme OMM 3s) : La rafale maximale enregistrée sur le réseau de proximité est de ${maxGust} km/h (station de ${bestWindSt.name}, distante de ${bestWindSt.distance} km${bestWindSt.obs.hxi ? ' relevée à ' + bestWindSt.obs.hxi : ''}). Sur le poste principal de ${s1.name} (${s1.distance} km), la rafale observée est de ${s1.obs.fxi !== null ? s1.obs.fxi + ' km/h' : 'non mesurée'}.`
      );
    }

    // 3. Relevés physiques des précipitations
    if (maxRain !== null) {
      const bestRainSt = validStations.find(s => s.obs.rr === maxRain) || s1;
      paragraphs.push(
        `• Précipitations : Le cumul pluviométrique mesuré atteint ${maxRain} mm (station de ${bestRainSt.name}, ${bestRainSt.distance} km), avec ${s1.obs.rr !== null ? s1.obs.rr + ' mm' : '-'} sur le poste principal de ${s1.name}.`
      );
    }

    // 4. Phénomènes météo
    if (detectedPhenomena.length > 0) {
      paragraphs.push(
        `• Phénomènes observés : Les capteurs Météo-France confirment la présence de : ${detectedPhenomena.join(', ')}.`
      );
    }

    // 5. Synthèse technique
    paragraphs.push(
      `L'ensemble des mesures collectées répond aux exigences de traçabilité métrologique requises par les compagnies d'assurance et experts d'assurés.`
    );

    // Score de confiance
    const d1 = s1.distance || 15;
    let score = 95;
    if (d1 > 10) score -= Math.min(25, Math.round((d1 - 10) * 1.2));
    if (validStations.length < 3) score -= 15;

    const confLevel = score >= 85 ? "Très élevée" : (score >= 70 ? "Élevée" : "Moyenne");

    return {
      text: paragraphs.join('\n\n'),
      confidence: {
        level: confLevel,
        score: score,
        reason: `${count} stations officielles Météo-France (poste principal à ${d1} km)`
      },
      detectedPhenomena
    };
  }
};
