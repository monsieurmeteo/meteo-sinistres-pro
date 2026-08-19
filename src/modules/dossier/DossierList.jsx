import React, { useState } from 'react';
import { 
  FolderSearch, Plus, Eye, Copy, Trash2, Search
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
      <div className="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 bg-white">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <FolderSearch className="w-6 h-6 text-sky-600" />
            Dossiers de Sinistres & Rapports
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
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
              className="px-3.5 py-2 pl-9 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 w-64 shadow-xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500 shadow-xs"
          >
            <option value="all">Tous les statuts</option>
            <option value="Rapport généré">Rapport généré</option>
            <option value="Analyse terminée">Analyse terminée</option>
            <option value="Brouillon">Brouillon</option>
          </select>

          <button
            onClick={onNewDossier}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Nouveau Sinistre
          </button>
        </div>
      </div>

      {/* Tableau des Dossiers */}
      <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200 text-[10px]">
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
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-mono font-bold text-sky-700">
                    {d.reference || d.id}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">
                    {d.assure?.nom} {d.assure?.prenom}
                    {d.assure?.societe && <span className="text-[11px] text-slate-500 block font-normal">{d.assure.societe}</span>}
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    {d.sinistre?.commune} ({d.sinistre?.codePostal})
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    {d.sinistre?.sinistreType || '-'}
                  </td>
                  <td className="p-3.5 text-center font-mono text-slate-700 font-bold">
                    {d.sinistre?.dateSinistre}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      d.status === 'Rapport généré'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {d.status || 'Brouillon'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenDossier(d)}
                        className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition"
                        title="Ouvrir l'analyse"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDuplicateDossier(d)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                        title="Dupliquer le dossier"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteDossier(d.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
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
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs font-medium">
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
