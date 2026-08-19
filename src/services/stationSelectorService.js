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
   * Sélection stricte des 5 stations Météo-France les plus proches géographiquement
   * (Tri par distance réelle pure sans biais d'extrêmes)
   */
  findBestStations(targetLat, targetLon, targetAlt = 0, claimType = '', count = 5) {
    if (!targetLat || !targetLon) return [];

    const all = this.getAllStations();
    const qualifiedStations = [];

    for (const st of all) {
      if (!st.lat || !st.lon || (st.lat === 48.85 && st.lon === 2.35 && st.dept !== '75')) continue;

      const isStandardAnemo = st.id.endsWith('001') || st.id.endsWith('002') || st.id.endsWith('004') || st.typePoste === 1;
      const dist = haversineDistance(targetLat, targetLon, st.lat, st.lon);

      qualifiedStations.push({
        ...st,
        distance: Math.round(dist * 10) / 10,
        altDiff: Math.abs((st.alt || 0) - targetAlt),
        isAnemo: isStandardAnemo,
        hasWind: isStandardAnemo,
        hasRain: true,
        hasTemp: true
      });
    }

    // Tri STRICT par distance physique croissante (les plus proches en premier)
    qualifiedStations.sort((a, b) => a.distance - b.distance);

    const topStations = qualifiedStations.slice(0, count);

    return topStations.map((s, idx) => ({
      ...s,
      isTop: true,
      rank: idx + 1
    }));
  }
};
