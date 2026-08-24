import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, ShieldCheck, Store } from 'lucide-react';
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

  const handleSelectMerchantAndLogin = (merchantId: string) => {
    setActiveMerchantId(merchantId);
    navigate('/dashboard');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMerchantId) {
      setActiveMerchantId(selectedMerchantId);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-emerald-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to RecoverAI</h2>
          <p className="text-xs text-slate-400">
            Select a merchant workspace to access your recovery operations dashboard.
          </p>
        </div>

        {/* 1-Click Quick Login Cards for Demo Sandbox */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            <span>Demo Sandbox Evaluation Access</span>
            <span className="text-amber-400 font-bold">TEST MODE</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {merchants.slice(0, 2).map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMerchantAndLogin(m.id)}
                className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {m.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{m.email}</div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                  <span className={idx === 0 ? "text-emerald-400 font-semibold" : "text-cyan-400 font-semibold"}>
                    {m.role || (idx === 0 ? "OWNER" : "ADMIN")} ROLE
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] font-mono uppercase text-slate-500">
            or select an active sandbox workspace
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Custom Select Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-400" />
                Merchant Account
              </span>
            </label>
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono transition-colors"
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

          <button
            type="submit"
            disabled={!selectedMerchantId}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            Enter Selected Workspace
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
          <p className="text-xs text-slate-400">
            New to RecoverAI?{' '}
            <NavLink to="/signup" className="text-emerald-400 hover:underline font-semibold">
              Create sandbox workspace & onboarding
            </NavLink>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Multi-Tenant Isolation & Zero Secret Exposure
          </div>
        </div>
      </div>
    </div>
  );
};
