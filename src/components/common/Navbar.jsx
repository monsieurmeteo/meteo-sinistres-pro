import React from 'react';
import { Plus, Shield, Settings, Bell } from 'lucide-react';

export default function Navbar({ onNewDossier, onOpenSettings }) {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0b0f19]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <img src="/logo_meteo_climat_pro.png" alt="Météo Climat PRO" className="h-10 object-contain" />
        <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 hidden sm:inline">
          PRO SINISTRES
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onNewDossier}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Nouveau Sinistre
        </button>
      </div>
    </header>
  );
}
