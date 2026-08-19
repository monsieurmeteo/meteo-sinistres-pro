import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

const BADGE_MAP = {
  'très élevée': 'bg-emerald-50 text-emerald-800 border-emerald-300',
  'très elevee': 'bg-emerald-50 text-emerald-800 border-emerald-300',
  'élevée': 'bg-emerald-50 text-emerald-800 border-emerald-300',
  'elevee': 'bg-emerald-50 text-emerald-800 border-emerald-300',
  'moyenne': 'bg-amber-50 text-amber-800 border-amber-300',
  'faible': 'bg-rose-50 text-rose-800 border-rose-300'
};

export default function ConfidenceBadge({ level = 'Élevée', score = 85, reason = '' }) {
  const normKey = (level || 'Élevée').toLowerCase();
  const colorClass = BADGE_MAP[normKey] || 'bg-sky-50 text-sky-800 border-sky-300';
  const isWeak = normKey === 'faible';

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
        {isWeak ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
        Indice de représentativité : {level} ({score}%)
      </span>
      {reason && <span className="text-xs text-slate-500 hidden md:inline">({reason})</span>}
    </div>
  );
}
