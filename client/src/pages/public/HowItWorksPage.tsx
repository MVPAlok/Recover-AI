import React from 'react';
import { NavLink } from 'react-router-dom';
import { SectionTag } from '../../components/system/SectionTag';
import { SystemPanel } from '../../components/system/SystemPanel';
import { StatusIndicator } from '../../components/system/StatusIndicator';
import { ActionButton } from '../../components/system/ActionButton';

export const HowItWorksPage: React.FC = () => {
  const stages = [
    {
      chapter: 'STAGE 01 / REAL-TIME INGESTION',
      source: 'GATEWAY WEBHOOK STREAM',
      title: 'Detection & Feature Extraction',
      desc: 'When a checkout payment fails on your website, RecoverAI ingests the raw failure event. The detection service extracts transaction attributes (amount, currency, customer history, and failure codes) to build an isolated execution context.',
      badge: 'STREAM INGESTION',
    },
    {
      chapter: 'STAGE 02 / RECOVERY PROBABILITY',
      source: 'MATHEMATICAL SCORING',
      title: 'Mathematical Probability & Risk Classification',
      desc: 'The scoring engine evaluates whether the failure is recoverable (e.g. transient network timeouts score >85% likelihood, while hard fraud declines score <5%). It also classifies priority based on customer lifetime value.',
      badge: '0.00 – 1.00 SCORE',
    },
    {
      chapter: 'STAGE 03 / LLM ROOT-CAUSE DIAGNOSIS',
      source: 'GOOGLE GEMINI 3.5 FLASH',
      title: 'AI Diagnostic Interpretation',
      desc: 'Google Gemini translates obscure decline codes into categorized failure reasons (TEMPORARY_INFRASTRUCTURE, CUSTOMER_AUTHENTICATION, FINANCIAL_HARD). If the LLM times out, an instant deterministic fallback rule is engaged.',
      badge: 'ZERO DOWNTIME',
    },
    {
      chapter: 'STAGE 04 / DETERMINISTIC POLICY',
      source: 'SAFETY ENGINE',
      title: 'Contextual Action Selection',
      desc: 'Hardcoded deterministic rules evaluate the AI advisory against safety guardrails to choose between RETRY (gateway spike), WAIT (bank congestion cooldown), REMIND (3DS OTP drop-off link), or STOP (hard decline).',
      badge: 'SAFETY OVERRIDES',
    },
    {
      chapter: 'STAGE 05 / CONTROLLED EXECUTION',
      source: 'UPSTASH REDIS + BULLMQ',
      title: 'Asynchronous Dispatch & Idempotency Lock',
      desc: 'The BullMQ worker queue handles the execution task with concurrency locks, verifying that the transaction has not already succeeded or exceeded max attempts (n >= 3). Dispatches Razorpay Test Orders or payment links.',
      badge: 'IDEMPOTENT',
    },
    {
      chapter: 'STAGE 06 / CRYPTOGRAPHIC SETTLEMENT',
      source: 'POSTGRESQL EVIDENCE LEDGER',
      title: 'Verified Payment Reconciliation',
      desc: 'When the customer or bank captures the transaction, Razorpay sends a signed payment.captured webhook. RecoverAI verifies the signature using timing-safe HMAC SHA-256 and writes verified revenue to the Payment ledger.',
      badge: 'CRYPTOGRAPHIC TRUTH',
    },
  ];

  return (
    <div className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-16 font-mono">
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <SectionTag label="ENGINEERING SPECIFICATION" />
        <h1 className="text-3xl sm:text-5xl font-bold font-geist text-on-surface tracking-tight leading-tight">
          THE 6-STAGE AUTONOMOUS RECOVERY LIFECYCLE
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant/80 leading-relaxed">
          From transaction failure ingestion to cryptographic ledger reconciliation.
        </p>
      </div>

      {/* 6 Stages Expanded */}
      <div className="space-y-6">
        {stages.map((st) => (
          <SystemPanel key={st.chapter} borderVariant="subtle" className="p-6 sm:p-8 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-primary uppercase">{st.chapter}</span>
              <StatusIndicator status="OPERATIONAL" label={st.source} />
            </div>

            <h3 className="text-lg sm:text-xl font-bold font-geist text-on-surface">
              {st.title}
            </h3>

            <p className="text-xs text-on-surface-variant/70 leading-relaxed">
              {st.desc}
            </p>
          </SystemPanel>
        ))}
      </div>

      {/* Recovery Timelines Matrix */}
      <SystemPanel borderVariant="primary" className="p-6 sm:p-8 space-y-6">
        <div className="space-y-1 border-b border-white/10 pb-3">
          <span className="text-xs text-primary font-bold uppercase">EXPECTED RETENTION BENCHMARKS</span>
          <h2 className="text-xl sm:text-2xl font-bold font-geist text-white">
            Recovery Timelines by Policy Strategy
          </h2>
        </div>

        <div className="overflow-x-auto rounded border border-white/10">
          <table className="w-full text-left text-xs border-collapse min-w-[580px]">
            <thead>
              <tr className="border-b border-white/10 bg-surface/80 text-on-surface-variant/70 uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Failure Trigger</th>
                <th className="py-3 px-4">Recovery Window</th>
                <th className="py-3 px-4">Retention Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-on-surface-variant">
              <tr>
                <td className="py-3 px-4 text-secondary font-bold">RETRY</td>
                <td className="py-3 px-4 text-white">Gateway Timeout / Network Drop</td>
                <td className="py-3 px-4">0 – 5 Minutes</td>
                <td className="py-3 px-4 text-secondary font-bold">70% – 85% Recovered</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-primary font-bold">WAIT</td>
                <td className="py-3 px-4 text-white">Bank Server Spike / Peak Hour</td>
                <td className="py-3 px-4">15 – 30 Minutes</td>
                <td className="py-3 px-4 text-primary font-bold">50% – 65% Recovered</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-tertiary font-bold">REMIND</td>
                <td className="py-3 px-4 text-white">3DS Drop-off / OTP Latency</td>
                <td className="py-3 px-4">1 – 24 Hours</td>
                <td className="py-3 px-4 text-tertiary font-bold">35% – 55% Recovered</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-error font-bold">STOP</td>
                <td className="py-3 px-4 text-white">Expired Card / Max Retries Exceeded</td>
                <td className="py-3 px-4">Immediate (0s)</td>
                <td className="py-3 px-4 text-on-surface-variant/60">Halted (Loss Prevention)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SystemPanel>

      <div className="text-center pt-4">
        <NavLink to="/security">
          <ActionButton>
            REVIEW SECURITY ARCHITECTURE
          </ActionButton>
        </NavLink>
      </div>
    </div>
  );
};
