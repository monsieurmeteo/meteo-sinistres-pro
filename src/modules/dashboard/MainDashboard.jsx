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
      <div className="glass-card rounded-2xl p-8 border border-sky-500/30 shadow-2xl relative overflow-hidden bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-400 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 inline-block mb-3">
            Météo Climat PRO — Plateforme Expertises & Assurances
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Générateur d'Attestations & Rapports Météorologiques de Sinistres
          </h1>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Géolocalisation automatique, moteur de sélection des 3 stations de référence Météo-France, analyse descriptive experte et édition de rapports PDF certifiés A4.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={onNewDossier}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-xl shadow-sky-600/30 transition transform hover:-translate-y-0.5"
            >
              <FilePlus className="w-4 h-4" />
              + Nouveau Dossier de Sinistre
            </button>

            <button
              onClick={onGoToClim}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-sky-500 text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              <Calendar className="w-4 h-4 text-sky-400" />
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
          value="2 418"
          subtitle="Réseau Météo-France officiel"
          icon={ShieldCheck}
          color="indigo"
        />
      </div>

      {/* Derniers Dossiers récents */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Derniers Sinistres Expertisés
          </h3>
        </div>

        <div className="space-y-2">
          {dossiers.slice(0, 4).map(d => (
            <div
              key={d.id}
              onClick={() => onOpenDossier(d)}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/40 cursor-pointer flex items-center justify-between transition group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-sky-400">{d.reference}</span>
                  <span className="text-xs font-bold text-white">{d.assure?.nom} {d.assure?.prenom}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {d.sinistre?.commune} — {d.sinistre?.sinistreType} ({d.sinistre?.dateSinistre})
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  d.status === 'Rapport généré' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {d.status}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
