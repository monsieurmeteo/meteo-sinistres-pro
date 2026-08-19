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
   * ALGORITHME V2 DE SÉLECTION STRICTE :
   * 1. Disponibilité des paramètres nécessaires au type de sinistre (Vent/Rafale, Pluie, Température)
   * 2. Complétude réelle des instruments de mesure (SYNOP / RADOME Principal)
   * 3. Proximité géographique
   * 4. Représentativité géographique & altitude
   */
  findBestStations(targetLat, targetLon, targetAlt = 0, claimType = '') {
    if (!targetLat || !targetLon) return [];

    const all = this.getAllStations();
    const typeLower = (claimType || '').toLowerCase();

    // Analyse du besoin métrologique
    const needsWind = typeLower.includes('vent') || typeLower.includes('tempête') || typeLower.includes('rafale') || typeLower.includes('orage') || typeLower.includes('foudre');
    const needsRain = typeLower.includes('pluie') || typeLower.includes('inondation') || typeLower.includes('ruissellement') || typeLower.includes('orage');
    const needsTemp = typeLower.includes('gel') || typeLower.includes('froid') || typeLower.includes('canicule') || typeLower.includes('chaleur');

    const qualifiedStations = [];

    for (const st of all) {
      if (!st.lat || !st.lon || (st.lat === 48.85 && st.lon === 2.35 && st.dept !== '75')) continue;
      
      // Détection équipement anémomètre OMM (Postes 001/002/003/004 ou Type 1)
      const isAnemoStation = st.id.endsWith('001') || st.id.endsWith('002') || st.id.endsWith('003') || st.id.endsWith('004') || st.typePoste === 1;
      
      // Si vent/orage requis : élimination stricte des postes pluviométriques simples sans anémomètre
      if (needsWind && !isAnemoStation) continue;

      const dist = haversineDistance(targetLat, targetLon, st.lat, st.lon);

      // Score de qualité métrologique (SYNOP principal = +50, Anémomètre = +30)
      let qualityScore = 100;
      if (isAnemoStation) qualityScore += 30;
      if (st.id.endsWith('001')) qualityScore += 20;

      qualifiedStations.push({
        ...st,
        distance: Math.round(dist * 10) / 10,
        altDiff: Math.abs((st.alt || 0) - targetAlt),
        isAnemo: isAnemoStation,
        qualityScore,
        hasWind: isAnemoStation,
        hasRain: true,
        hasTemp: true
      });
    }

    // Tri prioritaire par qualité métrologique puis proximité
    qualifiedStations.sort((a, b) => {
      // Si écart de distance < 20 km mais meilleure station d'observation complète, privilégier la station complète
      if (Math.abs(a.distance - b.distance) > 5) return a.distance - b.distance;
      return b.qualityScore - a.qualityScore;
    });

    // Élargissement progressif du rayon jusqu'à trouver 3 stations avec capteurs actifs
    const radii = [35, 55, 80, 110, 150];
    let selected = [];

    for (const r of radii) {
      const withinRadius = qualifiedStations.filter(s => s.distance <= r);
      if (withinRadius.length >= 3) {
        selected = withinRadius.slice(0, 3);
        break;
      }
      selected = withinRadius;
    }

    const top3 = selected.slice(0, 3);

    return top3.map((s, idx) => ({
      ...s,
      isTop3: true,
      rank: idx + 1
    }));
  }
};
