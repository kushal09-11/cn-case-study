import React from 'react';
import { HelpCircle } from 'lucide-react';

export function MetricCard({ 
  title, 
  value, 
  unit = '', 
  subtitle, 
  icon: Icon, 
  color = 'sky', 
  tooltip 
}) {
  const colorMap = {
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20 group-hover:border-sky-500/40',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/40',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 group-hover:border-rose-500/40',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 group-hover:border-indigo-500/40',
  };

  const textMap = {
    sky: 'text-sky-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    indigo: 'text-indigo-400',
  };

  return (
    <div className="group relative rounded-xl bg-slate-900/60 border border-slate-800 p-4 transition-all hover:bg-slate-900/90 hover:border-slate-700/80 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
          {tooltip && (
            <div className="relative group/tip cursor-help">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/tip:block w-48 p-2 text-[11px] font-normal normal-case leading-relaxed rounded-lg bg-slate-800 text-slate-200 border border-slate-700 shadow-xl z-30 pointer-events-none">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg border transition-all ${colorMap[color] || colorMap.sky}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-slate-100">
          {value !== undefined && value !== null ? value : '--'}
        </span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
