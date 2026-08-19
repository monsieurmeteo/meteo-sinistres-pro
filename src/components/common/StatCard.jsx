import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'sky' }) {
  const colorMap = {
    sky: 'text-sky-600 bg-sky-50 border-sky-200',
    amber: 'text-amber-600 bg-amber-50 border-amber-200',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    rose: 'text-rose-600 bg-rose-50 border-rose-200'
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
        <p className="text-3xl font-extrabold text-slate-950 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`p-3.5 rounded-xl border ${colorMap[color] || colorMap.sky}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
