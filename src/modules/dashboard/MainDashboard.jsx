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
      {/* Banner Accueil Élégante Claire */}
      <div className="glass-card rounded-2xl p-8 border border-sky-200 shadow-sm relative overflow-hidden bg-gradient-to-r from-sky-50 via-white to-sky-50/50">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-700 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 inline-block mb-3">
            Météo Climat PRO — Plateforme Expertises & Assurances
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Générateur d'Attestations & Rapports Météorologiques de Sinistres
          </h1>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
            Géolocalisation automatique BAN, moteur de sélection des 3 stations de référence Météo-France, analyse descriptive experte, consigne de gestion assurance et édition de rapports PDF certifiés A4.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={onNewDossier}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition transform hover:-translate-y-0.5"
            >
              <FilePlus className="w-4 h-4" />
              + Nouveau Dossier de Sinistre
            </button>

            <button
              onClick={onGoToClim}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-sky-500 text-xs font-bold text-slate-700 hover:text-sky-700 transition shadow-xs"
            >
              <Calendar className="w-4 h-4 text-sky-600" />
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
          color="sky"
        />
        <StatCard
          title="Rapports Générés"
          value={reportsCount}
          subtitle="Attestations certifiées"
          icon={FileText}
          color="emerald"
        />
        <StatCard
          title="En Cours d'Analyse"
          value={inProgressCount}
          subtitle="En attente de finalisation"
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title="Réseau Météo-France"
          value="2 418"
          subtitle="Stations connectées"
          icon={ShieldCheck}
          color="indigo"
        />
      </div>

      {/* Liste des Derniers Dossiers */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            Dossiers de Sinistres Récents
          </h2>
          <span className="text-xs text-slate-500 font-mono font-medium">
            {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} au total
          </span>
        </div>

        {dossiers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-medium">
            Aucun dossier de sinistre en cours. Cliquez sur "+ Nouveau Dossier de Sinistre" pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {dossiers.slice(0, 8).map((d) => (
              <div 
                key={d.id}
                onClick={() => onOpenDossier(d)}
                className="py-3.5 px-3 -mx-3 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 font-extrabold text-xs font-mono">
                    {d.reference?.slice(-3) || '001'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900 group-hover:text-sky-700 transition">
                        {d.assure?.nom ? `${d.assure.prenom || ''} ${d.assure.nom}` : 'Dossier sans nom'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 font-medium">
                        ({d.reference})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3 font-medium">
                      <span>📍 {d.sinistre?.commune || 'Commune non définie'}</span>
                      <span>⚡ {d.sinistre?.sinistreType || 'Type non défini'}</span>
                      <span>📅 {d.sinistre?.dateSinistre || 'Date inconnue'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                    d.status === 'Rapport généré' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {d.status || 'En cours'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
