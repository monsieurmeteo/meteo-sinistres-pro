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
    setProgressMsg('Sélection de toutes les stations dans un rayon de 30 km…');

    try {
      const claimType = sinistre.sinistreType || '';
      
      // Sélection de TOUTES les stations dans un rayon de 30 km
      let selected = stationSelectorService.findBestStations(sinistre.lat, sinistre.lon, 0, claimType, 30);
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

  // Chargement réseau : uniquement quand le dossier change
  useEffect(() => {
    loadStationData();
  }, [dossier?.id]);

  // Recalcul local de la décision assurance (sans re-fetch) quand le seuil change
  useEffect(() => {
    if (stationsWithData.length === 0) return;
    const decision = insuranceDecisionEngine.evaluateClaim(sinistre, stationsWithData, customThreshold);
    setInsuranceDecision(decision);
  }, [customThreshold]);

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
        bg: 'bg-rose-100 border-2 border-rose-500 text-rose-950',
        dot: 'bg-rose-600 ring-4 ring-rose-300',
        badge: 'bg-rose-600 text-white font-black',
        title: "Vigilance Rouge — Phénomène d'une intensité exceptionnelle"
      };
    }
    if (lvl.includes('orange')) {
      return {
        bg: 'bg-orange-100 border-2 border-orange-500 text-orange-950',
        dot: 'bg-orange-600 ring-4 ring-orange-300',
        badge: 'bg-orange-600 text-white font-black',
        title: "Vigilance Orange — Phénomène très dangereux"
      };
    }
    if (lvl.includes('jaune')) {
      return {
        bg: 'bg-amber-100 border-2 border-amber-500 text-amber-950',
        dot: 'bg-amber-500 ring-4 ring-amber-300',
        badge: 'bg-amber-600 text-white font-black',
        title: "Vigilance Jaune — Phénomènes locaux habituels"
      };
    }
    return {
      bg: 'bg-emerald-100 border-2 border-emerald-500 text-emerald-950',
      dot: 'bg-emerald-600 ring-4 ring-emerald-300',
      badge: 'bg-emerald-700 text-white font-black',
      title: "Vigilance Verte — Pas de vigilance particulière"
    };
  };

  if (loading) {
    return (
      <div className="rounded-3xl p-12 text-center border-2 border-slate-300 bg-white max-w-xl mx-auto my-12 shadow-md">
        <RefreshCw className="w-10 h-10 text-sky-600 animate-spin mx-auto mb-4 stroke-[2.5]" />
        <h2 className="text-lg font-black text-slate-950 mb-1">Expertise Météorologique en cours</h2>
        <p className="text-xs text-slate-700 font-mono font-bold animate-pulse">{progressMsg || 'Scan des stations dans un rayon de 30 km…'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl p-8 border-2 border-rose-400 bg-rose-100 max-w-xl mx-auto my-12 text-center shadow-md">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3 stroke-[2.5]" />
        <h2 className="text-base font-black text-rose-950 mb-1">Erreur lors de l'analyse</h2>
        <p className="text-xs text-rose-900 mb-6 font-bold">{error}</p>
        <button
          onClick={loadStationData}
          className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-black text-white transition shadow-md cursor-pointer"
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
      {/* Header épuré & contrasté */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-slate-400 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-800">
              <span className="font-mono font-black text-sky-950 bg-sky-100 px-2.5 py-0.5 rounded border border-sky-300 shadow-2xs">{reference}</span>
              <span className="font-black text-slate-400">•</span>
              <span className="font-extrabold text-slate-950">{sinistre.commune} ({sinistre.codePostal})</span>
              <span className="font-black text-slate-400">•</span>
              <span className="font-extrabold text-slate-950">{sinistre.dateSinistre || `${sinistre.dateDebut} au ${sinistre.dateFin}`}</span>
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
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-black text-white shadow-md transition disabled:opacity-50 cursor-pointer transform hover:-translate-y-0.5"
            title="Télécharger le certificat officiel au format PDF"
          >
            <FileCheck className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            {isGeneratingPdf1 ? 'Génération du PDF…' : "Télécharger le Certificat PDF"}
          </button>
        </div>
      </div>

      {/* BANDEAU CONSIGNE DE GESTION D'ASSURANCE */}
      {insuranceDecision && (
        <div className={`p-5 rounded-2xl border-2 transition shadow-sm ${
          insuranceDecision.isFavorable 
            ? 'border-emerald-500 bg-emerald-100/90 text-emerald-950' 
            : 'border-rose-500 bg-rose-100/90 text-rose-950'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                insuranceDecision.isFavorable ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'
              }`}>
                {insuranceDecision.isFavorable ? <Check className="w-7 h-7 stroke-[3.5]" /> : <X className="w-7 h-7 stroke-[3.5]" />}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black uppercase tracking-wider text-slate-950">
                    Consigne de Gestion : {insuranceDecision.decision}
                  </span>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-md border uppercase tracking-wider shadow-xs ${
                    insuranceDecision.isFavorable ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-rose-600 text-white border-rose-700'
                  }`}>
                    {insuranceDecision.isFavorable ? 'Garantie Acquise' : 'Garantie Non Acquise'}
                  </span>
                </div>
                <p className="text-xs font-bold mt-1 text-slate-950">
                  {insuranceDecision.ruleText} — <span className="text-slate-900 font-extrabold">{insuranceDecision.observedSummary}</span>
                </p>
              </div>
            </div>

            {/* Sélecteur de seuil contrat discret et contrasté */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border-2 border-slate-400 text-xs shadow-xs">
              <Sliders className="w-4 h-4 text-sky-700" />
              <span className="text-slate-950 font-extrabold text-[11px]">Seuil contrat :</span>
              <select
                value={customThreshold || insuranceDecision.threshold}
                onChange={(e) => setCustomThreshold(Number(e.target.value))}
                className="bg-transparent text-slate-950 font-black text-xs focus:outline-none cursor-pointer"
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

      {/* BANDEAU DE VIGILANCE METEO-FRANCE */}
      {liveVigilance && (
        <div className={`p-4 rounded-2xl border-2 shadow-sm flex flex-wrap items-center justify-between gap-3 ${vigiConfig.bg}`}>
          <div className="flex items-center gap-3">
            <span className={`w-4 h-4 rounded-full ${vigiConfig.dot} shrink-0`}></span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-950">
                  {vigiConfig.title}
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded uppercase shadow-2xs ${vigiConfig.badge}`}>
                  Dép. {sinistre.codePostal?.slice(0, 2) || '59'}
                </span>
              </div>
              <p className="text-xs text-slate-900 font-bold mt-0.5">
                {liveVigilance.bulletinText || "Statut officiel Météo-France lors de l'événement. Relevés instrumentaux certifiés ci-dessous."}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-slate-950 bg-white px-3 py-1.5 rounded-lg border-2 border-slate-400 shadow-xs">
            {liveVigilance.source || "Source Météo-France"}
          </span>
        </div>
      )}

      {/* 4 CARTES KPI METEO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border-2 border-rose-300 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-950">Rafale Max (Rayon 30 km)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
              <Wind className="w-4 h-4 text-rose-700 stroke-[2.5]" />
            </div>
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
                <div className="text-3xl font-black text-rose-700 tracking-tight">
                  {maxFxi !== null ? `${maxFxi} km/h` : (primaryStation?.obs?.fxi !== null && primaryStation?.obs?.fxi !== undefined ? `${primaryStation.obs.fxi} km/h` : 'Non mesuré')}
                </div>
                <p className="text-xs text-slate-800 mt-1 font-extrabold truncate">
                  {maxFxiStation ? `${maxFxiStation.name} (${maxFxiStation.distance} km)${maxFxiHour ? ` à ${maxFxiHour}` : ''}` : `Station ${primaryStation?.name || 'Météo-France'}`}
                </p>
              </>
            );
          })()}
        </div>

        <div className="bg-white rounded-2xl p-5 border-2 border-sky-300 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-sky-950">Précipitations 24h</span>
            <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-sky-700 stroke-[2.5]" />
            </div>
          </div>
          {(() => {
            let maxRr = null;
            let maxRrStation = null;
            stationsWithData.forEach(st => {
              if (st.obs?.rr != null && (maxRr === null || st.obs.rr > maxRr)) {
                maxRr = st.obs.rr;
                maxRrStation = st;
              }
            });
            return (
              <>
                <div className="text-3xl font-black text-sky-700 tracking-tight">
                  {maxRr !== null ? `${maxRr} mm` : 'Non mesuré'}
                </div>
                <p className="text-xs text-slate-800 mt-1 font-extrabold truncate">
                  {maxRrStation ? `Max. sur ${maxRrStation.name} (${maxRrStation.distance} km)` : "Cumul total de l'événement"}
                </p>
              </>
            );
          })()}
        </div>

        <div className="bg-white rounded-2xl p-5 border-2 border-amber-300 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-950">Températures Extrêmes</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-amber-700 stroke-[2.5]" />
            </div>
          </div>
          {(() => {
            let minTn = null, maxTx = null, tnSt = null, txSt = null;
            stationsWithData.forEach(st => {
              if (st.obs?.tn != null && (minTn === null || st.obs.tn < minTn)) { minTn = st.obs.tn; tnSt = st; }
              if (st.obs?.tx != null && (maxTx === null || st.obs.tx > maxTx)) { maxTx = st.obs.tx; txSt = st; }
            });
            return (
              <>
                <div className="text-3xl font-black text-slate-950 tracking-tight">
                  {minTn != null ? `${minTn}°` : 'N/M'} / {maxTx != null ? `${maxTx}°` : 'N/M'}
                </div>
                <p className="text-xs text-slate-800 mt-1 font-extrabold truncate">
                  Tn min ({tnSt?.name || '—'}) / Tx max ({txSt?.name || '—'})
                </p>
              </>
            );
          })()}
        </div>

        <div className="bg-white rounded-2xl p-5 border-2 border-emerald-300 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-950">Couverture 30 km</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 tracking-tight">
            {stationsWithData.length} Stations
          </div>
          <p className="text-xs text-slate-800 mt-1 font-extrabold truncate">
            Réseau instrumenté &lt; 30 km
          </p>
        </div>
      </div>

      {/* TABLEAU DE TOUTES LES STATIONS DANS UN RAYON DE 30 KM */}
      <div className="bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-slate-200">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">
            Relevés de Toutes les Stations Météo-France dans un Rayon de 30 km ({stationsWithData.length} stations)
          </h2>
          <span className="text-xs font-black text-sky-950 bg-sky-100 px-2.5 py-0.5 rounded border border-sky-300">
            Normes OMM 3 secondes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-950 font-black uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Distance</th>
                <th className="py-3 px-3">Altitude</th>
                <th className="py-3 px-3">Pluie 24h</th>
                <th className="py-3 px-3">Rafale Max</th>
                <th className="py-3 px-3">Heure</th>
                <th className="py-3 px-3">Tn / Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {stationsWithData.map((st, idx) => (
                <tr key={st.id || idx} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-3 font-black text-slate-950 flex items-center gap-2">
                    <span className="text-sm">{st.name}</span>
                    <span className="text-[10px] text-slate-600 font-mono">({st.id})</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-black text-sky-950 bg-sky-200 px-1.5 py-0.5 rounded border border-sky-400 uppercase shadow-2xs">
                        Réf
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-extrabold text-slate-950">{st.distance} km</td>
                  <td className="py-3.5 px-3 text-slate-800 font-mono font-bold">{st.alt || 0} m</td>
                  <td className="py-3.5 px-3 font-black text-sky-800 text-sm">
                    {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '0 mm'}
                  </td>
                  <td className="py-3.5 px-3 font-black text-rose-700 text-sm">
                    {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : 'Non mesuré'}
                  </td>
                  <td className="py-3.5 px-3 text-slate-900 font-mono font-bold">
                    {st.obs?.hxi || '-'}
                  </td>
                  <td className="py-3.5 px-3 text-slate-950 font-black font-mono">
                    {st.obs?.tn != null ? `${st.obs.tn}°` : '-'} / {st.obs?.tx != null ? `${st.obs.tx}°` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Carte Leaflet & Synthèse Rédactionnelle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border-2 border-slate-300 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            Localisation & Stations dans un Rayon de 30 km
          </h2>
          <SinistreMap sinistre={sinistre} stations={stationsWithData} />
        </div>

        <div className="bg-white rounded-2xl p-5 border-2 border-slate-300 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              Synthèse de l'Expert Météorologue
            </h2>
            <div className="text-xs text-slate-950 leading-relaxed space-y-2 bg-slate-100/80 p-4 rounded-xl border-2 border-slate-300 font-medium">
              {insuranceDecision?.commentExpert ? (
                <p className="font-bold text-slate-950">{insuranceDecision.commentExpert}</p>
              ) : (
                analysisResult.text.split('\n\n').map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-slate-200 flex items-center justify-between text-xs text-slate-700 font-bold">
            <span>Données certifiées Météo-France</span>
            <span className="font-mono text-sky-950 font-black bg-sky-100 px-2 py-0.5 rounded border border-sky-300">{reference}</span>
          </div>
        </div>
      </div>

      {/* HISTORIQUE JOURNALIER AVEC SÉLECTEUR (RAYON 30 KM) */}
      <div className="bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              Observations Journalières Détaillées (Rayon 30 km)
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border-2 border-slate-300 flex-wrap">
            {stationsWithData.map((st, idx) => (
              <button
                key={st.id || idx}
                onClick={() => setSelectedStationTab(idx)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  selectedStationTab === idx 
                    ? 'bg-sky-600 text-white shadow-xs' 
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                }`}
              >
                {st.name} ({st.distance} km)
              </button>
            ))}
          </div>
        </div>

        {activeTabStation.history && activeTabStation.history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-950 font-black uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Pluie</th>
                  <th className="py-3 px-3">Rafale Max</th>
                  <th className="py-3 px-3">Heure</th>
                  <th className="py-3 px-3">Tn / Tx</th>
                  <th className="py-3 px-3 text-center">Qualification de l'Événement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {activeTabStation.history.map((day, dIdx) => {
                  let qualif = 'Conditions habituelles';
                  if (day.fxi >= 100) qualif = '💨 Tempête / Vent violent';
                  else if (day.fxi >= 80) qualif = '💨 Coup de vent';
                  else if (day.rr >= 40) qualif = '🌧️ Précipitations intenses';
                  else if (day.rr >= 15) qualif = '🌧️ Épisode pluvieux';
                  else if (day.tn !== null && day.tn <= -3) qualif = '❄️ Gel sous abri';
                  else if (day.tx !== null && day.tx >= 33) qualif = '☀️ Forte chaleur';

                  return (
                    <tr key={day.date || dIdx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-black text-slate-950">{day.date}</td>
                      <td className="py-3 px-3 text-sky-900 font-black text-xs">
                        {day.rr !== null && day.rr !== undefined ? `${day.rr} mm` : '-'}
                      </td>
                      <td className="py-3 px-3 font-black text-rose-700 text-xs">
                        {day.fxi !== null && day.fxi !== undefined ? `${day.fxi} km/h` : '-'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{day.hxi || '-'}</td>
                      <td className="py-3 px-3 font-mono font-black text-slate-950">{day.tn != null ? `${day.tn}°` : '-'} / {day.tx != null ? `${day.tx}°` : '-'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-slate-950 font-black text-xs bg-slate-100 px-3 py-1 rounded-md border-2 border-slate-300 inline-block shadow-2xs">
                          {qualif}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-600 text-xs font-bold">
            Aucun historique journalier disponible pour cette station.
          </div>
        )}

        {/* BLOC RECORDS HISTORIQUES */}
        {(() => {
          const tabRec = stationRecordsService.getRecords(activeTabStation.id, activeTabStation.name, sinistre.codePostal?.slice(0, 2) || '59');
          return (
            <div className="mt-6 pt-5 border-t-2 border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Records Historiques & Normales Météo-France — {activeTabStation.name} <span className="text-xs text-sky-950 font-mono font-bold bg-sky-100 px-2 py-0.5 rounded border border-sky-300">({activeTabStation.id})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white border-2 border-rose-300 shadow-xs">
                  <span className="text-xs text-rose-950 uppercase font-black block">Record Absolu Vent</span>
                  <span className="text-2xl font-black text-rose-700 block mt-1">
                    {tabRec.windRecord?.val != null ? `${tabRec.windRecord.val} km/h` : 'Non archivé'}
                  </span>
                  <span className="text-xs text-slate-700 font-bold block mt-0.5">{tabRec.windRecord?.date || 'Historique'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border-2 border-sky-300 shadow-xs">
                  <span className="text-xs text-sky-950 uppercase font-black block">Record Absolu Pluie 24h</span>
                  <span className="text-2xl font-black text-sky-700 block mt-1">
                    {tabRec.rainRecord?.val != null ? `${tabRec.rainRecord.val} mm` : 'Non archivé'}
                  </span>
                  <span className="text-xs text-slate-700 font-bold block mt-0.5">{tabRec.rainRecord?.date || 'Historique'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border-2 border-indigo-300 shadow-xs">
                  <span className="text-xs text-indigo-950 uppercase font-black block">Normale Tn Mensuelle</span>
                  <span className="text-2xl font-black text-indigo-900 block mt-1">
                    {tabRec.monthlyNormal?.tn != null ? `${tabRec.monthlyNormal.tn}°C` : 'Non archivé'}
                  </span>
                  <span className="text-xs text-slate-700 font-bold block mt-0.5">Normale 1991-2020</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border-2 border-amber-300 shadow-xs">
                  <span className="text-xs text-amber-950 uppercase font-black block">Normale Tx Mensuelle</span>
                  <span className="text-2xl font-black text-amber-800 block mt-1">
                    {tabRec.monthlyNormal?.tx != null ? `${tabRec.monthlyNormal.tx}°C` : 'Non archivé'}
                  </span>
                  <span className="text-xs text-slate-700 font-bold block mt-0.5">Normale 1991-2020</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* TEMPLATE FORMAT 1 : CERTIFICAT D'INTEMPÉRIES (1 PAGE - RAYON 30 KM) */}
      <CertificatIntemperies1Page
        dossier={dossier}
        stationsData={stationsWithData}
        insuranceDecision={insuranceDecision}
        vigilanceStatus={liveVigilance}
      />
    </div>
  );
}
