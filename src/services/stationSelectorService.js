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
   * Sélectionne les 3 meilleures stations de référence réellement exploitables.
   * Élargissement progressif du rayon : 30 km -> 50 km -> 75 km -> 100 km.
   * Ne jamais inventer de fausse station si seulement 1 ou 2 stations existent.
   */
  findBestStations(targetLat, targetLon, targetAlt = 0, claimType = '') {
    if (!targetLat || !targetLon) return [];

    const all = this.getAllStations();
    const typeLower = (claimType || '').toLowerCase();

    // Critère selon l'aléa
    const needsWind = typeLower.includes('vent') || typeLower.includes('tempête') || typeLower.includes('rafale') || typeLower.includes('orage');
    
    const candidates = [];

    for (const st of all) {
      if (!st.lat || !st.lon || (st.lat === 48.85 && st.lon === 2.35 && st.dept !== '75')) continue;
      
      const isAnemoStation = st.id.endsWith('001') || st.id.endsWith('002') || st.id.endsWith('003') || st.id.endsWith('004') || st.typePoste === 1;
      
      // Si vent requis, priorité absolue aux stations équipées d'anémomètre
      if (needsWind && !isAnemoStation) continue;

      const dist = haversineDistance(targetLat, targetLon, st.lat, st.lon);

      candidates.push({
        ...st,
        distance: Math.round(dist * 10) / 10,
        altDiff: Math.abs((st.alt || 0) - targetAlt),
        isAnemo: isAnemoStation
      });
    }

    // Tri par distance puis altitude
    candidates.sort((a, b) => {
      if (Math.abs(a.distance - b.distance) > 4) return a.distance - b.distance;
      return a.altDiff - b.altDiff;
    });

    // Élargissement progressif du rayon
    const radii = [30, 50, 75, 100, 150];
    let selected = [];

    for (const r of radii) {
      const withinRadius = candidates.filter(s => s.distance <= r);
      if (withinRadius.length >= 3) {
        selected = withinRadius.slice(0, 3);
        break;
      }
      selected = withinRadius;
    }

    // Maximum 3 stations
    const top3 = selected.slice(0, 3);

    return top3.map((s, idx) => ({
      ...s,
      isTop3: true,
      rank: idx + 1
    }));
  }
};
