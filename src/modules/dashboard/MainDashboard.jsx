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

      {/* 4 StatCards Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Dossiers Traités"
          value={totalCount}
          subtitle="Sinistres expertisés"
          icon={FolderClock}
          trend="+12% ce mois"
          variant="primary"
        />
        <StatCard
          title="Rapports Générés"
          value={reportsCount}
          subtitle="Attestations certifiées"
          icon={FileText}
          variant="success"
        />
        <StatCard
          title="En Cours d'Analyse"
          value={inProgressCount}
          subtitle="En attente de finalisation"
          icon={TrendingUp}
          variant="warning"
        />
        <StatCard
          title="Réseau Météo-France"
          value="2 418"
          subtitle="Stations connectées"
          icon={ShieldCheck}
          variant="secondary"
        />
      </div>

      {/* Liste des Derniers Dossiers */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl bg-slate-900/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            Dossiers de Sinistres Récents
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} au total
          </span>
        </div>

        {dossiers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            Aucun dossier de sinistre en cours. Cliquez sur "+ Nouveau Dossier de Sinistre" pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {dossiers.slice(0, 8).map((d) => (
              <div 
                key={d.id}
                onClick={() => onOpenDossier(d)}
                className="py-3.5 px-3 -mx-3 rounded-xl hover:bg-slate-800/60 transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-xs">
                    {d.reference?.slice(-3) || '001'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white group-hover:text-sky-300 transition">
                        {d.assure?.nom ? `${d.assure.prenom || ''} ${d.assure.nom}` : 'Dossier sans nom'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        ({d.reference})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                      <span>📍 {d.sinistre?.commune || 'Commune non définie'}</span>
                      <span>⚡ {d.sinistre?.sinistreType || 'Type non défini'}</span>
                      <span>📅 {d.sinistre?.dateSinistre || 'Date inconnue'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    d.status === 'Rapport généré' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {d.status || 'En cours'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
