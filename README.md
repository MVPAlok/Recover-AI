# RecoverAI — Autonomous AI Payment Recovery Platform

<p align="center">
  <strong>Detect. Diagnose. Decide. Execute. Verify. Recover.</strong>
</p>

<p align="center">
  An event-driven payment recovery platform designed to help merchants identify recoverable payment failures and execute safe recovery workflows.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-Frontend-purple?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Express-Backend-green?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-ORM-darkblue?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Redis-Queue-red?style=for-the-badge&logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/BullMQ-Workers-red?style=for-the-badge" alt="BullMQ" />
  <img src="https://img.shields.io/badge/Google%20Gemini-AI-purple?style=for-the-badge&logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Razorpay-TEST%20MODE-blue?style=for-the-badge" alt="Razorpay" />
</p>

---

## 📑 Table of Contents

- [Overview](#overview)
- [Problem](#problem)
- [How RecoverAI Works](#how-recoverai-works)
- [Recovery Lifecycle](#recovery-lifecycle)
- [Core Capabilities](#core-capabilities)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Financial Integrity](#financial-integrity)
- [AI Diagnosis](#ai-diagnosis)
- [Recovery Decision Engine](#recovery-decision-engine)
- [Background Processing](#background-processing)
- [Webhook Processing](#webhook-processing)
- [Multi-Tenant Security](#multi-tenant-security)
- [Dashboard](#dashboard)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Sandbox & Security Restrictions](#sandbox--security-restrictions)
- [Current Limitations](#current-limitations)
- [Roadmap](#roadmap)
- [Design Philosophy](#design-philosophy)
- [Why RecoverAI?](#why-recoverai)
- [License](#license)

---

## Overview

**RecoverAI** is an AI-assisted payment recovery orchestration platform. The system is designed around a simple idea:

> *A failed payment does not necessarily mean lost revenue.*

Instead of treating every failed transaction the same way, RecoverAI analyzes the failure, determines whether recovery is appropriate, selects a policy-approved recovery action, executes that action, and waits for verified payment evidence before considering revenue recovered.

The core lifecycle is:

```text
FAILED PAYMENT
     │
     ▼
01 / DETECT
     │
     ▼
02 / DIAGNOSE
     │
     ▼
03 / DECIDE
     │
     ▼
04 / EXECUTE
     │
     ▼
05 / VERIFY
     │
     ▼
06 / RECOVER
```

The architecture combines:
- AI-assisted failure diagnosis
- Deterministic recovery policies
- PostgreSQL persistence
- Redis/BullMQ background processing
- Razorpay Test Mode integration
- Cryptographic webhook verification
- Idempotent event processing
- Multi-tenant data isolation
- Recovery audit trails
- Merchant operational dashboards

---

## Problem

Payment failures can happen for many different reasons:
- Temporary gateway failures
- Bank downtime
- Authentication or 3DS interruptions
- OTP drop-offs
- Payment method failures
- Expired or invalid payment instruments
- Customer abandonment
- Temporary infrastructure problems

A generic retry strategy is not appropriate for every failure.

For example:
* **Gateway timeout** $\rightarrow$ *Retry may be appropriate*
* **Customer authentication abandoned** $\rightarrow$ *A customer-assisted payment flow may be better*
* **Expired payment instrument** $\rightarrow$ *Repeated retries are unlikely to help*

RecoverAI attempts to make this distinction automatically while keeping the final recovery decision constrained by deterministic safety policies.

---

## How RecoverAI Works

RecoverAI processes a failed transaction through six logical stages:

```text
┌───────────────┐
│    DETECT     │
│ Failure Event │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   DIAGNOSE    │
│ Failure Cause │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    DECIDE     │
│ Recovery Rule │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    EXECUTE    │
│ Recovery Job  │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    VERIFY     │
│ Webhook + HMAC│
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    RECOVER    │
│Verified Value │
└───────────────┘
```

The important design principle is:

> **Executing a recovery action does not automatically mean that money was recovered.**
> Recovery is confirmed only after the payment evidence has been successfully verified and reconciled.

---

## Recovery Lifecycle

### 01 / DETECT
The detection layer evaluates failed transactions and calculates recovery-related signals.

*Example*:
```text
Transaction: ₹2,499
Status: FAILED
Failure: Gateway timeout
Recovery probability: 78%
```
The detection stage produces structured information used by the downstream diagnosis and policy engines.

---

### 02 / DIAGNOSE
The diagnosis layer determines the likely reason behind a payment failure.
Google Gemini can be used to analyze structured transaction information.

*Example*:
```text
Failure Category: GATEWAY_TIMEOUT
Root Cause: Temporary gateway response failure
Risk Level: MEDIUM
Confidence: 91%
```
If Gemini is unavailable, the system can use a deterministic fallback mechanism rather than silently pretending that an LLM response was generated.

---

### 03 / DECIDE
The recovery decision engine determines which action is allowed.
Possible recovery decisions include:
- `RETRY`
- `REMIND`
- `WAIT`
- `ESCALATE`
- `STOP`

The AI diagnosis does not have unrestricted authority. Deterministic policy constraints can override an AI recommendation when a recovery action would violate system safety rules.

*Example*:
```text
AI Recommendation ──► RETRY ──► Policy Check ──► retryCount = 3 ──► Retry limit reached ──► STOP
```

---

### 04 / EXECUTE
Approved recovery actions are executed through the recovery executor. Depending on the failure and policy, execution may include:
- Payment retry
- Payment link generation
- Reminder workflow
- Delayed retry window
- Manual review
- Policy-controlled stop

Background jobs can be processed through Redis and BullMQ.

---

### 05 / VERIFY
Payment outcomes are not trusted merely because a recovery API request succeeded.
Razorpay webhook events are verified using:

```text
Raw Webhook Body ──► HMAC SHA-256 ──► Constant-Time Signature Comparison ──► Event Validation ──► Idempotency Check
```
Duplicate webhook events are ignored safely.

---

### 06 / RECOVER
A transaction is considered financially recovered only after the payment evidence has been successfully verified and reconciled.

*Example*:
```text
Recovery Attempt ──► Payment Captured ──► Webhook Verified ──► Transaction Matched ──► Amount Matched ──► Payment Reconciled ──► RECOVERED
```

---

## Core Capabilities

### AI-Assisted Diagnosis
- Failure categorization
- Root-cause analysis
- Recovery probability signals
- Confidence scoring
- Gemini integration
- Deterministic fallback

### Recovery Decision Engine
- `RETRY`, `REMIND`, `WAIT`, `ESCALATE`, `STOP`
- Retry limits
- Safety overrides
- Idempotency

### Payment Evidence
- Verified payment records
- Captured amount
- Razorpay payment ID
- Razorpay order ID
- Reconciliation state
- Amount validation

### Webhook Security
- HMAC SHA-256 verification
- Raw-body verification
- Constant-time signature comparison
- Event deduplication
- Processing state tracking
- Failure handling

### Background Processing
- Redis
- BullMQ
- Asynchronous recovery jobs
- Retry handling
- Queue workers
- Correlation IDs

### Multi-Tenant Architecture
- User accounts
- Merchant memberships
- Role-based access
- Merchant-scoped queries
- Cross-tenant isolation

### Observability
- System health
- Database status
- Redis status
- AI status
- Razorpay environment status
- Worker status
- Operational metrics

---

## Architecture

```text
┌──────────────────────┐
│     React / Vite     │
│   Merchant Console   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Express REST API   │
└──────────┬───────────┘
           │
     ┌─────┴───────────────────┬─────────────────────┐
     ▼                         ▼                     ▼
┌──────────────┐        ┌──────────────┐      ┌──────────────┐
│  Detection   │        │  Diagnosis   │      │    Policy    │
│    Engine    │        │    Gemini    │      │    Engine    │
└──────┬───────┘        └──────┬───────┘      └──────┬───────┘
       │                       │                     │
       └───────────────────────┼─────────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Recovery Orchestrator│
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    BullMQ / Redis    │
                    │   Background Jobs    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Recovery Worker    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Razorpay Test Mode  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Razorpay Webhooks   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  HMAC Verification   │
                    │   + Idempotency      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  PostgreSQL / Prisma │
                    │  Payment Evidence    │
                    │  Transactions        │
                    │  Recovery Attempts   │
                    │  Audit Logs          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Merchant Dashboard  │
                    └──────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | Merchant interface |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS | UI system |
| **Backend** | Node.js + Express | REST API |
| **Database** | PostgreSQL | Persistent application state |
| **ORM** | Prisma | Database access |
| **Queue** | BullMQ | Background job processing |
| **Cache / Store** | Redis | Job and queue infrastructure |
| **AI** | Google Gemini | Failure diagnosis |
| **Payment Gateway** | Razorpay | Test Mode payment workflows |
| **Security** | HMAC SHA-256 | Webhook verification |

---

## Financial Integrity

RecoverAI separates:
$$\text{Recovery Attempt} \neq \text{Verified Payment}$$

This prevents a recovery attempt from being incorrectly counted as recovered revenue.

A simplified model is:
$$\text{Recovery Attempt} \neq \text{Recovered Revenue}$$

Instead:
$$\text{Verified + Reconciled Payment Evidence} \longrightarrow \text{Recovered Revenue}$$

The financial evidence layer validates:
- Transaction identity
- Payment identity
- Order identity
- Currency
- Expected amount
- Captured amount
- Webhook signature
- Reconciliation state

If an amount mismatch occurs:
```text
Expected: ₹10,000 | Captured: ₹9,000 ──► RECONCILIATION BLOCKED ──► REQUIRES REVIEW
```

---

## AI Diagnosis

Google Gemini is used as an AI-assisted diagnostic layer. The system treats AI as a reasoning component rather than the final financial authority.

```text
Transaction Data ──► Gemini Diagnosis ──► Structured Result ──► Deterministic Policy Engine ──► Approved Recovery Action
```

If the AI service becomes unavailable:
```text
Gemini ──► Unavailable ──► Deterministic Fallback ──► Continue Safely
```
Fallback results are explicitly marked rather than presented as successful LLM decisions.

---

## Recovery Decision Engine

The decision engine evaluates recovery conditions using deterministic rules.

*Example*:
```text
Failure Type: Gateway Timeout
Retry Count: 0
Transaction: ₹2,499
Risk: Low
Recovery Probability: 78%
     │
     ▼
Decision: RETRY
```

Safety conditions can override that decision:
```text
Retry Count: 3
Maximum: 3
     │
     ▼
Decision: STOP
```

The architecture intentionally separates **AI reasoning** from **financial authorization**.

---

## Background Processing

RecoverAI uses Redis and BullMQ for asynchronous operations.

```text
API Request ──► Create Recovery Job ──► BullMQ Queue ──► Recovery Worker ──► Execute Action ──► Persist Result
```
Background processing allows recovery operations to be retried and handled independently from the HTTP request lifecycle.

---

## Webhook Processing

Razorpay webhook processing follows a verification pipeline:

```text
Razorpay
   │
   ▼
POST /api/webhooks/razorpay
   │
   ▼
Capture Raw Body
   │
   ▼
Verify HMAC SHA-256
   │
   ▼
Validate Event
   │
   ▼
Check Event ID ──► Duplicate ──► Ignore Safely
   │
   ▼
Process Event
   │
   ▼
Match Transaction
   │
   ▼
Validate Amount
   │
   ▼
Reconcile Payment
   │
   ▼
Update Recovery State
```

Supported lifecycle events include:
- `payment.authorized`
- `payment.captured`
- `payment.failed`

---

## Multi-Tenant Security

RecoverAI is designed around merchant-level tenant isolation. The conceptual relationship is:

```text
User ──► MerchantMembership ──► Merchant ──► Transactions ──► Payments ──► Recovery Attempts ──► Audit Logs
```

All merchant-scoped queries include the authenticated merchant context.

*Example*:
```text
Merchant A ──► Transactions WHERE merchantId = A
```
A request attempting to access Merchant B's transaction through an ID will not bypass that merchant boundary.

Security tests cover:
- Cross-tenant transaction access
- Cross-tenant recovery access
- Cross-tenant overview metrics
- Customer history isolation
- Audit log isolation
- Secret exposure checks

---

## Dashboard

The RecoverAI dashboard is designed as an operational recovery console rather than a generic analytics dashboard.

- **Overview**: Provides visibility into revenue at risk, verified recovered revenue, recovery attempts, recovery rate, active recovery operations, and system health.
- **Transactions**: Provides search, filtering, payment status, recovery status, risk information, and transaction inspection.
- **Transaction Detail**: Provides the complete lifecycle:
  $$\text{Detection} \rightarrow \text{Diagnosis} \rightarrow \text{Decision} \rightarrow \text{Execution} \rightarrow \text{Verification} \rightarrow \text{Recovery}$$
- **Recovery Center**: Provides visibility into recovery attempts, execution state, recovery outcomes, and manual intervention.
- **Analytics**: Provides operational analysis of failure categories, recovery outcomes, recovery decisions, and revenue exposure.
- **Audit**: Provides chronological records of system actions and recovery events.
- **System**: Provides infrastructure and safety information such as PostgreSQL, Redis, Gemini, Razorpay, Workers, and Webhooks.

---

## Project Structure

```text
Recover_AI/
│
├── client/
│   └── src/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       │   └── public/
│       └── services/
│
├── server/
│   └── src/
│       ├── modules/
│       │   ├── detection/
│       │   ├── diagnosis/
│       │   ├── recovery-decision/
│       │   ├── recovery-executor/
│       │   ├── webhooks/
│       │   ├── dashboard/
│       │   ├── system/
│       │   ├── developer/
│       │   └── queue/
│       ├── integrations/
│       │   └── razorpay/
│       └── scripts/
│
├── database/
│   └── prisma/
│       └── schema.prisma
│
├── docs/
│   ├── architecture/
│   └── testing/
│
├── .env.example
├── package.json
└── README.md
```

---

## API Overview

The application exposes REST APIs for the main recovery lifecycle:

### Dashboard
* `GET /api/dashboard/overview` — Returns merchant-level operational metrics.

### Recovery
* `POST /api/recovery-executor/:id/orchestrate` — Runs the recovery orchestrator.
* `POST /api/recovery-executor/:id/enqueue-pipeline` — Enqueues recovery job to queue.
* `POST /api/recovery-executor/:id/manual-review` — Resolves manual review case.

### Recovery Intelligence
* `GET /api/recovery-decision/:id/intelligence` — Returns multi-strategy comparative metrics.

### Webhooks
* `POST /api/webhooks/razorpay` — Receives and verifies Razorpay webhook events.

### System
* `GET /api/system/health` — Infrastructure health status.
* `GET /api/system/financial-safety` — Financial safety and circuit breaker telemetry.

---

## Local Development

### 1. Clone the repository
```bash
git clone https://github.com/MVPAlok/Recover_AI.git
cd Recover_AI
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Fill in the required environment variables.

### 4. Generate Prisma Client
```bash
npm run prisma:generate
```

### 5. Apply database migrations
```bash
npx prisma migrate dev --schema=database/prisma/schema.prisma
```

### 6. Seed development data
```bash
npm run db:seed
```

### 7. Start development servers
```bash
npm run dev
```

Typical local endpoints:
- **Frontend**: `http://localhost:3000`
- **API**: `http://localhost:5000`

---

## Environment Variables

Example configuration:

```ini
# PostgreSQL
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# Redis / BullMQ
ENABLE_REDIS="true"
REDIS_URL="rediss://default:password@host:6379"

# Google Gemini
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GEMINI_MODEL="gemini-3.5-flash-lite"

# Razorpay TEST MODE
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
```

### Never Commit Secrets
Do not commit:
- `.env` / `server/.env`
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `REDIS_URL`

Use `.env.example` for documentation only.

---

## Testing

RecoverAI includes unit, integration, security, webhook, queue, and system-level tests.

Run the complete test suite:
```bash
npm run test:all
```

Run production-oriented verification:
```bash
npm run verify:production
```

Run specific suites where available:
```bash
npm run test:detection
npm run test:diagnosis
npm run test:decision
npm run test:executor
npm run test:webhooks
npm run test:dashboard
npm run test:queue
npm run test:system
```

Run the failure simulation:
```bash
npm run simulation:failure
```

Also verify the application builds successfully:
```bash
npm run build:server
npm run build:client
```

---

## Sandbox & Security Restrictions

### Razorpay TEST MODE ONLY
RecoverAI currently maintains a strict sandbox boundary for Razorpay:

```text
rzp_test_... ──► ALLOWED
rzp_live_... ──► REJECTED
```

No production payment rollout should be performed from the current sandbox implementation. The project is designed to allow payment-recovery workflows to be demonstrated and tested without processing real customer payments.

---

## Current Limitations

RecoverAI is currently a sandbox/evaluation implementation, not a live production payment-recovery service.

Important limitations include:
1. Razorpay is restricted to Test Mode.
2. Sandbox transaction data may be synthetic.
3. Production payment processing is not enabled.
4. AI recovery probabilities should not be interpreted as production-trained predictive models unless backed by appropriate historical data.
5. Deterministic fallback logic may be used when Gemini is unavailable.
6. Recovery outcomes in the sandbox should not be interpreted as real merchant revenue.
7. Production deployment would require additional operational, security, compliance, monitoring, and reliability controls.

These limitations are intentional. The objective is to establish the recovery architecture and validate the end-to-end workflow before introducing real-money processing.

---

## Roadmap

RecoverAI is being developed progressively rather than attempting to introduce every platform feature at once.

### Stage 1 — System Hardening
- Authentication UX
- Tenant isolation
- Dashboard consistency
- API verification
- State correctness
- Real vs simulated data transparency
- Error handling

### Stage 2 — Core Recovery Engine
- Event-driven orchestration (`Webhook` $\rightarrow$ `Event` $\rightarrow$ `Queue` $\rightarrow$ `Diagnosis` $\rightarrow$ `Decision` $\rightarrow$ `Execution` $\rightarrow$ `Verification` $\rightarrow$ `Recovery`)
- Idempotency
- Retry handling
- Queue workers
- Correlation IDs
- Deterministic policies
- Financial reconciliation

### Stage 3 — Real Recovery Capabilities
- Payment Link recovery
- Smart retry scheduling
- Customer notifications
- Scheduled recovery
- Verified recovery outcomes
- Improved recovery state handling

### Stage 4 — Recovery Intelligence
- Customer recovery profiles
- Gateway health signals
- Recovery probability
- Expected Recovery Value ($EV = \text{Transaction Amount} \times \text{Recovery Probability}$)
- Multi-strategy comparison
- AI explanations & Counterfactual recommendations

*Example Matrix*:
```text
               RETRY      PAYMENT LINK   REMINDER
Probability    42%        78%            61%
EV             ₹8,400     ₹15,600        ₹12,200
Status         VIABLE     PREFERRED      VIABLE
```

### Stage 5 — Financial Safety & Guardrails
- Gateway Decline Circuit Breakers
- Daily Merchant Retry Budgets
- Customer Anti-Spam Frequency Limiters
- AI Model Drift Anomaly Detection
- Tamper-Evident SHA-256 Audit Trail Chains

### Stage 6 — Developer Platform
- Webhook Payload Testing Emulator
- Failed Webhook Replay Engine
- Developer API Key Management (`rec_live_...`)
- Outbound Webhook Subscriptions
- Compliance & Audit Data Exporters (CSV & JSON)

### Stage 7 — Production Readiness & Packaging
- End-to-end failure simulation suites
- Production deployment configuration & packaging
- Multi-gateway routing and distributed worker topologies

---

## Design Philosophy

RecoverAI follows several core principles:

1. **AI does not control money**: AI provides reasoning and recommendations. Deterministic policy controls what the system is allowed to execute.
2. **Execution does not equal recovery**: $\text{Recovery Action Executed} \neq \text{Payment Recovered}$. Only verified payment evidence can establish recovery.
3. **Webhooks are evidence**: Payment state should be reconciled against verified gateway events rather than inferred solely from an API request.
4. **Every action should be traceable**: Operations are associated with `requestId`, `correlationId`, `transactionId`, and `recoveryAttemptId`.
5. **Tenant boundaries are mandatory**: Merchant A must never be able to access Merchant B's financial data.
6. **Sandbox before production**: The system intentionally remains in Razorpay Test Mode until architecture, security, reconciliation, reliability, and operational controls are sufficiently mature.

---

## Why RecoverAI?

RecoverAI is not intended to be another dashboard that displays failed payments. The central idea is to create an autonomous recovery loop:

```text
PAYMENT FAILURE
      │
      ▼
UNDERSTAND WHY
      │
      ▼
DETERMINE WHAT TO DO
      │
      ▼
EXECUTE SAFELY
      │
      ▼
VERIFY THE PAYMENT
      │
      ▼
CONFIRM RECOVERED VALUE
      │
      ▼
LEARN FROM OUTCOME
```

The long-term objective is to move payment recovery from **static retries** toward **context-aware recovery decisions** while maintaining strict financial and operational guardrails.

---

## License

This project is distributed under the MIT License. See `LICENSE` for details.