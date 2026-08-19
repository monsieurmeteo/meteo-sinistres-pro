import React from 'react';
import { 
  ShieldCheck, FilePlus, FolderClock, FileText, CheckCircle2, 
  TrendingUp, ArrowRight, Wind, Droplets, Calendar
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';

export default function MainDashboard({ dossiers = [], onNewDossier, onOpenDossier, onGoToClim }) {
  const totalCount = dossiers.length;
  const reportsCount = dossiers.filter(d => d.status === 'Rapport généré').length;
  const inProgressCount = totalCount - reportsCount;

  return (
    <div className="space-y-6">
      {/* Banner Accueil */}
      <div className="rounded-2xl p-8 border border-sky-200 shadow-md relative overflow-hidden bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-900 text-white">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-200 px-3 py-1 rounded-full bg-white/10 border border-white/20 inline-block mb-3 backdrop-blur">
            Météo Climat PRO — Plateforme Expertises & Assurances
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Générateur d'Attestations & Rapports Météorologiques de Sinistres
          </h1>
          <p className="text-xs text-sky-100 mt-2 leading-relaxed">
            Géolocalisation automatique, moteur de sélection des 3 stations de référence Météo-France, analyse descriptive experte et édition de rapports PDF certifiés A4.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={onNewDossier}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-sky-950 text-xs font-bold shadow-lg hover:bg-sky-50 transition transform hover:-translate-y-0.5"
            >
              <FilePlus className="w-4 h-4 text-sky-600" />
              + Nouveau Dossier de Sinistre
            </button>

            <button
              onClick={onGoToClim}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-900/80 border border-sky-400/30 hover:border-white text-xs font-semibold text-white transition"
            >
              <Calendar className="w-4 h-4 text-sky-300" />
              Archives & Climatologie (1950 - Aujourd'hui)
            </button>
          </div>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Dossiers"
          value={totalCount}
          subtitle="Dossiers enregistrés"
          icon={FileText}
          color="sky"
        />
        <StatCard
          title="Rapports Générés"
          value={reportsCount}
          subtitle="Attestations certifiées"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Dossiers en attente"
          value={inProgressCount}
          subtitle="Analyses à finaliser"
          icon={FolderClock}
          color="amber"
        />
        <StatCard
          title="Stations Couvertes"
          value="2 925"
          subtitle="Réseau Météo-France officiel"
          icon={ShieldCheck}
          color="indigo"
        />
      </div>

      {/* Derniers Dossiers récents */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Derniers Sinistres Expertisés
          </h3>
        </div>

        <div className="space-y-2">
          {dossiers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Aucun dossier enregistré pour le moment.
            </div>
          ) : (
            dossiers.slice(0, 4).map(d => (
              <div
                key={d.id}
                onClick={() => onOpenDossier(d)}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-sky-400 hover:bg-white cursor-pointer flex items-center justify-between transition group shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">{d.reference}</span>
                    <span className="text-xs font-bold text-slate-900">{d.assure?.nom} {d.assure?.prenom}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {d.sinistre?.commune} — {d.sinistre?.sinistreType} ({d.sinistre?.dateSinistre})
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    d.status === 'Rapport généré' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {d.status || 'Brouillon'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
