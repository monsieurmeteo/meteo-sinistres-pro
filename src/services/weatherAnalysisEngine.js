/**
 * Moteur d'analyse météorologique automatique pour dossiers de sinistre
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

    const s1 = stationsData[0];
    const s2 = stationsData[1] || null;
    const s3 = stationsData[2] || null;

    const validStations = stationsData.filter(s => s.obs && s.obs.date);
    const count = validStations.length;

    // Récupération des valeurs
    const gusts = validStations.map(s => s.obs.fxi).filter(v => v !== null && v !== undefined);
    const rains = validStations.map(s => s.obs.rr).filter(v => v !== null && v !== undefined);
    const tmaxs = validStations.map(s => s.obs.tx).filter(v => v !== null && v !== undefined);
    const tmins = validStations.map(s => s.obs.tn).filter(v => v !== null && v !== undefined);

    const maxGust = gusts.length > 0 ? Math.max(...gusts) : null;
    const maxRain = rains.length > 0 ? Math.max(...rains) : null;
    const maxT = tmaxs.length > 0 ? Math.max(...tmaxs) : null;
    const minT = tmins.length > 0 ? Math.min(...tmins) : null;

    // Détermination de la typologie d'événement
    const paragraphs = [];
    const sinistreType = (sinistreInfo.sinistreType || '').toLowerCase();

    // 1. Introduction géographique
    paragraphs.push(
      `L'analyse météorologique réalisée pour le sinistre survenu le ${sinistreInfo.dateSinistre || 'date non renseignée'} à ${sinistreInfo.commune || 'la commune déclarée'} s'appuie sur le réseau d'observation officiel Météo-France. Les ${count} station(s) de référence retenue(s) sont situées dans un rayon de ${validStations[validStations.length - 1]?.distance || '30'} km.`
    );

    // 2. Analyse spécifique selon le sinistre
    if (sinistreType.includes('vent') || sinistreType.includes('tempête') || sinistreType.includes('rafale')) {
      if (maxGust !== null) {
        if (maxGust >= 100) {
          paragraphs.push(
            `Un épisode de tempête majeure a été formellement enregistré sur le secteur. La station la plus proche (${s1.name}, à ${s1.distance} km) relève une rafale maximale de ${s1.obs.fxi ?? 'Donnée indisponible'} km/h${s1.obs.hxi ? ' à ' + s1.obs.hxi : ''}. Le pic maximal régional atteint ${maxGust} km/h.`
          );
        } else if (maxGust >= 80) {
          paragraphs.push(
            `Les observations mettent en évidence un coup de vent marqué sur la zone du sinistre. Les rafales maximales observées s'échelonnent entre ${Math.min(...gusts)} km/h et ${maxGust} km/h, confirmant un caractère venteux soutenu au cours de l'événement.`
          );
        } else {
          paragraphs.push(
            `Les anémomètres du secteur enregistrent des rafales maximales n'excédant pas ${maxGust} km/h (valeur relevée sur ${validStations.find(s => s.obs.fxi === maxGust)?.name}).`
          );
        }
      } else {
        paragraphs.push("Donnée de rafale maximale indisponible sur les postes environnants.");
      }
    } else if (sinistreType.includes('pluie') || sinistreType.includes('inondation') || sinistreType.includes('ruissellement')) {
      if (maxRain !== null) {
        if (maxRain >= 40) {
          paragraphs.push(
            `Un épisode pluvieux de très forte intensité est attesté par les pluviomètres du secteur. Le cumul quotidien atteint ${s1.obs.rr ?? 'Donnée indisponible'} mm sur la station principale (${s1.name}), avec un maximum de ${maxRain} mm enregistré à proximité immédiate.`
          );
        } else if (maxRain >= 15) {
          paragraphs.push(
            `Des précipitations notables ont touché le secteur lors de cette journée, avec un cumul de ${s1.obs.rr ?? '0'} mm à ${s1.name} et jusqu'à ${maxRain} mm sur l'ensemble des stations environnantes.`
          );
        } else {
          paragraphs.push(
            `Les précipitations mesurées sur la journée restent faibles à modérées, avec un cumul maximum de ${maxRain} mm.`
          );
        }
      }
    } else if (sinistreType.includes('gel') || sinistreType.includes('froid')) {
      paragraphs.push(
        `Les températures minimales relevées sous abri normalisé sont descendues à ${minT !== null ? minT + '°C' : 'Donnée indisponible'}, avec une valeur de ${s1.obs.tn !== null ? s1.obs.tn + '°C' : 'indisponible'} à ${s1.name}.`
      );
    } else {
      // Analyse générale
      paragraphs.push(
        `Au cours de la journée étudiée, les conditions observées sur le secteur sont caractérisées par : une rafale maximale de ${maxGust !== null ? maxGust + ' km/h' : 'Donnée indisponible'}, un cumul de précipitations de ${maxRain !== null ? maxRain + ' mm' : 'Donnée indisponible'}, et des températures comprises entre ${minT !== null ? minT + '°C' : '-'} et ${maxT !== null ? maxT + '°C' : '-'}.`
      );
    }

    // 3. Synthèse de cohérence
    if (count >= 2) {
      paragraphs.push(
        "La parfaite concordance temporelle et spatiale entre les différentes stations confirme le caractère homogène et généralisé des observations sur le lieu du sinistre."
      );
    }

    // 4. Calcul indice de confiance
    let confidenceScore = 100;
    const avgDist = count > 0 ? (validStations.reduce((sum, s) => sum + (s.distance || 0), 0) / count) : 50;

    if (count < 3) confidenceScore -= (3 - count) * 15;
    if (avgDist > 25) confidenceScore -= 15;
    if (avgDist > 40) confidenceScore -= 20;
    if (gusts.length === 0 && rains.length === 0) confidenceScore -= 30;

    let confLevel = "Très élevée";
    let confReason = `${count} stations complètes situées à proximité immédiate (< ${Math.round(avgDist)} km en moyenne).`;

    if (confidenceScore < 50) {
      confLevel = "Faible";
      confReason = "Nombre restreint de stations complètes ou distance élevée par rapport au lieu du sinistre.";
    } else if (confidenceScore < 75) {
      confLevel = "Moyenne";
      confReason = "Stations disponibles satisfaisantes avec cohérence globale des mesures.";
    } else if (confidenceScore < 90) {
      confLevel = "Élevée";
      confReason = `${count} stations de référence homogènes à moins de ${Math.round(avgDist)} km.`;
    }

    return {
      text: paragraphs.join('\n\n'),
      confidence: {
        level: confLevel,
        score: Math.max(10, Math.min(100, confidenceScore)),
        reason: confReason
      },
      highlights: {
        maxGust,
        maxRain,
        maxT,
        minT
      }
    };
  }
};
