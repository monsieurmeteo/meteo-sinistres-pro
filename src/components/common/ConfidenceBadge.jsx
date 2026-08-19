import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export default function ConfidenceBadge({ level = 'Élevée', score = 85, reason = '' }) {
  const getColors = () => {
    switch (level?.toLowerCase()) {
      case 'très élevée':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'élevée':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'moyenne':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'faible':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getColors()}`}>
        {level?.toLowerCase() === 'faible' ? (
          <ShieldAlert className="w-3.5 h-3.5" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5" />
        )}
        Indice de représentativité : {level} ({score}%)
      </span>
      {reason && <span className="text-xs text-slate-400 hidden md:inline">({reason})</span>}
    </div>
  );
}
