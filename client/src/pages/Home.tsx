import React from 'react';
import { useHealth } from '../hooks/useHealth';
import { ShieldCheck, Cpu } from 'lucide-react';

export const Home: React.FC = () => {
  const { data: health, loading, error } = useHealth();

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-surface-container-lowest/80 border border-outline-variant/30 backdrop-blur-2xl shadow-2xl space-y-6 max-w-lg mx-auto my-12">
      <div className="p-4 rounded-2xl bg-primary-container/20 border border-primary/30 text-primary-fixed-dim shadow-inner">
        <Cpu className="w-12 h-12" />
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold font-geist tracking-tight text-white">
          RecoverAI
        </h1>
        <p className="text-sm font-mono font-medium text-secondary-fixed tracking-wider uppercase">
          Autonomous Revenue Recovery Engine
        </p>
      </div>

      <div className="w-full pt-4 border-t border-outline-variant/20 flex items-center justify-between text-xs font-mono text-outline">
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-secondary-fixed" />
          Foundation Status
        </span>
        <span>
          {loading && 'Checking API...'}
          {error && <span className="text-amber-300">API Offline ({error})</span>}
          {health && <span className="text-secondary-fixed font-bold">API {health.status.toUpperCase()}</span>}
        </span>
      </div>
    </div>
  );
};
