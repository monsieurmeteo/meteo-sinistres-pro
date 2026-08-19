import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'sky', trend }) {
  const colorMap = {
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80 shadow-xl flex items-center justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
        <p className="text-3xl font-extrabold text-white mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`p-3.5 rounded-xl border ${colorMap[color] || colorMap.sky}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
