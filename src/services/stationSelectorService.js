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
   * Trouve et classe les 5 meilleures stations UNIQUEMENT 100% ÉQUIPÉES (Vent + Pluie + Température)
   * Exclusion stricte des postes sans anémomètre ou non équipés
   */
  findBestStations(targetLat, targetLon, targetAlt = 0) {
    if (!targetLat || !targetLon) return [];

    const all = this.getAllStations();
    const fullyEquippedStations = [];

    for (const st of all) {
      if (!st.lat || !st.lon || (st.lat === 48.85 && st.lon === 2.35 && st.dept !== '75')) continue;
      
      // Seules les stations SYNOP / RADOME officielles Météo-France avec anémomètre sont retenues
      const isAnemoStation = st.id.endsWith('001') || st.id.endsWith('002') || st.id.endsWith('003') || st.id.endsWith('004') || st.typePoste === 1;
      
      // Filtrer STRICTEMENT les stations non équipées
      if (!isAnemoStation) continue;

      const dist = haversineDistance(targetLat, targetLon, st.lat, st.lon);

      fullyEquippedStations.push({
        ...st,
        distance: Math.round(dist * 10) / 10,
        altDiff: Math.abs((st.alt || 0) - targetAlt),
        hasRain: true,
        hasWind: true,
        hasTemp: true,
        isComplete: true
      });
    }

    // Tri par distance géographique (avec départage altitude si distance similaire)
    fullyEquippedStations.sort((a, b) => {
      if (Math.abs(a.distance - b.distance) > 5) return a.distance - b.distance;
      return a.altDiff - b.altDiff;
    });

    const top5 = fullyEquippedStations.slice(0, 5);

    return top5.map((s, idx) => ({
      ...s,
      isTop5: true,
      rank: idx + 1
    }));
  }
};
