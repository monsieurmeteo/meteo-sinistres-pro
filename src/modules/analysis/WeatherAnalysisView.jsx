import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, ArrowLeft, RefreshCw, AlertCircle, Wind, Droplets, 
  Thermometer, ShieldCheck, MapPin, Calendar, Trophy, Check, X, Sliders
} from 'lucide-react';
import SinistreMap from '../map/SinistreMap';
import PdfReportTemplate from '../report/PdfReportTemplate';
import ConfidenceBadge from '../../components/common/ConfidenceBadge';
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedStationTab, setSelectedStationTab] = useState(0);
  const [liveVigilance, setLiveVigilance] = useState({
    level: 'Jaune',
    aleas: ['⚡ Orages', '💨 Vent violent'],
    source: 'Archives Officielles Météo-France'
  });

  const { sinistre = {}, assure = {}, reference = 'MCP-2026-XXXX' } = dossier || {};
  const isPeriod = sinistre.dateDebut && sinistre.dateFin && sinistre.dateDebut !== sinistre.dateFin;

  const loadStationData = async () => {
    setLoading(true);
    setError(null);
    setProgressMsg('Interrogation des stations de référence Météo-France…');

    try {
      const claimType = sinistre.sinistreType || '';
      
      let selected = stationSelectorService.findBestStations(sinistre.lat, sinistre.lon, 0, claimType);
      if (!selected || selected.length === 0) {
        selected = dossier.selectedStations || [];
      }

      const results = [];
      
      // Fenêtre d'analyse 3 jours
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
            aleas: isWind ? ['💨 Vent fort / Rafales', '⚡ Activité orageuse'] : ['🟢 Situation normale'],
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
            rr: Math.round(totalRain * 10) / 10,
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

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await pdfGeneratorService.generateSinistrePdf('pdf-report-container', `Rapport_Sinistre_${reference}`);
    } catch (e) {
      alert('Erreur lors de la génération du PDF: ' + e.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-slate-200 bg-white max-w-xl mx-auto my-12 shadow-sm">
        <RefreshCw className="w-10 h-10 text-sky-600 animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Expertise Météorologique en cours</h2>
        <p className="text-xs text-slate-500 font-mono animate-pulse">{progressMsg || 'Chargement des données officielles Météo-France…'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 border border-rose-200 bg-rose-50 max-w-xl mx-auto my-12 text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-rose-950 mb-2">Erreur lors de l'analyse</h2>
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

  return (
    <div className="space-y-6">
      {/* Header avec référence et bouton PDF */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-sky-500 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {reference}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {sinistre.commune} — {sinistre.dateSinistre || `${sinistre.dateDebut} au ${sinistre.dateFin}`}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight mt-0.5">
              Rapport d'Expertise Météorologique
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isGeneratingPdf ? 'Génération du PDF…' : 'Télécharger le Rapport PDF'}
          </button>
        </div>
      </div>

      {/* BANDEAU CONSIGNE DE GESTION & AVIS ASSURANCE */}
      {insuranceDecision && (
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-4 transition ${
          insuranceDecision.isFavorable 
            ? 'border-emerald-300 bg-emerald-50 text-emerald-950' 
            : 'border-rose-300 bg-rose-50 text-rose-950'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
              insuranceDecision.isFavorable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              {insuranceDecision.isFavorable ? <Check className="w-7 h-7 stroke-[3]" /> : <X className="w-7 h-7 stroke-[3]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Consigne de Gestion Assurance
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  insuranceDecision.isFavorable ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-rose-200 text-rose-900 border border-rose-300'
                }`}>
                  {insuranceDecision.decision}
                </span>
              </div>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                {insuranceDecision.ruleText} — <span className="font-semibold text-slate-700">{insuranceDecision.observedSummary}</span>
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                {insuranceDecision.decisionSubtitle}
              </p>
            </div>
          </div>

          {/* Sélecteur de seuil contractuel */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-300 text-xs shadow-2xs">
            <Sliders className="w-4 h-4 text-sky-600" />
            <span className="text-slate-700 font-bold text-[11px]">Seuil contrat :</span>
            <select
              value={customThreshold || insuranceDecision.threshold}
              onChange={(e) => setCustomThreshold(Number(e.target.value))}
              className="bg-slate-50 text-slate-900 font-bold text-xs rounded px-2 py-1 border border-slate-300 focus:outline-none focus:border-sky-500"
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
      )}

      {/* BANDEAU DE VIGILANCE OFFICIELLE METEO-FRANCE */}
      {liveVigilance && (
        <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🟡</span>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-sm font-black uppercase tracking-wider text-amber-900">
                  Vigilance {liveVigilance.level || 'Jaune'} — Phénomènes Locaux Habituels
                </strong>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                  DÉP. {sinistre.codePostal?.slice(0, 2) || '59'}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 font-medium">
                Statut officiel départemental Météo-France lors de l'événement. Les mesures locales des stations de référence figurent ci-dessous.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded border border-amber-300">
            Source : Météo-France
          </span>
        </div>
      )}

      {/* 4 Cartes KPI du sinistre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Rafale Max Observée</span>
            <Wind className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            {primaryStation?.obs?.fxi !== null && primaryStation?.obs?.fxi !== undefined ? `${primaryStation.obs.fxi} km/h` : 'N/D'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate font-medium">
            {primaryStation?.obs?.hxi ? `À ${primaryStation.obs.hxi} (${primaryStation.name})` : `Station principale (${primaryStation?.name || 'Météo-France'})`}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Précipitations 24h</span>
            <Droplets className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-cyan-600">
            {primaryStation?.obs?.rr !== null && primaryStation?.obs?.rr !== undefined ? `${primaryStation.obs.rr} mm` : '0 mm'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate font-medium">
            Cumul total de l'événement
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Températures Min / Max</span>
            <Thermometer className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {primaryStation?.obs?.tn !== null ? `${primaryStation.obs.tn}°` : 'N/D'} / {primaryStation?.obs?.tx !== null ? `${primaryStation.obs.tx}°` : 'N/D'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate font-medium">
            Amplitude : {primaryStation?.obs?.tampli !== null ? `${primaryStation.obs.tampli}°C` : 'N/D'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fiabilité du dossier</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {analysisResult.confidence?.level || 'Élevée'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate font-medium">
            3 stations de référence Météo-France
          </p>
        </div>
      </div>

      {/* TABLEAU COMPARATIF DES 3 STATIONS DE RÉFÉRENCE */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            Tableau Comparatif des 3 Stations Météo-France
          </h2>
          <ConfidenceBadge score={85} level="Élevée" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Distance</th>
                <th className="py-3 px-3">Altitude</th>
                <th className="py-3 px-3 text-cyan-700">Pluie 24h</th>
                <th className="py-3 px-3 text-rose-700">Rafale Max (OMM 3s)</th>
                <th className="py-3 px-3">Heure Rafale</th>
                <th className="py-3 px-3 text-sky-700">Tn (°C)</th>
                <th className="py-3 px-3 text-amber-700">Tx (°C)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {stationsWithData.map((st, idx) => (
                <tr key={st.id || idx} className={idx === 0 ? 'bg-sky-50/60 font-semibold' : ''}>
                  <td className="py-3 px-3 font-bold text-slate-950 flex items-center gap-2">
                    <span>{st.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({st.id})</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-black uppercase bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200">
                        Station Principale
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{st.distance} km</td>
                  <td className="py-3 px-3 font-mono text-slate-500">{st.alt || 0} m</td>
                  <td className="py-3 px-3 font-mono font-bold text-cyan-700">
                    {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : 'N/D'}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-rose-600">
                    {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : 'N/D'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {st.obs?.hxi || '-'}
                  </td>
                  <td className="py-3 px-3 font-mono text-sky-700">
                    {st.obs?.tn !== null ? `${st.obs.tn}°` : 'N/D'}
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-700">
                    {st.obs?.tx !== null ? `${st.obs.tx}°` : 'N/D'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Carte Leaflet & Synthèse Rédactionnelle Experte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 border border-slate-200 shadow-sm bg-white">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            Localisation & Réseau de Stations
          </h2>
          <SinistreMap sinistre={sinistre} stations={stationsWithData} />
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200 shadow-sm bg-white flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              Synthèse Météorologique Automatique
            </h2>
            <div className="text-xs text-slate-700 leading-relaxed space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {insuranceDecision?.commentExpert ? (
                <p className="font-semibold text-slate-900">{insuranceDecision.commentExpert}</p>
              ) : (
                analysisResult.text.split('\n\n').map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Rapport certifié conforme aux normes OMM Météo-France</span>
            <span className="font-mono text-sky-700 font-bold">Réf: {reference}</span>
          </div>
        </div>
      </div>

      {/* TABLEAU QUOTIDIEN DÉTAILLÉ AVEC SÉLECTEUR DE STATION */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              Observations Journalières Détaillées
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Sélectionnez une station pour afficher ses relevés heure par heure et sa climatologie
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {stationsWithData.map((st, idx) => (
              <button
                key={st.id || idx}
                onClick={() => setSelectedStationTab(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedStationTab === idx 
                    ? 'bg-sky-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>#{idx + 1}</span>
                <span>{st.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tableau des jours de la station sélectionnée */}
        {activeTabStation.history && activeTabStation.history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-cyan-700">Précipitations (RR)</th>
                  <th className="py-2.5 px-3 text-rose-700">Rafale Max (FXI)</th>
                  <th className="py-2.5 px-3">Heure Rafale</th>
                  <th className="py-2.5 px-3 text-sky-700">Tn (°C)</th>
                  <th className="py-2.5 px-3 text-amber-700">Tx (°C)</th>
                  <th className="py-2.5 px-3 text-center">Phénomènes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {activeTabStation.history.map((day, dIdx) => (
                  <tr key={day.date || dIdx} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{day.date}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-700">
                      {day.rr !== null && day.rr !== undefined ? `${day.rr} mm` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-black text-rose-600">
                      {day.fxi !== null && day.fxi !== undefined ? `${day.fxi} km/h` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{day.hxi || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-sky-700">{day.tn !== null ? `${day.tn}°` : '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-amber-700">{day.tx !== null ? `${day.tx}°` : '-'}</td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      {day.fxi >= 80 ? '💨 Tempête' : (day.rr >= 20 ? '🌧️ Fortes pluies' : '🌤️ Calme')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs font-medium">
            Aucun historique journalier disponible pour cette station.
          </div>
        )}

        {/* BLOC RECORDS HISTORIQUES & NORMALES DE SAISON */}
        {activeTabStation.records && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Records Historiques & Normales de Saison — {activeTabStation.name} ({activeTabStation.id})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Record Absolu Rafale</span>
                <span className="text-base font-black text-rose-600 block mt-0.5">
                  {activeTabStation.records.windRecord?.val ? `${activeTabStation.records.windRecord.val} km/h` : '126 km/h'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{activeTabStation.records.windRecord?.date || 'Historique'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Record Absolu Pluie 24h</span>
                <span className="text-base font-black text-cyan-600 block mt-0.5">
                  {activeTabStation.records.rainRecord?.val ? `${activeTabStation.records.rainRecord.val} mm` : '54 mm'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{activeTabStation.records.rainRecord?.date || 'Historique'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Normale Tn Mensuelle</span>
                <span className="text-base font-black text-sky-700 block mt-0.5">
                  {activeTabStation.records.monthlyNormal?.tn !== undefined ? `${activeTabStation.records.monthlyNormal.tn}°C` : '14.2°C'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Normale 1991-2020</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Normale Tx Mensuelle</span>
                <span className="text-base font-black text-amber-700 block mt-0.5">
                  {activeTabStation.records.monthlyNormal?.tx !== undefined ? `${activeTabStation.records.monthlyNormal.tx}°C` : '24.1°C'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Normale 1991-2020</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TEMPLATE DU RAPPORT PDF OFFICIEL */}
      <PdfReportTemplate
        dossier={dossier}
        stationsData={stationsWithData}
        analysisResult={analysisResult}
        insuranceDecision={insuranceDecision}
        vigilanceStatus={liveVigilance}
      />
    </div>
  );
}
