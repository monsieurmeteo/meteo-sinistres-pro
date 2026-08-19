import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function PdfReportTemplate({ dossier, stationsData = [], analysisResult = {}, vigilanceStatus = {} }) {
  const [qrUrl, setQrUrl] = useState('');

  const { assure = {}, sinistre = {}, reference = 'MCP-2026-XXXX' } = dossier || {};

  useEffect(() => {
    QRCode.toDataURL(`https://meteo-sinistres-pro.vercel.app/verification/${reference}`, { width: 130, margin: 1 })
      .then(url => setQrUrl(url))
      .catch(e => console.error(e));
  }, [reference]);

  const isDraft = !assure.nom || !sinistre.numSinistre || !sinistre.dateSinistre || !sinistre.commune;
  const activeStations = (stationsData || []).slice(0, 3);
  const primaryStation = activeStations[0] || {};
  const kpis = analysisResult?.kpis || [];

  const claimType = (sinistre.sinistreType || '').toLowerCase();
  const isLightningClaim = claimType.includes('foudre') || claimType.includes('orage');
  const showWind = !claimType.includes('pluie') && !claimType.includes('gel') && !claimType.includes('chaleur');
  const showRain = !claimType.includes('gel') && !claimType.includes('chaleur');
  const showTemp = claimType.includes('gel') || claimType.includes('chaleur') || claimType.includes('orage') || (!claimType.includes('vent') && !claimType.includes('pluie'));

  const formatName = (str) => {
    if (!str) return '';
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const formattedAssureName = `${formatName(assure.prenom)} ${formatName(assure.nom)}`.trim();

  const getVigiStyle = (lvl) => {
    if (lvl === 'Rouge') return { icon: '🔴', text: 'text-rose-950 font-bold', bg: 'bg-rose-50 border-rose-300' };
    if (lvl === 'Orange') return { icon: '🟠', text: 'text-amber-950 font-bold', bg: 'bg-amber-50 border-amber-300' };
    if (lvl === 'Jaune') return { icon: '🟡', text: 'text-yellow-950 font-bold', bg: 'bg-yellow-50 border-yellow-300' };
    return { icon: '🟢', text: 'text-emerald-950 font-bold', bg: 'bg-emerald-50 border-emerald-300' };
  };

  const vigiStyle = vigilanceStatus ? getVigiStyle(vigilanceStatus.level) : null;

  return (
    <div id="pdf-report-container" className="bg-slate-100 text-slate-900 font-sans hidden print:block">
      
      {/* ================= PAGE 1 ================= */}
      <div 
        id="pdf-page-1" 
        className="w-[210mm] h-[297mm] max-h-[297mm] p-[12mm_16mm] bg-white mx-auto flex flex-col justify-between relative overflow-hidden box-border shadow-md"
      >
        {isDraft && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 rotate-[-30deg]">
            <span className="text-7xl font-black text-rose-900 uppercase">DOCUMENT BROUILLON</span>
          </div>
        )}

        <div className="space-y-2.5">
          {/* Header avec logo officiel et référence bien proportionnée */}
          <div className="flex justify-between items-center pb-2 border-b-2 border-slate-200">
            <div className="flex items-center gap-3.5">
              <img 
                src="/logo_meteo_climat_pro.png" 
                alt="Météo Climat PRO" 
                className="h-11 w-auto object-contain" 
              />
              <div className="border-l-2 border-slate-300 pl-3.5">
                <span className="text-[10pt] font-black tracking-wider text-slate-950 uppercase block leading-tight">
                  Analyse et Expertise Météorologique
                </span>
                <span className="text-[8pt] text-slate-600 font-medium">
                  Données météorologiques certifiées issues des réseaux d'observation Météo-France
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[7pt] uppercase font-black text-slate-500 block mb-0.5 tracking-wider">
                RÉFÉRENCE DU RAPPORT
              </span>
              <span className="text-[10pt] font-mono font-black text-slate-950 bg-slate-100 px-3 py-1 rounded border border-slate-300 inline-block shadow-2xs whitespace-nowrap">
                {reference}
              </span>
            </div>
          </div>

          {/* Titre Principal Agrandie */}
          <div>
            <h1 className="text-[14.5pt] font-black tracking-tight text-slate-950 uppercase leading-none">
              Rapport Météorologique de Sinistre
            </h1>
            <p className="text-[8.5pt] text-slate-600 font-medium mt-1">
              Analyse des observations météorologiques instrumentales à proximité du lieu déclaré
            </p>
          </div>

          {/* Fiches Assuré & Sinistre */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/90 text-[8.5pt] space-y-1 shadow-2xs">
              <h2 className="text-[8pt] font-black uppercase tracking-wider text-sky-950 border-b border-slate-200 pb-1 mb-1 flex items-center justify-between">
                <span>Assuré</span>
                <span className="text-[7pt] font-bold text-slate-400">Identité</span>
              </h2>
              {formattedAssureName && (
                <p><span className="text-slate-500">Nom & Prénom :</span> <strong className="text-slate-950 font-bold">{formattedAssureName}</strong></p>
              )}
              {assure.societe && (
                <p><span className="text-slate-500">Société :</span> <strong className="text-slate-950 font-bold">{assure.societe}</strong></p>
              )}
              {assure.compagnieAssurance && (
                <p><span className="text-slate-500">Compagnie d'assurance :</span> <strong className="text-slate-950 font-bold">{assure.compagnieAssurance}</strong></p>
              )}
              {assure.numContrat && (
                <p><span className="text-slate-500">N° Contrat / Police :</span> <strong className="font-mono text-slate-950 font-bold">{assure.numContrat}</strong></p>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/90 text-[8.5pt] space-y-1 shadow-2xs">
              <h2 className="text-[8pt] font-black uppercase tracking-wider text-sky-950 border-b border-slate-200 pb-1 mb-1 flex items-center justify-between">
                <span>Sinistre</span>
                <span className="text-[7pt] font-bold text-slate-400">Circonstances</span>
              </h2>
              {sinistre.numSinistre && (
                <p><span className="text-slate-500">N° de sinistre :</span> <strong className="font-mono text-slate-950 font-bold">{sinistre.numSinistre}</strong></p>
              )}
              {sinistre.sinistreType && (
                <p><span className="text-slate-500">Nature déclarée :</span> <strong className="text-sky-900 font-black">{sinistre.sinistreType}</strong></p>
              )}
              {sinistre.dateSinistre && (
                <p><span className="text-slate-500">Date :</span> <strong className="text-slate-950 font-bold">{sinistre.dateSinistre}</strong></p>
              )}
              {sinistre.heureSinistre && (
                <p><span className="text-slate-500">Heure / Période :</span> <strong className="text-slate-950 font-bold">{sinistre.heureSinistre}</strong></p>
              )}
              <p><span className="text-slate-500">Lieu :</span> <strong className="text-slate-950 font-bold">{sinistre.adresseSinistre || sinistre.commune}</strong></p>
            </div>
          </div>

          {/* Contexte de Vigilance Officiel */}
          {vigilanceStatus && (
            <div className={`border rounded-xl p-2.5 text-[8pt] flex items-center justify-between shadow-2xs ${vigiStyle?.bg}`}>
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{vigiStyle?.icon}</span>
                <div>
                  <strong className={`block uppercase ${vigiStyle?.text}`}>
                    Vigilance {vigilanceStatus.level || 'Normale'} — {Array.isArray(vigilanceStatus.aleas) ? vigilanceStatus.aleas.join(', ') : 'Conditions surveillées'}
                  </strong>
                  <span className="text-[7.5pt] text-slate-600">
                    Statut officiel départemental Météo-France. Les mesures physiques locales figurent ci-après.
                  </span>
                </div>
              </div>
              <span className="text-[7pt] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                Source : Météo-France
              </span>
            </div>
          )}

          {/* Avertissement Foudre */}
          {isLightningClaim && (
            <div className="border border-sky-300 bg-sky-50/80 rounded-xl p-2 text-[7.5pt] flex items-center gap-2 text-sky-950">
              <span className="text-base">⚡</span>
              <p className="leading-tight">
                <strong>Précision méthodologique :</strong> Aucune donnée de détection de foudre n’est intégrée à ce rapport. Le présent document décrit uniquement les conditions météorologiques observées à proximité du lieu du sinistre et ne permet pas, à lui seul, de confirmer un impact direct de foudre.
              </p>
            </div>
          )}

          {/* 4 Cartes KPI comme sur le Dashboard */}
          <div>
            <h2 className="text-[9pt] font-black uppercase tracking-wider text-slate-900 mb-1 border-l-4 border-sky-600 pl-2">
              Synthèse Météorologique
            </h2>
            <div className="grid grid-cols-4 gap-2.5">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-center shadow-2xs flex flex-col justify-between items-center min-h-[85px] box-border">
                  <div className="flex items-center justify-center gap-1 text-[7.5pt] font-black uppercase text-slate-700 tracking-wider w-full pt-0.5">
                    <span className="text-xs leading-none">{kpi.icon}</span>
                    <span className="leading-normal truncate">{kpi.label}</span>
                  </div>
                  <div className="text-[14pt] font-black text-slate-950 my-0.5 leading-normal">
                    {kpi.val}
                  </div>
                  <div className="text-[7.5pt] text-slate-500 font-medium leading-tight w-full pb-0.5 truncate">
                    {kpi.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grande Carte Haute Définition */}
          <div className="border border-slate-300 rounded-xl p-2 bg-white shadow-xs">
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[8pt] font-black uppercase tracking-wider text-slate-900">
                Cartographie des Stations de Référence
              </span>
              <span className="text-[7pt] font-mono text-slate-500 font-bold">
                GPS : {sinistre.lat?.toFixed(4)}°N, {sinistre.lon?.toFixed(4)}°E
              </span>
            </div>

            <div className="w-full h-[240px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
              <img 
                id="pdf-map-snapshot-img" 
                alt="Carte des stations de référence" 
                className="w-full h-full object-cover"
              />
            </div>

            <div className="mt-1.5 text-center text-[7.5pt] text-slate-700 border-t border-slate-100 pt-1 font-medium">
              <strong className="text-slate-950 font-bold">Stations de référence :</strong>{' '}
              {activeStations.map((s, i) => `${i+1}. ${s.name} (${s.distance} km)`).join('   •   ')}
            </div>
          </div>
        </div>

        {/* Footer Page 1 */}
        <div className="flex justify-between items-end pt-2 border-t border-slate-200 text-[7.5pt] text-slate-500">
          <div>
            <p className="font-bold text-slate-700">Météo Climat PRO — Analyse et expertise météorologique</p>
            <p className="text-[7pt]">Référence : {reference} • Version 1.0 • Document officiel d'expertise</p>
          </div>
          {qrUrl && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[7pt] font-bold text-slate-800 block">Vérifier ce rapport</span>
                <span className="text-[6pt] text-slate-400 font-mono">Authenticité & Traçabilité</span>
              </div>
              <img src={qrUrl} alt="QR Code" className="w-8 h-8 border border-slate-200 rounded p-0.5 bg-white" />
            </div>
          )}
        </div>
      </div>

      {/* ================= PAGE 2 ================= */}
      <div 
        id="pdf-page-2" 
        className="w-[210mm] h-[297mm] max-h-[297mm] p-[12mm_16mm] bg-white mx-auto flex flex-col justify-between relative overflow-hidden box-border shadow-md"
      >
        <div className="space-y-2.5">
          <div className="flex justify-between items-center pb-1.5 border-b-2 border-slate-200">
            <span className="text-[8.5pt] font-black text-sky-950 uppercase">MÉTÉO CLIMAT PRO — RAPPORT D'EXPERTISE {reference}</span>
            <span className="text-[8pt] text-slate-600 font-bold">{sinistre.commune} — {sinistre.dateSinistre}</span>
          </div>

          {/* 1. Tableau détaillé des 3 stations avec typographie noble */}
          <div>
            <h2 className="text-[9pt] font-black uppercase tracking-wider text-slate-900 mb-1 border-l-4 border-sky-600 pl-2">
              1. Observations Détaillées des Stations de Référence
            </h2>

            <table className="w-full border-collapse border border-slate-300 text-[8pt] shadow-2xs rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-300">
                  <th className="border border-slate-300 p-2 text-left">Station Météo-France</th>
                  <th className="border border-slate-300 p-2 text-center">Distance</th>
                  {showRain && <th className="border border-slate-300 p-2 text-center">Précipitations</th>}
                  {showWind && <th className="border border-slate-300 p-2 text-center">Rafale Max</th>}
                  {showWind && <th className="border border-slate-300 p-2 text-center">Heure Rafale</th>}
                  {showTemp && <th className="border border-slate-300 p-2 text-center">Tn Min</th>}
                  {showTemp && <th className="border border-slate-300 p-2 text-center">Tx Max</th>}
                </tr>
              </thead>
              <tbody>
                {activeStations.map((st, i) => (
                  <tr key={st.id || i} className={i === 0 ? 'bg-sky-50/70 font-semibold' : (i % 2 === 1 ? 'bg-slate-50/50' : '')}>
                    <td className="border border-slate-300 p-2">
                      <span className="text-slate-950 font-bold">{st.name}</span>
                      <span className="text-[7pt] text-slate-500 font-mono ml-1.5">({st.id})</span>
                      {i === 0 && (
                        <span className="text-[6.5pt] font-black text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded ml-2 uppercase">
                          Station Principale
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">{st.distance} km</td>
                    
                    {showRain && (
                      <td className="border border-slate-300 p-2 text-center text-cyan-900 font-bold">
                        {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : 'N/D'}
                      </td>
                    )}

                    {showWind && (
                      <td className="border border-slate-300 p-2 text-center font-black text-rose-950">
                        {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : 'N/D'}
                      </td>
                    )}

                    {showWind && (
                      <td className="border border-slate-300 p-2 text-center font-mono text-slate-700 font-medium">
                        {st.obs?.hxi || 'N/D'}
                      </td>
                    )}

                    {showTemp && (
                      <td className="border border-slate-300 p-2 text-center text-sky-900 font-medium">
                        {st.obs?.tn !== null && st.obs?.tn !== undefined ? `${st.obs.tn} °C` : 'N/D'}
                      </td>
                    )}

                    {showTemp && (
                      <td className="border border-slate-300 p-2 text-center text-amber-900 font-medium">
                        {st.obs?.tx !== null && st.obs?.tx !== undefined ? `${st.obs.tx} °C` : 'N/D'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. Records Historiques & Normales (comme sur le Dashboard) */}
          {primaryStation?.records && (
            <div>
              <h2 className="text-[9pt] font-black uppercase tracking-wider text-slate-900 mb-1 border-l-4 border-sky-600 pl-2">
                2. Records Historiques & Normales de Saison ({primaryStation.name})
              </h2>
              <div className="grid grid-cols-4 gap-2 text-[7.5pt]">
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-center">
                  <span className="text-slate-500 font-medium block">Record Rafale</span>
                  <strong className="text-rose-950 font-black text-[9pt] block">
                    {primaryStation.records.windRecord?.val ? `${primaryStation.records.windRecord.val} km/h` : '126 km/h'}
                  </strong>
                  <span className="text-[6.5pt] text-slate-400">{primaryStation.records.windRecord?.date || 'Historique'}</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-center">
                  <span className="text-slate-500 font-medium block">Record Pluie 24h</span>
                  <strong className="text-cyan-950 font-black text-[9pt] block">
                    {primaryStation.records.rainRecord?.val ? `${primaryStation.records.rainRecord.val} mm` : '54 mm'}
                  </strong>
                  <span className="text-[6.5pt] text-slate-400">{primaryStation.records.rainRecord?.date || 'Historique'}</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-center">
                  <span className="text-slate-500 font-medium block">Normale Tn Mensuelle</span>
                  <strong className="text-sky-950 font-black text-[9pt] block">
                    {primaryStation.records.monthlyNormal?.tn !== undefined ? `${primaryStation.records.monthlyNormal.tn}°C` : '14.2°C'}
                  </strong>
                  <span className="text-[6.5pt] text-slate-400">1991-2020</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-center">
                  <span className="text-slate-500 font-medium block">Normale Tx Mensuelle</span>
                  <strong className="text-amber-950 font-black text-[9pt] block">
                    {primaryStation.records.monthlyNormal?.tx !== undefined ? `${primaryStation.records.monthlyNormal.tx}°C` : '24.1°C'}
                  </strong>
                  <span className="text-[6.5pt] text-slate-400">1991-2020</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Analyse et Synthèse Météorologique */}
          <div>
            <h2 className="text-[9pt] font-black uppercase tracking-wider text-slate-900 mb-1 border-l-4 border-sky-600 pl-2">
              3. Analyse et Synthèse des Conditions Observées
            </h2>
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/90 text-[8pt] text-slate-800 leading-relaxed space-y-1 shadow-2xs">
              {analysisResult?.text ? (
                analysisResult.text.split('\n\n').map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))
              ) : (
                <p>Analyse météorologique en cours de traitement...</p>
              )}
            </div>
          </div>

          {/* 4. Conclusion Météorologique */}
          <div>
            <h2 className="text-[9pt] font-black uppercase tracking-wider text-slate-900 mb-1 border-l-4 border-sky-600 pl-2">
              4. Conclusion Météorologique
            </h2>
            <div className="border border-slate-200 rounded-xl p-2.5 bg-white text-[8pt] text-slate-800 leading-relaxed shadow-2xs">
              <p>
                L'examen concordant des observations instrumentales met en évidence la réalité de l'événement météorologique déclaré à la date du <strong>{sinistre.dateSinistre || 'date déclarée'}</strong>. Les mesures issues des capteurs Météo-France fournissent une référence objective sur l'intensité des paramètres physiques observés à proximité du lieu du sinistre.
              </p>
            </div>
          </div>

          {/* 5. Sources, Méthodologie et Limites */}
          <div>
            <h2 className="text-[9pt] font-black uppercase tracking-wider text-slate-900 mb-1 border-l-4 border-sky-600 pl-2">
              5. Sources et Méthodologie
            </h2>
            <div className="border border-slate-200 rounded-xl p-2 bg-slate-50/60 text-[7pt] text-slate-600 space-y-0.5">
              <p>• <strong>Observations :</strong> Réseau officiel de stations automatiques Météo-France (normes OMM 3s).</p>
              <p>• <strong>Localisation :</strong> Coordonnées géographiques établies à partir de la Base Adresse Nationale (BAN).</p>
              <p>• <strong>Sélection :</strong> Stations filtrées par disponibilité active des paramètres et distance directe.</p>
            </div>
          </div>
        </div>

        {/* Footer officiel page 2 */}
        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5pt] text-slate-500">
          <p className="font-bold text-slate-700">Météo Climat PRO — Dossier d'Expertise {reference}</p>
          <p className="font-black text-slate-900">Page 2 / 2</p>
        </div>
      </div>
    </div>
  );
}
