import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, ArrowLeft, RefreshCw, AlertCircle, Wind, Droplets, 
  Sun, Thermometer, ShieldCheck, CheckCircle2, MapPin, Calendar, Clock,
  Trophy, History, Award, AlertTriangle
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
  const [analysisResult, setAnalysisResult] = useState({ text: '', kpis: [] });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedStationTab, setSelectedStationTab] = useState(0);
  const [liveVigilance, setLiveVigilance] = useState({ level: 'Jaune', aleas: ['Orages', 'Vent violent'] });

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

      // 2. Interrogation vigilance
      const dept = sinistre.codePostal ? sinistre.codePostal.slice(0, 2) : '59';
      try {
        const vigi = await vigilanceArchiveService.fetchLiveOrArchivedVigilance(dept, start);
        if (vigi) {
          setLiveVigilance(vigi);
        } else {
          // Fallback contextuel selon sinistre
          const isWind = claimType.toLowerCase().includes('vent') || claimType.toLowerCase().includes('orage');
          setLiveVigilance({
            level: isWind ? 'Jaune' : 'Vert',
            aleas: isWind ? ['Orages / Rafales'] : ['Phénomènes normaux']
          });
        }
      } catch (e) {
        console.warn(e);
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
            tx: maxTx
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
            obs: { date: start, rr: null, fxi: null, tn: null, tx: null },
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isGeneratingPdf ? 'Génération du PDF…' : 'Télécharger le Rapport PDF'}
          </button>
        </div>
      </div>

      {/* BANDEAU DE VIGILANCE METEO-FRANCE RESTAURE */}
      {liveVigilance && liveVigilance.level && liveVigilance.level !== 'Vert' && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl ${
          liveVigilance.level === 'Rouge'
            ? 'bg-rose-950/60 border-rose-600 text-rose-200'
            : liveVigilance.level === 'Orange'
            ? 'bg-amber-950/60 border-amber-600 text-amber-200'
            : 'bg-yellow-950/40 border-yellow-500/60 text-yellow-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {liveVigilance.level === 'Rouge' ? '🔴' : liveVigilance.level === 'Orange' ? '🟠' : '🟡'}
            </span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <span>Vigilance {liveVigilance.level.toLowerCase()} — {liveVigilance.aleas?.join(', ') || 'Conditions Surveillées'}</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-yellow-500/20 text-yellow-300 font-mono">
                  Dép. {sinistre.codePostal ? sinistre.codePostal.slice(0, 2) : '59'}
                </span>
              </h4>
              <p className="text-[11px] opacity-80 mt-0.5">
                Information départementale de contexte Météo-France. Les mesures locales de rafales et de précipitations figurent ci-dessous.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 shrink-0">
            Source : Météo-France
          </span>
        </div>
      )}

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonne Gauche : Carte & Synthèse */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Carte Haute Définition */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Cartographie des 3 Stations de Référence</span>
                <span className="text-xs font-mono text-slate-400">Ratio 3:2</span>
              </h2>
              <SinistreMap sinistre={sinistre} stations={stationsWithData} />
            </div>

            {/* Analyse Technique */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Analyse & Synthèse des Conditions Observées
              </h2>
              <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                {analysisResult.text ? (
                  analysisResult.text.split('\n\n').map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))
                ) : (
                  <p>Aucune analyse disponible.</p>
                )}
              </div>
            </div>
          </div>

          {/* Colonne Droite : KPIs, Observations & Records */}
          <div className="space-y-6">
            
            {/* KPIs */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
              <h2 className="text-sm font-bold text-white">Synthèse Météorologique</h2>
              <div className="grid grid-cols-2 gap-3">
                {analysisResult.kpis?.map((k, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                    <span className="text-lg block mb-1">{k.icon}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">{k.label}</span>
                    <span className="text-base font-black text-white block my-0.5">{k.val}</span>
                    <span className="text-[9px] text-slate-400 block truncate">{k.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Liste des 3 Stations */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Observations des Stations</h2>
                <span className="text-[11px] text-slate-400">Cliquez pour voir les records</span>
              </div>

              <div className="space-y-2">
                {stationsWithData.map((st, idx) => (
                  <button 
                    key={st.id || idx}
                    onClick={() => setSelectedStationTab(idx)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between text-xs ${
                      selectedStationTab === idx
                        ? 'bg-sky-950/50 border-sky-500/80 shadow-md shadow-sky-900/20'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <strong className="text-white block font-bold">#{idx + 1}. {st.name}</strong>
                      <span className="text-slate-400 font-mono text-[11px]">{st.distance} km • {st.id}</span>
                    </div>
                    <div className="text-right">
                      {st.obs?.fxi !== null ? (
                        <span className="font-bold text-rose-400 block">💨 {st.obs.fxi} km/h</span>
                      ) : (
                        <span className="text-slate-500 block">💨 N/D</span>
                      )}
                      {st.obs?.rr !== null ? (
                        <span className="font-bold text-cyan-400 block">🌧️ {st.obs.rr} mm</span>
                      ) : (
                        <span className="text-slate-500 block">🌧️ N/D</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Records Historiques & Normales */}
            {activeRecords && (
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Records Historiques — {activeStation?.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ouverte en {activeRecords.opened || '1970'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {/* Record Vent */}
                  <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
                      <Wind className="w-3 h-3 text-rose-400" /> Record Rafale
                    </span>
                    <span className="text-sm font-black text-rose-400 block">
                      {activeRecords.windRecord?.val ? `${activeRecords.windRecord.val} km/h` : 'N/D'}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      {activeRecords.windRecord?.date} {activeRecords.windRecord?.event ? `(${activeRecords.windRecord.event})` : ''}
                    </span>
                  </div>

                  {/* Record Pluie 24h */}
                  <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-cyan-400" /> Record Pluie 24h
                    </span>
                    <span className="text-sm font-black text-cyan-400 block">
                      {activeRecords.rain24Record?.val ? `${activeRecords.rain24Record.val} mm` : 'N/D'}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      {activeRecords.rain24Record?.date || 'Météo-France'}
                    </span>
                  </div>

                  {/* Record Chaleur Tx */}
                  <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" /> Record Chaleur (Tx)
                    </span>
                    <span className="text-sm font-black text-amber-400 block">
                      {activeRecords.txRecord?.val ? `${activeRecords.txRecord.val} °C` : 'N/D'}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      {activeRecords.txRecord?.date || 'Météo-France'}
                    </span>
                  </div>

                  {/* Record Froid Tn */}
                  <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/70 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-sky-400" /> Record Froid (Tn)
                    </span>
                    <span className="text-sm font-black text-sky-400 block">
                      {activeRecords.tnRecord?.val ? `${activeRecords.tnRecord.val} °C` : 'N/D'}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      {activeRecords.tnRecord?.date || 'Météo-France'}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight italic">
                  * Données climatiques de référence et normales issues des archives officielles Météo-France.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modèle PDF caché rendu pour html2canvas */}
      <PdfReportTemplate
        dossier={dossier}
        stationsData={stationsWithData}
        analysisResult={analysisResult}
        vigilanceStatus={liveVigilance}
      />
    </div>
  );
}
