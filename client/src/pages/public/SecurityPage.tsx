import React from 'react';
import { NavLink } from 'react-router-dom';
import { SectionTag } from '../../components/system/SectionTag';
import { SystemPanel } from '../../components/system/SystemPanel';
import { StatusIndicator } from '../../components/system/StatusIndicator';
import { ActionButton } from '../../components/system/ActionButton';

export const SecurityPage: React.FC = () => {
  const pillars = [
    {
      num: '01 / ISOLATION',
      title: 'Multi-Tenant RBAC Isolation',
      desc: 'Granular access control enforcing merchant tenant boundaries with User and MerchantMembership relationships. Role tiers include OWNER, ADMIN, ANALYST, SUPPORT, and VIEWER.',
      status: 'VERIFIED',
      badge: 'RBAC ENFORCED',
    },
    {
      num: '02 / INTEGRITY',
      title: 'Timing-Safe HMAC SHA-256',
      desc: 'All Razorpay webhooks require raw-body HMAC SHA-256 signature verification evaluated using crypto.timingSafeEqual to defeat side-channel timing attacks.',
      status: 'VERIFIED',
      badge: 'TIMING-SAFE',
    },
    {
      num: '03 / IDEMPOTENCY',
      title: 'Attempt Idempotency Locks',
      desc: 'Database uniqueness constraints (@@unique([transactionId, attemptNumber])) and webhook event deduplication (x-razorpay-event-id) prevent duplicate charges and race conditions.',
      status: 'VERIFIED',
      badge: 'IDEMPOTENT',
    },
    {
      num: '04 / AUDITABILITY',
      title: 'Immutable Audit Logging',
      desc: 'Every recovery decision, AI reasoning factor, and execution action is committed with correlation IDs, timestamps, actor metadata, and IP address logging.',
      status: 'VERIFIED',
      badge: 'IMMUTABLE',
    },
    {
      num: '05 / GUARDRAILS',
      title: 'Strict Test Mode Guardrails',
      desc: 'The platform strictly enforces Razorpay Test Mode keys (rzp_test_). Security filters reject live production keys to ensure zero financial exposure during testing.',
      status: 'VERIFIED',
      badge: 'FAIL CLOSED',
    },
    {
      num: '06 / ZERO LEAKAGE',
      title: 'Zero Secret Exposure',
      desc: 'Database connection strings, Redis auth tokens, and Gemini API keys reside exclusively in backend environment variables and are completely stripped from client REST responses.',
      status: 'VERIFIED',
      badge: 'SERVER-ONLY SECRETS',
    },
  ];

  return (
    <div className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-16 font-mono">
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <SectionTag label="SECURITY & GOVERNANCE" />
        <h1 className="text-3xl sm:text-5xl font-bold font-geist text-on-surface tracking-tight leading-tight">
          FINANCIAL DATA PROTECTION & ZERO-TRUST ARCHITECTURE
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant/80 leading-relaxed">
          Architectural safeguards engineered to protect transaction integrity, prevent duplicate billing, and ensure cryptographic reconciliation.
        </p>
      </div>

      {/* Security Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pillars.map((pillar) => (
          <SystemPanel key={pillar.num} borderVariant="subtle" className="p-6 sm:p-7 space-y-4">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-primary font-bold">{pillar.num}</span>
              <StatusIndicator status={pillar.status} label={pillar.badge} />
            </div>

            <h3 className="text-base sm:text-lg font-bold font-geist text-on-surface">
              {pillar.title}
            </h3>

            <p className="text-xs text-on-surface-variant/70 leading-relaxed">
              {pillar.desc}
            </p>
          </SystemPanel>
        ))}
      </div>

      {/* Sandbox CTA */}
      <SystemPanel borderVariant="primary" className="p-8 sm:p-10 text-center space-y-4">
        <h3 className="text-xl sm:text-2xl font-bold font-geist text-white">
          Ready to evaluate the autonomous recovery engine?
        </h3>
        <p className="text-xs text-on-surface-variant/80 max-w-md mx-auto">
          Initialize a merchant sandbox in 60 seconds with synthetic failed transactions.
        </p>
        <NavLink to="/signup" className="inline-block pt-2">
          <ActionButton>
            INITIALIZE SANDBOX ENVIRONMENT &rarr;
          </ActionButton>
        </NavLink>
      </SystemPanel>
    </div>
  );
};
