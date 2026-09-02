import React, { useState } from 'react';
import { simulateRecoveryEvent } from '../../services/api';

interface SimulateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_SCENARIOS = [
  {
    id: 'GATEWAY_TIMEOUT',
    name: 'Gateway Timeout',
    amount: 2499,
    expectedDecision: 'RETRY',
    badge: 'AI RETRY',
    badgeColor: 'text-primary border-primary/30 bg-primary/10',
    description: 'Transient network glitch during 3DS callback. System performs safe idempotent retry.',
  },
  {
    id: 'OTP_DROPOUT',
    name: 'OTP Dropout / Abandonment',
    amount: 4850,
    expectedDecision: 'REMIND',
    badge: 'SMART LINK',
    badgeColor: 'text-secondary border-secondary/30 bg-secondary/10',
    description: 'Customer abandoned checkout OTP. Generates 1-click WhatsApp/SMS recovery link.',
  },
  {
    id: 'INSUFFICIENT_FUNDS',
    name: 'Insufficient Funds',
    amount: 12000,
    expectedDecision: 'STOP',
    badge: 'GUARDRAIL STOP',
    badgeColor: 'text-error border-error/30 bg-error/10',
    description: 'Hard decline for insufficient balance. Authoritative Guardrail stops retries to protect merchant score.',
  },
  {
    id: 'BANK_MAINTENANCE',
    name: 'Bank CBS Maintenance',
    amount: 8500,
    expectedDecision: 'WAIT',
    badge: 'CIRCUIT BREAKER',
    badgeColor: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    description: 'Core banking switch under maintenance. Circuit breaker applies exponential backoff.',
  },
  {
    id: 'UPI_TIMEOUT',
    name: 'UPI Rail Latency',
    amount: 3200,
    expectedDecision: 'RETRY',
    badge: 'AI RETRY',
    badgeColor: 'text-primary border-primary/30 bg-primary/10',
    description: 'UPI collect intent timed out. Reroutes through alternate high-performance VPA switch.',
  },
  {
    id: 'EXPIRED_CARD',
    name: 'Expired Card Instrument',
    amount: 6200,
    expectedDecision: 'STOP',
    badge: 'GUARDRAIL STOP',
    badgeColor: 'text-error border-error/30 bg-error/10',
    description: 'Card expired in the past. Hard quarantine to prevent transaction fee burn.',
  },
];

export const SimulateEventModal: React.FC<SimulateEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedScenario, setSelectedScenario] = useState(PRESET_SCENARIOS[0].id);
  const [amount, setAmount] = useState(PRESET_SCENARIOS[0].amount);
  const [outcome, setOutcome] = useState<'SUCCESS' | 'FAILED' | 'PENDING' | 'RANDOM'>('SUCCESS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentScenario = PRESET_SCENARIOS.find((s) => s.id === selectedScenario) || PRESET_SCENARIOS[0];

  const handleScenarioChange = (id: string) => {
    setSelectedScenario(id);
    const preset = PRESET_SCENARIOS.find((s) => s.id === id);
    if (preset) {
      setAmount(preset.amount);
      if (preset.expectedDecision === 'STOP') {
        setOutcome('FAILED');
      } else if (preset.expectedDecision === 'REMIND') {
        setOutcome('PENDING');
      } else {
        setOutcome('SUCCESS');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await simulateRecoveryEvent({
        scenario: selectedScenario,
        amount: Number(amount),
        outcome,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-surface-container-high border border-primary/20 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30 bg-surface/50">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            <h2 className="font-mono text-sm tracking-wider font-bold text-on-surface uppercase">
              Simulate Recovery Event
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-white transition-colors p-1 rounded font-mono text-xs"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-mono text-error bg-error/10 border border-error/20 rounded">
              {error}
            </div>
          )}

          {/* Scenario Selection */}
          <div>
            <label className="block font-mono text-xs text-on-surface-variant uppercase tracking-wider mb-2">
              Select Failure Scenario Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_SCENARIOS.map((s) => {
                const isSelected = s.id === selectedScenario;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleScenarioChange(s.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(91,91,247,0.15)]'
                        : 'border-outline-variant/20 bg-surface/40 hover:border-outline-variant/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-on-surface">
                        {s.name}
                      </span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${s.badgeColor}`}>
                        {s.badge}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-on-surface-variant line-clamp-1">
                      ₹{s.amount.toLocaleString()} • {s.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scenario Details Preview */}
          <div className="p-3.5 rounded-lg bg-surface/80 border border-white/5 font-mono text-xs space-y-1.5">
            <div className="flex justify-between items-center text-on-surface-variant">
              <span>Expected AI Action:</span>
              <span className="text-primary font-bold">{currentScenario.expectedDecision}</span>
            </div>
            <div className="text-[11px] text-on-surface-variant/80">
              {currentScenario.description}
            </div>
          </div>

          {/* Amount & Outcome controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs text-on-surface-variant uppercase tracking-wider mb-1.5">
                Transaction Amount (₹)
              </label>
              <input
                type="number"
                min="100"
                max="500000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-surface/60 border border-outline-variant/30 rounded px-3 py-2 font-mono text-sm text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-on-surface-variant uppercase tracking-wider mb-1.5">
                Simulated Execution Outcome
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as any)}
                className="w-full bg-surface/60 border border-outline-variant/30 rounded px-3 py-2 font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="SUCCESS">Recovery Success (Captured)</option>
                <option value="PENDING">Awaiting Webhook (In-Progress)</option>
                <option value="FAILED">Recovery Failed (Decline)</option>
                <option value="RANDOM">Random (Stochastic)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-mono text-xs text-on-surface-variant hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded bg-primary hover:bg-primary-fixed text-surface-dim font-mono text-xs font-semibold tracking-wider transition-all shadow-[0_0_20px_rgba(91,91,247,0.3)] disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-surface-dim border-t-transparent rounded-full animate-spin" />
                  <span>DISPATCHING...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>GENERATE EVENT →</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimulateEventModal;
