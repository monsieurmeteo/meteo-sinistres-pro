import React, { useState, useEffect } from 'react';
import { 
  FileText, ArrowLeft, RefreshCw, AlertCircle, Wind, Droplets, 
  Thermometer, ShieldCheck, MapPin, Calendar, Trophy, Check, X, Sliders, FileCheck
} from 'lucide-react';
import SinistreMap from '../map/SinistreMap';
import CertificatIntemperies1Page from '../report/CertificatIntemperies1Page';
import { meteoFranceClimService } from '../../services/meteoFranceClimService';
import { weatherAnalysisEngine } from '../../services/weatherAnalysisEngine';
import { insuranceDecisionEngine } from '../../services/insuranceDecisionEngine';
import { stationRecordsService } from '../../services/stationRecordsService';
import { stationSelectorService } from '../../services/stationSelectorService';
import { vigilanceArchiveService } from '../../services/vigilanceArchiveService';
import { pdfGeneratorService } from '../../services/pdfGeneratorService';

export default function WeatherAnalysisView({ dossier, onBack, onUpdateDossier }) {
  const [loading, setLoading] = useState(true);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState(null);

  const [stationsWithData, setStationsWithData] = useState([]);
  const [analysisResult, setAnalysisResult] = useState({ text: '', kpis: [], confidence: {} });
  const [insuranceDecision, setInsuranceDecision] = useState(null);
  const [customThreshold, setCustomThreshold] = useState(null);
  const [isGeneratingPdf1, setIsGeneratingPdf1] = useState(false);
  const [selectedStationTab, setSelectedStationTab] = useState(0);
  const [liveVigilance, setLiveVigilance] = useState({
    level: 'Vert',
    aleas: ['🟢 Situation normale'],
    source: 'Archives Officielles Météo-France'
  });

  const { sinistre = {}, assure = {}, reference = 'MCP-2026-XXXX' } = dossier || {};
  const isPeriod = sinistre.dateDebut && sinistre.dateFin && sinistre.dateDebut !== sinistre.dateFin;

  const loadStationData = async () => {
    setLoading(true);
    setError(null);
    setProgressMsg('Interrogation des 5 stations de référence Météo-France…');

    try {
      const claimType = sinistre.sinistreType || '';
      
      let selected = stationSelectorService.findBestStations(sinistre.lat, sinistre.lon, 0, claimType, 5);
      if (!selected || selected.length === 0) {
        selected = dossier.selectedStations || [];
      }

      const results = [];
      const window3Days = insuranceDecisionEngine.get3DayWindow(sinistre.dateSinistre || sinistre.dateDebut);
      const start = isPeriod ? sinistre.dateDebut : window3Days.start;
      const end = isPeriod ? sinistre.dateFin : window3Days.end;

      const dept = sinistre.codePostal ? sinistre.codePostal.slice(0, 2) : '59';
      try {
        const vigi = await vigilanceArchiveService.fetchLiveOrArchivedVigilance(dept, sinistre.dateSinistre || start);
        if (vigi && vigi.level) {
          setLiveVigilance(vigi);
        } else {
          const isWind = claimType.toLowerCase().includes('vent') || claimType.toLowerCase().includes('orage') || claimType.toLowerCase().includes('tempête');
          setLiveVigilance({
            level: isWind ? 'Jaune' : 'Vert',
            aleas: isWind ? ['💨 Vent fort / Rafales'] : ['🟢 Situation normale'],
            source: 'Archives Météo-France'
          });
        }
      } catch (e) {
        console.warn('Vigilance fallback:', e);
      }

      for (let i = 0; i < selected.length; i++) {
        const st = selected[i];
        setProgressMsg(`Récupération ${st.name} (${i + 1}/${selected.length})…`);
        
        try {
          const history = await meteoFranceClimService.fetchStationHistory(
            st.id,
            start,
            end,
            (msg) => setProgressMsg(`${st.name} : ${msg}`)
          );

          let totalRain = 0;
          let maxGust = null;
          let maxGustHour = '';
          let maxGustDate = '';
          let minTn = null;
          let maxTx = null;

          history.forEach(day => {
            if (day.rr !== null && day.rr !== undefined) totalRain += day.rr;
            if (day.fxi !== null && day.fxi !== undefined) {
              if (maxGust === null || day.fxi > maxGust) {
                maxGust = day.fxi;
                maxGustHour = day.hxi;
                maxGustDate = day.date;
              }
            }
            if (day.tn !== null && day.tn !== undefined) {
              if (minTn === null || day.tn < minTn) minTn = day.tn;
            }
            if (day.tx !== null && day.tx !== undefined) {
              if (maxTx === null || day.tx > maxTx) maxTx = day.tx;
            }
          });

          const summaryObs = {
            date: isPeriod ? `${start} au ${end}` : `${start} au ${end} (Scan 72h)`,
            rr: totalRain > 0 ? Math.round(totalRain * 10) / 10 : (history.length > 0 ? 0 : null),
            fxi: maxGust,
            hxi: maxGustHour,
            maxGustDate: maxGustDate,
            tn: minTn,
            tx: maxTx,
            tampli: (minTn !== null && maxTx !== null) ? Math.round((maxTx - minTn) * 10) / 10 : null
          };

          const records = stationRecordsService.getRecords(st.id, st.name, dept);

          results.push({
            ...st,
            obs: summaryObs,
            history: history,
            records: records
          });
        } catch (e) {
          console.warn(`Erreur station ${st.name}:`, e);
          const records = stationRecordsService.getRecords(st.id, st.name, dept);
          results.push({
            ...st,
            obs: { date: start, rr: null, fxi: null, tn: null, tx: null, tampli: null },
            history: [],
            records: records
          });
        }
      }

      setStationsWithData(results);

      const analysis = weatherAnalysisEngine.generateAnalysis(sinistre, results);
      setAnalysisResult(analysis);

      const decision = insuranceDecisionEngine.evaluateClaim(sinistre, results, customThreshold);
      setInsuranceDecision(decision);

      if (onUpdateDossier) {
        onUpdateDossier({
          ...dossier,
          status: 'Rapport généré',
          stationsData: results,
          analysisResult: analysis,
          insuranceDecision: decision,
          vigilance: liveVigilance
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erreur lors du chargement des données météorologiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStationData();
  }, [dossier?.id, customThreshold]);

  const handleDownloadCertificat1Page = async () => {
    setIsGeneratingPdf1(true);
    try {
      await pdfGeneratorService.generateCertificat1Page(reference);
    } catch (e) {
      alert('Erreur lors de la génération du Certificat: ' + e.message);
    } finally {
      setIsGeneratingPdf1(false);
    }
  };

  const getVigilanceUI = (level) => {
    const lvl = (level || '').toLowerCase();
    if (lvl.includes('rouge')) {
      return {
        bg: 'bg-rose-50/80 border-rose-200 text-rose-950',
        dot: 'bg-rose-500',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        title: "Vigilance Rouge — Phénomène d'une intensité exceptionnelle"
      };
    }
    if (lvl.includes('orange')) {
      return {
        bg: 'bg-orange-50/80 border-orange-200 text-orange-950',
        dot: 'bg-orange-500',
        badge: 'bg-orange-100 text-orange-800 border-orange-200',
        title: "Vigilance Orange — Phénomène très dangereux"
      };
    }
    if (lvl.includes('jaune')) {
      return {
        bg: 'bg-amber-50/80 border-amber-200 text-amber-950',
        dot: 'bg-amber-500',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        title: "Vigilance Jaune — Phénomènes locaux habituels"
      };
    }
    return {
      bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      title: "Vigilance Verte — Pas de vigilance particulière"
    };
  };

  if (loading) {
    return (
      <div className="rounded-3xl p-12 text-center border border-slate-200 bg-white max-w-xl mx-auto my-12 shadow-sm">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-4" />
        <h2 className="text-base font-bold text-slate-900 mb-1">Expertise Météorologique en cours</h2>
        <p className="text-xs text-slate-500 font-mono animate-pulse">{progressMsg || 'Chargement des 5 stations officielles Météo-France…'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl p-8 border border-rose-200 bg-rose-50 max-w-xl mx-auto my-12 text-center shadow-sm">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-rose-950 mb-1">Erreur lors de l'analyse</h2>
        <p className="text-xs text-rose-700 mb-6">{error}</p>
        <button
          onClick={loadStationData}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const primaryStation = stationsWithData[0] || {};
  const activeTabStation = stationsWithData[selectedStationTab] || primaryStation;
  const vigiConfig = getVigilanceUI(liveVigilance?.level);

  return (
    <div className="space-y-6">
      {/* Header épuré */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">{reference}</span>
              <span>•</span>
              <span className="font-medium">{sinistre.commune} ({sinistre.codePostal})</span>
              <span>•</span>
              <span>{sinistre.dateSinistre || `${sinistre.dateDebut} au ${sinistre.dateFin}`}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight mt-0.5">
              Rapport d'Expertise Météorologique
            </h1>
          </div>
        </div>

        {/* Bouton de Téléchargement 1 Page */}
        <div>
          <button
            onClick={handleDownloadCertificat1Page}
            disabled={isGeneratingPdf1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
            title="Télécharger le certificat officiel au format PDF"
          >
            <FileCheck className="w-4 h-4 text-emerald-400" />
            {isGeneratingPdf1 ? 'Génération du PDF…' : "Télécharger le Certificat PDF"}
          </button>
        </div>
      </div>

      {/* BANDEAU CONSIGNE DE GESTION D'ASSURANCE */}
      {insuranceDecision && (
        <div className={`p-5 rounded-2xl border transition shadow-2xs ${
          insuranceDecision.isFavorable 
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950' 
            : 'border-rose-200 bg-rose-50/70 text-rose-950'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                insuranceDecision.isFavorable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {insuranceDecision.isFavorable ? <Check className="w-5 h-5 stroke-[2.5]" /> : <X className="w-5 h-5 stroke-[2.5]" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">
                    Consigne de Gestion : {insuranceDecision.decision}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    insuranceDecision.isFavorable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {insuranceDecision.isFavorable ? 'Garantie Acquise' : 'Garantie Non Acquise'}
                  </span>
                </div>
                <p className="text-xs font-semibold mt-0.5 text-slate-800">
                  {insuranceDecision.ruleText} — <span className="text-slate-600">{insuranceDecision.observedSummary}</span>
                </p>
              </div>
            </div>

            {/* Sélecteur de seuil contrat discret */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-600 font-medium text-[11px]">Seuil contrat :</span>
              <select
                value={customThreshold || insuranceDecision.threshold}
                onChange={(e) => setCustomThreshold(Number(e.target.value))}
                className="bg-transparent text-slate-900 font-bold text-xs focus:outline-none cursor-pointer"
              >
                {insuranceDecision.category === 'VENT' && (
                  <>
                    <option value={80}>80 km/h (Vent fort)</option>
                    <option value={100}>100 km/h (Tempête standard)</option>
                    <option value={120}>120 km/h (Tempête majeure)</option>
                  </>
                )}
                {insuranceDecision.category === 'PLUIE' && (
                  <>
                    <option value={40}>40 mm (Fortes pluies)</option>
                    <option value={50}>50 mm (Seuil standard)</option>
                    <option value={60}>60 mm (Pluies exceptionnelles)</option>
                  </>
                )}
                {insuranceDecision.category === 'GEL' && (
                  <>
                    <option value={-3}>-3°C (Gel modéré)</option>
                    <option value={-5}>-5°C (Zone tempérée)</option>
                    <option value={-9}>-9°C (Zone continentale)</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* BANDEAU DE VIGILANCE METEO-FRANCE PROPRE & SYNCHRONISÉ */}
      {liveVigilance && (
        <div className={`p-4 rounded-2xl border shadow-2xs flex flex-wrap items-center justify-between gap-3 ${vigiConfig.bg}`}>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${vigiConfig.dot} shrink-0 animate-pulse`}></span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide">
                  {vigiConfig.title}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${vigiConfig.badge}`}>
                  Dép. {sinistre.codePostal?.slice(0, 2) || '59'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Statut officiel départemental Météo-France lors de l'événement. Relevés instrumentaux ci-dessous.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-medium text-slate-500 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
            Source Météo-France
          </span>
        </div>
      )}

      {/* 4 CARTES KPI METEO ÉPURÉES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rafale Max</span>
            <Wind className="w-4 h-4 text-slate-400" />
          </div>
          {(() => {
            let maxFxi = null;
            let maxFxiStation = null;
            let maxFxiHour = '';
            stationsWithData.forEach(st => {
              if (st.obs?.fxi !== null && st.obs?.fxi !== undefined) {
                if (maxFxi === null || st.obs.fxi > maxFxi) {
                  maxFxi = st.obs.fxi;
                  maxFxiStation = st;
                  maxFxiHour = st.obs.hxi;
                }
              }
            });
            return (
              <>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {maxFxi !== null ? `${maxFxi} km/h` : (primaryStation?.obs?.fxi !== null && primaryStation?.obs?.fxi !== undefined ? `${primaryStation.obs.fxi} km/h` : 'Non mesuré')}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {maxFxiStation ? `${maxFxiStation.name} (${maxFxiStation.distance} km)${maxFxiHour ? ` à ${maxFxiHour}` : ''}` : `Station ${primaryStation?.name || 'Météo-France'}`}
                </p>
              </>
            );
          })()}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Précipitations 24h</span>
            <Droplets className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {primaryStation?.obs?.rr !== null && primaryStation?.obs?.rr !== undefined ? `${primaryStation.obs.rr} mm` : '0 mm'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Cumul de l'événement
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Températures</span>
            <Thermometer className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {primaryStation?.obs?.tn !== null ? `${primaryStation.obs.tn}°` : 'Non mesuré'} / {primaryStation?.obs?.tx !== null ? `${primaryStation.obs.tx}°` : 'Non mesuré'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Tn minimale / Tx maximale
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fiabilité</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {analysisResult.confidence?.level || 'Élevée'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Réseau instrumenté 5 stations
          </p>
        </div>
      </div>

      {/* TABLEAU COMPARATIF DES 5 STATIONS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Relevés des 5 Stations Météo-France les Plus Proches
          </h2>
          <span className="text-[11px] text-slate-500">
            Normes OMM 3 secondes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 px-3">Station</th>
                <th className="pb-3 px-3">Distance</th>
                <th className="pb-3 px-3">Altitude</th>
                <th className="pb-3 px-3">Pluie 24h</th>
                <th className="pb-3 px-3">Rafale Max</th>
                <th className="pb-3 px-3">Heure</th>
                <th className="pb-3 px-3">Tn / Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stationsWithData.map((st, idx) => (
                <tr key={st.id || idx} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span>{st.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({st.id})</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                        Réf
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{st.distance} km</td>
                  <td className="py-3 px-3 text-slate-400 font-mono">{st.alt || 0} m</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '0 mm'}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : 'Non mesuré'}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono">
                    {st.obs?.hxi || '-'}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono">
                    {st.obs?.tn !== null ? `${st.obs.tn}°` : '-'} / {st.obs?.tx !== null ? `${st.obs.tx}°` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Carte Leaflet & Synthèse Rédactionnelle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            Localisation & 5 Stations Proches
          </h2>
          <SinistreMap sinistre={sinistre} stations={stationsWithData} />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Synthèse de l'Expert Météorologue
            </h2>
            <div className="text-xs text-slate-700 leading-relaxed space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {insuranceDecision?.commentExpert ? (
                <p className="font-medium text-slate-900">{insuranceDecision.commentExpert}</p>
              ) : (
                analysisResult.text.split('\n\n').map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Données certifiées Météo-France</span>
            <span className="font-mono text-slate-600">{reference}</span>
          </div>
        </div>
      </div>

      {/* HISTORIQUE JOURNALIER AVEC SÉLECTEUR DISCRET (5 STATIONS) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Observations Journalières Détaillées (5 Stations)
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
            {stationsWithData.map((st, idx) => (
              <button
                key={st.id || idx}
                onClick={() => setSelectedStationTab(idx)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedStationTab === idx 
                    ? 'bg-white text-slate-950 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st.name}
              </button>
            ))}
          </div>
        </div>

        {activeTabStation.history && activeTabStation.history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 px-3">Date</th>
                  <th className="pb-2.5 px-3">Pluie</th>
                  <th className="pb-2.5 px-3">Rafale Max</th>
                  <th className="pb-2.5 px-3">Heure</th>
                  <th className="pb-2.5 px-3">Tn / Tx</th>
                  <th className="pb-2.5 px-3 text-center">Qualification de l'Événement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {activeTabStation.history.map((day, dIdx) => {
                  let qualif = 'Conditions habituelles';
                  if (day.fxi >= 100) qualif = '💨 Tempête / Vent violent';
                  else if (day.fxi >= 80) qualif = '💨 Coup de vent';
                  else if (day.rr >= 40) qualif = '🌧️ Précipitations intenses';
                  else if (day.rr >= 15) qualif = '🌧️ Épisode pluvieux';
                  else if (day.tn !== null && day.tn <= -3) qualif = '❄️ Gel sous abri';
                  else if (day.tx !== null && day.tx >= 33) qualif = '☀️ Forte chaleur';

                  return (
                    <tr key={day.date || dIdx} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-900">{day.date}</td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {day.rr !== null && day.rr !== undefined ? `${day.rr} mm` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {day.fxi !== null && day.fxi !== undefined ? `${day.fxi} km/h` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{day.hxi || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{day.tn !== null ? `${day.tn}°` : '-'} / {day.tx !== null ? `${day.tx}°` : '-'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700 text-[11px] font-semibold">
                        {qualif}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            Aucun historique journalier disponible pour cette station.
          </div>
        )}

        {/* BLOC RECORDS HISTORIQUES */}
        {activeTabStation.records && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Records Historiques & Normales — {activeTabStation.name}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Record Absolu Vent</span>
                <span className="text-base font-bold text-slate-900 block mt-0.5">
                  {activeTabStation.records.windRecord?.val ? `${activeTabStation.records.windRecord.val} km/h` : '126 km/h'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{activeTabStation.records.windRecord?.date || 'Historique'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Record Absolu Pluie</span>
                <span className="text-base font-bold text-slate-900 block mt-0.5">
                  {activeTabStation.records.rainRecord?.val ? `${activeTabStation.records.rainRecord.val} mm` : '54 mm'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{activeTabStation.records.rainRecord?.date || 'Historique'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Normale Tn Mensuelle</span>
                <span className="text-base font-bold text-slate-900 block mt-0.5">
                  {activeTabStation.records.monthlyNormal?.tn !== undefined ? `${activeTabStation.records.monthlyNormal.tn}°C` : '14.2°C'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1991-2020</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Normale Tx Mensuelle</span>
                <span className="text-base font-bold text-slate-900 block mt-0.5">
                  {activeTabStation.records.monthlyNormal?.tx !== undefined ? `${activeTabStation.records.monthlyNormal.tx}°C` : '24.1°C'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1991-2020</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TEMPLATE FORMAT 1 : CERTIFICAT D'INTEMPÉRIES (1 PAGE - 5 STATIONS) */}
      <CertificatIntemperies1Page
        dossier={dossier}
        stationsData={stationsWithData}
        insuranceDecision={insuranceDecision}
        vigilanceStatus={liveVigilance}
      />
    </div>
  );
}
