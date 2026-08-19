import stationNamesData from '../data/stationNames.json';

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
  /**
   * Retourne toutes les stations indexées
   */
  getAllStations() {
    if (Array.isArray(stationNamesData)) return stationNamesData;
    if (typeof stationNamesData === 'object') {
      return Object.entries(stationNamesData).map(([id, st]) => ({
        id: id,
        name: st.name || st.nom || id,
        lat: st.lat || st.latitude,
        lon: st.lon || st.longitude,
        alt: st.alt || st.altitude || 0,
        dept: st.dept || (id.length >= 2 ? id.substring(0, 2) : ''),
        hasRain: st.hasRain !== false,
        hasWind: st.hasWind !== false,
        hasTemp: st.hasTemp !== false,
        source: st.source || 'Météo-France'
      }));
    }
    return [];
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
      if (!st.lat || !st.lon) continue;
      const dist = haversineDistance(targetLat, targetLon, st.lat, st.lon);
      
      // Simulation / détection de complétude des capteurs
      // Les stations à indicatif se terminant par 001 ou SYNOP principales ont 100% de capteurs
      const isSynop = st.id.endsWith('001') || st.id.endsWith('002') || st.id.endsWith('003') || st.id.endsWith('004');
      const hasRain = true;
      const hasWind = isSynop || st.hasWind || (st.name && !st.name.toLowerCase().includes('poste pluvio'));
      const hasTemp = true;
      const completeness = (hasRain ? 1 : 0) + (hasWind ? 2 : 0) + (hasTemp ? 1 : 0); // Score /4

      withDistance.push({
        ...st,
        distance: Math.round(dist * 10) / 10,
        altDiff: Math.abs((st.alt || 0) - targetAlt),
        hasRain,
        hasWind,
        hasTemp,
        completenessScore: completeness,
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
      // 1. Complétude d'abord
      if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
      // 2. Distance
      return a.distance - b.distance;
    });

    const top3Ids = new Set(candidatePool.slice(0, 3).map(s => s.id));

    return candidatePool.map(s => ({
      ...s,
      isTop3: top3Ids.has(s.id),
      rank: top3Ids.has(s.id) ? candidatePool.slice(0, 3).findIndex(x => x.id === s.id) + 1 : null
    }));
  }
};
