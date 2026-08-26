import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { fetchMerchants, setActiveMerchantId } from '../../services/api';
import { Merchant } from '../../types';
import { SectionTag } from '../../components/system/SectionTag';
import { SystemPanel } from '../../components/system/SystemPanel';
import { ActionButton } from '../../components/system/ActionButton';
import { StatusIndicator } from '../../components/system/StatusIndicator';

export const LoginPage: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMerchants()
      .then((data) => {
        if (data.length === 0) {
          // 0 workspaces → stay on page, show "create sandbox" prompt
          setMerchants([]);
        } else if (data.length === 1) {
          // 1 workspace → auto-enter immediately, no click needed
          setActiveMerchantId(data[0].id);
          navigate('/dashboard', { replace: true });
        } else {
          // 2+ workspaces → show card picker
          setMerchants(data);
          setSelectedMerchantId(data[0].id);
        }
      })
      .catch(() => setError('Unable to reach the server. Please try again.'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMerchantId) {
      setActiveMerchantId(selectedMerchantId);
      navigate('/dashboard');
    }
  };

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-16 relative font-mono">
      <div className="w-full max-w-md space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <SectionTag label="01 / ACCESS" />
          <h1 className="text-2xl sm:text-4xl font-bold font-geist text-on-surface tracking-tight">
            SIGN IN
          </h1>
          <p className="text-xs sm:text-sm font-geist text-on-surface-variant/80 max-w-sm mx-auto leading-relaxed">
            Select your sandbox workspace to enter the autonomous recovery operations center.
          </p>
        </div>

        <SystemPanel borderVariant="primary" className="p-5 sm:p-8 space-y-6">
          <form onSubmit={handleEnter} className="space-y-5">

            {/* Workspace Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                <span>YOUR SANDBOXES</span>
                <StatusIndicator status="OPERATIONAL" label="TEST MODE" />
              </div>

              {loading ? (
                <div className="space-y-3">
                  <div className="h-16 rounded bg-surface/30 border border-white/5 animate-pulse" />
                  <div className="h-16 rounded bg-surface/30 border border-white/5 animate-pulse opacity-60" />
                  <p className="text-center text-[10px] text-on-surface-variant/50 pt-1">
                    Checking workspaces...
                  </p>
                </div>
              ) : error ? (
                <div className="p-4 rounded bg-error/10 border border-error/30 text-error text-xs">
                  {error}
                </div>
              ) : merchants.length === 0 ? (
                <div className="p-5 rounded bg-surface/30 border border-white/10 text-center space-y-4">
                  <p className="text-on-surface-variant/70 text-xs">No sandboxes found for your account.</p>
                  <NavLink
                    to="/signup"
                    className="inline-block px-5 py-2.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold font-mono rounded hover:bg-primary hover:text-surface-dim transition-all"
                  >
                    CREATE YOUR FIRST SANDBOX →
                  </NavLink>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                  {merchants.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMerchantId(m.id)}
                      className={`w-full p-3.5 rounded border text-left transition-all text-xs flex items-center justify-between gap-3 ${
                        selectedMerchantId === m.id
                          ? 'border-primary/50 bg-primary/10 shadow-[0_0_12px_rgba(91,91,247,0.15)]'
                          : 'border-white/5 bg-surface/30 hover:border-white/20 hover:bg-surface/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-on-surface text-[11px] font-geist truncate">{m.name}</div>
                        <div className="text-[10px] text-on-surface-variant/60 truncate mt-0.5">{m.email}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] text-secondary font-bold bg-secondary/10 px-1.5 py-0.5 rounded">SANDBOX</span>
                        {selectedMerchantId === m.id && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected workspace info */}
            {selectedMerchant && (
              <div className="flex justify-between items-center p-2.5 rounded bg-surface/30 border border-white/5 text-[10px] text-on-surface-variant/70">
                <span>Entering as</span>
                <span className="text-white font-bold font-geist truncate max-w-[60%] text-right">{selectedMerchant.email}</span>
              </div>
            )}

            {/* Security badge */}
            <div className="flex justify-between items-center p-2.5 rounded bg-surface/20 border border-white/5 text-[10px] text-on-surface-variant/60">
              <span>Security context</span>
              <span className="text-secondary font-bold">✓ TENANT ISOLATED</span>
            </div>

            <ActionButton
              type="submit"
              disabled={!selectedMerchantId || loading}
              className="w-full justify-center"
            >
              ENTER DASHBOARD →
            </ActionButton>
          </form>

          {/* Footer */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
            <div className="text-on-surface-variant/70 font-geist">
              New here?{' '}
              <NavLink to="/signup" className="text-primary hover:underline font-bold font-mono">
                CREATE SANDBOX →
              </NavLink>
            </div>
            <StatusIndicator status="OPERATIONAL" label="AUTH SERVICES READY" />
          </div>
        </SystemPanel>
      </div>
    </div>
  );
};

export default LoginPage;
