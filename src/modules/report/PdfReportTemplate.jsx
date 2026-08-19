import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function PdfReportTemplate({ dossier, stationsData = [], analysisResult = {}, vigilanceStatus = {} }) {
  const [qrUrl, setQrUrl] = useState('');

  const { assure = {}, sinistre = {}, reference = 'MCP-2026-XXXX' } = dossier || {};

  useEffect(() => {
    QRCode.toDataURL(`https://meteo-sinistres-pro.vercel.app/verification/${reference}`, { width: 120, margin: 1 })
      .then(url => setQrUrl(url))
      .catch(e => console.error(e));
  }, [reference]);

  // Validation champs obligatoires
  const isDraft = !assure.nom || !sinistre.numSinistre || !sinistre.dateSinistre || !sinistre.commune;

  // 3 Stations de référence
  const activeStations = (stationsData || []).slice(0, 3);
  const kpis = analysisResult?.kpis || [];

  // Détection colonnes selon aléa
  const claimType = (sinistre.sinistreType || '').toLowerCase();
  const showWind = !claimType.includes('pluie') && !claimType.includes('gel') && !claimType.includes('chaleur');
  const showRain = !claimType.includes('gel') && !claimType.includes('chaleur');
  const showTemp = claimType.includes('gel') || claimType.includes('chaleur') || claimType.includes('orage') || (!claimType.includes('vent') && !claimType.includes('pluie'));

  // Formatage nom propre (Casse Mixte)
  const formatName = (str) => {
    if (!str) return '';
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const formattedAssureName = `${formatName(assure.prenom)} ${formatName(assure.nom)}`.trim();

  return (
    <div id="pdf-report-container" className="bg-white text-slate-900 font-sans p-8 max-w-[920px] mx-auto hidden print:block shadow-2xl leading-normal text-[10pt]">
      
      {/* ================= PAGE 1 : CADRAGE, SYNTHÈSE & CARTE ================= */}
      <div className="min-h-[1100px] flex flex-col justify-between border-b-2 border-slate-300 pb-6 mb-8 relative">
        
        {/* Filigrane Brouillon si incomplet */}
        {isDraft && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 rotate-[-30deg]">
            <span className="text-8xl font-black text-rose-900 uppercase">DOCUMENT BROUILLON</span>
          </div>
        )}

        <div>
          {/* 1. Header Sobre & Institutionnel */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-300">
            <div className="flex items-center gap-4">
              <img 
                src="/logo_meteo_climat_pro.png" 
                alt="Météo Climat PRO" 
                className="h-12 w-auto object-contain" 
              />
              <div className="border-l-2 border-slate-200 pl-3">
                <span className="text-[9pt] font-extrabold tracking-wider text-slate-900 uppercase block">
                  Analyse et Expertise Météorologique
                </span>
                <span className="text-[8pt] text-slate-500 font-medium">
                  Données météorologiques issues des réseaux d'observation Météo-France
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[8pt] uppercase font-bold text-slate-500 block">Référence du rapport</span>
              <span className="text-[10pt] font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 inline-block">
                {reference}
              </span>
            </div>
          </div>

          {/* 2. Titre Principal */}
          <div className="mt-4 mb-4">
            <h1 className="text-[16pt] font-black tracking-tight text-slate-950 uppercase">
              Rapport Météorologique de Sinistre
            </h1>
            <p className="text-[9pt] text-slate-600 font-medium">
              Analyse des observations météorologiques à proximité du lieu déclaré
            </p>
          </div>

          {/* 3. Blocs Assuré & Sinistre (Masquage automatique des lignes vides) */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Bloc Assuré */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 text-[9pt] space-y-1">
              <h2 className="text-[8.5pt] font-bold uppercase tracking-wider text-sky-950 border-b border-slate-200 pb-1 mb-1.5">
                Assuré
              </h2>
              {formattedAssureName && (
                <p><span className="text-slate-500">Nom & Prénom :</span> <strong className="text-slate-900">{formattedAssureName}</strong></p>
              )}
              {assure.societe && (
                <p><span className="text-slate-500">Société :</span> <strong className="text-slate-900">{assure.societe}</strong></p>
              )}
              {assure.compagnieAssurance && (
                <p><span className="text-slate-500">Compagnie d'assurance :</span> <strong className="text-slate-900">{assure.compagnieAssurance}</strong></p>
              )}
              {assure.numContrat && (
                <p><span className="text-slate-500">N° Contrat / Police :</span> <strong className="font-mono text-slate-900">{assure.numContrat}</strong></p>
              )}
            </div>

            {/* Bloc Sinistre */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 text-[9pt] space-y-1">
              <h2 className="text-[8.5pt] font-bold uppercase tracking-wider text-sky-950 border-b border-slate-200 pb-1 mb-1.5">
                Sinistre
              </h2>
              {sinistre.numSinistre && (
                <p><span className="text-slate-500">N° de sinistre :</span> <strong className="font-mono text-slate-900">{sinistre.numSinistre}</strong></p>
              )}
              {sinistre.sinistreType && (
                <p><span className="text-slate-500">Nature déclarée :</span> <strong className="text-sky-950">{sinistre.sinistreType}</strong></p>
              )}
              {sinistre.dateSinistre && (
                <p><span className="text-slate-500">Date :</span> <strong className="text-slate-900">{sinistre.dateSinistre}</strong></p>
              )}
              {sinistre.heureSinistre && (
                <p><span className="text-slate-500">Heure / Période :</span> <strong className="text-slate-900">{sinistre.heureSinistre}</strong></p>
              )}
              <p><span className="text-slate-500">Lieu :</span> <strong className="text-slate-900">{sinistre.adresseSinistre || sinistre.commune}</strong></p>
            </div>
          </div>

          {/* 4. Contexte de Vigilance (Affiché uniquement si vigilance active) */}
          {vigilanceStatus && vigilanceStatus.level && vigilanceStatus.level !== 'Vert' && (
            <div className="border border-amber-300 bg-amber-50/60 rounded-lg p-2.5 mb-4 text-[8.5pt] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{vigilanceStatus.level === 'Rouge' ? '🔴' : '🟠'}</span>
                <div>
                  <span className="font-bold text-amber-950 block uppercase">
                    Contexte de Vigilance : {vigilanceStatus.level} ({vigilanceStatus.aleas?.join(', ')})
                  </span>
                  <span className="text-[7.5pt] text-slate-600">
                    La vigilance constitue une information départementale de contexte. Les observations locales sont présentées ci-dessous.
                  </span>
                </div>
              </div>
              <span className="text-[7.5pt] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-amber-200">
                Source : Météo-France
              </span>
            </div>
          )}

          {/* 5. Synthèse Météorologique Immédiate (3-4 KPI majeurs) */}
          <div className="mb-4">
            <h2 className="text-[9pt] font-bold uppercase tracking-wider text-slate-800 mb-2 border-l-3 border-sky-700 pl-2">
              Synthèse Météorologique
            </h2>
            <div className="grid grid-cols-4 gap-2.5">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-center">
                  <span className="text-xs block mb-0.5">{kpi.icon}</span>
                  <span className="text-[7.5pt] font-bold text-slate-600 uppercase block truncate">{kpi.label}</span>
                  <span className="text-[12pt] font-black text-slate-950 block my-0.5">{kpi.val}</span>
                  <span className="text-[7pt] text-slate-500 block truncate">{kpi.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Grande Carte Géoréférencée (Ratio strict 16:9 / 3:2 préservé) */}
          <div className="border border-slate-300 rounded-xl p-2.5 bg-white shadow-xs">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <span className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-800">
                Cartographie des Stations de Référence
              </span>
              <span className="text-[7.5pt] font-mono text-slate-500">
                GPS : {sinistre.lat?.toFixed(4)}°N, {sinistre.lon?.toFixed(4)}°E
              </span>
            </div>

            <div className="w-full aspect-[16/9] max-h-[300px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
              <img 
                id="pdf-map-snapshot-img" 
                alt="Carte des stations de référence" 
                className="w-full h-full object-contain"
              />
            </div>

            {/* Ligne compacte des 3 stations sous la carte */}
            <div className="mt-2 text-center text-[8pt] text-slate-600 border-t border-slate-100 pt-1.5 font-medium">
              <strong>Stations de référence :</strong>{' '}
              {activeStations.map((s, i) => `${i+1}. ${s.name} (${s.distance} km)`).join('  •  ')}
            </div>
          </div>
        </div>

        {/* 7. Pied de page Page 1 + QR Code */}
        <div className="flex justify-between items-end pt-3 border-t border-slate-200 text-[8pt] text-slate-500">
          <div>
            <p><strong>Météo Climat PRO</strong> — Analyse et expertise météorologique</p>
            <p>Référence : {reference} • Version 1.0 • Édité le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          {qrUrl && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[7.5pt] font-bold text-slate-700 block">Vérifier ce rapport</span>
                <span className="text-[6.5pt] text-slate-400 font-mono">Authenticité & Traçabilité</span>
              </div>
              <img src={qrUrl} alt="QR Code" className="w-10 h-10 border border-slate-200 rounded p-0.5 bg-white" />
            </div>
          )}
        </div>
      </div>

      {/* ================= PAGE 2 : TABLEAU DÉTAILLÉ & SYNTHÈSE TECHNIQUE ================= */}
      <div className="min-h-[1100px] flex flex-col justify-between pt-2">
        <div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-4">
            <span className="text-[8.5pt] font-bold text-sky-950 uppercase">Météo Climat PRO — Rapport {reference}</span>
            <span className="text-[8pt] text-slate-500">{sinistre.commune} — {sinistre.dateSinistre}</span>
          </div>

          {/* 1. Tableau détaillé des 3 stations de référence */}
          <h2 className="text-[9pt] font-bold uppercase tracking-wider text-slate-800 mb-2 border-l-3 border-sky-700 pl-2">
            1. Observations Détaillées des Stations de Référence
          </h2>

          <table className="w-full border-collapse border border-slate-300 text-[8.5pt] mb-4 shadow-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="border border-slate-300 p-2 text-left">Station</th>
                <th className="border border-slate-300 p-2 text-center">Distance</th>
                {showRain && <th className="border border-slate-300 p-2 text-center">Précipitations</th>}
                {showWind && <th className="border border-slate-300 p-2 text-center">Rafale Max</th>}
                {showWind && <th className="border border-slate-300 p-2 text-center">Heure</th>}
                {showTemp && <th className="border border-slate-300 p-2 text-center">Tmin</th>}
                {showTemp && <th className="border border-slate-300 p-2 text-center">Tmax</th>}
              </tr>
            </thead>
            <tbody>
              {activeStations.map((st, i) => (
                <tr key={st.id || i} className={i === 0 ? 'bg-sky-50/60 font-semibold' : (i % 2 === 1 ? 'bg-slate-50/40' : '')}>
                  <td className="border border-slate-300 p-2">
                    <span className="text-slate-900 font-bold">{st.name}</span>
                    <span className="text-[7.5pt] text-slate-500 font-mono ml-1">({st.id})</span>
                    {i === 0 && (
                      <span className="text-[7pt] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded ml-1.5 uppercase">
                        Station Principale
                      </span>
                    )}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-700">{st.distance} km</td>
                  
                  {showRain && (
                    <td className="border border-slate-300 p-2 text-center text-slate-900 font-medium">
                      {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : 'N/D'}
                    </td>
                  )}

                  {showWind && (
                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-950">
                      {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : 'N/D'}
                    </td>
                  )}

                  {showWind && (
                    <td className="border border-slate-300 p-2 text-center font-mono text-slate-600">
                      {st.obs?.hxi || 'N/D'}
                    </td>
                  )}

                  {showTemp && (
                    <td className="border border-slate-300 p-2 text-center text-slate-800">
                      {st.obs?.tn !== null && st.obs?.tn !== undefined ? `${st.obs.tn} °C` : 'N/D'}
                    </td>
                  )}

                  {showTemp && (
                    <td className="border border-slate-300 p-2 text-center text-slate-800">
                      {st.obs?.tx !== null && st.obs?.tx !== undefined ? `${st.obs.tx} °C` : 'N/D'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[7pt] text-slate-500 mb-4 italic">
            * N/D : donnée non disponible pour la période étudiée.
          </p>

          {/* 2. Analyse et Synthèse Météorologique (100 à 150 mots) */}
          <h2 className="text-[9pt] font-bold uppercase tracking-wider text-slate-800 mb-2 border-l-3 border-sky-700 pl-2">
            2. Analyse et Synthèse des Conditions Observées
          </h2>
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/80 text-[8.5pt] text-slate-800 leading-relaxed space-y-2 mb-4">
            {analysisResult?.text ? (
              analysisResult.text.split('\n\n').map((p, idx) => (
                <p key={idx}>{p}</p>
              ))
            ) : (
              <p>Analyse météorologique en cours de traitement...</p>
            )}
          </div>

          {/* 3. Sources et Méthodologie */}
          <h2 className="text-[9pt] font-bold uppercase tracking-wider text-slate-800 mb-1.5 border-l-3 border-sky-700 pl-2">
            3. Sources et Méthodologie
          </h2>
          <div className="border border-slate-200 rounded-lg p-2.5 bg-white text-[7.5pt] text-slate-600 space-y-1">
            <p>• <strong>Observations météorologiques :</strong> données issues des réseaux d'observation officiels Météo-France.</p>
            <p>• <strong>Localisation :</strong> coordonnées géographiques calculées à partir de l'adresse du sinistre déclarée.</p>
            <p>• <strong>Sélection des stations :</strong> stations disposant des observations nécessaires, classées selon leur proximité et la complétude des données.</p>
            <p>• <strong>Distance :</strong> distance orthodromique directe entre le lieu du sinistre et chaque station.</p>
            <p>• <strong>Période étudiée :</strong> {sinistre.dateSinistre || 'date déclarée'}.</p>
          </div>
        </div>

        {/* Footer officiel page 2 */}
        <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[8pt] text-slate-500">
          <p>Météo Climat PRO — Dossier {reference}</p>
          <p className="font-bold">Page 2/2</p>
        </div>
      </div>
    </div>
  );
}
