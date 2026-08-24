import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
  RotateCcw,
  Ban,
  Server,
  Lock,
  Sparkles,
  BarChart3,
  Search,
  FileCheck,
  ShoppingBag,
  CreditCard,
  Building,
} from 'lucide-react';
import { getActiveMerchantId } from '../../services/api';

interface LifecycleScenario {
  id: string;
  name: string;
  amount: string;
  failureCode: string;
  detectionScore: string;
  diagnosis: string;
  recommendedAction: 'RETRY' | 'WAIT' | 'REMIND' | 'STOP';
  executionDetail: string;
  webhookEvent: string;
  recoveredAmount: string;
  status: 'RECOVERED' | 'CANCELLED';
}

const LIFECYCLE_SCENARIOS: LifecycleScenario[] = [
  {
    id: 'txn_sim_01',
    name: 'Temporary Gateway Timeout (Bank Spike)',
    amount: '₹2,499',
    failureCode: 'GATEWAY_TIMEOUT',
    detectionScore: '92% Recovery Likelihood',
    diagnosis: 'Temporary infrastructure timeout on issuing bank rail.',
    recommendedAction: 'RETRY',
    executionDetail: 'Razorpay Test Mode Order created via BullMQ Queue',
    webhookEvent: 'payment.captured (Amount: ₹2,499, Signature Verified)',
    recoveredAmount: '₹2,499',
    status: 'RECOVERED',
  },
  {
    id: 'txn_sim_02',
    name: '3D-Secure Authentication Drop-off',
    amount: '₹4,850',
    failureCode: 'AUTHENTICATION_FAILURE',
    detectionScore: '78% Recovery Likelihood',
    diagnosis: 'Customer abandoned OTP 3DS verification step.',
    recommendedAction: 'REMIND',
    executionDetail: 'Dispatched direct Razorpay Test Mode Payment Link to customer',
    webhookEvent: 'payment.captured (Amount: ₹4,850 via Payment Link)',
    recoveredAmount: '₹4,850',
    status: 'RECOVERED',
  },
  {
    id: 'txn_sim_03',
    name: 'Expired Payment Card (Hard Decline)',
    amount: '₹12,000',
    failureCode: 'EXPIRED_CARD',
    detectionScore: '4% Recovery Likelihood',
    diagnosis: 'Permanent card expiration. Automated retries will fail.',
    recommendedAction: 'STOP',
    executionDetail: 'Recovery permanently halted by Authoritative Policy Guardrail',
    webhookEvent: 'No webhook triggered (Halted for loss prevention)',
    recoveredAmount: '₹0',
    status: 'CANCELLED',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(getActiveMerchantId());
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);

  const currentScenario = LIFECYCLE_SCENARIOS[selectedScenarioIndex];

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="space-y-24 sm:space-y-32 pb-24 overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-600/15 via-indigo-600/15 to-cyan-600/10 blur-3xl pointer-events-none rounded-full" />

        <div className="text-center space-y-6 max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-sm backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-emerald-400">Autonomous Revenue Recovery</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Razorpay Test Mode Sandbox</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Recover revenue from{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
              failed payments.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            RecoverAI detects failed payment events, understands why they failed using AI diagnostics, chooses the safest recovery strategy, and verifies the revenue through cryptographic payment evidence.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-95"
            >
              Get Started with RecoverAI
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              See How It Works
            </a>
          </div>

          <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-500 font-mono">
            <span>TRUSTED RECOVERY</span>
            <span>•</span>
            <span>VERIFIED PAYMENT LEDGER</span>
            <span>•</span>
            <span>ZERO GUESSWORK</span>
          </div>
        </div>

        {/* Hero Illustrative Pipeline Ribbon */}
        <div className="mt-14 p-1 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900/60 border border-slate-800 shadow-2xl">
          <div className="bg-slate-950/90 rounded-xl p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 text-rose-300">
                <div className="text-[10px] font-mono uppercase text-rose-400">1. Failed Payment</div>
                <div className="text-xs font-semibold mt-1">₹2,499 Declined</div>
              </div>
              <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-indigo-300">
                <div className="text-[10px] font-mono uppercase text-indigo-400">2. AI Diagnosis</div>
                <div className="text-xs font-semibold mt-1">Bank Timeout (92%)</div>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-cyan-300">
                <div className="text-[10px] font-mono uppercase text-cyan-400">3. Policy Action</div>
                <div className="text-xs font-semibold mt-1">Smart RETRY (0-5m)</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-300">
                <div className="text-[10px] font-mono uppercase text-amber-400">4. Payment Dispatch</div>
                <div className="text-xs font-semibold mt-1">Razorpay Test Order</div>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <div className="text-[10px] font-mono uppercase text-emerald-400">5. Verified Ledger</div>
                <div className="text-xs font-semibold mt-1">₹2,499 Recovered</div>
              </div>
            </div>
            <div className="text-[11px] text-center text-slate-500 mt-3 font-mono">
              Illustrative pipeline flow — Revenue recognized strictly upon HMAC SHA-256 webhook capture
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. VALUE PROPOSITION PILLARS */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">DETECT</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Identify failed payment transactions automatically from your payment gateway stream and score recovery likelihood.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">DIAGNOSE</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Understand failure causes using Google Gemini AI diagnostics paired with transparent deterministic fallback logic.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">RECOVER</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforce authoritative recovery policy actions: <span className="text-white font-mono text-[11px]">RETRY</span>, <span className="text-white font-mono text-[11px]">REMIND</span>, <span className="text-white font-mono text-[11px]">WAIT</span>, <span className="text-white font-mono text-[11px]">ESCALATE</span>, or <span className="text-white font-mono text-[11px]">STOP</span>.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-emerald-300">VERIFY</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Count revenue as recovered <span className="font-semibold text-emerald-400">only after verified payment evidence</span>. Execution is not recovery.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PROBLEM & OPPORTUNITY SECTION */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              The Payment Drop-off Problem
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Failed payments are lost revenue — until you recover them.
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Customers fail to complete checkouts due to temporary bank server congestion, UPI outages, authentication drop-offs, and network hiccups. Most merchants only see a generic &ldquo;Payment Failed&rdquo; code while the customer vanishes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Traditional failure */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-rose-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-rose-400 font-semibold uppercase">Traditional Handling</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Customer Lost
                </span>
              </div>
              <div className="space-y-2 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2 text-rose-300 font-semibold">
                  <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                  PAYMENT FAILED (Raw Bank Code)
                </div>
                <div className="pl-6 text-slate-500">↓ Merchant logs error</div>
                <div className="pl-6 text-slate-500">↓ Blind retry triggered (Fails again)</div>
                <div className="pl-6 text-slate-500">↓ Generic email sent 24h later</div>
                <div className="pl-6 text-rose-400 font-semibold">✕ Customer Churned & Cart Abandoned</div>
              </div>
            </div>

            {/* RecoverAI Handling */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-900/40 space-y-4 shadow-lg shadow-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 font-semibold uppercase">RecoverAI Handling</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Revenue Reconciled
                </span>
              </div>
              <div className="space-y-2 text-xs text-slate-300 font-mono">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  PAYMENT FAILED (Real-Time Ingestion)
                </div>
                <div className="pl-6 text-slate-400">↓ AI Diagnoses failure root cause & likelihood</div>
                <div className="pl-6 text-slate-400">↓ Policy enforces context-aware action (RETRY / WAIT / REMIND)</div>
                <div className="pl-6 text-slate-400">↓ Execution via BullMQ & Razorpay Test Mode</div>
                <div className="pl-6 text-emerald-400 font-semibold">✓ Cryptographic Webhook Reconciles Exact Amount</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW RECOVERAI WORKS (6-STEP VISUAL WORKFLOW) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
            6-Stage Recovery Engine
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How RecoverAI turns failed payments into recovered revenue
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            A controlled, explainable pipeline combining multi-agent AI diagnostics with hard deterministic safety guardrails.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400 font-semibold">STEP 01</span>
              <span className="text-xs text-slate-500 font-mono">INGESTION</span>
            </div>
            <h3 className="text-base font-bold text-white">DETECT</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              RecoverAI listens for failed transaction events from your payment gateway stream, extracting failure codes and customer history.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400 font-semibold">STEP 02</span>
              <span className="text-xs text-slate-500 font-mono">SCORING</span>
            </div>
            <h3 className="text-base font-bold text-white">SCORE</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The detection model calculates recovery probability (0–100%) and business priority based on customer lifetime value and payment signals.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-indigo-400 font-semibold">STEP 03</span>
              <span className="text-xs text-slate-500 font-mono">AI DIAGNOSTICS</span>
            </div>
            <h3 className="text-base font-bold text-white">DIAGNOSE</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Google Gemini interprets raw error metadata into categorized root causes, backed by instant deterministic fallback if AI is offline.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400 font-semibold">STEP 04</span>
              <span className="text-xs text-slate-500 font-mono">POLICY ENGINE</span>
            </div>
            <h3 className="text-base font-bold text-white">DECIDE</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Deterministic safety rules select the optimal action: <span className="font-mono text-white text-[11px]">RETRY</span>, <span className="font-mono text-white text-[11px]">REMIND</span>, <span className="font-mono text-white text-[11px]">WAIT</span>, <span className="font-mono text-white text-[11px]">ESCALATE</span>, or <span className="font-mono text-white text-[11px]">STOP</span>.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-indigo-400 font-semibold">STEP 05</span>
              <span className="text-xs text-slate-500 font-mono">BACKGROUND QUEUE</span>
            </div>
            <h3 className="text-base font-bold text-white">EXECUTE</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The worker queue (BullMQ + Redis) dispatches the recovery action to the Razorpay Test Mode gateway with strict attempt idempotency.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-emerald-500/30 bg-emerald-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 font-semibold">STEP 06</span>
              <span className="text-xs text-emerald-400/80 font-mono">SETTLEMENT</span>
            </div>
            <h3 className="text-base font-bold text-emerald-300">VERIFY</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              An HMAC SHA-256 verified webhook confirms payment capture and reconciles the PostgreSQL evidence ledger.
            </p>
          </div>
        </div>

        {/* Strong Architectural Callout */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 text-center space-y-2">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold">
            Core Financial Invariant
          </div>
          <div className="text-lg sm:text-xl font-bold text-white">
            &ldquo;Execution is not recovery. Verified payment evidence is recovery.&rdquo;
          </div>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto">
            RecoverAI will never report revenue as recovered until a cryptographically verified webhook confirms the exact paise amount in the payment ledger.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE RECOVERY LIFECYCLE SIMULATOR */}
      {/* ========================================================================= */}
      <section id="lifecycle-demo" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              Interactive Demonstration
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Explore the Decision & Recovery Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Select a sample failure scenario to see how RecoverAI scores, diagnoses, decides, and reconciles.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Illustrative demo data
          </div>
        </div>

        {/* Scenario Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {LIFECYCLE_SCENARIOS.map((sc, idx) => (
            <button
              key={sc.id}
              onClick={() => setSelectedScenarioIndex(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                selectedScenarioIndex === idx
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{sc.name}</span>
              <span className="font-mono text-[11px] opacity-80">{sc.amount}</span>
            </button>
          ))}
        </div>

        {/* Interactive Scenario Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-8 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stage 1 & 2: Ingestion & Scoring */}
            <div className="space-y-4 p-5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-rose-400 uppercase">1. Failed Event</span>
                <span className="text-slate-500">{currentScenario.id}</span>
              </div>
              <div>
                <div className="text-xl font-bold text-white">{currentScenario.amount}</div>
                <div className="text-xs font-mono text-rose-300 mt-0.5">{currentScenario.failureCode}</div>
              </div>
              <div className="pt-3 border-t border-slate-800/80 space-y-1">
                <div className="text-[11px] font-mono text-cyan-400">DETECTION ENGINE</div>
                <div className="text-xs text-slate-300 font-semibold">{currentScenario.detectionScore}</div>
              </div>
            </div>

            {/* Stage 3 & 4: Diagnosis & Policy */}
            <div className="space-y-4 p-5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-indigo-400 uppercase">2. AI Diagnosis</span>
                <span className="text-slate-500">Gemini Flash</span>
              </div>
              <div>
                <div className="text-xs text-slate-300 leading-relaxed font-medium">
                  {currentScenario.diagnosis}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-800/80 space-y-1">
                <div className="text-[11px] font-mono text-amber-400">AUTHORITATIVE POLICY</div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {currentScenario.recommendedAction}
                </div>
              </div>
            </div>

            {/* Stage 5 & 6: Execution & Settlement */}
            <div className={`space-y-4 p-5 rounded-xl border ${
              currentScenario.status === 'RECOVERED'
                ? 'bg-emerald-950/10 border-emerald-500/30'
                : 'bg-rose-950/10 border-rose-500/30'
            }`}>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className={currentScenario.status === 'RECOVERED' ? 'text-emerald-400 uppercase' : 'text-rose-400 uppercase'}>
                  3. Execution & Ledger
                </span>
                <span className="text-slate-500">Razorpay Test</span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {currentScenario.executionDetail}
              </div>
              <div className="pt-3 border-t border-slate-800/80 space-y-1">
                <div className="text-[11px] font-mono text-slate-400">WEBHOOK RECONCILIATION</div>
                <div className="text-xs font-mono text-slate-300 break-all">{currentScenario.webhookEvent}</div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">Verified Recovered:</span>
                  <span className={`text-base font-bold font-mono ${
                    currentScenario.status === 'RECOVERED' ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {currentScenario.recoveredAmount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ARCHITECTURAL DIFFERENTIATION (COMPARISON TABLE) */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Architectural Differentiation
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Why RecoverAI is not a simple retry script
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Compare traditional payment retry plugins with RecoverAI&rsquo;s autonomous multi-agent architecture.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <table className="w-full text-left text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80">
                <th className="py-4 px-6 font-semibold text-slate-400 uppercase tracking-wider w-1/3">
                  Capability / Invariant
                </th>
                <th className="py-4 px-6 font-semibold text-rose-400 uppercase tracking-wider w-1/3">
                  Traditional Dunning / Retries
                </th>
                <th className="py-4 px-6 font-semibold text-emerald-400 uppercase tracking-wider w-1/3">
                  RecoverAI Autonomous Engine
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-6 font-medium text-white">Recovery Strategy</td>
                <td className="py-4 px-6 text-slate-400">Static timed intervals (Day 1, 3, 7)</td>
                <td className="py-4 px-6 text-emerald-300 font-medium">Dynamic, root-cause-aware policy (RETRY, WAIT, REMIND, STOP)</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-6 font-medium text-white">Failure Diagnostics</td>
                <td className="py-4 px-6 text-slate-400">Generic raw bank strings</td>
                <td className="py-4 px-6 text-emerald-300 font-medium">Google Gemini LLM Root-Cause Analysis with structured JSON schemas</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-6 font-medium text-white">Hallucination Guardrails</td>
                <td className="py-4 px-6 text-slate-400">N/A (Rigid cron scripts)</td>
                <td className="py-4 px-6 text-emerald-300 font-medium">Authoritative Deterministic Safety Engine overrides AI when unsafe</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-6 font-medium text-white">Financial Source of Truth</td>
                <td className="py-4 px-6 text-slate-400">Prematurely marks success on attempt trigger</td>
                <td className="py-4 px-6 text-emerald-300 font-medium">Cryptographic PostgreSQL Payment Ledger backed by webhook verification</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-6 font-medium text-white">Background Execution</td>
                <td className="py-4 px-6 text-slate-400">Synchronous API calls or basic crons</td>
                <td className="py-4 px-6 text-emerald-300 font-medium">Upstash Redis + BullMQ Queue with retry backoff & concurrency locks</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-6 font-medium text-white">Full Observability</td>
                <td className="py-4 px-6 text-slate-400">Unstructured server logs</td>
                <td className="py-4 px-6 text-emerald-300 font-medium">Live System Health telemetry (Database, Redis, AI latency, Webhook error rate)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. AI DIAGNOSIS & RESILIENCE SECTION */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
                <Cpu className="w-3.5 h-3.5" />
                INTELLIGENT DIAGNOSTIC LAYER
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                AI that explains the failure before deciding what to do.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                RecoverAI uses Google Gemini to translate cryptic payment decline codes and metadata into standardized categories:
              </p>
              <ul className="space-y-2 text-xs text-slate-300 font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  TEMPORARY_INFRASTRUCTURE (Gateway Timeout, Bank rail lag)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  CUSTOMER_AUTHENTICATION (3DS OTP drop, Verification error)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  INSTRUMENT_EXPIRATION & FINANCIAL_HARD (Expired card, repeated decline)
                </li>
              </ul>
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/20 text-xs text-slate-400">
                <span className="font-semibold text-indigo-300">Transparent Fallback Guarantee:</span> If the LLM provider experiences latency or outage, RecoverAI automatically switches to deterministic diagnostic rules with zero pipeline downtime.
              </div>
            </div>

            {/* Illustrative AI Output Card */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-3">
                <span>GEMINI_DIAGNOSTIC_SCHEMA</span>
                <span className="text-emerald-400 font-semibold">VALIDATED</span>
              </div>
              <div className="space-y-1.5 text-slate-300">
                <div><span className="text-slate-500">&quot;failureCategory&quot;:</span> <span className="text-cyan-300">&quot;TEMPORARY_INFRASTRUCTURE&quot;</span>,</div>
                <div><span className="text-slate-500">&quot;diagnosisCode&quot;:</span> <span className="text-cyan-300">&quot;TEMPORARY_GATEWAY_FAILURE&quot;</span>,</div>
                <div><span className="text-slate-500">&quot;confidence&quot;:</span> <span className="text-emerald-400">0.94</span>,</div>
                <div><span className="text-slate-500">&quot;isLikelyTemporary&quot;:</span> <span className="text-indigo-400">true</span>,</div>
                <div><span className="text-slate-500">&quot;recommendedNextStep&quot;:</span> <span className="text-amber-300">&quot;EVALUATE_RETRY&quot;</span>,</div>
                <div><span className="text-slate-500">&quot;reasoning&quot;:</span> <span className="text-slate-400">&quot;Transient HTTP 504 gateway timeout on acquiring network. Issuing bank rails remain operational.&quot;</span></div>
              </div>
              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800 text-right">
                Illustrative JSON schema output
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FINANCIAL TRUST & PAYMENT EVIDENCE LEDGER */}
      {/* ========================================================================= */}
      <section id="evidence-ledger" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
            Zero False-Positive Invariant
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Recovered revenue is backed by payment evidence
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            RecoverAI does not recognize revenue simply because a retry was sent or an order was placed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="text-2xl font-bold font-mono text-rose-400">Recovery Attempt</div>
            <p className="text-xs text-slate-400">
              An action dispatched to Razorpay (e.g. Test Order Created or Link Generated). Status remains <span className="text-amber-400 font-mono">Pending</span>.
            </p>
            <div className="text-xs font-mono text-slate-500">₹0 Counted</div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-2xl font-bold font-mono text-cyan-400">Cryptographic Webhook</div>
              <p className="text-xs text-slate-400">
                Razorpay emits <span className="text-white font-mono">payment.captured</span> signed with HMAC SHA-256 secret.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500">Signature Verified</div>
          </div>

          <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-2xl font-bold font-mono text-emerald-400">Payment Evidence Ledger</div>
              <p className="text-xs text-slate-300">
                Amount reconciled in PostgreSQL <span className="text-white font-mono">Payment</span> table where <span className="text-emerald-400 font-mono">verified = true</span>.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold">100% Verified Recovered</div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. SECURITY & ARCHITECTURAL GUARDRAILS */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Security & Compliance Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Engineered for institutional security & multi-tenant isolation
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Factual architecture safeguards protecting your payment data and credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Multi-Tenant RBAC</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Granular isolation between merchants with role-based memberships (OWNER, ADMIN, ANALYST, SUPPORT, VIEWER).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Timing-Safe HMAC Verification</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Raw-body webhook evaluation using constant-time comparison (<span className="font-mono text-[11px]">crypto.timingSafeEqual</span>).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Attempt Idempotency</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Database unique constraints (<span className="font-mono text-[11px]">@@unique([transactionId, attemptNumber])</span>) prevent duplicate charges.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Immutable Audit Trails</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Non-cascading audit logging recording actor, IP, timestamp, reasoning, and correlation IDs across the lifecycle.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Strict Test Mode Guardrail</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hardcoded key verification requiring <span className="font-mono text-[11px]">rzp_test_</span> prefix. Zero exposure of production keys.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Zero Secret Leakage</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Database URLs, Redis connection strings, and Gemini API keys are completely stripped and sanitized from client responses.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. SYSTEM HEALTH / RELIABILITY PREVIEW */}
      {/* ========================================================================= */}
      <section id="system-health" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono text-emerald-400 uppercase font-semibold">
                Operational Telemetry
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Continuous Infrastructure Health Monitoring
              </h3>
              <p className="text-xs text-slate-400">
                RecoverAI monitors all recovery infrastructure components in real time.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM OPERATIONAL
            </div>
          </div>

          {/* Illustrative Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">PostgreSQL</div>
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Healthy
              </div>
              <div className="text-[10px] text-slate-500">~110ms</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">Upstash Redis</div>
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Healthy
              </div>
              <div className="text-[10px] text-slate-500">~290ms</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">Google Gemini</div>
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Healthy
              </div>
              <div className="text-[10px] text-slate-500">0.0% Fallback</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">Razorpay</div>
              <div className="text-amber-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                TEST MODE
              </div>
              <div className="text-[10px] text-slate-500">Sandbox Validated</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">Webhook Worker</div>
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Healthy
              </div>
              <div className="text-[10px] text-slate-500">0.0% Errors</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400">Recovery Worker</div>
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Healthy
              </div>
              <div className="text-[10px] text-slate-500">Concurrency: 5</div>
            </div>
          </div>
          <div className="text-[11px] text-right text-slate-500 font-mono">
            Conceptual telemetry overview • Production metrics available in authenticated Merchant Settings
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. DASHBOARD PREVIEW & WORKFLOW PANELS */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Merchant Workspace
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            What you get inside the RecoverAI dashboard
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            A purpose-built operations command center giving your finance and support teams full control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <BarChart3 className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Recovery Overview</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track revenue at risk, total verified recovered revenue, and dynamic recovery rate across your merchant account.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Recovery Center</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Live status tracking for dispatched attempts, real-time webhook confirmation, and a dedicated &ldquo;Needs Attention&rdquo; queue.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Search className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Transaction Explorer</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inspect full AI reasoning factors, root causes, policy overrides, and cryptographic payment ledger receipts.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. INDUSTRY USE CASES */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
            Industry Applications
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Built for modern digital commerce & subscriptions
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <ShoppingBag className="w-6 h-6 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">E-Commerce</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Recover checkout payment failures before shoppers abandon their cart.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            <h4 className="text-sm font-bold text-white">Subscriptions & SaaS</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Recover recurring billing failures and eliminate passive subscriber churn.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <Building className="w-6 h-6 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Digital Services</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prevent immediate service disruption by engaging automatic wait and retry windows.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <Layers className="w-6 h-6 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Marketplaces</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitor and reconcile payment recoveries across multiple merchant accounts with tenant isolation.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 13. FINAL HIGH-IMPACT CTA */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-tr from-indigo-950/60 via-slate-900 to-emerald-950/40 border border-slate-800 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Stop treating failed payments as the end of the transaction.
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Turn recoverable payment failures into verified revenue with AI diagnostics and cryptographic reconciliation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-95"
            >
              Get Started with RecoverAI
              <ArrowRight className="w-4 h-4" />
            </button>
            <NavLink
              to="/how-it-works"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-sm transition-all"
            >
              Explore 6-Stage Engine
            </NavLink>
          </div>

          <div className="text-[11px] text-slate-400 font-mono pt-2">
            Currently running in Razorpay Test Mode Sandbox • Strict multi-tenant isolation
          </div>
        </div>
      </section>
    </div>
  );
};
