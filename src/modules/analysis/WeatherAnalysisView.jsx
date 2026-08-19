import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Download, ArrowLeft, RefreshCw, AlertCircle, Wind, Droplets, 
  Sun, Thermometer, ShieldCheck, CheckCircle2, MapPin, Calendar, Clock
} from 'lucide-react';
import SinistreMap from '../map/SinistreMap';
import PdfReportTemplate from '../report/PdfReportTemplate';
import ConfidenceBadge from '../../components/common/ConfidenceBadge';
import { meteoFranceClimService } from '../../services/meteoFranceClimService';
import { weatherAnalysisEngine } from '../../services/weatherAnalysisEngine';
import { pdfGeneratorService } from '../../services/pdfGeneratorService';

export default function WeatherAnalysisView({ dossier, onBack, onUpdateDossier }) {
  const [loading, setLoading] = useState(true);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState(null);

  const [stationsWithData, setStationsWithData] = useState([]);
  const [analysisResult, setAnalysisResult] = useState({ text: '', confidence: {} });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' ou 'daily'

  const { sinistre = {}, assure = {}, reference = 'MCP-2026-XXXX' } = dossier || {};
  const isPeriod = sinistre.dateDebut && sinistre.dateFin && sinistre.dateDebut !== sinistre.dateFin;

  const loadStationData = async () => {
    setLoading(true);
    setError(null);
    setProgressMsg('Interrogation des 5 stations Météo-France…');

    try {
      const selected = dossier.selectedStations || [];
      const results = [];

      const start = sinistre.dateDebut || sinistre.dateSinistre;
      const end = sinistre.dateFin || sinistre.dateSinistre;

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

          // Calcul des agrégats pour la période (Rafale max, Cumul pluie, Tn min, Tx max)
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

          results.push({
            ...st,
            obs: summaryObs,
            history: history
          });
        } catch (e) {
          console.warn(`Erreur station ${st.name}:`, e);
          results.push({
            ...st,
            obs: { date: start, rr: null, fxi: null, tn: null, tx: null },
            history: []
          });
        }
      }

      setStationsWithData(results);

      // Génération de l'analyse automatique sur les 5 postes
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
    loadStationData();
  }, [dossier]);

  // Référence intelligente parmi les 5 postes
  const bestWindStation = useMemo(() => {
    return stationsWithData.find(s => s.obs?.fxi !== null && s.obs?.fxi !== undefined) || stationsWithData[0] || null;
  }, [stationsWithData]);

  const bestRainStation = useMemo(() => {
    return stationsWithData.find(s => s.obs?.rr !== null && s.obs?.rr !== undefined) || stationsWithData[0] || null;
  }, [stationsWithData]);

  const bestTempStation = useMemo(() => {
    return stationsWithData.find(s => s.obs?.tx !== null && s.obs?.tx !== undefined) || stationsWithData[0] || null;
  }, [stationsWithData]);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await pdfGeneratorService.generateSinistrePdf('pdf-report-container', `${reference}_${sinistre.commune || 'Rapport'}`);
      
      if (onUpdateDossier) {
        onUpdateDossier({
          ...dossier,
          status: 'Rapport généré'
        });
      }
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
          {/* Cartes KPI Météorologiques Clés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rafale Max */}
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

            {/* Précipitations */}
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

            {/* Températures */}
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

            {/* Fiabilité & Échantillonnage */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">Réseau 5 Stations</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-lg font-extrabold text-emerald-400">
                {analysisResult.confidence?.level || 'Élevée'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {analysisResult.confidence?.reason || '5 stations de référence Météo-France'}
              </p>
            </div>
          </div>

          {/* Tableau Comparatif des 5 Stations */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  {isPeriod ? `Bilan Comparatif de la Période (${sinistre.dateSinistre})` : 'Tableau Comparatif des 5 Stations Météo-France'}
                </h3>
                {isPeriod && <p className="text-xs text-slate-400 mt-0.5">Synthèse des cumuls et valeurs maximales observées</p>}
              </div>
              
              <div className="flex items-center gap-3">
                {isPeriod && (
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      onClick={() => setViewMode('summary')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${viewMode === 'summary' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Synthèse Période
                    </button>
                    <button
                      onClick={() => setViewMode('daily')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${viewMode === 'daily' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Détail Jour par Jour
                    </button>
                  </div>
                )}
                <ConfidenceBadge 
                  level={analysisResult.confidence?.level} 
                  score={analysisResult.confidence?.score} 
                  reason={analysisResult.confidence?.reason} 
                />
              </div>
            </div>

            {/* Vue Synthèse */}
            {viewMode === 'summary' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Station</th>
                      <th className="p-3.5 text-center">Distance</th>
                      <th className="p-3.5 text-center">Altitude</th>
                      <th className="p-3.5 text-center">{isPeriod ? 'Cumul Pluie' : 'Pluie 24h'}</th>
                      <th className="p-3.5 text-center">Rafale Max ({isPeriod ? 'Période' : 'OMM 3s'})</th>
                      <th className="p-3.5 text-center">Heure / Date Rafale</th>
                      <th className="p-3.5 text-center">Tn Min</th>
                      <th className="p-3.5 text-center">Tx Max</th>
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
                        <td className="p-3.5 text-center text-slate-400">{st.alt} m</td>
                        <td className="p-3.5 text-center font-bold text-cyan-400">
                          {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '-'}
                        </td>
                        <td className="p-3.5 text-center font-bold text-rose-400">
                          {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : (
                            <span className="text-slate-500 font-sans text-[10px]">Non équipé</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center text-slate-400">
                          {st.obs?.hxi ? `${st.obs.hxi} ${st.obs.maxGustDate ? `(${st.obs.maxGustDate.split('-')[2]})` : ''}` : '-'}
                        </td>
                        <td className="p-3.5 text-center text-sky-400">{st.obs?.tn !== null && st.obs?.tn !== undefined ? `${st.obs.tn}°` : '-'}</td>
                        <td className="p-3.5 text-center text-amber-400">{st.obs?.tx !== null && st.obs?.tx !== undefined ? `${st.obs.tx}°` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Vue Détail Quotidien si mode Période */}
            {viewMode === 'daily' && isPeriod && (
              <div className="p-4 space-y-4">
                {stationsWithData.map((st, i) => (
                  <div key={st.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h4 className="text-xs font-bold text-sky-400 mb-2 flex items-center justify-between">
                      <span>#{i+1} {st.name} ({st.id}) — {st.distance} km</span>
                      <span className="text-[11px] text-slate-400">{st.history?.length || 0} jours analysés</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead className="text-slate-500 uppercase border-b border-slate-800">
                          <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2 text-center">Pluie (mm)</th>
                            <th className="p-2 text-center">Rafale Max</th>
                            <th className="p-2 text-center">Heure</th>
                            <th className="p-2 text-center">Tn (°C)</th>
                            <th className="p-2 text-center">Tx (°C)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 font-mono">
                          {st.history?.map(d => (
                            <tr key={d.date} className="hover:bg-slate-800/40">
                              <td className="p-2 font-sans font-semibold text-slate-200">{d.date}</td>
                              <td className="p-2 text-center text-cyan-400 font-bold">{d.rr !== null ? `${d.rr}` : '-'}</td>
                              <td className="p-2 text-center text-rose-400 font-bold">{d.fxi !== null ? `${d.fxi} km/h` : '-'}</td>
                              <td className="p-2 text-center text-slate-400">{d.hxi || '-'}</td>
                              <td className="p-2 text-center text-sky-400">{d.tn !== null ? `${d.tn}°` : '-'}</td>
                              <td className="p-2 text-center text-amber-400">{d.tx !== null ? `${d.tx}°` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grille : Carte interactive Leaflet + Synthèse rédigée */}
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
      />
    </div>
  );
}
