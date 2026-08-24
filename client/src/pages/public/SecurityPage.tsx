import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  FileCheck,
  Layers,
  Ban,
  Key,
  ArrowRight,
} from 'lucide-react';

export const SecurityPage: React.FC = () => {
  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-emerald-400">SECURITY & GOVERNANCE</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Financial data protection & zero-trust architecture
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Factual architectural safeguards engineered to protect merchant transaction integrity, prevent duplicate billing, and ensure cryptographic financial reconciliation.
        </p>
      </div>

      {/* Security Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Multi-Tenant RBAC Isolation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Granular access control enforcing merchant boundaries with <span className="font-mono text-slate-300">User</span> and <span className="font-mono text-slate-300">MerchantMembership</span> relationships. Roles include <span className="font-mono text-white text-[11px]">OWNER</span>, <span className="font-mono text-white text-[11px]">ADMIN</span>, <span className="font-mono text-white text-[11px]">ANALYST</span>, <span className="font-mono text-white text-[11px]">SUPPORT</span>, and <span className="font-mono text-white text-[11px]">VIEWER</span>.
          </p>
        </div>

        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Timing-Safe HMAC SHA-256</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            All Razorpay webhooks require raw-body HMAC SHA-256 signature verification evaluated using <span className="font-mono text-slate-300">crypto.timingSafeEqual</span> to defeat side-channel timing attacks.
          </p>
        </div>

        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Attempt Idempotency Locks</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Database constraints (<span className="font-mono text-slate-300">@@unique([transactionId, attemptNumber])</span>) and webhook event deduplication (<span className="font-mono text-slate-300">x-razorpay-event-id</span>) prevent double-charging or race conditions.
          </p>
        </div>

        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Immutable Audit Logging</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every recovery decision, AI reasoning factor, and execution event is committed with correlation IDs, timestamps, actor metadata, IP address, and non-cascading persistence.
          </p>
        </div>

        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Ban className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Strict Test Mode Guardrails</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The platform strictly enforces Razorpay Test Mode keys (<span className="font-mono text-slate-300">rzp_test_</span>). Hardcoded security filters reject live credentials to ensure zero live customer risk during sandbox testing.
          </p>
        </div>

        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Zero Client Secret Leakage</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Database connection strings, Redis auth tokens, and Gemini API keys reside exclusively in backend environment variables and are completely stripped from all client REST payloads.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Ready to test the recovery engine?</h3>
        <NavLink
          to="/signup"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-900/30"
        >
          Create Sandbox Account
          <ArrowRight className="w-4 h-4" />
        </NavLink>
      </div>
    </div>
  );
};
