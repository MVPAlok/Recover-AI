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

  const currentMerchant = merchants.find((m) => m.id === selectedMerchantId);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-16 relative font-mono">
      {/* Centered System Access Console */}
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <SectionTag label="01 / ACCESS" />
          <h1 className="text-3xl sm:text-4xl font-bold font-geist text-on-surface tracking-tight">
            ENTER THE RECOVERY SYSTEM
          </h1>
          <p className="text-xs sm:text-sm font-geist text-on-surface-variant/80 max-w-md mx-auto leading-relaxed">
            Authenticate your merchant environment to access autonomous recovery operations.
          </p>
        </div>

        {/* Main Authentication System Panel (Surface 1) */}
        <SystemPanel borderVariant="primary" className="p-6 sm:p-8 space-y-6">
          {/* Quick Operational Profile Selection */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-on-surface-variant/70">
              <span>ACTIVE WORKSPACE NODES</span>
              <StatusIndicator status="OPERATIONAL" label="TEST MODE" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {merchants.slice(0, 2).map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMerchantAndLogin(m.id)}
                  className={`p-3.5 rounded bg-surface/50 border text-left transition-all text-xs flex flex-col justify-between space-y-2 ${
                    selectedMerchantId === m.id
                      ? 'border-primary/40 bg-primary/10 text-on-surface'
                      : 'border-white/5 hover:border-white/20 text-on-surface-variant/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface text-[11px] truncate font-geist">{m.name}</span>
                    <span className="text-secondary text-[9px] font-bold">
                      {m.role || (idx === 0 ? 'OWNER' : 'ADMIN')}
                    </span>
                  </div>
                  <div className="text-[10px] text-on-surface-variant/60 truncate">{m.email}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] text-on-surface-variant/70 uppercase tracking-wider">
                MERCHANT IDENTIFIER
              </label>
              <select
                value={selectedMerchantId}
                onChange={(e) => setSelectedMerchantId(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2.5 rounded bg-surface/50 border border-white/10 text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
              >
                {loading ? (
                  <option>Loading merchant environments...</option>
                ) : (
                  merchants.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#070B17] text-white">
                      {m.name} — {m.id.slice(0, 16)}...
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] text-on-surface-variant/70 uppercase tracking-wider">
                FINANCE & OPERATIONS EMAIL
              </label>
              <input
                type="text"
                readOnly
                value={currentMerchant?.email || 'admin@recoverai.local'}
                className="w-full px-3 py-2.5 rounded bg-surface/30 border border-white/5 text-on-surface/80 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] text-on-surface-variant/70 uppercase tracking-wider">
                SECURITY CONTEXT
              </label>
              <div className="flex justify-between items-center p-2.5 rounded bg-surface/30 border border-white/5 text-[10px] text-on-surface-variant/70">
                <span>Multi-Tenant Sandbox Session</span>
                <span className="text-secondary font-bold">&#10003; ISOLATED</span>
              </div>
            </div>

            <div className="pt-2">
              <ActionButton
                type="submit"
                disabled={!selectedMerchantId}
                className="w-full justify-center"
              >
                ENTER RECOVERY SYSTEM
              </ActionButton>
            </div>
          </form>

          {/* Panel Footer Status */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
            <div className="text-on-surface-variant/70 font-geist">
              New merchant?{' '}
              <NavLink to="/signup" className="text-primary hover:underline font-bold font-mono">
                CREATE SANDBOX &rarr;
              </NavLink>
            </div>
            <StatusIndicator status="OPERATIONAL" label="AUTH SERVICES READY" />
          </div>
        </SystemPanel>
      </div>
    </div>
  );
};
