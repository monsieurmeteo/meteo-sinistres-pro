import stationDatabase from '../data/stationDatabase.json';

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
   * Trouve et classe les 5 meilleures stations autour d'un point géographique
   * Priorité : Complétude (Pluie + Vent + Rafale + Tn + Tx) > Distance > Écart d'altitude
   */
  findBestStations(targetLat, targetLon, targetAlt = 0) {
    if (!targetLat || !targetLon) return [];

    const all = this.getAllStations();
    const withDistance = [];

    for (const st of all) {
      if (!st.lat || !st.lon || (st.lat === 48.85 && st.lon === 2.35 && st.dept !== '75')) continue;
      const dist = haversineDistance(targetLat, targetLon, st.lat, st.lon);
      
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

    // Cercles de recherche progressifs : 30 km -> 50 km -> 75 km -> 100 km -> 150 km
    const radii = [30, 50, 75, 100, 150];
    let candidatePool = [];

    for (const r of radii) {
      const inRadius = withDistance.filter(s => s.distance <= r);
      if (inRadius.length >= 5) {
        candidatePool = inRadius;
        break;
      }
    }

    if (candidatePool.length < 5) {
      candidatePool = withDistance.sort((a, b) => a.distance - b.distance).slice(0, 15);
    }

    // Tri de précision : Complétude en premier, distance en second (avec pondération altitude)
    candidatePool.sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
      if (Math.abs(a.distance - b.distance) > 5) return a.distance - b.distance;
      return a.altDiff - b.altDiff;
    });

    const top5 = candidatePool.slice(0, 5);

    return top5.map((s, idx) => ({
      ...s,
      isTop5: true,
      rank: idx + 1
    }));
  }
};
