import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { setActiveMerchantId, setOnboardingProfile, createMerchantWorkspace } from '../../services/api';
import { SectionTag } from '../../components/system/SectionTag';
import { SystemPanel } from '../../components/system/SystemPanel';
import { ActionButton } from '../../components/system/ActionButton';
import { StatusIndicator } from '../../components/system/StatusIndicator';

export const SignupPage: React.FC = () => {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const bName = businessName.trim() || 'Apex Retail India';
    const bEmail = email.trim() || 'finance@apexretail.in';

    setOnboardingProfile({
      businessName: bName,
      email: bEmail,
      currency: currency || 'INR',
    });

    try {
      const created = await createMerchantWorkspace({
        name: bName,
        email: bEmail,
        currency: currency || 'INR',
      });
      if (created?.id) {
        setActiveMerchantId(created.id);
      }
    } catch (err) {
      console.warn('Sandbox merchant pre-creation warning, proceeding to onboarding wizard:', err);
    } finally {
      setIsSubmitting(false);
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <SectionTag label="01 / INITIALIZATION" />
          <h1 className="text-2xl sm:text-4xl font-bold font-geist text-on-surface tracking-tight mt-2">
            CREATE RECOVERY ENVIRONMENT
          </h1>
          <p className="text-xs sm:text-sm font-mono text-on-surface-variant max-w-md mx-auto leading-relaxed">
            Configure your isolated merchant infrastructure and autonomous recovery rules.
          </p>
        </div>

        {/* Configuration System Panel */}
        <SystemPanel borderVariant="primary" className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1 font-mono">
              <label className="block text-[10px] sm:text-[11px] text-on-surface-variant/70 uppercase tracking-wider">
                BUSINESS / STORE NAME
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Retail India"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2.5 rounded bg-surface/50 border border-white/10 text-on-surface text-xs font-mono placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1 font-mono">
              <label className="block text-[10px] sm:text-[11px] text-on-surface-variant/70 uppercase tracking-wider">
                FINANCE & OPERATIONS EMAIL
              </label>
              <input
                type="email"
                required
                placeholder="finance@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded bg-surface/50 border border-white/10 text-on-surface text-xs font-mono placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1 font-mono">
              <label className="block text-[10px] sm:text-[11px] text-on-surface-variant/70 uppercase tracking-wider">
                SETTLEMENT CURRENCY
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded bg-surface/50 border border-white/10 text-on-surface text-xs font-mono focus:outline-none focus:border-primary transition-colors"
              >
                <option value="INR" className="bg-surface-container-lowest text-white">INR — Indian Rupee (₹)</option>
                <option value="USD" className="bg-surface-container-lowest text-white">USD — US Dollar ($)</option>
              </select>
            </div>

            {/* Sandbox Environment notice */}
            <div className="p-3 rounded bg-surface/30 border border-white/5 space-y-1 text-xs font-mono">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-on-surface">
                <span>SANDBOX ENVIRONMENT</span>
                <StatusIndicator status="OPERATIONAL" label="SYNTHETIC READY" />
              </div>
              <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
                Synthetic transactions enabled. No production funds are touched during evaluation.
              </p>
            </div>

            <div className="pt-2">
              <ActionButton
                type="submit"
                disabled={isSubmitting}
                className="w-full justify-center"
              >
                {isSubmitting ? 'INITIALIZING ENVIRONMENT...' : 'INITIALIZE RECOVERY ENVIRONMENT'}
              </ActionButton>
            </div>
          </form>

          {/* Panel Footer */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-mono">
            <div className="text-on-surface-variant/70">
              Existing environment?{' '}
              <NavLink to="/login" className="text-primary hover:underline font-bold">
                SIGN IN &rarr;
              </NavLink>
            </div>
            <StatusIndicator status="VERIFIED" label="TENANT ISOLATED" />
          </div>
        </SystemPanel>
      </div>
    </div>
  );
};
