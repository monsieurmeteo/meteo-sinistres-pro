import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, User, MapPin, Calendar, Clock, FileText, CheckCircle2, 
  Search, ArrowRight, Building2, X
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
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [societe, setSociete] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [numContrat, setNumContrat] = useState('');
  const [compagnieAssurance, setCompagnieAssurance] = useState('');

  const [dateMode, setDateMode] = useState('single');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [dateSinistre, setDateSinistre] = useState(yesterday.toISOString().split('T')[0]);
  const [dateDebut, setDateDebut] = useState(threeDaysAgo.toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState(yesterday.toISOString().split('T')[0]);
  const [heureSinistre, setHeureSinistre] = useState('');

  const [numSinistre, setNumSinistre] = useState('');
  const [sinistreType, setSinistreType] = useState(SINISTRE_TYPES[0]);
  const [customSinistreType, setCustomSinistreType] = useState('');
  const [description, setDescription] = useState('');
  const [observations, setObservations] = useState('');

  // Localisation
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchContainerRef = useRef(null);

  // 5 Stations découvertes
  const [discoveredStations, setDiscoveredStations] = useState([]);

  // Fermer la liste déroulante si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setAddressSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recherche d'adresse BAN
  useEffect(() => {
    if (!addressQuery || addressQuery.trim().length < 2) {
      setAddressSuggestions([]);
      return;
    }

    if (selectedLocation && addressQuery === selectedLocation.label) {
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
  }, [addressQuery, selectedLocation]);

  const handleSelectAddress = (loc) => {
    setSelectedLocation(loc);
    setAddressQuery(loc.label);
    setAddressSuggestions([]);

    const stations = stationSelectorService.findBestStations(loc.lat, loc.lon, 0, sinistreType);
    setDiscoveredStations(stations);
  };

  const handleClearAddress = () => {
    setSelectedLocation(null);
    setAddressQuery('');
    setAddressSuggestions([]);
    setDiscoveredStations([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!nom.trim()) {
      alert('Veuillez renseigner le nom de l'assuré.');
      return;
    }

    if (!selectedLocation) {
      alert('Veuillez rechercher et sélectionner une adresse ou commune dans la liste.');
      return;
    }

    const stations = discoveredStations.length > 0
      ? discoveredStations
      : stationSelectorService.findBestStations(selectedLocation.lat, selectedLocation.lon, 0, sinistreType);

    const effectiveDateSinistre = dateMode === 'single' ? dateSinistre : `${dateDebut} au ${dateFin}`;

    const dossier = {
      id: 'dossier_' + Date.now(),
      status: 'Analyse en cours',
      assure: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        societe: societe.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        numContrat: numContrat.trim(),
        compagnieAssurance: compagnieAssurance.trim()
      },
      sinistre: {
        numSinistre: numSinistre.trim() || `SIN-${Date.now().toString().slice(-6)}`,
        sinistreType: sinistreType === 'Autre aléa climatique' && customSinistreType ? customSinistreType : sinistreType,
        adresseSinistre: selectedLocation.label,
        commune: selectedLocation.city || selectedLocation.label,
        codePostal: selectedLocation.postcode || '',
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        dateMode,
        dateSinistre: effectiveDateSinistre,
        dateDebut: dateMode === 'single' ? dateSinistre : dateDebut,
        dateFin: dateMode === 'single' ? dateSinistre : dateFin,
        heureSinistre: heureSinistre.trim() || 'Journée entière',
        description: description.trim(),
        observations: observations.trim()
      },
      selectedStations: stations.slice(0, 5)
    };

    onSaveAndAnalyze(dossier);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950 flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-sky-600" />
            Nouveau Dossier de Sinistre
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Formulaire de déclaration — Analyse automatique sur les 5 stations Météo-France les plus proches
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs"
        >
          Annuler
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 : Assuré & Contrat */}
        <div className="glass-card rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm bg-white relative z-10">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              1. Fiche Assuré & Contrat
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nom *</label>
              <input
                type="text"
                required
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Ex: Dupont"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                placeholder="Ex: Jean"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Société (si professionnel)</label>
              <input
                type="text"
                value={societe}
                onChange={e => setSociete(e.target.value)}
                placeholder="Ex: SAS BTP Nord"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Compagnie d'Assurance</label>
              <input
                type="text"
                value={compagnieAssurance}
                onChange={e => setCompagnieAssurance(e.target.value)}
                placeholder="Ex: AXA, Allianz, Groupama..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">N° Police / Contrat</label>
              <input
                type="text"
                value={numContrat}
                onChange={e => setNumContrat(e.target.value)}
                placeholder="Ex: POL-19847291"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">N° de Sinistre</label>
              <input
                type="text"
                value={numSinistre}
                onChange={e => setNumSinistre(e.target.value)}
                placeholder="Ex: SIN-2026-0042"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono shadow-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone</label>
              <input
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="Ex: 06 12 34 56 78"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ex: jean.dupont@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2 : Localisation du Sinistre */}
        <div className="glass-card rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm bg-white relative z-40">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              2. Localisation Exacte du Sinistre
            </h3>
          </div>

          <div className="relative z-50" ref={searchContainerRef}>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Adresse exacte, Commune ou Code Postal *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={addressQuery}
                onChange={e => {
                  setAddressQuery(e.target.value);
                  if (selectedLocation && e.target.value !== selectedLocation.label) {
                    setSelectedLocation(null);
                  }
                }}
                placeholder="Rechercher une commune ou adresse (ex: Strasbourg, Douai, Paris)..."
                className="w-full px-4 py-3 pl-10 pr-10 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              {addressQuery && (
                <button
                  type="button"
                  onClick={handleClearAddress}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Suggestions BAN déroulantes */}
            {addressSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-sky-300 shadow-2xl p-2 z-[9999] bg-white text-slate-900 max-h-80 overflow-y-auto space-y-1.5">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-sky-700 tracking-wider">
                  Sélectionnez votre adresse parmi les résultats :
                </div>
                {addressSuggestions.map((loc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectAddress(loc)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 flex items-center justify-between transition group shadow-2xs"
                  >
                    <div>
                      <strong className="block text-xs font-bold text-slate-900 group-hover:text-sky-900">{loc.label}</strong>
                      <span className="text-[11px] text-slate-500">{loc.context}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-100/50 px-2 py-1 rounded-lg border border-sky-200">
                      {loc.lat.toFixed(3)}°, {loc.lon.toFixed(3)}°
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lieu validé */}
          {selectedLocation && (
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-sky-800">Point géoréférencé :</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{selectedLocation.label}</p>
                <p className="text-xs font-mono text-slate-600 mt-0.5">
                  GPS : {selectedLocation.lat.toFixed(4)}°N | {selectedLocation.lon.toFixed(4)}°E
                </p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            </div>
          )}

          {/* 5 Stations découvertes */}
          {discoveredStations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3">
                5 Stations Météo-France de référence retenues :
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {discoveredStations.slice(0, 5).map((st, idx) => (
                  <div key={st.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono">
                          #{idx + 1}
                        </span>
                        <strong className="block text-xs text-slate-900 font-bold mt-1 truncate max-w-[100px]">{st.name}</strong>
                      </div>
                      <span className="text-xs font-black text-sky-700">{st.distance} km</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-0.5">
                      <p>ID : <span className="font-mono text-slate-700 font-semibold">{st.id}</span></p>
                      <p>Alt : {st.alt} m</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3 : Date unique OU Période */}
        <div className="glass-card rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm bg-white relative z-10">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-600" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                3. Temporalité du Sinistre
              </h3>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDateMode('single')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  dateMode === 'single' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Date Unique
              </button>
              <button
                type="button"
                onClick={() => setDateMode('period')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  dateMode === 'period' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Période (Plusieurs jours)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Type de sinistre / Aléa météo *</label>
              <select
                value={sinistreType}
                onChange={e => setSinistreType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 font-medium focus:outline-none focus:border-sky-500 shadow-xs"
              >
                {SINISTRE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {dateMode === 'single' ? (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Date exacte du sinistre *</label>
                <input
                  type="date"
                  required
                  value={dateSinistre}
                  onChange={e => setDateSinistre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-sky-500 shadow-xs"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date de Début *</label>
                  <input
                    type="date"
                    required
                    value={dateDebut}
                    onChange={e => setDateDebut(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-sky-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date de Fin *</label>
                  <input
                    type="date"
                    required
                    value={dateFin}
                    onChange={e => setDateFin(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-sky-500 shadow-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Heure approximative / Plage horaire</label>
              <input
                type="text"
                value={heureSinistre}
                onChange={e => setHeureSinistre(e.target.value)}
                placeholder={dateMode === 'single' ? 'Ex: 17h30 ou vers 18h' : 'Ex: Pic d'intensité le 2ème jour'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Description sommaire des dommages</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Toiture endommagée, tuiles arrachées, infiltration..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-bold text-white shadow-md shadow-sky-600/20 transition transform hover:-translate-y-0.5"
          >
            Lancer l'analyse {dateMode === 'period' ? 'de la période' : 'du sinistre'} (5 Stations Équipées)
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
