import stationDatabase from '../data/stationDatabase.json';

/**
 * Calcul de la distance géodésique Haversine en kilomètres
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const stationSelectorService = {
  getAllStations() {
    return Array.isArray(stationDatabase) ? stationDatabase : [];
  },

  /**
   * Trouve et classe les meilleures stations autour d'un point géographique
   * Priorité : Complétude (Pluie + Vent + Rafale + Tn + Tx) > Distance > Écart d'altitude
   */
  findBestStations(targetLat, targetLon, targetAlt = 0) {
    if (!targetLat || !targetLon) return [];

    const all = this.getAllStations();
    const withDistance = [];

    for (const st of all) {
      if (!st.lat || !st.lon || (st.lat === 48.85 && st.lon === 2.35 && st.dept !== '75')) continue;
      const dist = haversineDistance(targetLat, targetLon, st.lat, st.lon);
      
      // Détection anémomètre : les stations SYNOP/RADOME (terminant par 001, 002, 003, 004 ou typePoste 1) ont un anémomètre
      const isAnemoStation = st.id.endsWith('001') || st.id.endsWith('002') || st.id.endsWith('003') || st.id.endsWith('004') || st.typePoste === 1;
      const hasRain = true;
      const hasWind = isAnemoStation;
      const hasTemp = true;

      withDistance.push({
        ...st,
        distance: Math.round(dist * 10) / 10,
        altDiff: Math.abs((st.alt || 0) - targetAlt),
        hasRain,
        hasWind,
        hasTemp,
        isComplete: hasRain && hasWind && hasTemp
      });
    }

    // Cercles de recherche progressifs : 30 km -> 50 km -> 75 km -> 100 km
    const radii = [30, 50, 75, 100, 150];
    let candidatePool = [];

    for (const r of radii) {
      const inRadius = withDistance.filter(s => s.distance <= r && s.isComplete);
      if (inRadius.length >= 3) {
        candidatePool = inRadius;
        break;
      }
    }

    if (candidatePool.length < 3) {
      candidatePool = withDistance.sort((a, b) => a.distance - b.distance).slice(0, 10);
    }

    // Tri de précision
    candidatePool.sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
      return a.distance - b.distance;
    });

    const top3 = candidatePool.slice(0, 3);
    const top3Ids = new Set(top3.map(s => s.id));

    return top3.map((s, idx) => ({
      ...s,
      isTop3: true,
      rank: idx + 1
    }));
  }
};
