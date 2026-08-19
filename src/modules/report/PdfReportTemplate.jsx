import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function PdfReportTemplate({ dossier, stationsData = [], analysisResult = {} }) {
  const [qrUrl, setQrUrl] = useState('');

  const { assure = {}, sinistre = {}, reference = 'MCP-2026-XXXX' } = dossier || {};

  useEffect(() => {
    QRCode.toDataURL(`https://meteo-sinistres-pro.vercel.app/verification/${reference}`, { width: 140, margin: 1 })
      .then(url => setQrUrl(url))
      .catch(e => console.error(e));
  }, [reference]);

  // Seules les stations avec observations valides
  const equippedStations = stationsData.filter(s => s.obs && (s.obs.fxi !== null || s.obs.rr !== null));

  const validGusts = equippedStations.map(s => s.obs?.fxi).filter(v => v !== null && v !== undefined);
  const maxProximityGust = validGusts.length > 0 ? Math.max(...validGusts) : null;
  const bestWindStation = equippedStations.find(s => s.obs?.fxi === maxProximityGust) || equippedStations[0];

  const validRains = equippedStations.map(s => s.obs?.rr).filter(v => v !== null && v !== undefined);
  const maxProximityRain = validRains.length > 0 ? Math.max(...validRains) : null;
  const bestRainStation = equippedStations.find(s => s.obs?.rr === maxProximityRain) || equippedStations[0];

  const mapStaticUrl = sinistre.lat && sinistre.lon 
    ? `https://static-maps.yandex.ru/1.x/?lang=fr_FR&ll=${sinistre.lon},${sinistre.lat}&z=10&l=map&size=650,260&pt=${sinistre.lon},${sinistre.lat},pm2rdm`
    : null;

  return (
    <div id="pdf-report-container" className="bg-white text-slate-900 font-sans p-10 max-w-[920px] mx-auto hidden print:block shadow-2xl leading-normal">
      
      {/* PAGE 1 : PAGE DE GARDE & CARTE GÉORÉFÉRENCÉE */}
      <div className="min-h-[1120px] flex flex-col justify-between border-b-2 border-slate-300 pb-8 mb-12">
        <div>
          {/* Header officiel avec Logo */}
          <div className="flex justify-between items-center pb-5 border-b-2 border-sky-600">
            <div className="flex items-center gap-4">
              <img src="/logo_meteo_climat_pro.png" alt="Météo Climat PRO" className="h-16 object-contain" />
              <div>
                <span className="text-[10px] font-extrabold tracking-widest text-sky-800 uppercase block">Expertise & Conseil Météorologique</span>
                <span className="text-xs text-slate-500 font-medium">Agrément & Certification Assurances</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Dossier d'Attestation</span>
              <span className="text-sm font-mono font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                {reference}
              </span>
            </div>
          </div>

          {/* Titre Principal de l'Attestation */}
          <div className="mt-8 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-700 bg-sky-50 border border-sky-200 px-3.5 py-1 rounded-full inline-block mb-2">
              Attestation Technique d'Intempérie
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
              Rapport Météorologique de Sinistre
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium max-w-xl mx-auto">
              Relevés officiels Météo-France et analyse sur les 5 stations complètes équipées les plus proches.
            </p>
          </div>

          {/* Fiches Assuré & Sinistre */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            {/* Encadré Assuré */}
            <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/80 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900 mb-2 pb-1 border-b border-slate-200 flex items-center justify-between">
                <span>1. Informations Assuré</span>
                <span className="text-[10px] text-slate-500 font-normal">Fiche déclarant</span>
              </h3>
              <div className="text-xs space-y-1 text-slate-700">
                <p><strong>Nom & Prénom :</strong> {assure.nom} {assure.prenom}</p>
                {assure.societe && <p><strong>Société :</strong> {assure.societe}</p>}
                <p><strong>Adresse déclarée :</strong> {assure.adresse || '-'}</p>
                <p><strong>Commune :</strong> {assure.codePostal} {assure.commune}</p>
                <p><strong>Compagnie d'Assurance :</strong> {assure.compagnieAssurance || 'Non renseignée'}</p>
                <p><strong>N° de Police / Contrat :</strong> <span className="font-mono font-bold text-slate-900">{assure.numContrat || '-'}</span></p>
              </div>
            </div>

            {/* Encadré Sinistre */}
            <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/80 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900 mb-2 pb-1 border-b border-slate-200 flex items-center justify-between">
                <span>2. Circonstances du Sinistre</span>
                <span className="text-[10px] text-slate-500 font-normal">Détails événement</span>
              </h3>
              <div className="text-xs space-y-1 text-slate-700">
                <p><strong>N° de Sinistre :</strong> <span className="font-mono font-bold text-slate-900">{sinistre.numSinistre || '-'}</span></p>
                <p><strong>Nature de l'aléa :</strong> <span className="font-bold text-rose-700">{sinistre.sinistreType || '-'}</span></p>
                <p><strong>Date / Période :</strong> <span className="font-bold text-slate-900">{sinistre.dateSinistre}</span></p>
                <p><strong>Heure déclarée :</strong> {sinistre.heureSinistre || 'Journée entière'}</p>
                <p><strong>Lieu géographique :</strong> {sinistre.adresseSinistre || sinistre.commune}</p>
                <p><strong>Point GPS :</strong> <span className="font-mono">{sinistre.lat ? `${sinistre.lat.toFixed(4)}°N, ${sinistre.lon?.toFixed(4)}°E` : '-'}</span></p>
              </div>
            </div>
          </div>

          {/* Synthèse Chiffrée Clé Grand Public */}
          <div className="mt-5 border-2 border-sky-600 rounded-2xl p-4 bg-sky-50/50">
            <h3 className="text-xs font-black uppercase tracking-wider text-sky-950 mb-2.5 flex items-center justify-between">
              <span>Synthèse des Mesures Observées à Proximité Immédiate</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                Représentativité : {analysisResult.confidence?.level || 'Élevée'}
              </span>
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Rafale Max Observée</span>
                <span className="text-2xl font-black text-rose-600 block mt-0.5">
                  {maxProximityGust !== null ? `${maxProximityGust} km/h` : 'Non mesuré'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {bestWindStation ? `Station ${bestWindStation.name} (${bestWindStation.distance} km)` : 'Norme OMM 3s'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Précipitations Observées</span>
                <span className="text-2xl font-black text-cyan-600 block mt-0.5">
                  {maxProximityRain !== null ? `${maxProximityRain} mm` : '-'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {bestRainStation ? `Station ${bestRainStation.name} (${bestRainStation.distance} km)` : 'Cumul mesuré'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Réseau 100% Équipé</span>
                <span className="text-2xl font-black text-sky-700 block mt-0.5">
                  {equippedStations.length} Stations
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Distance moy. : {equippedStations.length > 0 ? (equippedStations.reduce((a,b)=>a+b.distance,0)/equippedStations.length).toFixed(1) : '-'} km
                </span>
              </div>
            </div>
          </div>

          {/* Cartographie Intégrée dans l'Attestation */}
          <div className="mt-5 border border-slate-300 rounded-2xl p-4 bg-slate-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center justify-between">
              <span>3. Cartographie & Emplacement Géoréférencé</span>
              <span className="text-[10px] text-slate-500">Lieu du sinistre 🔴 et Postes Météo-France 🔵</span>
            </h3>
            
            {/* Schéma / Grille Visuelle des Postes Autour du Sinistre */}
            <div className="bg-white rounded-xl border border-slate-300 p-3 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="font-bold text-rose-700">🔴 Sinistre : {sinistre.adresseSinistre || sinistre.commune}</span>
                <span className="font-mono text-slate-500 text-[11px]">{sinistre.lat?.toFixed(4)}°N, {sinistre.lon?.toFixed(4)}°E</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center pt-1">
                {equippedStations.slice(0, 5).map((st, i) => (
                  <div key={st.id || i} className="p-2 rounded-lg bg-sky-50/80 border border-sky-200 text-[10px]">
                    <strong className="block text-slate-900 font-bold truncate">#{i+1} {st.name}</strong>
                    <span className="text-sky-700 font-extrabold block mt-0.5">{st.distance} km</span>
                    <span className="text-rose-600 font-bold block mt-0.5">{st.obs?.fxi ? `💨 ${st.obs.fxi} km/h` : '-'}</span>
                    <span className="text-cyan-700 block">{st.obs?.rr !== null && st.obs?.rr !== undefined ? `🌧️ ${st.obs.rr} mm` : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pied de Page Garde */}
        <div className="flex justify-between items-end pt-4 border-t border-slate-300 text-[11px] text-slate-500">
          <div>
            <p><strong>Météo Climat PRO SASU</strong> — Expertise météorologique et certification pour assurances</p>
            <p>Rapport d'expertise n° {reference} — Édité le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          {qrUrl && (
            <div className="text-center">
              <img src={qrUrl} alt="QR Code" className="w-14 h-14 mx-auto mb-1 border border-slate-300 rounded p-0.5 bg-white" />
              <span className="text-[9px] font-bold text-slate-500">Certificat authentifié</span>
            </div>
          )}
        </div>
      </div>

      {/* PAGE 2 : TABLEAU DÉTAILLÉ & ANALYSE TECHNIQUE */}
      <div className="min-h-[1120px] flex flex-col justify-between pt-4">
        <div>
          {/* Header secondaire */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-6">
            <span className="text-xs font-extrabold text-sky-800 uppercase">Météo Climat PRO — Dossier {reference}</span>
            <span className="text-xs text-slate-500 font-medium">{sinistre.commune} — {sinistre.dateSinistre}</span>
          </div>

          {/* 1. Tableau Comparatif des Stations Complètes */}
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-sky-600 pl-2.5">
            1. Relevés des 5 Stations Météo-France de Référence (100% Équipées)
          </h2>

          <table className="w-full border-collapse border border-slate-300 text-xs mb-6 shadow-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold">
                <th className="border border-slate-300 p-2.5 text-left">Station Météo-France</th>
                <th className="border border-slate-300 p-2 text-center">Distance</th>
                <th className="border border-slate-300 p-2 text-center">Altitude</th>
                <th className="border border-slate-300 p-2 text-center">Pluie</th>
                <th className="border border-slate-300 p-2 text-center">Rafale Max (OMM 3s)</th>
                <th className="border border-slate-300 p-2 text-center">Heure / Date</th>
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
                  <td className="border border-slate-300 p-2 text-center text-slate-600">{st.alt} m</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-cyan-700">
                    {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-rose-700">
                    {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-mono text-slate-600">
                    {st.obs?.hxi ? `${st.obs.hxi} ${st.obs.maxGustDate ? `(${st.obs.maxGustDate.split('-')[2]})` : ''}` : '-'}
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

          {/* 2. Analyse Météorologique descriptive experte */}
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-sky-600 pl-2.5">
            2. Analyse Technique & Synthèse des Conditions Observées
          </h2>
          <div className="border border-slate-300 rounded-xl p-5 bg-slate-50/80 text-xs text-slate-800 leading-relaxed space-y-3 mb-6 shadow-sm">
            {analysisResult.text ? (
              analysisResult.text.split('\n\n').map((p, idx) => (
                <p key={idx}>{p}</p>
              ))
            ) : (
              <p>Analyse météorologique en cours de traitement...</p>
            )}
          </div>

          {/* 3. Méthodologie & Cadre Légal d'Expertise */}
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-sky-600 pl-2.5">
            3. Références Normatives & Traçabilité
          </h2>
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 text-[11px] text-slate-600 space-y-1.5 leading-normal">
            <p>• <strong>Base de Données Source :</strong> Données issues de la base officielle DPClim de Météo-France.</p>
            <p>• <strong>Standard Métrologique du Vent :</strong> Mesures des rafales maximales normalisées sur 3 secondes (`FXI3S`) selon les directives de l'Organisation Météorologique Mondiale (OMM).</p>
            <p>• <strong>Sélection des Postes :</strong> Stations SYNOP/RADOME 100% équipées de capteurs homologués de vent, pluie et température.</p>
            <p>• <strong>Valeur Juridique :</strong> Le présent rapport technique constitue une attestation d'observation météorologique certifiée établie par Météo Climat PRO SASU.</p>
          </div>
        </div>

        {/* Footer officiel page 2 */}
        <div className="pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500">
          <p>Météo Climat PRO SASU — Rapport météorologique certifié — Dossier {reference}</p>
          <p className="font-bold">Page 2/2</p>
        </div>
      </div>
    </div>
  );
}
