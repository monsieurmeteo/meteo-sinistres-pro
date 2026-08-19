import React from 'react';
import { Plus, User, LogOut } from 'lucide-react';

export default function Navbar({ onNewDossier, currentUser, onLogout }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      <div className="flex items-center gap-3">
        <img src="/logo_meteo_climat_pro.png" alt="Météo Climat PRO" className="h-10 object-contain" />
        <span className="text-xs font-mono font-bold text-sky-700 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 hidden sm:inline">
          PRO SINISTRES
        </span>
      </div>

      <div className="flex items-center gap-3">
        {currentUser && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-bold hidden sm:flex">
            <User className="w-3.5 h-3.5 text-sky-600" />
            <span>{currentUser}</span>
          </div>
        )}

        <button
          onClick={onNewDossier}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Nouveau Sinistre
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 transition"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
