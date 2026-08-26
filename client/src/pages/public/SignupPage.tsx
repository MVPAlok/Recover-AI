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
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-16 relative font-mono">
      <div className="w-full max-w-md space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <SectionTag label="01 / INITIALIZATION" />
          <h1 className="text-2xl sm:text-4xl font-bold font-geist text-on-surface tracking-tight">
            CREATE SANDBOX
          </h1>
          <p className="text-xs sm:text-sm font-geist text-on-surface-variant/80 max-w-sm mx-auto leading-relaxed">
            Set up your isolated merchant workspace. No production funds are touched — all transactions are synthetic.
          </p>
        </div>

        <SystemPanel borderVariant="primary" className="p-5 sm:p-8 space-y-6">
          <form onSubmit={handleSignup} className="space-y-4">

            {/* Business Name */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] text-on-surface-variant/70 uppercase tracking-wider">
                Business / Store Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Retail India"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2.5 rounded bg-surface/50 border border-white/10 text-on-surface text-xs placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] text-on-surface-variant/70 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded bg-surface/50 border border-white/10 text-on-surface text-xs placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Currency */}
            <div className="space-y-1">
              <label className="block text-[10px] sm:text-[11px] text-on-surface-variant/70 uppercase tracking-wider">
                Settlement Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded bg-surface/50 border border-white/10 text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
              >
                <option value="INR" className="bg-[#070B17] text-white">INR — Indian Rupee (₹)</option>
                <option value="USD" className="bg-[#070B17] text-white">USD — US Dollar ($)</option>
              </select>
            </div>

            {/* What happens next info box */}
            <div className="p-3.5 rounded bg-surface/30 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-on-surface">
                <span>What happens next</span>
                <StatusIndicator status="OPERATIONAL" label="SYNTHETIC READY" />
              </div>
              <ul className="space-y-1.5 text-[11px] text-on-surface-variant/70 font-geist leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">→</span>
                  Your isolated sandbox workspace is created
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">→</span>
                  Onboarding wizard guides Razorpay setup (2 min)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">→</span>
                  Synthetic transactions are auto-seeded for evaluation
                </li>
              </ul>
            </div>

            <div className="pt-1">
              <ActionButton
                type="submit"
                disabled={isSubmitting}
                className="w-full justify-center"
              >
                {isSubmitting ? 'CREATING SANDBOX...' : 'CREATE SANDBOX →'}
              </ActionButton>
            </div>
          </form>

          {/* Footer */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
            <div className="text-on-surface-variant/70 font-geist">
              Already have a sandbox?{' '}
              <NavLink to="/login" className="text-primary hover:underline font-bold font-mono">
                SIGN IN →
              </NavLink>
            </div>
            <StatusIndicator status="VERIFIED" label="TENANT ISOLATED" />
          </div>
        </SystemPanel>
      </div>
    </div>
  );
};

export default SignupPage;
