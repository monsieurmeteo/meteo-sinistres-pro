import React from 'react';
import { LayoutDashboard, FolderSearch, Calendar, PlusCircle } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'dossiers', label: 'Dossiers Sinistres', icon: FolderSearch },
    { id: 'new', label: 'Nouveau Sinistre', icon: PlusCircle },
    { id: 'climatology', label: 'Climatologie 1950-2026', icon: Calendar }
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="space-y-1.5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
        <p className="font-bold text-slate-900">Météo Climat PRO</p>
        <p className="mt-0.5">Certifications Assurances & Données Météo-France</p>
        <p className="mt-1 font-mono text-[10px] text-sky-700 font-bold">Version 1.0 Pro</p>
      </div>
    </aside>
  );
}
