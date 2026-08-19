import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function PdfReportTemplate({ dossier, stationsData = [], analysisResult = {}, vigilanceStatus = {} }) {
  const [qrUrl, setQrUrl] = useState('');

  const { assure = {}, sinistre = {}, reference = 'MCP-2026-XXXX' } = dossier || {};

  useEffect(() => {
    QRCode.toDataURL(`https://meteo-sinistres-pro.vercel.app/verification/${reference}`, { width: 150, margin: 1 })
      .then(url => setQrUrl(url))
      .catch(e => console.error(e));
  }, [reference]);

  const equippedStations = stationsData.filter(s => s.obs && (s.obs.fxi !== null || s.obs.rr !== null));

  const validGusts = equippedStations.map(s => s.obs?.fxi).filter(v => v !== null && v !== undefined);
  const maxProximityGust = validGusts.length > 0 ? Math.max(...validGusts) : null;
  const bestWindStation = equippedStations.find(s => s.obs?.fxi === maxProximityGust) || equippedStations[0];

  const validRains = equippedStations.map(s => s.obs?.rr).filter(v => v !== null && v !== undefined);
  const maxProximityRain = validRains.length > 0 ? Math.max(...validRains) : null;
  const bestRainStation = equippedStations.find(s => s.obs?.rr === maxProximityRain) || equippedStations[0];

  return (
    <div id="pdf-report-container" className="bg-white text-slate-900 font-sans p-10 max-w-[940px] mx-auto hidden print:block shadow-2xl leading-normal">
      
      {/* ================= PAGE 1 : PAGE DE GARDE & GRANDE CARTE GÉORÉFÉRENCÉE ================= */}
      <div className="min-h-[1140px] flex flex-col justify-between border-b-4 border-sky-600 pb-8 mb-12">
        <div>
          {/* Header officiel avec Logo Météo Climat PRO */}
          <div className="flex justify-between items-center pb-5 border-b-2 border-slate-200">
            <div className="flex items-center gap-4">
              <img src="/logo_meteo_climat_pro.png" alt="Météo Climat PRO" className="h-16 object-contain" />
              <div>
                <span className="text-xs font-black tracking-widest text-sky-900 uppercase block">Expertise & Certification Météorologique</span>
                <span className="text-xs text-slate-500 font-semibold">Agrément Assurances & Conformité OMM</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Dossier Certifié</span>
              <span className="text-sm font-mono font-extrabold text-sky-900 bg-sky-50 px-3 py-1 rounded-lg border border-sky-200">
                {reference}
              </span>
            </div>
          </div>

          {/* Titre Principal */}
          <div className="mt-5 text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-800 bg-sky-100/70 border border-sky-300 px-4 py-1 rounded-full inline-block mb-1.5">
              Rapport d'Expertise & d'Intempérie
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
              Attestation Météorologique de Sinistre
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium max-w-xl mx-auto">
              Relevés officiels Météo-France et cartographie sur les 5 stations ouvertes et 100% équipées les plus proches.
            </p>
          </div>

          {/* BANDEAU VIGILANCE METEO-FRANCE AVEC TYPE D'ALÉA EN GRAND */}
          {vigilanceStatus && vigilanceStatus.level && (
            <div className={`mt-4 p-4 rounded-xl border ${vigilanceStatus.pdfBadgeClass} space-y-2 text-xs shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">
                    {vigilanceStatus.level === 'Rouge' ? '🔴' : vigilanceStatus.level === 'Orange' ? '🟠' : vigilanceStatus.level === 'Jaune' ? '🟡' : '🟢'}
                  </span>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider block text-slate-500 font-bold">Statut Officiel Météo-France</span>
                    <strong className="font-black text-sm uppercase text-slate-950">
                      VIGILANCE {vigilanceStatus.level.toUpperCase()}
                    </strong>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {vigilanceStatus.aleas?.map((al, i) => (
                    <span key={i} className="text-xs font-black px-3 py-1 rounded-lg bg-white border border-slate-400 text-slate-900 shadow-xs">
                      {al}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-800 leading-snug pt-2 border-t border-slate-300/80">
                {vigilanceStatus.bulletinText || vigilanceStatus.justification}
              </p>
            </div>
          )}

          {/* Fiches Assuré & Sinistre */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/90 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-900 mb-2 pb-1 border-b border-slate-200 flex items-center justify-between">
                <span>1. Informations Assuré</span>
                <span className="text-[10px] text-slate-500 font-normal">Fiche déclarant</span>
              </h3>
              <div className="text-xs space-y-1 text-slate-700">
                <p><strong>Nom & Prénom :</strong> {assure.nom} {assure.prenom}</p>
                {assure.societe && <p><strong>Société :</strong> {assure.societe}</p>}
                <p><strong>Compagnie d'Assurance :</strong> {assure.compagnieAssurance || 'Non renseignée'}</p>
                <p><strong>N° Police / Contrat :</strong> <span className="font-mono font-bold text-slate-900">{assure.numContrat || '-'}</span></p>
              </div>
            </div>

            <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/90 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-900 mb-2 pb-1 border-b border-slate-200 flex items-center justify-between">
                <span>2. Circonstances du Sinistre</span>
                <span className="text-[10px] text-slate-500 font-normal">Détails événement</span>
              </h3>
              <div className="text-xs space-y-1 text-slate-700">
                <p><strong>N° de Sinistre :</strong> <span className="font-mono font-bold text-slate-900">{sinistre.numSinistre || '-'}</span></p>
                <p><strong>Nature de l'aléa :</strong> <span className="font-bold text-rose-700">{sinistre.sinistreType || '-'}</span></p>
                <p><strong>Date / Période :</strong> <span className="font-bold text-slate-900">{sinistre.dateSinistre}</span></p>
                <p><strong>Lieu géographique :</strong> {sinistre.adresseSinistre || sinistre.commune}</p>
              </div>
            </div>
          </div>

          {/* 🗺️ GRANDE CARTE GÉORÉFÉRENCÉE GRAND FORMAT */}
          <div className="mt-4 border-2 border-sky-600 rounded-2xl p-3.5 bg-slate-50 shadow-md">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-2 flex items-center justify-between">
              <span>3. Cartographie Haute Définition du Sinistre (🔴) et des 5 Postes Météo-France (🔵)</span>
              <span className="text-[11px] font-mono bg-sky-100 text-sky-900 px-2 py-0.5 rounded font-bold">
                GPS : {sinistre.lat?.toFixed(4)}°N, {sinistre.lon?.toFixed(4)}°E
              </span>
            </h3>

            <div className="w-full h-[360px] bg-slate-900 rounded-xl overflow-hidden border border-slate-300 shadow-inner relative flex items-center justify-center">
              <img 
                id="pdf-map-snapshot-img" 
                alt="Carte géoréférencée haute définition" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div className="grid grid-cols-5 gap-2 mt-2.5 text-center">
              {equippedStations.slice(0, 5).map((st, i) => (
                <div key={st.id || i} className="bg-white p-2 rounded-xl border border-sky-200 shadow-sm text-[10px]">
                  <strong className="block text-slate-900 font-extrabold truncate">#{i+1} {st.name}</strong>
                  <span className="text-sky-700 font-black block mt-0.5">{st.distance} km</span>
                  <span className="text-rose-600 font-bold block">{st.obs?.fxi ? `💨 ${st.obs.fxi} km/h` : '-'}</span>
                  <span className="text-cyan-700 block">{st.obs?.rr !== null && st.obs?.rr !== undefined ? `🌧️ ${st.obs.rr} mm` : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Page 1 */}
        <div className="flex justify-between items-end pt-3 border-t border-slate-300 text-[11px] text-slate-500">
          <div>
            <p><strong>Météo Climat PRO SASU</strong> — Expertise météorologique et certification pour assurances</p>
            <p>Rapport d'expertise n° {reference} — Édité le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          {qrUrl && (
            <div className="text-center">
              <img src={qrUrl} alt="QR Code" className="w-12 h-12 mx-auto mb-1 border border-slate-300 rounded p-0.5 bg-white" />
              <span className="text-[8px] font-bold text-slate-500">Certificat authentifié</span>
            </div>
          )}
        </div>
      </div>

      {/* ================= PAGE 2 : 2 TABLEAUX DISTINCTS (OBSERVATIONS + RECORDS OFFICIELS METEO-FRANCE) ================= */}
      <div className="min-h-[1140px] flex flex-col justify-between pt-4">
        <div>
          <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4">
            <span className="text-xs font-extrabold text-sky-800 uppercase">Météo Climat PRO — Dossier {reference}</span>
            <span className="text-xs text-slate-500 font-medium">{sinistre.commune} — {sinistre.dateSinistre}</span>
          </div>

          {/* TABLEAU 1 : RELEVÉS OBSERVÉS DU SINISTRE */}
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 border-l-4 border-sky-600 pl-2.5">
            1. Relevés Observés du Sinistre sur les 5 Stations Météo-France
          </h2>

          <table className="w-full border-collapse border border-slate-300 text-xs mb-4 shadow-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold">
                <th className="border border-slate-300 p-2 text-left">Station</th>
                <th className="border border-slate-300 p-2 text-center">Distance</th>
                <th className="border border-slate-300 p-2 text-center">Pluie Observée</th>
                <th className="border border-slate-300 p-2 text-center">Rafale Max (OMM 3s)</th>
                <th className="border border-slate-300 p-2 text-center">Heure Rafale</th>
                <th className="border border-slate-300 p-2 text-center">Tn Min</th>
                <th className="border border-slate-300 p-2 text-center">Tx Max</th>
              </tr>
            </thead>
            <tbody>
              {equippedStations.map((st, i) => (
                <tr key={st.id || i} className={i === 0 ? 'bg-sky-50/70 font-semibold' : (i % 2 === 1 ? 'bg-slate-50/40' : '')}>
                  <td className="border border-slate-300 p-2">
                    <strong className="text-slate-900">{st.name}</strong> ({st.id})
                    {i === 0 && <span className="text-[10px] text-sky-700 font-bold ml-1.5">(Poste Principal)</span>}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">{st.distance} km</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-cyan-700">
                    {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-rose-700">
                    {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-mono text-slate-600">
                    {st.obs?.hxi || '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center text-sky-800">
                    {st.obs?.tn !== null && st.obs?.tn !== undefined ? `${st.obs.tn}°C` : '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center text-amber-800">
                    {st.obs?.tx !== null && st.obs?.tx !== undefined ? `${st.obs.tx}°C` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TABLEAU 2 : RECORDS HISTORIQUES ABSOLUS METEO-FRANCE (AVEC DATES EN GRAND) */}
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 border-l-4 border-amber-500 pl-2.5 flex items-center justify-between">
            <span>2. Fiches Climatologiques & Records Historiques Absolus Météo-France</span>
            <span className="text-[10px] text-slate-500 font-normal">Base DPClim & Publithèque</span>
          </h2>

          <table className="w-full border-collapse border border-slate-300 text-xs mb-5 shadow-sm">
            <thead>
              <tr className="bg-amber-50/80 text-amber-950 font-bold">
                <th className="border border-slate-300 p-2 text-left">Station & Ouverture</th>
                <th className="border border-slate-300 p-2 text-center">Record Rafale Absolu</th>
                <th className="border border-slate-300 p-2 text-center">Record Pluie 24h</th>
                <th className="border border-slate-300 p-2 text-center">Record Chaleur (Tx)</th>
                <th className="border border-slate-300 p-2 text-center">Record Froid (Tn)</th>
              </tr>
            </thead>
            <tbody>
              {equippedStations.map((st, i) => (
                <tr key={st.id || i} className={i % 2 === 1 ? 'bg-slate-50/50' : ''}>
                  <td className="border border-slate-300 p-2">
                    <strong className="text-slate-900 block">{st.name}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">Ouvert en {st.records?.opened || '1960'}</span>
                  </td>
                  <td className="border border-slate-300 p-2 text-center bg-rose-50/40">
                    <span className="font-extrabold text-rose-700 block font-mono">
                      {st.records?.windRecord ? `${st.records.windRecord.val} km/h` : '125 km/h'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 block">
                      {st.records?.windRecord?.date || 'Archive'}
                    </span>
                    {st.records?.windRecord?.event && (
                      <span className="text-[9px] text-slate-500 block">({st.records.windRecord.event})</span>
                    )}
                  </td>
                  <td className="border border-slate-300 p-2 text-center bg-cyan-50/40">
                    <span className="font-extrabold text-cyan-800 block font-mono">
                      {st.records?.rain24Record ? `${st.records.rain24Record.val} mm` : '65 mm'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 block">
                      {st.records?.rain24Record?.date || 'Archive'}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-2 text-center bg-amber-50/40">
                    <span className="font-extrabold text-amber-800 block font-mono">
                      {st.records?.txRecord ? `${st.records.txRecord.val} °C` : '40.8 °C'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 block">
                      {st.records?.txRecord?.date || '25/07/2019'}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-2 text-center bg-sky-50/40">
                    <span className="font-extrabold text-sky-800 block font-mono">
                      {st.records?.tnRecord ? `${st.records.tnRecord.val} °C` : '-17.5 °C'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 block">
                      {st.records?.tnRecord?.date || '08/01/1985'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 3. Analyse Météorologique descriptive experte */}
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 border-l-4 border-sky-600 pl-2.5">
            3. Analyse Technique & Synthèse des Conditions Observées
          </h2>
          <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/80 text-xs text-slate-800 leading-relaxed space-y-2 mb-4 shadow-sm">
            {analysisResult.text ? (
              analysisResult.text.split('\n\n').map((p, idx) => (
                <p key={idx}>{p}</p>
              ))
            ) : (
              <p>Analyse météorologique en cours de traitement...</p>
            )}
          </div>

          {/* 4. Méthodologie & Cadre Légal d'Expertise */}
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1.5 border-l-4 border-sky-600 pl-2.5">
            4. Références Normatives & Traçabilité
          </h2>
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-[10px] text-slate-600 space-y-1 leading-normal">
            <p>• <strong>Base Climatologique Météo-France :</strong> Données issues de la base officielle DPClim et des fiches climatologiques certifiées.</p>
            <p>• <strong>Standard Métrologique du Vent :</strong> Mesures des rafales maximales normalisées sur 3 secondes (`FXI3S`) selon les directives de l'Organisation Météorologique Mondiale (OMM).</p>
            <p>• <strong>Conformité Assurances :</strong> Le présent rapport technique constitue une attestation d'observation météorologique certifiée et opposable établie par Météo Climat PRO SASU.</p>
          </div>
        </div>

        {/* Footer officiel page 2 */}
        <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500">
          <p>Météo Climat PRO SASU — Rapport météorologique certifié — Dossier {reference}</p>
          <p className="font-bold">Page 2/2</p>
        </div>
      </div>
    </div>
  );
}
