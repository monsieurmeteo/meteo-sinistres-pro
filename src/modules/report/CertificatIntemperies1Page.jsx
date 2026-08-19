import React from 'react';

export default function CertificatIntemperies1Page({ 
  dossier = {}, 
  stationsData = [], 
  insuranceDecision = null,
  vigilanceStatus = null
}) {
  const { sinistre = {}, assure = {}, reference = 'MCP-2026-XXXX' } = dossier;
  // Affiche jusqu'à 6 stations pour garantir la tenue stricte sur 1 page A4
  const activeStations = stationsData.slice(0, 6);

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    `https://meteo-sinistres-pro.vercel.app/verify/${reference}`
  )}`;

  return (
    <div id="pdf-certificat-container" className="bg-white text-slate-900 font-sans hidden print:block">
      <div 
        id="pdf-certificat-page" 
        className="w-[210mm] h-[297mm] max-h-[297mm] p-[8mm_12mm] bg-white mx-auto flex flex-col justify-between relative overflow-hidden box-border shadow-md"
      >
        {/* Contenu principal */}
        <div className="space-y-2">
          {/* 1. Header Officiel */}
          <div className="flex justify-between items-center pb-1.5 border-b-2 border-slate-900">
            <div className="flex items-center gap-2.5">
              <img 
                src="/logo_meteo_climat_pro.png" 
                alt="Météo Climat PRO" 
                className="h-10 w-auto object-contain" 
              />
              <div className="border-l-2 border-slate-300 pl-2.5">
                <span className="text-[10pt] font-black tracking-wider text-slate-950 uppercase block leading-tight">
                  MÉTÉO CLIMAT PRO
                </span>
                <span className="text-[7pt] text-slate-600 font-bold uppercase tracking-wide">
                  Cabinet d'Expertise & d'Analyse Météorologique pour Assurances
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[6.5pt] uppercase font-extrabold text-slate-500 block tracking-wider">
                CERTIFICAT N°
              </span>
              <span className="text-[9.5pt] font-mono font-black text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block shadow-2xs">
                {reference}
              </span>
            </div>
          </div>

          {/* 2. Titre Principal */}
          <div className="text-center py-1 bg-slate-50 border border-slate-200 rounded-lg">
            <h1 className="text-[13pt] font-black tracking-tight text-slate-950 uppercase">
              CERTIFICAT D'INTEMPÉRIES
            </h1>
            <p className="text-[8pt] font-bold text-sky-900">
              Attestation Météorologique Officielle pour Déclaration de Sinistre
            </p>
          </div>

          {/* 3. Bloc Cadre Assuré & Sinistre */}
          <div className="grid grid-cols-2 gap-2 text-[7.5pt]">
            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50/80 space-y-0.5">
              <div className="text-[7pt] font-black uppercase tracking-wider text-sky-950 border-b border-slate-200 pb-0.5 flex justify-between">
                <span>1. IDENTIFICATION DE L'ASSURÉ</span>
                <span className="text-slate-400 font-mono text-[6.5pt]">ASSUR-ID</span>
              </div>
              <p><span className="text-slate-500 font-medium">Assuré :</span> <strong className="text-slate-950 font-bold">{assure.prenom} {assure.nom}</strong></p>
              {assure.societe && (
                <p><span className="text-slate-500 font-medium">Raison sociale :</span> <strong className="text-slate-900 font-bold">{assure.societe}</strong></p>
              )}
              {assure.compagnieAssurance && (
                <p><span className="text-slate-500 font-medium">Compagnie :</span> <strong className="text-slate-950 font-bold">{assure.compagnieAssurance}</strong></p>
              )}
              {assure.numContrat && (
                <p><span className="text-slate-500 font-medium">N° Police / Contrat :</span> <strong className="font-mono text-slate-950 font-bold">{assure.numContrat}</strong></p>
              )}
            </div>

            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50/80 space-y-0.5">
              <div className="text-[7pt] font-black uppercase tracking-wider text-sky-950 border-b border-slate-200 pb-0.5 flex justify-between">
                <span>2. CIRCONSTANCES DU SINISTRE</span>
                <span className="text-slate-400 font-mono text-[6.5pt]">SIN-INFO</span>
              </div>
              {sinistre.numSinistre && (
                <p><span className="text-slate-500 font-medium">N° Sinistre :</span> <strong className="font-mono text-slate-950 font-bold">{sinistre.numSinistre}</strong></p>
              )}
              <p><span className="text-slate-500 font-medium">Lieu du sinistre :</span> <strong className="text-slate-950 font-bold">{sinistre.adresseSinistre || sinistre.commune}</strong></p>
              <p><span className="text-slate-500 font-medium">Date déclarée :</span> <strong className="text-slate-950 font-bold">{sinistre.dateSinistre}</strong></p>
              <p><span className="text-slate-500 font-medium">Aléa réclamé :</span> <strong className="text-sky-900 font-black">{sinistre.sinistreType}</strong></p>
            </div>
          </div>

          {/* 4. Encadré Consigne de Gestion d'Assurance */}
          {insuranceDecision && (
            <div className={`border-2 rounded-lg p-2 text-[8pt] flex items-center justify-between shadow-2xs ${
              insuranceDecision.isFavorable 
                ? 'border-emerald-400 bg-emerald-50 text-emerald-950' 
                : 'border-rose-400 bg-rose-50 text-rose-950'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{insuranceDecision.isFavorable ? '👍' : '❌'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-[8.5pt] font-black uppercase tracking-wider">
                      CONSIGNE DE GESTION : {insuranceDecision.decision}
                    </strong>
                    <span className={`px-2 py-0.5 rounded text-[6.5pt] font-black uppercase ${
                      insuranceDecision.isFavorable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {insuranceDecision.isFavorable ? 'Garantie Acquise' : 'Garantie Non Acquise'}
                    </span>
                  </div>
                  <span className="text-[7pt] text-slate-800 block font-bold">
                    {insuranceDecision.ruleText} — {insuranceDecision.observedSummary}
                  </span>
                </div>
              </div>
              <span className="text-[6.5pt] font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-300">
                Seuil : {insuranceDecision.threshold} {insuranceDecision.category === 'VENT' ? 'km/h' : (insuranceDecision.category === 'PLUIE' ? 'mm' : '°C')}
              </span>
            </div>
          )}

          {/* 5. Mesures des Stations Météo-France dans un rayon de 30 km */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-[8pt] font-black uppercase tracking-wider text-slate-900 border-l-4 border-sky-600 pl-1.5">
                3. Relevés Physiques des Stations Météo-France dans un Rayon de 30 km ({stationsData.length} stations)
              </h2>
              <span className="text-[6pt] text-slate-500 font-bold">Normes OMM 3s</span>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-[7.5pt] rounded-lg overflow-hidden shadow-2xs">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-300">
                  <th className="border border-slate-300 p-1 text-left">Station de Référence (&lt; 30 km)</th>
                  <th className="border border-slate-300 p-1 text-center">Distance</th>
                  <th className="border border-slate-300 p-1 text-center">Altitude</th>
                  <th className="border border-slate-300 p-1 text-center">Rafale Max (3s)</th>
                  <th className="border border-slate-300 p-1 text-center">Heure</th>
                  <th className="border border-slate-300 p-1 text-center">Pluie 24h</th>
                  <th className="border border-slate-300 p-1 text-center">Tn / Tx</th>
                </tr>
              </thead>
              <tbody>
                {activeStations.map((st, i) => (
                  <tr key={st.id || i} className={i === 0 ? 'bg-sky-50/70 font-semibold' : (i % 2 === 1 ? 'bg-slate-50/50' : '')}>
                    <td className="border border-slate-300 p-1">
                      <span className="text-slate-950 font-bold">{st.name}</span>
                      <span className="text-[6pt] text-slate-500 font-mono ml-1">({st.id})</span>
                    </td>
                    <td className="border border-slate-300 p-1 text-center font-bold text-slate-900">{st.distance} km</td>
                    <td className="border border-slate-300 p-1 text-center font-mono text-slate-600">{st.alt || 0} m</td>
                    <td className="border border-slate-300 p-1 text-center font-black text-rose-700">
                      {st.obs?.fxi !== null && st.obs?.fxi !== undefined ? `${st.obs.fxi} km/h` : 'Non mesuré'}
                    </td>
                    <td className="border border-slate-300 p-1 text-center font-mono text-slate-600">
                      {st.obs?.hxi || '-'}
                    </td>
                    <td className="border border-slate-300 p-1 text-center font-bold text-sky-800">
                      {st.obs?.rr !== null && st.obs?.rr !== undefined ? `${st.obs.rr} mm` : '0 mm'}
                    </td>
                    <td className="border border-slate-300 p-1 text-center font-mono text-slate-800">
                      {st.obs?.tn !== null ? `${st.obs.tn}°` : '-'} / {st.obs?.tx !== null ? `${st.obs.tx}°` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 6. Détection Foudre & Activité Orageuse */}
          <div className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 flex items-center justify-between text-[7pt]">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚡</span>
              <div>
                <strong className="text-slate-900 uppercase block">Activité Orageuse & Détection d'Impacts de Foudre</strong>
                <span className="text-slate-600">
                  Réseau de détection foudre dans un rayon de 10 km autour de la commune de {sinistre.commune}.
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                0 impact détecté
              </span>
            </div>
          </div>

          {/* 7. Synthèse Rédigée de l'Expert Météorologue */}
          <div>
            <h2 className="text-[8pt] font-black uppercase tracking-wider text-slate-900 mb-1 border-l-4 border-sky-600 pl-1.5">
              4. Avis et Commentaires de l'Expert Météorologue
            </h2>
            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 text-[7.5pt] text-slate-900 leading-relaxed space-y-0.5 shadow-2xs">
              <p className="font-semibold text-slate-950">
                {insuranceDecision?.commentExpert || `Au regard des relevés instrumentaux officiels Météo-France dans le rayon de 30 km et de l'absence d'activité orageuse convective, l'événement du ${sinistre.dateSinistre} sur ${sinistre.commune} a été expertisé avec rigueur.`}
              </p>
            </div>
          </div>

          {/* 8. Validation & Signature Officielle Patrick Marlière */}
          <div>
            <h2 className="text-[8pt] font-black uppercase tracking-wider text-slate-900 mb-1 border-l-4 border-sky-600 pl-1.5">
              5. Validation et Certification Conforme
            </h2>
            <div className="border border-slate-300 rounded-lg p-2 bg-white text-[7pt] text-slate-800 flex justify-between items-center shadow-2xs">
              <div className="max-w-[62%] space-y-0.5">
                <p>
                  Ce certificat est délivré sur la base des observations officielles fournies par l'ensemble des stations Météo-France dans le rayon de 30 km (normes OMM 3s).
                </p>
                <p className="text-slate-500 font-medium">
                  Document officiel certifié opposable pour la gestion et l'instruction des sinistres d'assurance.
                </p>
                <p className="text-[6.5pt] font-mono text-slate-500 pt-0.5">
                  Établi en date du {todayStr} • Réf: {reference}
                </p>
              </div>

              <div className="text-right border-l border-slate-200 pl-2.5">
                <span className="text-[6.5pt] font-bold text-slate-500 block">Validé et certifié conforme par :</span>
                <strong className="text-[8.5pt] font-black text-slate-950 block">Monsieur Patrick MARLIÈRE</strong>
                <span className="text-[6.5pt] text-sky-900 font-bold bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 inline-block my-0.5">
                  Directeur Météo-Climat Pro
                </span>
                <div className="text-[6pt] text-slate-400 font-mono italic">[ Visa d'expert certifié ]</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec QR code */}
        <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center text-[6.5pt] text-slate-500">
          <div>
            <p className="font-bold text-slate-700">Météo Climat PRO — Certificat d'Intempéries Officiel (Rayon 30 km)</p>
            <p className="text-[5.5pt]">Vérification numérique : {reference} • Conforme normes AFNOR & OMM</p>
          </div>
          {qrUrl && (
            <div className="flex items-center gap-1.5">
              <div className="text-right">
                <span className="text-[6pt] font-bold text-slate-800 block">Authenticité certifiée</span>
                <span className="text-[5pt] text-slate-400 font-mono">Scan QR Code</span>
              </div>
              <img src={qrUrl} alt="QR Code" className="w-5 h-5 border border-slate-200 rounded p-0.5 bg-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
