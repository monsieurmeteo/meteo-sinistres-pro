import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function PdfReportTemplate({ dossier, stationsData = [], analysisResult = {} }) {
  const [qrUrl, setQrUrl] = useState('');

  const { assure = {}, sinistre = {}, reference = 'MCP-2026-XXXX' } = dossier || {};
  const s1 = stationsData[0] || {};
  const s2 = stationsData[1] || {};
  const s3 = stationsData[2] || {};

  useEffect(() => {
    QRCode.toDataURL(`https://meteo-climat-pro.fr/verification/${reference}`, { width: 120, margin: 1 })
      .then(url => setQrUrl(url))
      .catch(e => console.error(e));
  }, [reference]);

  return (
    <div id="pdf-report-container" className="bg-white text-slate-900 font-sans p-10 max-w-[900px] mx-auto hidden print:block shadow-2xl">
      {/* PAGE 1 : PAGE DE GARDE */}
      <div className="min-h-[1100px] flex flex-col justify-between border-b-2 border-slate-200 pb-8 mb-12">
        <div>
          {/* Header avec Logo */}
          <div className="flex justify-between items-center pb-6 border-b-2 border-sky-600">
            <img src="/logo_meteo_climat_pro.png" alt="Météo Climat PRO" className="h-16 object-contain" />
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700 block">Expertise Météorologique d'Assurance</span>
              <span className="text-sm font-mono font-bold text-slate-800">Réf : {reference}</span>
            </div>
          </div>

          {/* Titre Principal */}
          <div className="mt-14 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 uppercase">
              Rapport Météorologique de Sinistre
            </h1>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Analyse des conditions météorologiques observées à proximité du lieu déclaré
            </p>
            <div className="w-24 h-1 bg-sky-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Fiches Assuré & Sinistre */}
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div className="border border-slate-300 rounded-xl p-5 bg-slate-50/70">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800 mb-3 pb-1 border-b border-slate-200">
                Informations Assuré
              </h3>
              <div className="text-xs space-y-1.5 text-slate-700">
                <p><strong>Nom & Prénom :</strong> {assure.nom} {assure.prenom}</p>
                {assure.societe && <p><strong>Société :</strong> {assure.societe}</p>}
                <p><strong>Adresse :</strong> {assure.adresse || '-'}</p>
                <p><strong>Commune :</strong> {assure.codePostal} {assure.commune}</p>
                <p><strong>Compagnie :</strong> {assure.compagnieAssurance || '-'}</p>
                <p><strong>N° Contrat :</strong> <span className="font-mono">{assure.numContrat || '-'}</span></p>
              </div>
            </div>

            <div className="border border-slate-300 rounded-xl p-5 bg-slate-50/70">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800 mb-3 pb-1 border-b border-slate-200">
                Détails du Sinistre
              </h3>
              <div className="text-xs space-y-1.5 text-slate-700">
                <p><strong>N° Sinistre :</strong> <span className="font-mono font-bold">{sinistre.numSinistre || '-'}</span></p>
                <p><strong>Nature de l'aléa :</strong> <span className="font-semibold text-rose-700">{sinistre.sinistreType || '-'}</span></p>
                <p><strong>Date de survenance :</strong> <span className="font-bold">{sinistre.dateSinistre}</span></p>
                <p><strong>Heure déclarée :</strong> {sinistre.heureSinistre || 'Journée entière'}</p>
                <p><strong>Lieu :</strong> {sinistre.adresseSinistre || sinistre.commune}</p>
                <p><strong>Coordonnées :</strong> {sinistre.lat ? `${sinistre.lat.toFixed(4)}°N, ${sinistre.lon?.toFixed(4)}°E` : '-'}</p>
              </div>
            </div>
          </div>

          {/* Synthèse Clé */}
          <div className="mt-8 border border-sky-200 bg-sky-50/50 rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900 mb-2">
              Indice de Fiabilité & Représentativité
            </h3>
            <div className="flex items-center justify-between text-xs">
              <p className="text-slate-700">
                Analyse appuyée sur <strong>{stationsData.length} stations officielles Météo-France</strong> (distance moyenne : {stationsData.length > 0 ? (stationsData.reduce((a,b)=>a+b.distance,0)/stationsData.length).toFixed(1) : '-'} km).
              </p>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg">
                Niveau : {analysisResult.confidence?.level || 'Élevée'}
              </span>
            </div>
          </div>
        </div>

        {/* Bas de page garde */}
        <div className="flex justify-between items-end pt-6 border-t border-slate-200 text-[11px] text-slate-500">
          <div>
            <p><strong>Date d'édition :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
            <p><strong>Éditeur :</strong> Météo Climat PRO (SASU d'expertise et de conseil météo)</p>
          </div>
          {qrUrl && (
            <div className="text-center">
              <img src={qrUrl} alt="QR Code" className="w-16 h-16 mx-auto mb-1 border border-slate-200 rounded" />
              <span className="text-[9px] text-slate-400">Authenticité certifiée</span>
            </div>
          )}
        </div>
      </div>

      {/* PAGE 2 : OBSERVATIONS & ANALYSE TECHNIQUE */}
      <div className="min-h-[1100px] flex flex-col justify-between pt-4">
        <div>
          {/* Header secondaire */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-6">
            <span className="text-xs font-bold text-sky-800">Météo Climat PRO — Dossier {reference}</span>
            <span className="text-xs text-slate-500">{sinistre.commune} — {sinistre.dateSinistre}</span>
          </div>

          {/* 1. Tableau Comparatif des 3 Stations */}
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-sky-600 pl-2">
            1. Données Observées sur les Stations de Référence
          </h2>

          <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
            <thead>
              <tr className="bg-slate-100 text-slate-800">
                <th className="border border-slate-300 p-2 text-left">Station (Météo-France)</th>
                <th className="border border-slate-300 p-2 text-center">Distance</th>
                <th className="border border-slate-300 p-2 text-center">Pluie 24h</th>
                <th className="border border-slate-300 p-2 text-center">Rafale Max (OMM 3s)</th>
                <th className="border border-slate-300 p-2 text-center">Heure Rafale</th>
                <th className="border border-slate-300 p-2 text-center">Tn</th>
                <th className="border border-slate-300 p-2 text-center">Tx</th>
              </tr>
            </thead>
            <tbody>
              {stationsData.map((st, i) => (
                <tr key={st.id || i} className={i === 0 ? 'bg-sky-50/60 font-semibold' : ''}>
                  <td className="border border-slate-300 p-2">
                    {st.name} ({st.id}) {i === 0 && <span className="text-[10px] text-sky-700 font-bold">(Principale)</span>}
                  </td>
                  <td className="border border-slate-300 p-2 text-center">{st.distance} km</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-sky-700">
                    {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-rose-700">
                    {st.obs?.fxi ? `${st.obs.fxi} km/h` : '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-mono">
                    {st.obs?.hxi || '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    {st.obs?.tn !== null && st.obs?.tn !== undefined ? `${st.obs.tn}°C` : '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    {st.obs?.tx !== null && st.obs?.tx !== undefined ? `${st.obs.tx}°C` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 2. Analyse Météorologique descriptive */}
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-sky-600 pl-2">
            2. Analyse Météorologique Expertisée
          </h2>
          <div className="border border-slate-300 rounded-xl p-5 bg-slate-50 text-xs text-slate-800 leading-relaxed space-y-3 mb-6">
            {analysisResult.text ? (
              analysisResult.text.split('\n\n').map((p, idx) => (
                <p key={idx}>{p}</p>
              ))
            ) : (
              <p>Analyse en cours de traitement...</p>
            )}
          </div>

          {/* 3. Cadre Légal & Méthodologie */}
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-sky-600 pl-2">
            3. Traçabilité & Méthodologie
          </h2>
          <div className="text-[11px] text-slate-600 space-y-1.5 leading-normal">
            <p>• <strong>Origine des données :</strong> Base de Données Climatologiques (DPClim) de Météo-France.</p>
            <p>• <strong>Standard des mesures de vent :</strong> Rafales normalisées sur 3 secondes (`FXI3S`) selon les normes de l'Organisation Météorologique Mondiale (OMM).</p>
            <p>• <strong>Calcul géodésique :</strong> Méthode orthodromique Haversine entre l'adresse géocodée BAN et les stations.</p>
            <p>• <strong>Clause de non-responsabilité :</strong> Le présent rapport constitue une attestation technique d'observation météorologique établie sous la responsabilité exclusive de Météo Climat PRO.</p>
          </div>
        </div>

        {/* Footer officiel */}
        <div className="pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500">
          <p>Météo Climat PRO — Rapport météorologique d'observation — Dossier {reference} — Page 2/2</p>
        </div>
      </div>
    </div>
  );
}
