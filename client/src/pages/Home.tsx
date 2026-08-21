import React from 'react';
import { useHealth } from '../hooks/useHealth';
import { ShieldCheck, Cpu } from 'lucide-react';

export const Home: React.FC = () => {
  const { data: health, loading, error } = useHealth();

  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
        <Cpu className="w-12 h-12" />
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          RecoverAI
        </h1>
        <p className="text-xl font-medium text-cyan-400">
          AI Revenue Recovery Agent
        </p>
      </div>

      <div className="w-full pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          Foundation Status
        </span>
        <span className="font-mono">
          {loading && 'Checking API...'}
          {error && <span className="text-amber-400">API Offline ({error})</span>}
          {health && <span className="text-emerald-400">API {health.status.toUpperCase()}</span>}
        </span>
      </div>
    </div>
  );
};
