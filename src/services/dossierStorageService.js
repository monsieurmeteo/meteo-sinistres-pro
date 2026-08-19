const STORAGE_KEY = 'meteo_climat_pro_sinistres_v1';

export const dossierStorageService = {
  generateReference() {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `MCP-${year}-${rand}`;
  },

  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = this.getInitialSample();
        this.saveAll(initial);
        return initial;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Erreur lecture storage:', e);
      return [];
    }
  },

  saveAll(dossiers) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dossiers));
    } catch (e) {
      console.error('Erreur écriture storage:', e);
    }
  },

  save(dossier) {
    const all = this.getAll();
    const existingIndex = all.findIndex(d => d.id === dossier.id);
    let updated;

    if (existingIndex >= 0) {
      updated = [...all];
      updated[existingIndex] = { ...dossier, updatedAt: new Date().toISOString() };
    } else {
      const newDossier = {
        ...dossier,
        reference: dossier.reference || this.generateReference(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updated = [newDossier, ...all];
    }

    this.saveAll(updated);
    return existingIndex >= 0 ? updated[existingIndex] : updated[0];
  },

  delete(id) {
    const all = this.getAll();
    const updated = all.filter(d => d.id !== id);
    this.saveAll(updated);
    return updated;
  },

  getInitialSample() {
    return [
      {
        id: 'sample_dossier_01',
        reference: 'MCP-2026-849102',
        status: 'Rapport généré',
        createdAt: '2026-08-04T10:00:00Z',
        assure: {
          nom: 'Marlière',
          prenom: 'Patrick',
          societe: 'Cabinet Expertise Nord',
          telephone: '03 20 00 00 00',
          email: 'patrick@meteo-climat.com',
          numContrat: 'POL-AXA-2026-001',
          compagnieAssurance: 'AXA Assurances'
        },
        sinistre: {
          numSinistre: 'SIN-2026-0803',
          sinistreType: 'Tempête / Vent violent / Fortes rafales',
          adresseSinistre: '14 Rue de la Paix, 59500 Douai',
          commune: 'Douai',
          codePostal: '59500',
          lat: 50.3708,
          lon: 3.0789,
          dateSinistre: '2026-08-03',
          heureSinistre: '14h30',
          description: 'Arrachement partiel de toiture et infiltration suite aux violentes rafales sous orage.',
          observations: 'Épisode convectif violent avec rafales normalisées OMM 3s mesurées à 63 km/h sur Lille-Lesquin et 65 km/h sur Valenciennes.'
        },
        selectedStations: [
          { id: '59178001', name: 'Douai', distance: 1.2, alt: 25, isTop3: true, rank: 1 },
          { id: '59343001', name: 'Lille-Lesquin', distance: 22.4, alt: 47, isTop3: true, rank: 2 },
          { id: '59606001', name: 'Valenciennes', distance: 31.8, alt: 50, isTop3: true, rank: 3 }
        ]
      }
    ];
  }
};
