import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowRight,
  Layers,
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-cyan-400">ENGINEERING SPECIFICATION</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          How the 6-Stage Recovery Engine Operates
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          From transaction failure ingestion to cryptographic ledger reconciliation.
        </p>
      </div>

      {/* 6 Stages Expanded */}
      <div className="space-y-8">
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase">STAGE 01 — REAL-TIME INGESTION</span>
            <span className="text-xs font-mono text-slate-500">GATEWAY WEBHOOK STREAM</span>
          </div>
          <h3 className="text-xl font-bold text-white">Detection & Feature Extraction</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            When a checkout payment fails on your website, RecoverAI ingests the raw failure event. The detection service extracts transaction attributes (amount, currency, merchant ID, customer payment history, and gateway failure codes) to build an isolated execution context.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase">STAGE 02 — RECOVERY PROBABILITY</span>
            <span className="text-xs font-mono text-slate-500">0.00 TO 1.00 CONFIDENCE SCORE</span>
          </div>
          <h3 className="text-xl font-bold text-white">Mathematical Scoring & Risk Classification</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            The scoring engine evaluates whether the failure is recoverable (e.g. transient network timeouts score &gt;85% likelihood, while expired payment instruments score &lt;10%). It also classifies economic priority based on customer lifetime spend.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">STAGE 03 — LLM ROOT-CAUSE DIAGNOSIS</span>
            <span className="text-xs font-mono text-slate-500">GOOGLE GEMINI 3.5 FLASH</span>
          </div>
          <h3 className="text-xl font-bold text-white">AI Diagnostic Interpretation</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Google Gemini translates obscure decline codes into categorized failure reasons (<span className="font-mono text-indigo-300 text-xs">TEMPORARY_INFRASTRUCTURE</span>, <span className="font-mono text-indigo-300 text-xs">CUSTOMER_AUTHENTICATION</span>, <span className="font-mono text-indigo-300 text-xs">FINANCIAL_HARD</span>). If the LLM times out or errors, an instant deterministic fallback rule is engaged.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-mono text-amber-400 font-bold uppercase">STAGE 04 — POLICY ENGINE</span>
            <span className="text-xs font-mono text-slate-500">DETERMINISTIC SAFETY OVERRIDES</span>
          </div>
          <h3 className="text-xl font-bold text-white">Contextual Action Selection</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Hardcoded deterministic business rules evaluate the AI advisory against safety guardrails:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-emerald-400 font-bold">RETRY</span>: Temporary network/gateway spike
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-cyan-400 font-bold">WAIT</span>: Cooldown for bank congestion
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-indigo-400 font-bold">REMIND</span>: 3DS OTP drop-off link
            </div>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-mono text-rose-400 font-bold uppercase">STAGE 05 — CONTROLLED EXECUTION</span>
            <span className="text-xs font-mono text-slate-500">UPSTASH REDIS + BULLMQ</span>
          </div>
          <h3 className="text-xl font-bold text-white">Asynchronous Dispatch & Idempotency Lock</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            The BullMQ worker queue handles the execution task with concurrency locks, verifying that the transaction has not already succeeded or exceeded max attempts ($n \ge 3$). It creates a Razorpay Test Mode Order or Customer Payment Link.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase">STAGE 06 — CRYPTOGRAPHIC SETTLEMENT</span>
            <span className="text-xs font-mono text-emerald-400">POSTGRESQL PAYMENT LEDGER</span>
          </div>
          <h3 className="text-xl font-bold text-emerald-300">Verified Payment Reconciliation</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            When the customer or bank captures the transaction, Razorpay sends a signed <span className="font-mono text-white text-xs">payment.captured</span> webhook. RecoverAI verifies the signature using timing-safe HMAC SHA-256 and writes the verified amount to the <span className="font-mono text-white text-xs">Payment</span> ledger table.
          </p>
        </div>
      </div>

      {/* Recovery Timelines Matrix */}
      <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-mono text-emerald-400 uppercase font-semibold">
            Expected Retention Benchmarks
          </div>
          <h2 className="text-2xl font-bold text-white">
            Recovery Timelines by Policy Strategy
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse min-w-[580px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950">
                <th className="py-3 px-4 font-semibold text-slate-400">Action</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Failure Trigger</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Recovery Window</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Retention Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
              <tr>
                <td className="py-3 px-4 text-emerald-400 font-bold">RETRY</td>
                <td className="py-3 px-4 text-slate-300">Gateway Timeout / Network Drop</td>
                <td className="py-3 px-4 text-slate-300">0 – 5 Minutes</td>
                <td className="py-3 px-4 text-emerald-300">70% – 85% Recovered</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-cyan-400 font-bold">WAIT</td>
                <td className="py-3 px-4 text-slate-300">Bank Server Spike / UPI Peak Hour</td>
                <td className="py-3 px-4 text-slate-300">15 – 30 Minutes</td>
                <td className="py-3 px-4 text-cyan-300">50% – 65% Recovered</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-indigo-400 font-bold">REMIND</td>
                <td className="py-3 px-4 text-slate-300">3DS Drop-off / OTP Latency</td>
                <td className="py-3 px-4 text-slate-300">1 – 24 Hours</td>
                <td className="py-3 px-4 text-indigo-300">35% – 55% Recovered</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-rose-400 font-bold">STOP</td>
                <td className="py-3 px-4 text-slate-300">Expired Card / Max Retries Reached</td>
                <td className="py-3 px-4 text-slate-300">Immediate (0s)</td>
                <td className="py-3 px-4 text-slate-500">Halted (Loss Prevention)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center pt-4">
        <NavLink
          to="/security"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-900/30"
        >
          View Security & Multi-Tenant Isolation
          <ArrowRight className="w-4 h-4" />
        </NavLink>
      </div>
    </div>
  );
};
