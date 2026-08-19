import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, ArrowLeft, RefreshCw, AlertCircle, Wind, Droplets, 
  Sun, Thermometer, ShieldCheck, CheckCircle2, MapPin
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

  const { sinistre = {}, assure = {}, reference = 'MCP-2026-XXXX' } = dossier || {};

  const loadStationData = async () => {
    setLoading(true);
    setError(null);
    setProgressMsg('Interrogation des stations Météo-France…');

    try {
      const selected = dossier.selectedStations || [];
      const results = [];

      for (let i = 0; i < selected.length; i++) {
        const st = selected[i];
        setProgressMsg(`Récupération données ${st.name} (${i + 1}/${selected.length})…`);
        
        try {
          const history = await meteoFranceClimService.fetchStationHistory(
            st.id,
            sinistre.dateSinistre,
            sinistre.dateSinistre,
            (msg) => setProgressMsg(`${st.name} : ${msg}`)
          );

          const dayObs = history.find(h => h.date === sinistre.dateSinistre) || (history.length > 0 ? history[0] : null);

          results.push({
            ...st,
            obs: dayObs || {
              date: sinistre.dateSinistre,
              rr: null,
              fxi: null,
              tn: null,
              tx: null
            }
          });
        } catch (e) {
          console.warn(`Erreur station ${st.name}:`, e);
          results.push({
            ...st,
            obs: { date: sinistre.dateSinistre, rr: null, fxi: null, tn: null, tx: null }
          });
        }
      }

      setStationsWithData(results);

      // Génération de l'analyse automatique
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

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await pdfGeneratorService.generateSinistrePdf('pdf-report-container', `${reference}_${sinistre.commune || 'Rapport'}`);
      
      // Mettre à jour le statut du dossier
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
            {isGeneratingPdf ? 'Génération du PDF…' : 'Générer le Rapport PDF A4'}
          </button>
        </div>
      </div>

      {/* Chargement */}
      {loading && (
        <div className="glass-card rounded-2xl p-8 border border-sky-500/30 flex flex-col items-center justify-center gap-3 text-sky-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="text-sm font-semibold">{progressMsg || 'Interrogation Météo-France en cours…'}</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Cartes KPI Météorologiques Clés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">Rafale Max (OMM 3s)</span>
                <Wind className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-3xl font-extrabold text-rose-400">
                {stationsWithData[0]?.obs?.fxi ? `${stationsWithData[0].obs.fxi} km/h` : '-'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {stationsWithData[0]?.obs?.hxi ? `à ${stationsWithData[0].obs.hxi}` : 'Station principale'} ({stationsWithData[0]?.name})
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">Précipitations 24h</span>
                <Droplets className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-3xl font-extrabold text-cyan-400">
                {stationsWithData[0]?.obs?.rr !== null && stationsWithData[0]?.obs?.rr !== undefined ? `${stationsWithData[0].obs.rr} mm` : '-'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Cumul total de la journée
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
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

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-xs uppercase font-semibold">Fiabilité du dossier</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-lg font-extrabold text-emerald-400">
                {analysisResult.confidence?.level || 'Élevée'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {analysisResult.confidence?.reason || '3 stations de référence'}
              </p>
            </div>
          </div>

          {/* Tableau Comparatif des 3 Stations */}
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
                      <td className="p-3.5 text-center text-slate-400">{st.alt} m</td>
                      <td className="p-3.5 text-center font-bold text-cyan-400">
                        {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '-'}
                      </td>
                      <td className="p-3.5 text-center font-bold text-rose-400">
                        {st.obs?.fxi ? `${st.obs.fxi} km/h` : '-'}
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

          {/* Grille : Carte + Analyse rédigée */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Carte Leaflet */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                Localisation & Réseau de Stations
              </h3>
              <SinistreMap sinistre={sinistre} stations={stationsWithData} />
            </div>

            {/* Analyse météorologique rédigée */}
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
        </>
      )}

      {/* Modèle de rapport PDF (invisible à l'écran, capturé par jsPDF) */}
      <PdfReportTemplate
        dossier={dossier}
        stationsData={stationsWithData}
        analysisResult={analysisResult}
      />
    </div>
  );
}
