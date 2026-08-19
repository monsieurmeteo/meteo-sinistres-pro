import React, { useState, useEffect } from 'react';
import { 
  Shield, User, MapPin, Calendar, Clock, FileText, CheckCircle2, 
  Search, ArrowRight, AlertCircle, Building2, Radio
} from 'lucide-react';
import { geocodingService } from '../../services/geocodingService';
import { stationSelectorService } from '../../services/stationSelectorService';

const SINISTRE_TYPES = [
  'Tempête / Vent violent / Fortes rafales',
  'Fortes pluies / Inondation / Ruissellement',
  'Grêle',
  'Gel / Froid extrême',
  'Neige / Poids de la neige',
  'Orage / Foudre',
  'Canicule / Chaleur extrême',
  'Autre aléa climatique'
];

export default function NewDossierWizard({ onSaveAndAnalyze, onCancel }) {
  // Informations Assuré
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [societe, setSociete] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [numContrat, setNumContrat] = useState('');
  const [compagnieAssurance, setCompagnieAssurance] = useState('');

  // Informations Sinistre
  const [numSinistre, setNumSinistre] = useState('');
  const [sinistreType, setSinistreType] = useState(SINISTRE_TYPES[0]);
  const [customSinistreType, setCustomSinistreType] = useState('');
  const [dateSinistre, setDateSinistre] = useState(new Date().toISOString().split('T')[0]);
  const [heureSinistre, setHeureSinistre] = useState('');
  const [description, setDescription] = useState('');
  const [observations, setObservations] = useState('');

  // Localisation
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Stations découvertes
  const [discoveredStations, setDiscoveredStations] = useState([]);

  // Recherche adresse en direct
  useEffect(() => {
    if (!addressQuery || addressQuery.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      const results = await geocodingService.searchAddress(addressQuery);
      setAddressSuggestions(results);
      setIsSearchingAddress(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [addressQuery]);

  // Découverte des stations quand un lieu est sélectionné
  const handleSelectAddress = (loc) => {
    setSelectedLocation(loc);
    setAddressQuery(loc.label);
    setAddressSuggestions([]);

    // Lancer la sélection automatique des stations
    const stations = stationSelectorService.findBestStations(loc.lat, loc.lon);
    setDiscoveredStations(stations);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!nom || !selectedLocation || !dateSinistre) {
      alert('Veuillez renseigner le nom de l\'assuré, la date et sélectionner une adresse valide.');
      return;
    }

    const dossier = {
      id: 'dossier_' + Date.now(),
      status: 'Analyse en cours',
      assure: {
        nom, prenom, societe, telephone, email, numContrat, compagnieAssurance
      },
      sinistre: {
        numSinistre: numSinistre || `SIN-${Date.now().toString().slice(-6)}`,
        sinistreType: sinistreType === 'Autre aléa climatique' && customSinistreType ? customSinistreType : sinistreType,
        adresseSinistre: selectedLocation.label,
        commune: selectedLocation.city,
        codePostal: selectedLocation.postcode,
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        dateSinistre,
        heureSinistre,
        description,
        observations
      },
      selectedStations: discoveredStations.slice(0, 3)
    };

    onSaveAndAnalyze(dossier);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-sky-400" />
            Nouveau Dossier de Sinistre
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Création d'une attestation météorologique conforme aux normes d'expertise d'assurance
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
        >
          Annuler
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 : Assuré & Contrat */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <User className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              1. Fiche Assuré & Contrat
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nom *</label>
              <input
                type="text"
                required
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Ex: Dupont"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                placeholder="Ex: Jean"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Société (si professionnel)</label>
              <input
                type="text"
                value={societe}
                onChange={e => setSociete(e.target.value)}
                placeholder="Ex: SAS BTP Nord"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Compagnie d'Assurance</label>
              <input
                type="text"
                value={compagnieAssurance}
                onChange={e => setCompagnieAssurance(e.target.value)}
                placeholder="Ex: AXA, Allianz, Groupama, Macif..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">N° Police / Contrat</label>
              <input
                type="text"
                value={numContrat}
                onChange={e => setNumContrat(e.target.value)}
                placeholder="Ex: POL-19847291"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">N° de Sinistre</label>
              <input
                type="text"
                value={numSinistre}
                onChange={e => setNumSinistre(e.target.value)}
                placeholder="Ex: SIN-2026-0042"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Téléphone</label>
              <input
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="Ex: 06 12 34 56 78"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ex: contact@assure.fr"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2 : Localisation du Sinistre */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <MapPin className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              2. Localisation Exacte du Sinistre (API BAN Nationale)
            </h3>
          </div>

          <div className="relative">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Adresse exacte, Commune ou Code Postal *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={addressQuery}
                onChange={e => setAddressQuery(e.target.value)}
                placeholder="Tapez une adresse (ex: 14 rue de la paix 59000 Lille)..."
                className="w-full px-4 py-2.5 pl-10 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            {/* Suggestions BAN */}
            {addressSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 glass-card rounded-xl border border-slate-700 shadow-2xl p-2 z-50 overflow-hidden space-y-1">
                {addressSuggestions.map((loc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectAddress(loc)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-sky-500/20 text-xs text-slate-200 hover:text-white flex items-center justify-between transition"
                  >
                    <div>
                      <strong className="block text-slate-100">{loc.label}</strong>
                      <span className="text-[11px] text-slate-400">{loc.context}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{loc.lat.toFixed(3)}°, {loc.lon.toFixed(3)}°</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedLocation && (
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-sky-300">Point géoréférencé avec succès :</p>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedLocation.label}</p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Latitude : {selectedLocation.lat.toFixed(4)}°N | Longitude : {selectedLocation.lon.toFixed(4)}°E
                </p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          )}

          {/* 3 Stations découvertes automatiquement */}
          {discoveredStations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                <span>3 Stations Météo-France les plus complètes retenues :</span>
                <span className="text-emerald-400 text-[11px] font-normal">Qualité & proximité optimisées</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {discoveredStations.slice(0, 3).map((st, idx) => (
                  <div key={st.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                          Station #{idx + 1}
                        </span>
                        <strong className="block text-xs text-white font-bold mt-1.5">{st.name}</strong>
                      </div>
                      <span className="text-xs font-extrabold text-sky-400">{st.distance} km</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-0.5">
                      <p>Altitude : {st.alt} m</p>
                      <p className="text-emerald-400">Pluie: ✅ | Vent: ✅ | Temp: ✅</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3 : Date, Aléa & Circonstances */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <FileText className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              3. Détails & Circonstances du Sinistre
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Type de sinistre / Aléa météo *</label>
              <select
                value={sinistreType}
                onChange={e => setSinistreType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {SINISTRE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {sinistreType === 'Autre aléa climatique' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Préciser l'aléa</label>
                <input
                  type="text"
                  value={customSinistreType}
                  onChange={e => setCustomSinistreType(e.target.value)}
                  placeholder="Ex: Trophée de glace, microrafale..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Date exacte du sinistre *</label>
              <input
                type="date"
                required
                value={dateSinistre}
                onChange={e => setDateSinistre(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Heure approximative / Plage horaire</label>
              <input
                type="text"
                value={heureSinistre}
                onChange={e => setHeureSinistre(e.target.value)}
                placeholder="Ex: 17h30 ou entre 16h et 19h"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">Description sommaire des dommages</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Chute de tuiles, infiltration par toiture arrachée, ruissellement..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-bold text-white shadow-xl shadow-sky-600/30 transition transform hover:-translate-y-0.5"
          >
            Lancer l'analyse météorologique Météo-France
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
