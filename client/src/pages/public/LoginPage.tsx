import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { fetchMerchants, setActiveMerchantId } from '../../services/api';
import { Merchant } from '../../types';

export const LoginPage: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMerchants()
      .then((data) => {
        setMerchants(data);
        if (data.length > 0) {
          setSelectedMerchantId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load merchants', err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMerchantId) {
      setActiveMerchantId(selectedMerchantId);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-emerald-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to RecoverAI</h2>
          <p className="text-xs text-slate-400">
            Access your merchant revenue recovery workspace & telemetry.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Select Merchant Workspace</label>
            <div className="relative">
              <select
                value={selectedMerchantId}
                onChange={(e) => setSelectedMerchantId(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              >
                {loading ? (
                  <option>Loading merchant workspaces...</option>
                ) : (
                  merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className="text-[11px] text-slate-500">
              Demo sandbox mode: select from available seeded merchant accounts.
            </p>
          </div>

          <button
            type="submit"
            disabled={!selectedMerchantId}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            Enter Merchant Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
          <p className="text-xs text-slate-400">
            New to RecoverAI?{' '}
            <NavLink to="/signup" className="text-emerald-400 hover:underline font-semibold">
              Create sandbox workspace
            </NavLink>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Strict Multi-Tenant Isolation
          </div>
        </div>
      </div>
    </div>
  );
};
