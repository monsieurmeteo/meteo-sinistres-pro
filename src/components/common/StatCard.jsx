import React from 'react';

const COLOR_MAP = {
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', iconBg: 'bg-sky-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', iconBg: 'bg-amber-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', iconBg: 'bg-indigo-100' }
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'sky' }) {
  const styles = COLOR_MAP[color] || COLOR_MAP.sky;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
          {title}
        </span>
        <span className="text-2xl font-black text-slate-900 block">
          {value}
        </span>
        {subtitle && (
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
            {subtitle}
          </span>
        )}
      </div>

      {Icon && (
        <div className={`p-3.5 rounded-xl ${styles.iconBg} ${styles.text} border ${styles.border}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
