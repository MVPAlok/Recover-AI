import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Key,
  RotateCcw,
} from 'lucide-react';
import { setActiveMerchantId } from '../../services/api';

export const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [keyId, setKeyId] = useState('rzp_test_sample_sandbox_key');
  const [policyProfile, setPolicyProfile] = useState<'BALANCED' | 'AGGRESSIVE' | 'CONSERVATIVE'>('BALANCED');
  const [simulatedWebhook, setSimulatedWebhook] = useState(false);
  const navigate = useNavigate();

  const handleFinish = () => {
    setActiveMerchantId('merchant_test_001');
    navigate('/dashboard');
  };

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      {/* Onboarding Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-emerald-400">MERCHANT ONBOARDING WIZARD</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Connect Your Payment Infrastructure
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          4 quick steps to configure autonomous recovery and start receiving verified payment evidence.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
        <div className={`p-3 rounded-xl border ${currentStep >= 1 ? 'bg-indigo-950/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
          <div className="font-bold">01. PROFILE</div>
          <div className="text-[10px] hidden sm:block mt-0.5">Workspace</div>
        </div>
        <div className={`p-3 rounded-xl border ${currentStep >= 2 ? 'bg-indigo-950/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
          <div className="font-bold">02. GATEWAY</div>
          <div className="text-[10px] hidden sm:block mt-0.5">Razorpay Test</div>
        </div>
        <div className={`p-3 rounded-xl border ${currentStep >= 3 ? 'bg-indigo-950/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
          <div className="font-bold">03. AI POLICY</div>
          <div className="text-[10px] hidden sm:block mt-0.5">Decision Rules</div>
        </div>
        <div className={`p-3 rounded-xl border ${currentStep >= 4 ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
          <div className="font-bold">04. LAUNCH</div>
          <div className="text-[10px] hidden sm:block mt-0.5">Live Dashboard</div>
        </div>
      </div>

      {/* Step Body */}
      <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl">
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-white">Step 1: Confirm Merchant Account</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-mono">Workspace Role</span>
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  OWNER (Full Administrative Access)
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-mono">Environment Tier</span>
                <div className="text-amber-400 font-mono font-semibold">
                  TEST MODE SANDBOX
                </div>
              </div>
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2"
            >
              Continue to Gateway Connection
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-white">Step 2: Connect Razorpay Test Sandbox</h2>
            <p className="text-xs text-slate-400">
              RecoverAI requires Test Mode credentials with the <span className="font-mono text-amber-400">rzp_test_</span> prefix.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Razorpay Key ID</label>
                <input
                  type="text"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Pre-configured with RecoverAI&rsquo;s internal test provider for instant experimentation.</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2"
              >
                Continue to Policy Rules
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-white">Step 3: Choose Recovery Policy Mode</h2>
            <p className="text-xs text-slate-400">
              Select how aggressively the deterministic policy engine should dispatch recovery actions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setPolicyProfile('BALANCED')}
                className={`p-4 rounded-xl border cursor-pointer space-y-2 transition-all ${
                  policyProfile === 'BALANCED'
                    ? 'bg-indigo-950/30 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs">BALANCED (Standard)</div>
                <p className="text-[11px] leading-relaxed">
                  Smart network retries + cooldown windows + 3DS customer reminder links.
                </p>
              </div>

              <div
                onClick={() => setPolicyProfile('AGGRESSIVE')}
                className={`p-4 rounded-xl border cursor-pointer space-y-2 transition-all ${
                  policyProfile === 'AGGRESSIVE'
                    ? 'bg-indigo-950/30 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs">AGGRESSIVE (High Recovery)</div>
                <p className="text-[11px] leading-relaxed">
                  Immediate retry on all recoverable failures with minimal wait duration.
                </p>
              </div>

              <div
                onClick={() => setPolicyProfile('CONSERVATIVE')}
                className={`p-4 rounded-xl border cursor-pointer space-y-2 transition-all ${
                  policyProfile === 'CONSERVATIVE'
                    ? 'bg-indigo-950/30 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs">CONSERVATIVE (Low Friction)</div>
                <p className="text-[11px] leading-relaxed">
                  Focus on customer payment links and extended cooldown periods.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2"
              >
                Continue to Verification
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-emerald-400">Step 4: Webhook Simulation & Launch</h2>
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400">HMAC SHA-256 TEST SIMULATION</span>
                <span className="text-slate-500">READY</span>
              </div>
              <p className="text-xs text-slate-300">
                Simulate an incoming <span className="font-mono text-white">payment.captured</span> webhook to verify end-to-end evidence ledger reconciliation.
              </p>
              <button
                type="button"
                onClick={() => setSimulatedWebhook(true)}
                disabled={simulatedWebhook}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                {simulatedWebhook ? '✓ Webhook Verified (₹2,499 Reconciled)' : 'Dispatch Test Webhook Event'}
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={handleFinish}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
              >
                Launch Merchant Operations Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
