import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  RotateCcw,
  Search,
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-emerald-400">PRODUCT CAPABILITIES</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Engineered for autonomous, verified revenue recovery
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          RecoverAI integrates detection, LLM-based root-cause diagnosis, deterministic safety policy, background workers, and cryptographic reconciliation into a unified platform.
        </p>
      </div>

      {/* Feature Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Capability 1 */}
        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Detection & Scoring Engine</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Continuously ingests failed transaction streams, assesses merchant risk, and computes recovery probabilities (0–100%) by correlating historical customer lifetime value with failure codes.
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>PHASE 3 ENGINE</span>
            <span>•</span>
            <span>0-100% PROBABILITY</span>
          </div>
        </div>

        {/* Capability 2 */}
        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Gemini AI Diagnostics</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Translates cryptic gateway error payloads into standardized failure categories with structured JSON outputs, reasoning factors, and instant deterministic fallback guarantees.
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>GEMINI 3.5 FLASH</span>
            <span>•</span>
            <span>ZERO DOWNTIME FALLBACK</span>
          </div>
        </div>

        {/* Capability 3 */}
        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Authoritative Decision Engine</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Deterministic hard safety rules enforce contextual actions (<span className="font-mono text-white text-[11px]">RETRY</span>, <span className="font-mono text-white text-[11px]">WAIT</span>, <span className="font-mono text-white text-[11px]">REMIND</span>, <span className="font-mono text-white text-[11px]">STOP</span>). Prevents AI hallucinations and limits max retries.
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>HARD SAFETY OVERRIDES</span>
            <span>•</span>
            <span>MAX RETRY GUARDS</span>
          </div>
        </div>

        {/* Capability 4 */}
        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <RotateCcw className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">BullMQ Worker Queue</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Scalable asynchronous execution backed by Upstash Redis, supporting concurrency = 5, automated exponential retry backoff, and strict idempotency locks.
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>UPSTASH REDIS</span>
            <span>•</span>
            <span>BULLMQ QUEUES</span>
          </div>
        </div>

        {/* Capability 5 */}
        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Payment Evidence Ledger</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Financial reconciliation architecture ensuring revenue is counted if and only if Razorpay emits a verified <span className="font-mono text-white text-[11px]">payment.captured</span> HMAC webhook matching the exact paise amount.
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>POSTGRESQL EVIDENCE</span>
            <span>•</span>
            <span>ZERO FALSE POSITIVES</span>
          </div>
        </div>

        {/* Capability 6 */}
        <div className="p-7 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">System Telemetry & Health</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time multi-service telemetry calculating live query latencies, queue depths, AI fallback rates, and webhook error rates without hardcoded values.
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>GET /api/system/health</span>
            <span>•</span>
            <span>20S POLLING</span>
          </div>
        </div>
      </div>

      {/* Navigation Footer CTA */}
      <div className="pt-8 text-center space-y-4">
        <NavLink
          to="/how-it-works"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-900/30"
        >
          See 6-Stage Workflow & Timelines
          <ArrowRight className="w-4 h-4" />
        </NavLink>
      </div>
    </div>
  );
};
