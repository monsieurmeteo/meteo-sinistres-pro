import React, { useState } from 'react';
import { 
  FolderSearch, Plus, Eye, Copy, Trash2, Download, Search, 
  Calendar, MapPin, User, FileText
} from 'lucide-react';

export default function DossierList({ dossiers = [], onOpenDossier, onNewDossier, onDeleteDossier, onDuplicateDossier }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = dossiers.filter(d => {
    const q = searchTerm.toLowerCase();
    const matchQuery = 
      (d.reference || '').toLowerCase().includes(q) ||
      (d.assure?.nom || '').toLowerCase().includes(q) ||
      (d.sinistre?.commune || '').toLowerCase().includes(q) ||
      (d.sinistre?.numSinistre || '').toLowerCase().includes(q);

    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchQuery && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filtres */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <FolderSearch className="w-6 h-6 text-sky-400" />
            Dossiers de Sinistres & Rapports
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Archivage et consultation des dossiers expertisés
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher dossier, assuré, ville..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-3.5 py-2 pl-9 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-64"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="Rapport généré">Rapport généré</option>
            <option value="Analyse terminée">Analyse terminée</option>
            <option value="Brouillon">Brouillon</option>
          </select>

          <button
            onClick={onNewDossier}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Nouveau Sinistre
          </button>
        </div>
      </div>

      {/* Tableau des Dossiers */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Réf. Dossier</th>
                <th className="p-3.5">Assuré</th>
                <th className="p-3.5">Commune</th>
                <th className="p-3.5">Type Sinistre</th>
                <th className="p-3.5 text-center">Date Événement</th>
                <th className="p-3.5 text-center">Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-3.5 font-mono font-bold text-sky-400">
                    {d.reference || d.id}
                  </td>
                  <td className="p-3.5 font-semibold text-slate-200">
                    {d.assure?.nom} {d.assure?.prenom}
                    {d.assure?.societe && <span className="text-[11px] text-slate-400 block font-normal">{d.assure.societe}</span>}
                  </td>
                  <td className="p-3.5 text-slate-300">
                    {d.sinistre?.commune} ({d.sinistre?.codePostal})
                  </td>
                  <td className="p-3.5 text-slate-300 font-medium">
                    {d.sinistre?.sinistreType || '-'}
                  </td>
                  <td className="p-3.5 text-center font-mono text-slate-300">
                    {d.sinistre?.dateSinistre}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      d.status === 'Rapport généré'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {d.status || 'Brouillon'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenDossier(d)}
                        className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition"
                        title="Ouvrir l'analyse"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDuplicateDossier(d)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="Dupliquer le dossier"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteDossier(d.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    Aucun dossier de sinistre trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
