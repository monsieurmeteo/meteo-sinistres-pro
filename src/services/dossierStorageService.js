/**
 * Gestion du stockage local et persistance des dossiers de sinistres
 */
const STORAGE_KEY = 'mcp_sinistres_dossiers_v1';

export const dossierStorageService = {
  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const samples = this.getInitialSampleDossiers();
        this.saveAll(samples);
        return samples;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('[dossierStorage] Erreur lecture:', e);
      return [];
    }
  },

  getById(id) {
    const all = this.getAll();
    return all.find(d => d.id === id) || null;
  },

  save(dossier) {
    const all = this.getAll();
    const existingIndex = all.findIndex(d => d.id === dossier.id);
    
    const updated = {
      ...dossier,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      all[existingIndex] = updated;
    } else {
      updated.createdAt = updated.createdAt || new Date().toISOString();
      updated.reference = updated.reference || this.generateReference();
      all.unshift(updated);
    }

    this.saveAll(all);
    return updated;
  },

  delete(id) {
    const all = this.getAll().filter(d => d.id !== id);
    this.saveAll(all);
    return all;
  },

  saveAll(dossiers) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dossiers));
    } catch (e) {
      console.error('[dossierStorage] Erreur sauvegarde:', e);
    }
  },

  generateReference() {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `MCP-${year}-${rand}`;
  },

  getInitialSampleDossiers() {
    return [
      {
        id: 'sample-1',
        reference: 'MCP-2026-001258',
        status: 'Rapport généré',
        createdAt: '2026-08-19T10:00:00Z',
        updatedAt: '2026-08-19T11:30:00Z',
        assure: {
          nom: 'Dupont',
          prenom: 'Jean-Marc',
          societe: '',
          adresse: '14 Rue de Valenciennes',
          codePostal: '59500',
          commune: 'Douai',
          telephone: '06 12 34 56 78',
          email: 'jm.dupont@example.com',
          numContrat: 'POL-9847291',
          compagnieAssurance: 'AXA Assurances'
        },
        sinistre: {
          numSinistre: 'SIN-2026-59012',
          sinistreType: 'Tempête / Fortes rafales',
          adresseSinistre: '14 Rue de Valenciennes, 59500 Douai',
          codePostal: '59500',
          commune: 'Douai',
          lat: 50.3712,
          lon: 3.0805,
          dateSinistre: '2026-08-03',
          heureSinistre: '19:00',
          description: 'Toiture arrachée et chute de tuiles suite à de très violentes rafales sous orage.',
          observations: 'Expertise contradictoire requise.'
        },
        selectedStations: [
          { id: '59178001', name: 'Douai', distance: 1.8, alt: 25 },
          { id: '59343001', name: 'Lille-Lesquin', distance: 22.4, alt: 47 },
          { id: '59606004', name: 'Valenciennes', distance: 28.1, alt: 50 }
        ]
      }
    ];
  }
};
