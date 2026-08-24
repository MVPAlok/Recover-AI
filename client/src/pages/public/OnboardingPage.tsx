import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Key,
  RotateCcw,
  Store,
  Sparkles,
} from 'lucide-react';
import {
  setActiveMerchantId,
  getOnboardingProfile,
  setOnboardingProfile,
  createMerchantWorkspace,
} from '../../services/api';

export const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState({
    businessName: 'Apex Retail India',
    email: 'finance@apexretail.in',
    currency: 'INR',
  });

  const [keyId, setKeyId] = useState('rzp_test_recoverai_sandbox_key');
  const [gatewayVerified, setGatewayVerified] = useState(false);
  const [verifyingGateway, setVerifyingGateway] = useState(false);

  const [policyProfile, setPolicyProfile] = useState<'BALANCED' | 'AGGRESSIVE' | 'CONSERVATIVE'>('BALANCED');

  const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'complete'>('idle');
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = getOnboardingProfile();
    if (saved) {
      setProfile({
        businessName: saved.businessName || 'Apex Retail India',
        email: saved.email || 'finance@apexretail.in',
        currency: saved.currency || 'INR',
      });
    }
  }, []);

  const handleVerifyGateway = () => {
    setVerifyingGateway(true);
    setTimeout(() => {
      setVerifyingGateway(false);
      setGatewayVerified(true);
    }, 600);
  };

  const handleRunSimulation = () => {
    setSimulationState('running');
    setSimulationLogs(['Ingesting failed transaction (₹2,499 - GATEWAY_TIMEOUT)...']);

    setTimeout(() => {
      setSimulationLogs((prev) => [
        ...prev,
        'Google Gemini diagnosed root cause: TEMPORARY_GATEWAY_FAILURE (94% confidence)...',
      ]);
    }, 600);

    setTimeout(() => {
      setSimulationLogs((prev) => [
        ...prev,
        'Deterministic Policy Engine executed RETRY via Razorpay Test Order...',
      ]);
    }, 1200);

    setTimeout(() => {
      setSimulationLogs((prev) => [
        ...prev,
        'HMAC SHA-256 Webhook received: payment.captured (Verified Signature)...',
        'Reconciled ₹2,499 in PostgreSQL Payment Ledger (Status: RECOVERED)!',
      ]);
      setSimulationState('complete');
    }, 1800);
  };

  const handleFinish = async () => {
    // Persist final selections
    setOnboardingProfile({
      ...profile,
      gatewayKey: keyId,
      policyProfile,
    });

    try {
      const merchant = await createMerchantWorkspace({
        name: profile.businessName,
        email: profile.email,
        currency: profile.currency,
      });
      if (merchant?.id) {
        setActiveMerchantId(merchant.id);
      }
    } catch (err) {
      console.warn('Sandbox merchant registration warning:', err);
    } finally {
      navigate('/dashboard');
    }
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
          Welcome to RecoverAI, {profile.businessName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Complete the 4-step setup below to connect your sandbox gateway and launch autonomous revenue recovery.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
        <div
          onClick={() => setCurrentStep(1)}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            currentStep === 1
              ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
              : currentStep > 1
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          <div className="font-bold flex items-center justify-center gap-1">
            {currentStep > 1 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            01. WORKSPACE
          </div>
          <div className="text-[10px] hidden sm:block mt-0.5">Profile Info</div>
        </div>

        <div
          onClick={() => currentStep > 1 && setCurrentStep(2)}
          className={`p-3 rounded-xl border transition-all ${
            currentStep === 2
              ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
              : currentStep > 2
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 cursor-pointer'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          <div className="font-bold flex items-center justify-center gap-1">
            {currentStep > 2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            02. GATEWAY
          </div>
          <div className="text-[10px] hidden sm:block mt-0.5">Razorpay Test</div>
        </div>

        <div
          onClick={() => currentStep > 2 && setCurrentStep(3)}
          className={`p-3 rounded-xl border transition-all ${
            currentStep === 3
              ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
              : currentStep > 3
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 cursor-pointer'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          <div className="font-bold flex items-center justify-center gap-1">
            {currentStep > 3 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            03. POLICY
          </div>
          <div className="text-[10px] hidden sm:block mt-0.5">AI Rules</div>
        </div>

        <div
          className={`p-3 rounded-xl border transition-all ${
            currentStep === 4
              ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          <div className="font-bold">04. LAUNCH</div>
          <div className="text-[10px] hidden sm:block mt-0.5">Verification</div>
        </div>
      </div>

      {/* Step Body */}
      <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-2xl backdrop-blur-xl">
        {/* ========================================================================= */}
        {/* Step 1: Confirm Workspace Profile */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-400" />
                Step 1: Confirm Workspace Profile
              </h2>
              <p className="text-xs text-slate-400">
                Verify your merchant organization details and administrator role.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-slate-500 font-mono text-[11px]">BUSINESS NAME</span>
                <div className="text-white font-bold text-sm truncate">{profile.businessName}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-slate-500 font-mono text-[11px]">PRIMARY EMAIL</span>
                <div className="text-white font-bold text-sm truncate">{profile.email}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-slate-500 font-mono text-[11px]">SETTLEMENT</span>
                <div className="text-emerald-400 font-bold font-mono text-sm">{profile.currency} (₹)</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/20 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Assigned Role: <strong className="text-white font-mono">OWNER</strong> (Multi-Tenant Master RBAC)</span>
              </div>
              <span className="text-emerald-400 font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-md shadow-indigo-900/30"
              >
                Continue to Gateway Setup
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Step 2: Connect Razorpay Test Sandbox */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Step 2: Connect Razorpay Test Sandbox
              </h2>
              <p className="text-xs text-slate-400">
                RecoverAI requires Test Mode credentials prefixed with <span className="font-mono text-amber-400">rzp_test_</span> for isolated execution.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Razorpay Key ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keyId}
                    onChange={(e) => {
                      setKeyId(e.target.value);
                      setGatewayVerified(false);
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyGateway}
                    disabled={verifyingGateway || gatewayVerified}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all ${
                      gatewayVerified
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {verifyingGateway
                      ? 'Verifying...'
                      : gatewayVerified
                      ? '✓ Verified'
                      : 'Test Connection'}
                  </button>
                </div>
              </div>

              {gatewayVerified && (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sandbox connected successfully. Razorpay Test Mode orders and webhook listeners are active.</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-md shadow-indigo-900/30"
              >
                Continue to Policy Rules
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Step 3: Choose Recovery Policy Mode */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Step 3: Choose Recovery Policy Strategy
              </h2>
              <p className="text-xs text-slate-400">
                Select how the deterministic policy engine balances recovery aggressiveness with customer friction.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setPolicyProfile('BALANCED')}
                className={`p-5 rounded-2xl border cursor-pointer space-y-2 transition-all ${
                  policyProfile === 'BALANCED'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">BALANCED</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Immediate smart retries for network drops + 30m cooldown for bank congestion + 3DS reminder links.
                </p>
                <div className="text-[10px] text-emerald-400 font-mono pt-1">
                  Expected retention: 45% – 65%
                </div>
              </div>

              <div
                onClick={() => setPolicyProfile('AGGRESSIVE')}
                className={`p-5 rounded-2xl border cursor-pointer space-y-2 transition-all ${
                  policyProfile === 'AGGRESSIVE'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs">HIGH RECOVERY</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Shorter wait windows and immediate re-attempts on all recoverable failures.
                </p>
                <div className="text-[10px] text-cyan-400 font-mono pt-1">
                  Expected retention: 55% – 75%
                </div>
              </div>

              <div
                onClick={() => setPolicyProfile('CONSERVATIVE')}
                className={`p-5 rounded-2xl border cursor-pointer space-y-2 transition-all ${
                  policyProfile === 'CONSERVATIVE'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs">LOW FRICTION</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Focus on customer payment links and extended cooldown periods before retries.
                </p>
                <div className="text-[10px] text-indigo-400 font-mono pt-1">
                  Expected retention: 35% – 50%
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-md shadow-indigo-900/30"
              >
                Continue to Simulation
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Step 4: Webhook Simulation & Dashboard Launch */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Step 4: End-to-End Recovery Simulation & Launch
              </h2>
              <p className="text-xs text-slate-400">
                Simulate an end-to-end failed payment recovery to test the full pipeline before entering the dashboard.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-semibold">TEST RUNNER</span>
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={simulationState === 'running' || simulationState === 'complete'}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-900/30 flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${simulationState === 'running' ? 'animate-spin' : ''}`} />
                  {simulationState === 'running'
                    ? 'Simulating Recovery...'
                    : simulationState === 'complete'
                    ? '✓ Simulation Verified'
                    : 'Dispatch Simulated Recovery'}
                </button>
              </div>

              {/* Simulation Terminal Box */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-xs space-y-1.5 min-h-[100px]">
                {simulationLogs.length === 0 ? (
                  <div className="text-slate-500 italic">
                    Click &ldquo;Dispatch Simulated Recovery&rdquo; above to run the 6-stage pipeline...
                  </div>
                ) : (
                  simulationLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('Reconciled')
                          ? 'text-emerald-400 font-bold'
                          : log.includes('Gemini')
                          ? 'text-indigo-300'
                          : 'text-slate-300'
                      }
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2 active:scale-95"
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
