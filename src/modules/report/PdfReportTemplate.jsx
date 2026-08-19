import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function PdfReportTemplate({ dossier, stationsData = [], analysisResult = {}, vigilanceStatus = {} }) {
  const [qrUrl, setQrUrl] = useState('');

  const { assure = {}, sinistre = {}, reference = 'MCP-2026-XXXX' } = dossier || {};

  useEffect(() => {
    QRCode.toDataURL(`https://meteo-sinistres-pro.vercel.app/verification/${reference}`, { width: 100, margin: 1 })
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
  const isLightningClaim = claimType.includes('foudre') || claimType.includes('orage');
  const showWind = !claimType.includes('pluie') && !claimType.includes('gel') && !claimType.includes('chaleur');
  const showRain = !claimType.includes('gel') && !claimType.includes('chaleur');
  const showTemp = claimType.includes('gel') || claimType.includes('chaleur') || claimType.includes('orage') || (!claimType.includes('vent') && !claimType.includes('pluie'));

  // Formatage nom propre (Casse Mixte)
  const formatName = (str) => {
    if (!str) return '';
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const formattedAssureName = `${formatName(assure.prenom)} ${formatName(assure.nom)}`.trim();

  // Badge vigilance avec couleur exacte
  const getVigiStyle = (lvl) => {
    if (lvl === 'Rouge') return { icon: '🔴', text: 'text-rose-950', bg: 'bg-rose-50 border-rose-300' };
    if (lvl === 'Orange') return { icon: '🟠', text: 'text-amber-950', bg: 'bg-amber-50 border-amber-300' };
    if (lvl === 'Jaune') return { icon: '🟡', text: 'text-yellow-950', bg: 'bg-yellow-50 border-yellow-300' };
    return { icon: '🟢', text: 'text-emerald-950', bg: 'bg-emerald-50 border-emerald-300' };
  };

  const vigiStyle = vigilanceStatus ? getVigiStyle(vigilanceStatus.level) : null;

  return (
    <div id="pdf-report-container" className="bg-slate-100 text-slate-900 font-sans hidden print:block text-[9pt]">
      
      {/* ================= PAGE 1 ================= */}
      <div 
        id="pdf-page-1" 
        className="w-[210mm] h-[297mm] max-h-[297mm] p-[12mm_15mm] bg-white mx-auto flex flex-col justify-between relative overflow-hidden box-border shadow-md"
      >
        {isDraft && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 rotate-[-30deg]">
            <span className="text-7xl font-black text-rose-900 uppercase">DOCUMENT BROUILLON</span>
          </div>
        )}

        <div className="space-y-2.5">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-300">
            <div className="flex items-center gap-3">
              <img 
                src="/logo_meteo_climat_pro.png" 
                alt="Météo Climat PRO" 
                className="h-10 w-auto object-contain" 
              />
              <div className="border-l-2 border-slate-200 pl-3">
                <span className="text-[8.5pt] font-extrabold tracking-wider text-slate-900 uppercase block">
                  Analyse et Expertise Météorologique
                </span>
                <span className="text-[7pt] text-slate-500 font-medium">
                  Données météorologiques issues des réseaux d'observation Météo-France
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[7pt] uppercase font-bold text-slate-500 block">Référence du rapport</span>
              <span className="text-[9pt] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block">
                {reference}
              </span>
            </div>
          </div>

          {/* Titre Principal */}
          <div>
            <h1 className="text-[13.5pt] font-black tracking-tight text-slate-950 uppercase">
              Rapport Météorologique de Sinistre
            </h1>
            <p className="text-[8pt] text-slate-600 font-medium">
              Analyse des observations météorologiques à proximité du lieu déclaré
            </p>
          </div>

          {/* Fiches Assuré & Sinistre */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/80 text-[8pt] space-y-0.5">
              <h2 className="text-[7.5pt] font-bold uppercase tracking-wider text-sky-950 border-b border-slate-200 pb-0.5 mb-1">
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

            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/80 text-[8pt] space-y-0.5">
              <h2 className="text-[7.5pt] font-bold uppercase tracking-wider text-sky-950 border-b border-slate-200 pb-0.5 mb-1">
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

          {/* Contexte de Vigilance */}
          {vigilanceStatus && vigilanceStatus.level && vigilanceStatus.level !== 'Vert' && (
            <div className={`border rounded-lg p-2 text-[7.5pt] flex items-center justify-between ${vigiStyle?.bg}`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{vigiStyle?.icon}</span>
                <div>
                  <strong className={`block uppercase ${vigiStyle?.text}`}>
                    Vigilance {vigilanceStatus.level.toLowerCase()} — {vigilanceStatus.aleas?.join(', ') || 'Conditions surveillées'}
                  </strong>
                  <span className="text-[6.5pt] text-slate-600">
                    Information départementale de contexte. Les mesures locales figurent dans le présent rapport.
                  </span>
                </div>
              </div>
              <span className="text-[6.5pt] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                Source : Météo-France
              </span>
            </div>
          )}

          {/* Avertissement Foudre */}
          {isLightningClaim && (
            <div className="border border-sky-300 bg-sky-50/70 rounded-lg p-2 text-[7.5pt] flex items-center gap-2 text-sky-950">
              <span className="text-base">⚡</span>
              <p className="leading-tight">
                <strong>Précision méthodologique :</strong> Aucune donnée de détection de foudre n’est intégrée à ce rapport. Le présent document décrit uniquement les conditions météorologiques observées à proximité du lieu du sinistre et ne permet pas, à lui seul, de confirmer un impact direct de foudre.
              </p>
            </div>
          )}

          {/* Synthèse KPI Page 1 */}
          <div>
            <h2 className="text-[8pt] font-bold uppercase tracking-wider text-slate-800 mb-1 border-l-3 border-sky-700 pl-1.5">
              Synthèse Météorologique
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-center">
                  <span className="text-xs block mb-0.5">{kpi.icon}</span>
                  <span className="text-[6.5pt] font-bold text-slate-600 uppercase block truncate">{kpi.label}</span>
                  <span className="text-[11pt] font-black text-slate-950 block my-0.5 leading-none">{kpi.val}</span>
                  <span className="text-[6pt] text-slate-500 block truncate mt-1">{kpi.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grande Carte Haute Définition (Ratio strict 3:2, haute et non déformée) */}
          <div className="border border-slate-300 rounded-xl p-2 bg-white shadow-xs">
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-800">
                Cartographie des Stations de Référence
              </span>
              <span className="text-[6.5pt] font-mono text-slate-500">
                GPS : {sinistre.lat?.toFixed(4)}°N, {sinistre.lon?.toFixed(4)}°E
              </span>
            </div>

            <div className="w-full h-[280px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
              <img 
                id="pdf-map-snapshot-img" 
                alt="Carte des stations de référence" 
                className="w-full h-full object-cover"
              />
            </div>

            <div className="mt-1.5 text-center text-[7pt] text-slate-600 border-t border-slate-100 pt-1 font-medium">
              <strong>Stations de référence :</strong>{' '}
              {activeStations.map((s, i) => `${i+1}. ${s.name} (${s.distance} km)`).join('  •  ')}
            </div>
          </div>
        </div>

        {/* Footer Page 1 */}
        <div className="flex justify-between items-end pt-2 border-t border-slate-200 text-[7pt] text-slate-500">
          <div>
            <p><strong>Météo Climat PRO</strong> — Analyse et expertise météorologique</p>
            <p>Référence : {reference} • Version 1.0 • Édité le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          {qrUrl && (
            <div className="flex items-center gap-1.5">
              <div className="text-right">
                <span className="text-[6.5pt] font-bold text-slate-700 block">Vérifier ce rapport</span>
                <span className="text-[5.5pt] text-slate-400 font-mono">Authenticité & Traçabilité</span>
              </div>
              <img src={qrUrl} alt="QR Code" className="w-8 h-8 border border-slate-200 rounded p-0.5 bg-white" />
            </div>
          )}
        </div>
      </div>

      {/* ================= PAGE 2 ================= */}
      <div 
        id="pdf-page-2" 
        className="w-[210mm] h-[297mm] max-h-[297mm] p-[12mm_15mm] bg-white mx-auto flex flex-col justify-between relative overflow-hidden box-border shadow-md"
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-1">
            <span className="text-[8pt] font-bold text-sky-950 uppercase">Météo Climat PRO — Rapport {reference}</span>
            <span className="text-[7.5pt] text-slate-500">{sinistre.commune} — {sinistre.dateSinistre}</span>
          </div>

          {/* 1. Tableau détaillé des 3 stations */}
          <div>
            <h2 className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-800 mb-1 border-l-3 border-sky-700 pl-1.5">
              1. Observations Détaillées des Stations de Référence
            </h2>

            <table className="w-full border-collapse border border-slate-300 text-[8pt] shadow-xs">
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
                      <span className="text-[7pt] text-slate-500 font-mono ml-1">({st.id})</span>
                      {i === 0 && (
                        <span className="text-[6.5pt] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded ml-1 uppercase">
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
            <p className="text-[6.5pt] text-slate-500 mt-1 italic">
              * N/D : donnée non mesurée ou indisponible sur le poste à la date étudiée.
            </p>
          </div>

          {/* 2. Analyse et Synthèse Météorologique */}
          <div>
            <h2 className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-800 mb-1 border-l-3 border-sky-700 pl-1.5">
              2. Analyse et Synthèse des Conditions Observées
            </h2>
            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/80 text-[8pt] text-slate-800 leading-relaxed space-y-1">
              {analysisResult?.text ? (
                analysisResult.text.split('\n\n').map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))
              ) : (
                <p>Analyse météorologique en cours de traitement...</p>
              )}
            </div>
          </div>

          {/* 3. Conclusion Météorologique */}
          <div>
            <h2 className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-800 mb-1 border-l-3 border-sky-700 pl-1.5">
              3. Conclusion Météorologique
            </h2>
            <div className="border border-slate-200 rounded-lg p-2.5 bg-white text-[8pt] text-slate-800 leading-relaxed">
              <p>
                L'examen concordant des observations instrumentales met en évidence la réalité de l'événement météorologique déclaré à la date du <strong>{sinistre.dateSinistre || 'date déclarée'}</strong>. Les mesures issues des capteurs Météo-France fournissent une référence objective sur l'intensité des paramètres physiques observés à proximité du lieu du sinistre.
              </p>
            </div>
          </div>

          {/* 4. Limites de l'Analyse */}
          <div>
            <h2 className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-800 mb-1 border-l-3 border-sky-700 pl-1.5">
              4. Limites de l'Analyse
            </h2>
            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 text-[7pt] text-slate-600 leading-normal space-y-0.5">
              <p>
                Les observations présentées sont relevées à l'emplacement exact des stations météorologiques officielles. Des variations locales d'intensité peuvent survenir entre les postes de mesure et l'adresse précise du sinistre en fonction de la topographie locale, de l'environnement bâti et de la dynamique convective des phénomènes.
              </p>
            </div>
          </div>

          {/* 5. Sources et Méthodologie */}
          <div>
            <h2 className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-800 mb-1 border-l-3 border-sky-700 pl-1.5">
              5. Sources et Méthodologie
            </h2>
            <div className="border border-slate-200 rounded-lg p-2 bg-white text-[7pt] text-slate-600 space-y-0.5">
              <p>• <strong>Observations :</strong> Réseau officiel de stations automatiques Météo-France (normes OMM).</p>
              <p>• <strong>Localisation :</strong> Coordonnées géographiques établies à partir de l'adresse déclarée.</p>
              <p>• <strong>Sélection :</strong> Stations filtrées par disponibilité active des paramètres et distance directe.</p>
            </div>
          </div>
        </div>

        {/* Footer officiel page 2 */}
        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7pt] text-slate-500">
          <p>Météo Climat PRO — Dossier {reference}</p>
          <p className="font-bold">Page 2/2</p>
        </div>
      </div>
    </div>
  );
}
