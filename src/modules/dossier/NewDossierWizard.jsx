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
  const [nom, setNom] = useState('Dupont');
  const [prenom, setPrenom] = useState('Jean');
  const [societe, setSociete] = useState('');
  const [telephone, setTelephone] = useState('06 12 34 56 78');
  const [email, setEmail] = useState('jean.dupont@email.com');
  const [numContrat, setNumContrat] = useState('POL-2026-9812');
  const [compagnieAssurance, setCompagnieAssurance] = useState('AXA Assurances');

  // Mode Date : 'single' (date unique) ou 'period' (période)
  const [dateMode, setDateMode] = useState('single');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [dateSinistre, setDateSinistre] = useState(yesterday.toISOString().split('T')[0]);
  const [dateDebut, setDateDebut] = useState(threeDaysAgo.toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState(yesterday.toISOString().split('T')[0]);
  const [heureSinistre, setHeureSinistre] = useState('17h30');

  const [numSinistre, setNumSinistre] = useState(`SIN-${Date.now().toString().slice(-6)}`);
  const [sinistreType, setSinistreType] = useState(SINISTRE_TYPES[0]);
  const [customSinistreType, setCustomSinistreType] = useState('');
  const [description, setDescription] = useState('Infiltration et toiture endommagée suite à un violent épisode de vent et fortes pluies');
  const [observations, setObservations] = useState('');

  // Localisation par défaut
  const [addressQuery, setAddressQuery] = useState('Lille');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState({
    label: 'Lille, Nord, Hauts-de-France',
    city: 'Lille',
    postcode: '59000',
    lat: 50.6292,
    lon: 3.0573
  });
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // 5 Stations découvertes
  const [discoveredStations, setDiscoveredStations] = useState([]);

  useEffect(() => {
    if (selectedLocation) {
      const stations = stationSelectorService.findBestStations(selectedLocation.lat, selectedLocation.lon);
      setDiscoveredStations(stations);
    }
  }, []);

  useEffect(() => {
    if (!addressQuery || addressQuery.trim().length < 2) {
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

  const handleSelectAddress = (loc) => {
    setSelectedLocation(loc);
    setAddressQuery(loc.label);
    setAddressSuggestions([]);

    const stations = stationSelectorService.findBestStations(loc.lat, loc.lon);
    setDiscoveredStations(stations);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let loc = selectedLocation;
    let stations = discoveredStations;

    if (!loc) {
      loc = {
        label: addressQuery || 'France',
        city: addressQuery || 'Lille',
        postcode: '59000',
        lat: 50.6292,
        lon: 3.0573
      };
      stations = stationSelectorService.findBestStations(loc.lat, loc.lon);
    }

    if (stations.length === 0) {
      stations = stationSelectorService.findBestStations(loc.lat, loc.lon);
    }

    const effectiveDateSinistre = dateMode === 'single' ? dateSinistre : `${dateDebut} au ${dateFin}`;

    const dossier = {
      id: 'dossier_' + Date.now(),
      status: 'Analyse en cours',
      assure: {
        nom: nom || 'Assuré',
        prenom: prenom || '',
        societe,
        telephone,
        email,
        numContrat,
        compagnieAssurance
      },
      sinistre: {
        numSinistre: numSinistre || `SIN-${Date.now().toString().slice(-6)}`,
        sinistreType: sinistreType === 'Autre aléa climatique' && customSinistreType ? customSinistreType : sinistreType,
        adresseSinistre: loc.label,
        commune: loc.city || loc.label,
        codePostal: loc.postcode || '',
        lat: loc.lat,
        lon: loc.lon,
        dateMode,
        dateSinistre: effectiveDateSinistre,
        dateDebut: dateMode === 'single' ? dateSinistre : dateDebut,
        dateFin: dateMode === 'single' ? dateSinistre : dateFin,
        heureSinistre: dateMode === 'single' ? heureSinistre : 'Sur la période',
        description,
        observations
      },
      selectedStations: stations.slice(0, 5)
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
            Analyse d'une date unique ou d'une période d'intempéries sur les 5 stations Météo-France les plus proches
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
                placeholder="Tapez une adresse ou commune (ex: Douai, Lille, Paris)..."
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

          {/* 5 Stations découvertes automatiquement */}
          {discoveredStations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                <span>5 Stations Météo-France de référence retenues :</span>
                <span className="text-emerald-400 text-[11px] font-normal">Capteurs certifiés Météo-France</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {discoveredStations.slice(0, 5).map((st, idx) => (
                  <div key={st.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                          #{idx + 1}
                        </span>
                        <strong className="block text-xs text-white font-bold mt-1 truncate max-w-[100px]">{st.name}</strong>
                      </div>
                      <span className="text-xs font-extrabold text-sky-400">{st.distance} km</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-0.5">
                      <p>ID : <span className="font-mono text-slate-300">{st.id}</span></p>
                      <p>Alt : {st.alt} m</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3 : Date unique OU Période & Circonstances */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                3. Temporalité du Sinistre (Date Unique ou Période)
              </h3>
            </div>

            {/* Toggle Date Unique / Période */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDateMode('single')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  dateMode === 'single' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Date Unique
              </button>
              <button
                type="button"
                onClick={() => setDateMode('period')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  dateMode === 'period' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Période (Plusieurs jours)
              </button>
            </div>
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

            {/* Date unique */}
            {dateMode === 'single' ? (
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
            ) : (
              /* Période (Date début et Date fin) */
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Date de Début *</label>
                  <input
                    type="date"
                    required
                    value={dateDebut}
                    onChange={e => setDateDebut(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Date de Fin *</label>
                  <input
                    type="date"
                    required
                    value={dateFin}
                    onChange={e => setDateFin(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Heure approximative / Plage</label>
              <input
                type="text"
                value={heureSinistre}
                onChange={e => setHeureSinistre(e.target.value)}
                placeholder={dateMode === 'single' ? 'Ex: 17h30 ou vers 18h' : 'Ex: Pic d\'intensité le 2ème jour'}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Description sommaire des dommages</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Inondation par ruissellement, toiture arrachée..."
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
            Lancer l'analyse {dateMode === 'period' ? 'de la période' : 'de la date'} (5 Stations)
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
