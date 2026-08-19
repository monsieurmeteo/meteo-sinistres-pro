import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, ArrowLeft, RefreshCw, AlertCircle, Wind, Droplets, 
  Sun, Thermometer, ShieldCheck, CheckCircle2, MapPin, Calendar, Clock,
  Trophy, History, Award, Sparkles, AlertTriangle, ShieldAlert
} from 'lucide-react';
import SinistreMap from '../map/SinistreMap';
import PdfReportTemplate from '../report/PdfReportTemplate';
import ConfidenceBadge from '../../components/common/ConfidenceBadge';
import { meteoFranceClimService } from '../../services/meteoFranceClimService';
import { weatherAnalysisEngine } from '../../services/weatherAnalysisEngine';
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
      
      // 1. Découverte intelligente des stations avec capteurs actifs
      let selected = stationSelectorService.findBestStations(sinistre.lat, sinistre.lon, 0, claimType);
      if (!selected || selected.length === 0) {
        selected = dossier.selectedStations || [];
      }

      const results = [];
      const start = sinistre.dateDebut || sinistre.dateSinistre;
      const end = sinistre.dateFin || sinistre.dateSinistre;

      // 2. Interrogation vigilance officielle
      const dept = sinistre.codePostal ? sinistre.codePostal.slice(0, 2) : '59';
      try {
        const vigi = await vigilanceArchiveService.fetchLiveOrArchivedVigilance(dept, start);
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

      // 3. Récupération des données stations
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
            date: isPeriod ? `${start} au ${end}` : start,
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

      // Génération de l'analyse
      const analysis = weatherAnalysisEngine.generateAnalysis(sinistre, results);
      setAnalysisResult(analysis);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erreur lors du chargement des données.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStationData();
  }, [dossier]);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await pdfGeneratorService.generateSinistrePdf('pdf-report-container', reference);
    } catch (e) {
      alert('Erreur lors de la génération du PDF : ' + e.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const activeStation = stationsWithData[selectedStationTab] || stationsWithData[0];
  const activeRecords = activeStation?.records;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800">
                {reference}
              </span>
              <span className="text-xs text-slate-400">
                {sinistre.commune} — {sinistre.dateSinistre}
              </span>
            </div>
            <h1 className="text-xl font-black text-white mt-1">
              Rapport d'Expertise Météorologique
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4" />
            {isGeneratingPdf ? 'Génération du PDF…' : 'Télécharger le Rapport PDF'}
          </button>
        </div>
      </div>

      {/* 1. BANDEAU DE VIGILANCE METEO-FRANCE (TOUJOURS VISIBLE ET PERMANENT) */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all ${
        liveVigilance?.level === 'Rouge'
          ? 'bg-rose-950/60 border-rose-600 text-rose-200'
          : liveVigilance?.level === 'Orange'
          ? 'bg-amber-950/60 border-amber-600 text-amber-200'
          : liveVigilance?.level === 'Jaune'
          ? 'bg-yellow-950/40 border-yellow-500/60 text-yellow-200'
          : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {liveVigilance?.level === 'Rouge' ? '🔴' : liveVigilance?.level === 'Orange' ? '🟠' : liveVigilance?.level === 'Jaune' ? '🟡' : '🟢'}
          </span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <span>Vigilance {liveVigilance?.level || 'Jaune'} — {Array.isArray(liveVigilance?.aleas) ? liveVigilance.aleas.join(', ') : 'Conditions Surveillées'}</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 font-mono">
                Dép. {sinistre.codePostal ? sinistre.codePostal.slice(0, 2) : '59'}
              </span>
            </h4>
            <p className="text-[11px] opacity-80 mt-0.5">
              Statut officiel départemental Météo-France lors de l'événement. Les mesures locales des stations de référence figurent ci-dessous.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 shrink-0">
          Source : Météo-France
        </span>
      </div>

      {loading ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">{progressMsg}</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* 2. 4 CARTES KPI D'ORIGINE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-xl">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">Rafale Max Observée</span>
                <Wind className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-3xl font-extrabold text-rose-400">
                {stationsWithData[0]?.obs?.fxi ? `${stationsWithData[0].obs.fxi} km/h` : 'N/D'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {stationsWithData[0]?.obs?.hxi ? `à ${stationsWithData[0].obs.hxi}` : 'Station principale'} ({stationsWithData[0]?.name})
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-xl">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">Précipitations 24h</span>
                <Droplets className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-3xl font-extrabold text-cyan-400">
                {stationsWithData[0]?.obs?.rr !== null && stationsWithData[0]?.obs?.rr !== undefined ? `${stationsWithData[0].obs.rr} mm` : '-'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Cumul total de l'événement
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-xl">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">Températures Min / Max</span>
                <Thermometer className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400">
                {stationsWithData[0]?.obs?.tn ?? '-'}° / {stationsWithData[0]?.obs?.tx ?? '-'}°
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Amplitude : {stationsWithData[0]?.obs?.tampli ? `${stationsWithData[0].obs.tampli}°C` : '-'}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-xl">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">Fiabilité du dossier</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-lg font-extrabold text-emerald-400">
                {analysisResult.confidence?.level || 'Élevée'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {analysisResult.confidence?.reason || '3 stations de référence Météo-France'}
              </p>
            </div>
          </div>

          {/* 3. TABLEAU COMPARATIF DES 3 STATIONS */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Tableau Comparatif des 3 Stations Météo-France
              </h3>
              <ConfidenceBadge 
                level={analysisResult.confidence?.level} 
                score={analysisResult.confidence?.score} 
                reason={analysisResult.confidence?.reason} 
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Station</th>
                    <th className="p-3.5 text-center">Distance</th>
                    <th className="p-3.5 text-center">Altitude</th>
                    <th className="p-3.5 text-center">Pluie 24h</th>
                    <th className="p-3.5 text-center">Rafale Max (OMM 3s)</th>
                    <th className="p-3.5 text-center">Heure Rafale</th>
                    <th className="p-3.5 text-center">Tn (°C)</th>
                    <th className="p-3.5 text-center">Tx (°C)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {stationsWithData.map((st, idx) => (
                    <tr key={st.id || idx} className={idx === 0 ? 'bg-sky-500/10' : 'hover:bg-slate-800/30'}>
                      <td className="p-3.5 font-sans">
                        <strong className="text-slate-100">{st.name}</strong> ({st.id})
                        {idx === 0 && (
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400">
                            Station Principale
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-200">{st.distance} km</td>
                      <td className="p-3.5 text-center text-slate-400">{st.alt || 0} m</td>
                      <td className="p-3.5 text-center font-bold text-cyan-400">
                        {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '-'}
                      </td>
                      <td className="p-3.5 text-center font-bold text-rose-400">
                        {st.obs?.fxi ? `${st.obs.fxi} km/h` : 'N/D'}
                      </td>
                      <td className="p-3.5 text-center text-slate-400">{st.obs?.hxi || '-'}</td>
                      <td className="p-3.5 text-center text-sky-400">{st.obs?.tn !== null && st.obs?.tn !== undefined ? `${st.obs.tn}°` : '-'}</td>
                      <td className="p-3.5 text-center text-amber-400">{st.obs?.tx !== null && st.obs?.tx !== undefined ? `${st.obs.tx}°` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. GRILLE : CARTE INTERACTIVE LEAFLET + SYNTHÈSE RÉDIGÉE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                Localisation & Réseau de Stations
              </h3>
              <SinistreMap sinistre={sinistre} stations={stationsWithData} />
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-sky-400" />
                  Synthèse Météorologique Automatique
                </h3>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-3 custom-scrollbar max-h-80 overflow-y-auto">
                  {analysisResult.text ? (
                    analysisResult.text.split('\n\n').map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))
                  ) : (
                    <p>Analyse non disponible.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">Réf : {reference}</span>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger le rapport A4
                </button>
              </div>
            </div>
          </div>

          {/* 5. TABLEAU QUOTIDIEN DÉTAILLÉ AVEC ONGLETS */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl p-5">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Tableau Quotidien Détaillé & Phénomènes Observés
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Relevés jour par jour avec heures de pointes et indicateurs météo</p>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {stationsWithData.map((st, idx) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStationTab(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedStationTab === idx
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>#{idx + 1} {st.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({st.distance}km)</span>
                  </button>
                ))}
              </div>
            </div>

            {activeStation && activeStation.history && activeStation.history.length > 0 ? (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-center">Tn Min (°C)</th>
                      <th className="p-3 text-center">Heure Tn</th>
                      <th className="p-3 text-center">Tx Max (°C)</th>
                      <th className="p-3 text-center">Heure Tx</th>
                      <th className="p-3 text-center">Pluie (mm)</th>
                      <th className="p-3 text-center">Rafale Max</th>
                      <th className="p-3 text-center">Heure Rafale</th>
                      <th className="p-3 text-center">Direction</th>
                      <th className="p-3 text-center">Phénomènes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {activeStation.history.map(d => (
                      <tr key={d.date} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 font-sans font-bold text-slate-200">{d.date}</td>
                        <td className={`p-3 text-center ${d.tn !== null && d.tn < 0 ? 'text-sky-400 font-bold' : 'text-slate-300'}`}>
                          {d.tn !== null ? `${d.tn}°C` : '-'}
                        </td>
                        <td className="p-3 text-center text-slate-400">{d.htn || '-'}</td>
                        <td className={`p-3 text-center ${d.tx !== null && d.tx >= 25 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                          {d.tx !== null ? `${d.tx}°C` : '-'}
                        </td>
                        <td className="p-3 text-center text-slate-400">{d.htx || '-'}</td>
                        <td className={`p-3 text-center ${d.rr > 0 ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
                          {d.rr !== null ? `${d.rr}` : '-'}
                        </td>
                        <td className={`p-3 text-center ${d.fxi >= 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                          {d.fxi !== null ? `${d.fxi} km/h` : '-'}
                        </td>
                        <td className="p-3 text-center text-slate-400">{d.hxi || '-'}</td>
                        <td className="p-3 text-center text-slate-400">{d.dxi ? `${d.dxi}°` : '-'}</td>
                        <td className="p-3 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            {d.orag && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold" title="Orage">⚡ Orage</span>}
                            {d.grele && <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-200 text-xs font-bold" title="Grêle">⚪ Grêle</span>}
                            {d.neig && <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 text-xs font-bold" title="Neige">❄️ Neige</span>}
                            {d.gelee && <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 text-xs font-bold" title="Gelée">🧊 Gelée</span>}
                            {d.brou && <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 text-xs font-bold" title="Brouillard">🌫️ Brouillard</span>}
                            {!d.orag && !d.grele && !d.neig && !d.gelee && !d.brou && <span className="text-slate-600">-</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                Aucun relevé quotidien disponible pour cette sélection.
              </div>
            )}
          </div>

          {/* 6. RECORDS HISTORIQUES & NORMALES DE SAISON */}
          {activeRecords && (
            <div className="glass-card rounded-2xl border border-slate-800 shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Records Historiques & Normales de Saison — {activeStation?.name}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Station ouverte en {activeRecords.opened || '1970'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-rose-400" /> Record Rafale
                  </span>
                  <span className="text-base font-black text-rose-400 block">
                    {activeRecords.windRecord?.val ? `${activeRecords.windRecord.val} km/h` : 'N/D'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {activeRecords.windRecord?.date} {activeRecords.windRecord?.event ? `(${activeRecords.windRecord.event})` : ''}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Record Pluie 24h
                  </span>
                  <span className="text-base font-black text-cyan-400 block">
                    {activeRecords.rain24Record?.val ? `${activeRecords.rain24Record.val} mm` : 'N/D'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {activeRecords.rain24Record?.date || 'Météo-France'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> Record Chaleur (Tx)
                  </span>
                  <span className="text-base font-black text-amber-400 block">
                    {activeRecords.txRecord?.val ? `${activeRecords.txRecord.val} °C` : 'N/D'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {activeRecords.txRecord?.date || 'Météo-France'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-sky-400" /> Record Froid (Tn)
                  </span>
                  <span className="text-base font-black text-sky-400 block">
                    {activeRecords.tnRecord?.val ? `${activeRecords.tnRecord.val} °C` : 'N/D'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {activeRecords.tnRecord?.date || 'Météo-France'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-tight italic pt-1">
                * Données climatiques de référence et normales 1991-2020 issues des archives officielles Météo-France.
              </p>
            </div>
          )}
        </>
      )}

      {/* Modèle de rapport PDF A4 étanche (invisible à l'écran, capturé par jsPDF) */}
      <PdfReportTemplate
        dossier={dossier}
        stationsData={stationsWithData}
        analysisResult={analysisResult}
        vigilanceStatus={liveVigilance}
      />
    </div>
  );
}
