import React from 'react';
import { NavLink } from 'react-router-dom';
import { SectionTag } from '../../components/system/SectionTag';
import { SystemPanel } from '../../components/system/SystemPanel';
import { StatusIndicator } from '../../components/system/StatusIndicator';
import { ActionButton } from '../../components/system/ActionButton';

export const FeaturesPage: React.FC = () => {
  const capabilities = [
    {
      chapter: '01 / DETECTION',
      title: 'Detection & Scoring Engine',
      desc: 'Continuously ingests failed transaction streams, assesses merchant risk, and computes recovery probabilities (0–100%) by correlating customer historical success with failure codes.',
      status: 'OPERATIONAL',
      statusLabel: '0-100% PROBABILITY',
    },
    {
      chapter: '02 / DIAGNOSIS',
      title: 'Google Gemini AI Diagnostics',
      desc: 'Translates cryptic gateway error payloads into standardized failure classifications with structured JSON outputs, key signals, and deterministic fallback guarantees.',
      status: 'OPERATIONAL',
      statusLabel: 'GEMINI 3.5 FLASH',
    },
    {
      chapter: '03 / DECISION',
      title: 'Authoritative Decision Engine',
      desc: 'Deterministic hard safety rules enforce contextual actions (RETRY, WAIT, REMIND, STOP). Prevents AI hallucinations and enforces strict retry caps.',
      status: 'OPERATIONAL',
      statusLabel: 'HARD SAFETY RULES',
    },
    {
      chapter: '04 / EXECUTION',
      title: 'BullMQ & Redis Workers',
      desc: 'Scalable asynchronous execution backed by Upstash Redis, supporting concurrency locks, exponential backoff, and strict idempotency.',
      status: 'OPERATIONAL',
      statusLabel: 'BULLMQ QUEUES',
    },
    {
      chapter: '05 / VERIFICATION',
      title: 'Payment Evidence Ledger',
      desc: 'Financial reconciliation ensuring revenue is recognized if and only if Razorpay emits a verified payment.captured HMAC SHA-256 webhook.',
      status: 'VERIFIED',
      statusLabel: 'HMAC SHA-256',
    },
    {
      chapter: '06 / TELEMETRY',
      title: 'System Telemetry & Observability',
      desc: 'Real-time multi-service telemetry calculating query latencies, queue depths, AI fallback rates, and webhook health without hardcoded values.',
      status: 'OPERATIONAL',
      statusLabel: 'LIVE TELEMETRY',
    },
  ];

  return (
    <div className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-16 font-mono">
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <SectionTag label="CORE CAPABILITIES" />
        <h1 className="text-3xl sm:text-5xl font-bold font-geist text-on-surface tracking-tight leading-tight">
          ENGINEERED FOR AUTONOMOUS REVENUE RECOVERY
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant/80 leading-relaxed">
          Integrated detection, LLM-based root-cause diagnosis, deterministic safety policies, asynchronous workers, and cryptographic payment reconciliation.
        </p>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {capabilities.map((cap) => (
          <SystemPanel key={cap.chapter} borderVariant="subtle" className="p-6 sm:p-7 space-y-4">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-primary font-bold">{cap.chapter}</span>
              <StatusIndicator status={cap.status} label={cap.statusLabel} />
            </div>

            <h3 className="text-base sm:text-lg font-bold font-geist text-on-surface">
              {cap.title}
            </h3>

            <p className="text-xs text-on-surface-variant/70 leading-relaxed">
              {cap.desc}
            </p>
          </SystemPanel>
        ))}
      </div>

      {/* Navigation Footer */}
      <div className="pt-6 text-center">
        <NavLink to="/how-it-works">
          <ActionButton>
            SEE 6-STAGE WORKFLOW &rarr;
          </ActionButton>
        </NavLink>
      </div>
    </div>
  );
};
