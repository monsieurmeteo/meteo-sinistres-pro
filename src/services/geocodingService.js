/**
 * Service de géocodage haute précision (API BAN Nationale Data.gouv.fr)
 */
export const geocodingService = {
  /**
   * Recherche d'adresses ou communes avec autocomplétion
   */
  async searchAddress(query) {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur API Adresse');
      
      const data = await response.json();
      return (data.features || []).map(f => ({
        label: f.properties.label,
        name: f.properties.name,
        postcode: f.properties.postcode,
        city: f.properties.city,
        context: f.properties.context,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        type: f.properties.type, // housenumber, street, municipality
        score: f.properties.score
      }));
    } catch (err) {
      console.warn('[Geocoding] Fallback Nominatim:', err);
      // Fallback Nominatim
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=fr&limit=5`;
        const resNom = await fetch(nomUrl, { headers: { 'User-Agent': 'MeteoClimatPro-Sinistres/1.0' } });
        const dataNom = await resNom.json();
        return (dataNom || []).map(n => ({
          label: n.display_name,
          name: n.name,
          postcode: '',
          city: n.name,
          context: '',
          lat: parseFloat(n.lat),
          lon: parseFloat(n.lon),
          type: 'municipality',
          score: 0.8
        }));
      } catch (e) {
        console.error('[Geocoding] Échec global:', e);
        return [];
      }
    }
  },

  /**
   * Géocodage inverse depuis Latitude / Longitude
   */
  async reverseGeocode(lat, lon) {
    try {
      const url = `https://api-adresse.data.gouv.fr/reverse/?lat=${lat}&lon=${lon}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const p = data.features[0].properties;
        return {
          label: p.label,
          city: p.city,
          postcode: p.postcode,
          context: p.context
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }
};
