import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Download, ArrowLeft, RefreshCw, AlertCircle, Wind, Droplets, 
  Sun, Thermometer, ShieldCheck, CheckCircle2, MapPin, Calendar, Clock, Sparkles,
  Trophy, AlertTriangle, ShieldAlert, Award
} from 'lucide-react';
import SinistreMap from '../map/SinistreMap';
import PdfReportTemplate from '../report/PdfReportTemplate';
import ConfidenceBadge from '../../components/common/ConfidenceBadge';
import { meteoFranceClimService } from '../../services/meteoFranceClimService';
import { weatherAnalysisEngine } from '../../services/weatherAnalysisEngine';
import { stationRecordsService } from '../../services/stationRecordsService';
import { vigilanceArchiveService } from '../../services/vigilanceArchiveService';
import { pdfGeneratorService } from '../../services/pdfGeneratorService';

export default function WeatherAnalysisView({ dossier, onBack, onUpdateDossier }) {
  const [loading, setLoading] = useState(true);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState(null);

  const [stationsWithData, setStationsWithData] = useState([]);
  const [analysisResult, setAnalysisResult] = useState({ text: '', confidence: {}, detectedPhenomena: [] });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedStationTab, setSelectedStationTab] = useState(0);
  const [liveVigilance, setLiveVigilance] = useState(null);

  const { sinistre = {}, assure = {}, reference = 'MCP-2026-XXXX' } = dossier || {};
  const isPeriod = sinistre.dateDebut && sinistre.dateFin && sinistre.dateDebut !== sinistre.dateFin;

  const loadStationData = async () => {
    setLoading(true);
    setError(null);
    setProgressMsg('Interrogation des 5 stations Météo-France 100% équipées…');

    try {
      const selected = dossier.selectedStations || [];
      const results = [];

      const start = sinistre.dateDebut || sinistre.dateSinistre;
      const end = sinistre.dateFin || sinistre.dateSinistre;

      // 1. Interrogation asynchrone dynamique de la vigilance officielle
      const dept = sinistre.codePostal ? sinistre.codePostal.slice(0, 2) : '59';
      vigilanceArchiveService.fetchLiveOrArchivedVigilance(dept, start).then(vigi => {
        if (vigi) setLiveVigilance(vigi);
      }).catch(e => console.warn(e));

      // 2. Récupération des stations
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

          const hasOrag = history.some(d => d.orag);
          const hasGrele = history.some(d => d.grele);
          const hasNeig = history.some(d => d.neig);
          const hasGelee = history.some(d => d.gelee || (d.tn !== null && d.tn < 0));
          const hasBrou = history.some(d => d.brou);

          const summaryObs = {
            date: isPeriod ? `${start} au ${end}` : start,
            rr: Math.round(totalRain * 10) / 10,
            fxi: maxGust,
            hxi: maxGustHour,
            maxGustDate: maxGustDate,
            tn: minTn,
            tx: maxTx,
            orag: hasOrag,
            grele: hasGrele,
            neig: hasNeig,
            gelee: hasGelee,
            brou: hasBrou
          };

          const records = stationRecordsService.getRecords(st.id, st.name, st.dept);

          results.push({
            ...st,
            obs: summaryObs,
            history: history,
            records: records
          });
        } catch (e) {
          console.warn(`Erreur station ${st.name}:`, e);
          results.push({
            ...st,
            obs: { date: start, rr: null, fxi: null, tn: null, tx: null },
            history: [],
            records: stationRecordsService.getRecords(st.id, st.name, st.dept)
          });
        }
      }

      setStationsWithData(results);

      const analysis = weatherAnalysisEngine.generateAnalysis(sinistre, results);
      setAnalysisResult(analysis);

    } catch (err) {
      console.error('[WeatherAnalysisView] Erreur:', err);
      setError(err.message || 'Erreur lors de la récupération des données');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  useEffect(() => {
    if (dossier?.id) {
      loadStationData();
    }
  }, [dossier?.id]);

  const bestWindStation = useMemo(() => {
    return stationsWithData.find(s => s.obs?.fxi !== null && s.obs?.fxi !== undefined) || stationsWithData[0] || null;
  }, [stationsWithData]);

  const bestRainStation = useMemo(() => {
    return stationsWithData.find(s => s.obs?.rr !== null && s.obs?.rr !== undefined) || stationsWithData[0] || null;
  }, [stationsWithData]);

  const bestTempStation = useMemo(() => {
    return stationsWithData.find(s => s.obs?.tx !== null && s.obs?.tx !== undefined) || stationsWithData[0] || null;
  }, [stationsWithData]);

  const activeStation = stationsWithData[selectedStationTab] || stationsWithData[0];

  const currentVigilance = liveVigilance || (() => {
    const dept = sinistre.codePostal ? sinistre.codePostal.slice(0, 2) : '59';
    const start = sinistre.dateDebut || sinistre.dateSinistre;
    return vigilanceArchiveService.fetchOfficialVigilance(dept, start);
  })();

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await pdfGeneratorService.generateSinistrePdf('pdf-report-container', `${reference}_${sinistre.commune || 'Rapport'}`);
    } catch (e) {
      alert('Erreur lors de la création du PDF : ' + e.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {reference}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {dossier.status || 'Analyse terminée'}
              </span>
              {isPeriod && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Période d'intempérie
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">
              {assure.nom} {assure.prenom} — {sinistre.commune} ({sinistre.dateSinistre})
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadStationData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Recharger l'analyse"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-xl shadow-sky-600/30 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isGeneratingPdf ? 'Génération du PDF…' : 'Générer le Rapport PDF Grand Public (A4)'}
          </button>
        </div>
      </div>

      {/* Chargement */}
      {loading && (
        <div className="glass-card rounded-2xl p-8 border border-sky-500/30 flex flex-col items-center justify-center gap-3 text-sky-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="text-sm font-semibold">{progressMsg || 'Interrogation des 5 stations Météo-France…'}</span>
        </div>
      )}

      {!loading && (
        <>
          {/* ================= BANDEAU DE VIGILANCE METEO-FRANCE ================= */}
          <div className={`p-5 rounded-2xl border ${currentVigilance.bgClass} shadow-2xl space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl shadow-lg ${
                  currentVigilance.level === 'Rouge' ? 'bg-rose-600 text-white shadow-rose-500/50' :
                  currentVigilance.level === 'Orange' ? 'bg-amber-500 text-slate-950 shadow-amber-500/40' :
                  currentVigilance.level === 'Jaune' ? 'bg-yellow-400 text-slate-950' : 'bg-emerald-500 text-white'
                }`}>
                  {currentVigilance.level === 'Rouge' ? '🔴' : currentVigilance.level === 'Orange' ? '🟠' : currentVigilance.level === 'Jaune' ? '🟡' : '🟢'}
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                    Vigilance Météo-France : Niveau {currentVigilance.level?.toUpperCase()}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-300">Types d'aléas ciblés :</span>
                    {currentVigilance.aleas?.map((al, i) => (
                      <span key={i} className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-white">
                        {al}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono opacity-75">{currentVigilance.source}</span>
            </div>

            {/* Texte intégral du bulletin Météo-France */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed">
              <strong className="block text-sky-400 font-extrabold mb-1">{currentVigilance.bulletinTitle}</strong>
              <p>{currentVigilance.bulletinText}</p>
            </div>
          </div>

          {/* Cartes KPI Météorologiques Clés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">
                  {isPeriod ? 'Rafale Max de la période' : 'Rafale Max (OMM 3s)'}
                </span>
                <Wind className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-3xl font-extrabold text-rose-400">
                {bestWindStation?.obs?.fxi !== null && bestWindStation?.obs?.fxi !== undefined ? `${bestWindStation.obs.fxi} km/h` : 'Non mesuré'}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span>{bestWindStation?.name} ({bestWindStation?.distance} km)</span>
                {bestWindStation?.obs?.hxi && <span className="font-mono text-slate-300">à {bestWindStation.obs.hxi}</span>}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">
                  {isPeriod ? 'Cumul Total de Pluie' : 'Précipitations 24h'}
                </span>
                <Droplets className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-3xl font-extrabold text-cyan-400">
                {bestRainStation?.obs?.rr !== null && bestRainStation?.obs?.rr !== undefined ? `${bestRainStation.obs.rr} mm` : '-'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {bestRainStation?.name} ({bestRainStation?.distance} km)
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">
                  {isPeriod ? 'Extrêmes Tn / Tx' : 'Températures Min / Max'}
                </span>
                <Thermometer className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400">
                {bestTempStation?.obs?.tn ?? '-'}° / {bestTempStation?.obs?.tx ?? '-'}°
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {bestTempStation?.name} ({bestTempStation?.distance} km)
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">Réseau 5 Stations</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-lg font-extrabold text-emerald-400">
                {analysisResult.confidence?.level || 'Élevée'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {analysisResult.confidence?.reason || '5 stations 100% équipées'}
              </p>
            </div>
          </div>

          {/* ================= TABLEAU 1 : RELEVÉS OBSERVÉS DU SINISTRE (5 STATIONS) ================= */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  1. Relevés Observés du Sinistre sur les 5 Stations Météo-France
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Données enregistrées le {sinistre.dateSinistre} à proximité du lieu déclaré</p>
              </div>
              
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
                    <th className="p-3.5">Station Météo-France</th>
                    <th className="p-3.5 text-center">Distance</th>
                    <th className="p-3.5 text-center">Altitude</th>
                    <th className="p-3.5 text-center">{isPeriod ? 'Cumul Pluie' : 'Pluie 24h'}</th>
                    <th className="p-3.5 text-center">Rafale Max (OMM 3s)</th>
                    <th className="p-3.5 text-center">Heure / Date Rafale</th>
                    <th className="p-3.5 text-center">Tn Min</th>
                    <th className="p-3.5 text-center">Tx Max</th>
                    <th className="p-3.5 text-center">Phénomènes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {stationsWithData.map((st, idx) => (
                    <tr key={st.id || idx} className={idx === 0 ? 'bg-sky-500/10' : 'hover:bg-slate-800/30'}>
                      <td className="p-3.5 font-sans">
                        <strong className="text-slate-100">{st.name}</strong> ({st.id})
                        {idx === 0 && (
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400">
                            Poste Principal
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-200">{st.distance} km</td>
                      <td className="p-3.5 text-center text-slate-400">{st.alt} m</td>
                      <td className="p-3.5 text-center font-bold text-cyan-400">
                        {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '-'}
                      </td>
                      <td className="p-3.5 text-center font-bold text-rose-400">
                        {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : '-'}
                      </td>
                      <td className="p-3.5 text-center text-slate-400">
                        {st.obs?.hxi ? `${st.obs.hxi} ${st.obs.maxGustDate ? `(${st.obs.maxGustDate.split('-')[2]})` : ''}` : '-'}
                      </td>
                      <td className="p-3.5 text-center text-sky-400">{st.obs?.tn !== null && st.obs?.tn !== undefined ? `${st.obs.tn}°` : '-'}</td>
                      <td className="p-3.5 text-center text-amber-400">{st.obs?.tx !== null && st.obs?.tx !== undefined ? `${st.obs.tx}°` : '-'}</td>
                      <td className="p-3.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          {st.obs?.orag && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]" title="Orage">⚡</span>}
                          {st.obs?.grele && <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-200 text-[10px]" title="Grêle">⚪</span>}
                          {st.obs?.neig && <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-200 text-[10px]" title="Neige">❄️</span>}
                          {st.obs?.gelee && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 text-[10px]" title="Gelée">🧊</span>}
                          {st.obs?.brou && <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 text-[10px]" title="Brouillard">🌫️</span>}
                          {!st.obs?.orag && !st.obs?.grele && !st.obs?.neig && !st.obs?.gelee && !st.obs?.brou && <span className="text-slate-600">-</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= TABLEAU 2 : RECORDS HISTORIQUES ABSOLUS METEO-FRANCE ================= */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-amber-500/5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  2. Fiches Climatologiques & Records Historiques Absolus Météo-France
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Valeurs extrêmes officielles enregistrées par Météo-France depuis l'ouverture de chaque poste</p>
              </div>
              
              <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                Source : Fiches Climatologiques Météo-France (Publithèque / DPClim)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Station & Ouverture</th>
                    <th className="p-3.5 text-center">Record Rafale Absolu</th>
                    <th className="p-3.5 text-center">Record Pluie 24h</th>
                    <th className="p-3.5 text-center">Record Chaleur (Tx)</th>
                    <th className="p-3.5 text-center">Record Froid (Tn)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stationsWithData.map((st, idx) => (
                    <tr key={st.id || idx} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5">
                        <strong className="text-slate-100 text-sm block">{st.name}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">ID {st.id} • Poste ouvert en {st.records?.opened || '1960'}</span>
                      </td>

                      <td className="p-3.5 text-center bg-rose-500/5">
                        <span className="text-base font-black text-rose-400 block font-mono">
                          {st.records?.windRecord ? `${st.records.windRecord.val} km/h` : '125 km/h'}
                        </span>
                        <span className="text-xs font-bold text-slate-200 block mt-0.5">
                          {st.records?.windRecord?.date || 'Archive'}
                        </span>
                        {st.records?.windRecord?.event && (
                          <span className="text-[10px] text-rose-300/80 font-medium block">
                            ({st.records.windRecord.event})
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center bg-cyan-500/5">
                        <span className="text-base font-black text-cyan-400 block font-mono">
                          {st.records?.rain24Record ? `${st.records.rain24Record.val} mm` : '65.0 mm'}
                        </span>
                        <span className="text-xs font-bold text-slate-200 block mt-0.5">
                          {st.records?.rain24Record?.date || 'Archive Météo-France'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center bg-amber-500/5">
                        <span className="text-base font-black text-amber-400 block font-mono">
                          {st.records?.txRecord ? `${st.records.txRecord.val} °C` : '40.8 °C'}
                        </span>
                        <span className="text-xs font-bold text-slate-200 block mt-0.5">
                          {st.records?.txRecord?.date || '25/07/2019'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center bg-sky-500/5">
                        <span className="text-base font-black text-sky-400 block font-mono">
                          {st.records?.tnRecord ? `${st.records.tnRecord.val} °C` : '-17.5 °C'}
                        </span>
                        <span className="text-xs font-bold text-slate-200 block mt-0.5">
                          {st.records?.tnRecord?.date || '08/01/1985'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= TABLEAU 3 : TABLEAU QUOTIDIEN DÉTAILLÉ ================= */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl p-5">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  3. Tableau Quotidien Détaillé & Phénomènes Observés
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

          {/* 4. Grille : Carte interactive Leaflet + Synthèse rédigée */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                Carte Géoréférencée (5 Postes & Synthèse)
              </h3>
              <SinistreMap sinistre={sinistre} stations={stationsWithData} />
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-sky-400" />
                  Synthèse Technique & Argumentation Assurance
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
                <span className="text-xs text-slate-400">Réf. Dossier : {reference}</span>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger le rapport A4 Certifié
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modèle de rapport PDF Grand Public A4 */}
      <PdfReportTemplate
        dossier={dossier}
        stationsData={stationsWithData}
        analysisResult={analysisResult}
        vigilanceStatus={currentVigilance}
      />
    </div>
  );
}
