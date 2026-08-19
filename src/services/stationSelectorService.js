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

// Stations Synoptiques & RADOME majeures avec anémomètres certifiés OMM
const MAJOR_ANEMO_KEYWORDS = [
  'aeroport', 'aérodrome', 'lesquin', 'valenciennes', 'cambrai', 'dunkerque', 'epinoy',
  'roubaix', 'douai', 'steenvoorde', 'saint-quentin', 'arras', 'glisy', 'amiens',
  'le touquet', 'boulogne', 'calais', 'beauvais', 'roissy', 'orly', 'le bourget',
  'reims', 'rouen', 'evreux', 'tours', 'rennes', 'nantes', 'brest', 'bordeaux',
  'toulouse', 'lyon', 'marseille', 'nice', 'montpellier', 'strasbourg', 'nancy', 'metz'
];

export const stationSelectorService = {
  getAllStations() {
    return Array.isArray(stationDatabase) ? stationDatabase : [];
  },

  /**
   * Sélection des 5 stations de référence Météo-France les plus proches
   */
  findBestStations(targetLat, targetLon, targetAlt = 0, claimType = '', count = 5) {
    if (!targetLat || !targetLon) return [];

    const all = this.getAllStations();
    const typeLower = (claimType || '').toLowerCase();

    const needsWind = typeLower.includes('vent') || typeLower.includes('tempête') || typeLower.includes('rafale') || typeLower.includes('orage') || typeLower.includes('foudre');

    const qualifiedStations = [];

    for (const st of all) {
      if (!st.lat || !st.lon || (st.lat === 48.85 && st.lon === 2.35 && st.dept !== '75')) continue;

      const nameLower = (st.name || '').toLowerCase();
      const isMajorAnemo = MAJOR_ANEMO_KEYWORDS.some(k => nameLower.includes(k));
      const isStandardAnemo = st.id.endsWith('001') || st.id.endsWith('002') || st.id.endsWith('004') || st.typePoste === 1;

      let qualityScore = 100;
      if (isMajorAnemo) qualityScore += 80;
      if (isStandardAnemo) qualityScore += 30;

      const dist = haversineDistance(targetLat, targetLon, st.lat, st.lon);

      qualifiedStations.push({
        ...st,
        distance: Math.round(dist * 10) / 10,
        altDiff: Math.abs((st.alt || 0) - targetAlt),
        isAnemo: isMajorAnemo || isStandardAnemo,
        qualityScore,
        hasWind: isMajorAnemo || isStandardAnemo,
        hasRain: true,
        hasTemp: true
      });
    }

    if (needsWind) {
      qualifiedStations.sort((a, b) => {
        const scoreA = a.distance - (a.isAnemo ? 25 : 0);
        const scoreB = b.distance - (b.isAnemo ? 25 : 0);
        return scoreA - scoreB;
      });
    } else {
      qualifiedStations.sort((a, b) => a.distance - b.distance);
    }

    const topStations = qualifiedStations.slice(0, count);

    return topStations.map((s, idx) => ({
      ...s,
      isTop: true,
      rank: idx + 1
    }));
  }
};
