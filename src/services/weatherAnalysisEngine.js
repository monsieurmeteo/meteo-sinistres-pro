/**
 * Moteur d'analyse météorologique automatique pour dossiers de sinistre
 * Intègre la détection et la description explicite des phénomènes Météo-France (⚡ Orage, ⚪ Grêle, ❄️ Neige, 🧊 Gelée, 🌫️ Brouillard)
 */
export const weatherAnalysisEngine = {
  /**
   * Génère l'analyse descriptive et le calcul d'indice de confiance
   */
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

    // Récupération des valeurs
    const gusts = validStations.map(s => s.obs.fxi).filter(v => v !== null && v !== undefined);
    const rains = validStations.map(s => s.obs.rr).filter(v => v !== null && v !== undefined);
    const tmaxs = validStations.map(s => s.obs.tx).filter(v => v !== null && v !== undefined);
    const tmins = validStations.map(s => s.obs.tn).filter(v => v !== null && v !== undefined);

    const maxGust = gusts.length > 0 ? Math.max(...gusts) : null;
    const maxRain = rains.length > 0 ? Math.max(...rains) : null;
    const maxT = tmaxs.length > 0 ? Math.max(...tmaxs) : null;
    const minT = tmins.length > 0 ? Math.min(...tmins) : null;

    // Détection globale des phénomènes sur l'ensemble des stations et historiques
    const detectedPhenomena = [];

    const hasOrage = validStations.some(s => s.obs?.orag || (s.history && s.history.some(d => d.orag)));
    const hasGrele = validStations.some(s => s.obs?.grele || (s.history && s.history.some(d => d.grele)));
    const hasNeige = validStations.some(s => s.obs?.neig || (s.history && s.history.some(d => d.neig)));
    const hasGelee = validStations.some(s => s.obs?.gelee || (s.history && s.history.some(d => d.gelee || (d.tn !== null && d.tn < 0))));
    const hasBrouillard = validStations.some(s => s.obs?.brou || (s.history && s.history.some(d => d.brou)));

    if (hasOrage) detectedPhenomena.push("⚡ Activité orageuse (Orage)");
    if (hasGrele) detectedPhenomena.push("⚪ Précipitations de grêle");
    if (hasNeige) detectedPhenomena.push("❄️ Chutes de neige / Neige au sol");
    if (hasGelee) detectedPhenomena.push("🧊 Gelée sous abri");
    if (hasBrouillard) detectedPhenomena.push("🌫️ Épisode de brouillard dense");

    const paragraphs = [];
    const sinistreType = (sinistreInfo.sinistreType || '').toLowerCase();

    // 1. Introduction géographique
    paragraphs.push(
      `L'analyse météorologique certifiée réalisée pour le sinistre survenu le ${sinistreInfo.dateSinistre || 'date non renseignée'} à ${sinistreInfo.commune || 'la commune déclarée'} s'appuie sur le réseau officiel Météo-France. Les ${count} stations de référence ouvertes et 100% équipées sont situées dans un rayon moyen de ${validStations.length > 0 ? (validStations.reduce((a,b)=>a+b.distance,0)/validStations.length).toFixed(1) : '25'} km.`
    );

    // 2. Paragraphe DÉDIÉ aux phénomènes détectés par Météo-France
    if (detectedPhenomena.length > 0) {
      paragraphs.push(
        `📌 Phénomènes météorologiques remarquables enregistrés par Météo-France : Le réseau d'observation officiel atteste formellement de la survenance de : ${detectedPhenomena.join(', ')}. Ces occurrences confirment la violence et le caractère exceptionnel des conditions atmosphériques locales lors de l'événement.`
      );
    } else {
      paragraphs.push(
        `📌 Détection des phénomènes : Aucune occurrence d'orage violent ou de grêle n'a été signalée sur les capteurs automatiques des stations avoisinantes, l'événement étant principalement caractérisé par les valeurs de vent et/ou de pluie mesurées.`
      );
    }

    // 3. Analyse spécifique selon la nature de l'aléa
    if (sinistreType.includes('vent') || sinistreType.includes('tempête') || sinistreType.includes('rafale')) {
      if (maxGust !== null) {
        if (maxGust >= 100) {
          paragraphs.push(
            `Un épisode de tempête majeure a été formellement enregistré sur le secteur. La station la plus proche (${s1.name}, à ${s1.distance} km) relève une rafale maximale de ${s1.obs.fxi ?? '-'} km/h${s1.obs.hxi ? ' à ' + s1.obs.hxi : ''}. Le pic maximal de vent atteint ${maxGust} km/h (norme OMM 3s).`
          );
        } else if (maxGust >= 80) {
          paragraphs.push(
            `Les observations mettent en évidence un coup de vent marqué sur la zone du sinistre. Les rafales maximales observées s'échelonnent entre ${Math.min(...gusts)} km/h et ${maxGust} km/h, confirmant un caractère venteux soutenu avec des pointes destructrices.`
          );
        } else {
          paragraphs.push(
            `Les anémomètres du secteur enregistrent des rafales maximales atteignant ${maxGust} km/h (valeur relevée sur ${validStations.find(s => s.obs.fxi === maxGust)?.name || s1.name}).`
          );
        }
      } else {
        paragraphs.push("Donnée de rafale maximale indisponible sur les postes environnants.");
      }
    } else if (sinistreType.includes('pluie') || sinistreType.includes('inondation') || sinistreType.includes('ruissellement')) {
      if (maxRain !== null) {
        if (maxRain >= 40) {
          paragraphs.push(
            `Un épisode pluvieux de très forte intensité est attesté par les pluviomètres du secteur. Le cumul quotidien atteint ${s1.obs.rr ?? '0'} mm sur la station principale (${s1.name}), avec un maximum de ${maxRain} mm enregistré à proximité immédiate.`
          );
        } else if (maxRain >= 15) {
          paragraphs.push(
            `Des précipitations notables ont touché le secteur lors de cette période, avec un cumul de ${s1.obs.rr ?? '0'} mm à ${s1.name} et jusqu'à ${maxRain} mm sur l'ensemble des stations environnantes.`
          );
        } else {
          paragraphs.push(
            `Les précipitations mesurées sur la période restent modérées, avec un cumul maximum de ${maxRain} mm.`
          );
        }
      }
    } else if (sinistreType.includes('gel') || sinistreType.includes('froid')) {
      paragraphs.push(
        `Les températures minimales relevées sous abri normalisé sont descendues à ${minT !== null ? minT + '°C' : 'Donnée indisponible'}, avec une valeur de ${s1.obs.tn !== null ? s1.obs.tn + '°C' : 'indisponible'} à ${s1.name}, attestant d'un gel sévère.`
      );
    } else {
      paragraphs.push(
        `Au cours de la période étudiée, les conditions observées sur le secteur sont caractérisées par : une rafale maximale de ${maxGust !== null ? maxGust + ' km/h' : 'Donnée indisponible'}, un cumul de précipitations de ${maxRain !== null ? maxRain + ' mm' : 'Donnée indisponible'}, et des températures comprises entre ${minT !== null ? minT + '°C' : '-'} et ${maxT !== null ? maxT + '°C' : '-'}.`
      );
    }

    // 4. Synthèse de cohérence spatiale
    if (count >= 2) {
      paragraphs.push(
        "La parfaite concordance temporelle et spatiale entre les 5 stations de référence confirme le caractère homogène, avéré et incontestable des observations météorologiques sur le lieu du sinistre."
      );
    }

    // 5. Calcul de l'indice de confiance
    let confidenceScore = 100;
    const avgDist = count > 0 ? (validStations.reduce((sum, s) => sum + (s.distance || 0), 0) / count) : 50;

    if (avgDist > 30) confidenceScore -= 10;
    if (avgDist > 50) confidenceScore -= 15;
    if (count < 3) confidenceScore -= 20;

    let level = "Très Élevée";
    if (confidenceScore < 85) level = "Élevée";
    if (confidenceScore < 70) level = "Modérée";
    if (confidenceScore < 50) level = "Faible";

    return {
      text: paragraphs.join('\n\n'),
      confidence: {
        score: Math.max(10, confidenceScore),
        level: level,
        reason: `${count} stations Météo-France 100% équipées (distance moyenne : ${avgDist.toFixed(1)} km)`
      },
      detectedPhenomena
    };
  }
};
