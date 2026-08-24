import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { setActiveMerchantId } from '../../services/api';

export const SignupPage: React.FC = () => {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('INR');
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // Default to the primary demo merchant ID or store new context
    setActiveMerchantId('merchant_test_001');
    navigate('/onboarding');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-emerald-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Merchant Sandbox</h2>
          <p className="text-xs text-slate-400">
            Start recovering failed payments with AI diagnostics & Razorpay Test Mode.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Business / Store Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Retail India"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Merchant Email</label>
            <input
              type="email"
              required
              placeholder="finance@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Primary Settlement Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="INR">INR (₹ Indian Rupee)</option>
              <option value="USD">USD ($ US Dollar)</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Test Mode Sandbox Included
            </div>
            <div>No credit card or live payment credentials required.</div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-95"
          >
            Continue to Gateway Setup
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
          <p className="text-xs text-slate-400">
            Already have a merchant workspace?{' '}
            <NavLink to="/login" className="text-emerald-400 hover:underline font-semibold">
              Sign In
            </NavLink>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Deterministic AI Fallback Guardrails
          </div>
        </div>
      </div>
    </div>
  );
};
