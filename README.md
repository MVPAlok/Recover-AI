# 💸 RecoverAI — Autonomous AI Payment Recovery Platform

<div align="center">

  <h1>⚡ RecoverAI</h1>
  <h3><strong>Detect. Diagnose. Decide. Execute. Verify. Recover.</strong></h3>
  <p><em>An institutional-grade, event-driven payment recovery platform engineered to identify recoverable failures and execute safe, policy-governed recovery workflows.</em></p>

  <p>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" /></a>
    <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-Neon%20DB-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
    <a href="https://www.prisma.io"><img src="https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" /></a>
    <a href="https://redis.io"><img src="https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" /></a>
    <a href="https://bullmq.io"><img src="https://img.shields.io/badge/BullMQ-Worker%20Queue-E0234E?style=for-the-badge" alt="BullMQ" /></a>
    <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/Google%20Gemini-3.5%20Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" /></a>
    <a href="https://razorpay.com"><img src="https://img.shields.io/badge/Razorpay-Strict%20Sandbox-0C2340?style=for-the-badge&logo=razorpay&logoColor=528FF0" alt="Razorpay" /></a>
    <a href="#-automated-testing--production-verification"><img src="https://img.shields.io/badge/Tests-86%2F86%20Passing%20(100%25)-00C853?style=for-the-badge" alt="Tests" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-FFD700?style=for-the-badge" alt="License" /></a>
  </p>

</div>

---

## 📑 Table of Contents

- [📌 Overview & Vision](#-overview--vision)
- [🛑 The Problem with Traditional Dunning](#-the-problem-with-traditional-dunning)
- [🔄 The 6-Stage Autonomous Recovery Lifecycle](#-the-6-stage-autonomous-recovery-lifecycle)
- [🏛️ Full System Architecture](#-full-system-architecture)
- [🧠 Recovery Intelligence & Multi-Strategy Expected Value](#-recovery-intelligence--multi-strategy-expected-value)
- [🔒 Financial Safety & Gateway Circuit Breakers](#-financial-safety--gateway-circuit-breakers)
- [🛠️ Technology Stack](#-technology-stack)
- [🗂️ Monorepo Structure](#-monorepo-structure)
- [🔌 REST API & Webhook Reference](#-rest-api--webhook-reference)
- [🚀 Local Development Setup](#-local-development-setup)
- [🧪 Automated Testing & Production Verification](#-automated-testing--production-verification)
- [🛡️ Sandbox Boundary & Security Invariants](#-sandbox-boundary--security-invariants)
- [🗺️ Progressive Roadmap (Stages 1–7)](#-progressive-roadmap-stages-17)
- [💡 Core Design Philosophy](#-core-design-philosophy)
- [📜 License](#-license)

---

## 📌 Overview & Vision

**RecoverAI** is an institutional-grade, event-driven payment recovery platform built around a single thesis:

> 💡 **A failed payment is not necessarily lost revenue—it is an incomplete transaction requiring intelligent intervention.**

Traditional dunning treats every failure with the same blunt instrument: sending generic retry emails or firing blind payment gateway retries. 

RecoverAI replaces static retry logic with an **autonomous 6-stage lifecycle**:
1. **Detects** payment failures in real time and scores recovery probability.
2. **Diagnoses** the exact technical root cause using Google Gemini 3.5 AI.
3. **Decides** the optimal recovery action bounded by authoritative, deterministic safety policies.
4. **Executes** multi-channel recovery workflows asynchronously via Upstash Redis & BullMQ.
5. **Verifies** gateway outcomes cryptographically via constant-time HMAC SHA-256 webhooks.
6. **Reconciles** funds into a tamper-evident PostgreSQL double-entry financial ledger.

> [!IMPORTANT]
> **The Core Financial Invariant**: $\text{Recovery Action Executed} \neq \text{Payment Recovered}$.
> RecoverAI never credits revenue upon attempt dispatch. Money is considered recovered **if and only if** verified cryptographic payment evidence is reconciled in PostgreSQL.

---

## 🛑 The Problem with Traditional Dunning

Every year, digital merchants lose up to **9% of gross revenue** to preventable payment failures.

| Failure Scenario | Legacy Dunning Behavior | The Consequence | RecoverAI Autonomous Action |
| :--- | :--- | :--- | :--- |
| **3DS OTP Abandonment** | Blind gateway retry | Fails immediately (no customer interaction) | **1-Click WhatsApp / SMS Payment Link** with biometric UPI intent |
| **Bank Rail Congestion** | Immediate rapid retries | Triggers issuer decline penalties & churn | **30-Minute Delayed Observation Window** until bank metrics stabilize |
| **Temporary Gateway Timeout** | Static 24-hour email | Lost conversion window | **Smart Instant Retry** with exponential jitter |
| **Expired Card / Hard Stop** | Automated daily retries | Network fines & chargeback risk | **Immediate Hard Policy Block (`STOP`)** with zero wasted friction |

---

## 🔄 The 6-Stage Autonomous Recovery Lifecycle

```mermaid
flowchart TD
    %% Custom Styling
    classDef detectStyle fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#ffffff;
    classDef diagStyle fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#ffffff;
    classDef decideStyle fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#ffffff;
    classDef execStyle fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#ffffff;
    classDef verifyStyle fill:#134e4a,stroke:#2dd4bf,stroke-width:2px,color:#ffffff;
    classDef reconcileStyle fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ffffff;
    classDef stopStyle fill:#881337,stroke:#f43f5e,stroke-width:2px,color:#ffffff;

    Start([⚡ Payment Failure Ingestion]):::detectStyle --> Stage1

    subgraph S1 ["01 / DETECT & SCORE"]
        Stage1["🔍 Feature Extraction<br/>• Amount & Currency<br/>• Error Code & Bank Telemetry<br/>• Historical Customer Spend<br/><b>Recovery Probability Score: 78%</b>"]:::detectStyle
    end

    Stage1 --> Stage2

    subgraph S2 ["02 / DIAGNOSE"]
        Stage2["🤖 Gemini 3.5 AI Diagnostic Engine<br/>• Failure Taxonomy Classification<br/>• Risk Level: MEDIUM<br/>• Structured JSON Output"]:::diagStyle
        Fallback["🛡️ Deterministic Fallback<br/>(Engaged on LLM Timeout / Outage)"]:::diagStyle
        Stage2 -.->|Failover| Fallback
    end

    Stage2 & Fallback --> Stage3

    subgraph S3 ["03 / DECIDE"]
        Stage3{"⚖️ Authoritative Policy Engine<br/>Hard Deterministic Constraints"}:::decideStyle
        Stage3 -->|retryCount >= 3 OR Expired| Halt["⛔ STOP (Safety Halt)"]:::stopStyle
        Stage3 -->|Approved Safe Action| ApprovedDecision["🎯 Selected Action:<br/>RETRY | REMIND | WAIT | ESCALATE"]:::decideStyle
    end

    ApprovedDecision --> Stage4

    subgraph S4 ["04 / EXECUTE"]
        Stage4["⚙️ Asynchronous Recovery Dispatcher<br/>• BullMQ Queue + Upstash Redis<br/>• Razorpay Test Mode Order / Link<br/><b>Invariant: amountRecovered = ₹0 (Pending)</b>"]:::execStyle
    end

    Stage4 --> Stage5

    subgraph S5 ["05 / VERIFY"]
        Stage5["🔐 Cryptographic Webhook Ingestion<br/>• Raw Body HMAC SHA-256 Validation<br/>• Constant-Time Signature Check<br/>• Idempotent Deduplication (Event ID)"]:::verifyStyle
    end

    Stage5 --> Stage6

    subgraph S6 ["06 / RECONCILE"]
        Stage6["💰 Double-Entry Financial Ledger<br/>• Exact Amount Match (paise == txAmount)<br/>• Tamper-Evident SHA-256 Audit Chain<br/><b>Status: RECOVERED ✓</b>"]:::reconcileStyle
    end

    Stage6 --> Done([🎉 Merchant Revenue Reclaimed]):::reconcileStyle
```

---

## 🏛️ Full System Architecture

```mermaid
flowchart TB
    subgraph ClientTier ["🖥️ FRONTEND INTERFACE (React 18 + Vite)"]
        Dashboard["📊 Merchant Mission Control<br/>Overview • Explorer • Timeline • Analytics"]
        DevHub["🛠️ Developer Hub<br/>Webhook Emulator • Replay • API Keys"]
        HealthConsole["🩺 System Health & Telemetry<br/>Circuit Breakers • Queue Depth • Audit Chain"]
    end

    subgraph APITier ["🚀 EXPRESS REST API GATEWAY (Node.js + TypeScript)"]
        Routes["🔀 API Router & Auth Middleware<br/>/api/dashboard • /api/recovery-executor • /api/developer"]
        Orchestrator["⚡ Recovery Orchestrator Service<br/>6-Stage Autonomous Lifecycle Coordinator"]
    end

    subgraph CoreEngines ["🧠 INTELLIGENCE & POLICY CORE"]
        DetectionEngine["01 / Detection Scoring Engine"]
        GeminiAgent["02 / Gemini 3.5 AI Diagnosis Agent"]
        PolicyEngine["03 / Deterministic Policy Engine"]
        IntelligenceService["04 / Multi-Strategy EV Matrix Engine"]
        SafetyService["05 / Financial Safety & Circuit Breaker"]
    end

    subgraph AsyncTier ["📦 ASYNCHRONOUS WORKER QUEUE"]
        BullMQQueue[("📥 BullMQ Queue<br/>Upstash Redis")]
        Worker["⚙️ Recovery Queue Worker<br/>Concurrency = 5 • Exponential Backoff"]
    end

    subgraph ExternalTier ["🌐 EXTERNAL GATEWAY & WEBHOOKS"]
        RazorpaySandbox["💳 Razorpay Sandbox (Strict Test Mode)"]
        WebhookHandler["📩 HMAC SHA-256 Webhook Ingestion"]
    end

    subgraph PersistenceTier ["🗄️ PERSISTENCE & SETTLEMENT LAYER"]
        PostgresDB[("🐘 PostgreSQL (Neon Cloud)<br/>• Transactions Table<br/>• RecoveryAttempts Table<br/>• Reconciled Payments Ledger<br/>• Tamper-Evident AuditLog Chain")]
    end

    ClientTier -->|REST API Requests| Routes
    Routes --> Orchestrator
    Orchestrator --> DetectionEngine & GeminiAgent & PolicyEngine & IntelligenceService & SafetyService
    Orchestrator --> BullMQQueue
    BullMQQueue --> Worker
    Worker --> RazorpaySandbox
    RazorpaySandbox --> WebhookHandler
    WebhookHandler --> PostgresDB
    CoreEngines --> PostgresDB
    Routes --> PostgresDB

    style ClientTier fill:#070b17,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style APITier fill:#0f172a,stroke:#6366f1,stroke-width:2px,color:#ffffff
    style CoreEngines fill:#1e1b4b,stroke:#a855f7,stroke-width:2px,color:#ffffff
    style AsyncTier fill:#271010,stroke:#ef4444,stroke-width:2px,color:#ffffff
    style ExternalTier fill:#062b2e,stroke:#14b8a6,stroke-width:2px,color:#ffffff
    style PersistenceTier fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff
```

---

## 🧠 Recovery Intelligence & Multi-Strategy Expected Value

For every payment failure, RecoverAI simultaneously computes an **Expected Recovery Value (EV)** matrix across all candidate recovery channels:

$$\text{Expected Recovery Value (EV)} = \text{Transaction Amount} \times \text{Recovery Probability}$$

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📊 MULTI-STRATEGY COMPARATIVE INTELLIGENCE MATRIX (Example: ₹20,000 Payment Failure)                   │
├───────────────────────────────────┬──────────────┬──────────────────┬───────────────┬──────────────────┤
│ Recovery Strategy Option          │ Probability  │ Expected Value   │ Policy Status │ Channel Intent   │
├───────────────────────────────────┼──────────────┼──────────────────┼───────────────┼──────────────────┤
│ Strategy A: Automated Retry       │ 35%          │ ₹7,000           │ SUBOPTIMAL    │ Gateway Retry    │
│ Strategy B: 1-Click Payment Link  │ 78%          │ ₹15,600          │ PREFERRED ⭐  │ WhatsApp / UPI   │
│ Strategy C: Multi-Channel Remind  │ 58%          │ ₹11,600          │ VIABLE        │ SMS & Email Link │
│ Strategy D: Scheduled Delay 30m   │ 42%          │ ₹8,400           │ VIABLE        │ Bank Cooldown    │
└───────────────────────────────────┴──────────────┴──────────────────┴───────────────┴──────────────────┘
```

> **🤖 AI Counterfactual Explanation**:
> *"Strategy B (1-Click Payment Link) is preferred over Strategy A (Auto-Retry): Because this failure was caused by 3DS OTP drop-off, repeated background gateway attempts will fail without user authentication. An interactive WhatsApp/UPI link enables 1-click biometric re-authorization, yielding a +43% probability lift (EV ₹15,600 vs ₹7,000)."*

---

## 🔒 Financial Safety & Gateway Circuit Breakers

RecoverAI includes strict financial velocity protections to prevent card network penalties, merchant churn, and API runaway costs:

```mermaid
flowchart LR
    classDef safe fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef trip fill:#881337,stroke:#f43f5e,stroke-width:2px,color:#fff;
    classDef check fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff;

    Req([Incoming Recovery Request]):::check --> BudgetCheck{1. Daily Merchant Budget<br/>Max 250 attempts / 24h}:::check

    BudgetCheck -->|Exceeded| BudgetBlock[🛑 Blocked: Daily Budget Ceiling]:::trip
    BudgetCheck -->|Passed| SpamCheck{2. Customer Contact Guard<br/>Max 1 contact / 24h}:::check

    SpamCheck -->|Recent Contact| SpamBlock[🛑 Blocked: Anti-Spam Cooldown]:::trip
    SpamCheck -->|Passed| CBCheck{3. Gateway Circuit Breaker<br/>Decline Rate < 60% in 15m}:::check

    CBCheck -->|Decline Rate >= 60%| CBTrip[🛑 Tripped to OPEN: Gateway Degraded]:::trip
    CBCheck -->|Healthy CLOSED| DriftCheck{4. AI Model Drift Monitor<br/>Confidence >= 0.65}:::check

    DriftCheck -->|Passed| Allowed([✅ Execution Permitted]):::safe
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose & Architectural Role |
| :--- | :--- | :--- |
| **Frontend UI** | React 18 + Vite | High-performance SPA with fixed mission-control navigation |
| **Language** | TypeScript 5.5 | End-to-end strict type safety across client and server |
| **Styling** | Tailwind CSS | Dark mission-control aesthetic (`#070B17`) with Geist Mono typography |
| **Backend API** | Node.js + Express | Modular, scalable REST API orchestrating the recovery pipeline |
| **Database** | PostgreSQL (Neon Cloud) | Serverless relational database holding state and double-entry ledger |
| **ORM** | Prisma 5.22 | Type-safe query building, migrations, and relationship management |
| **Background Queue** | BullMQ + Upstash Redis | Resilient asynchronous queue with concurrency = 5 and exponential backoff |
| **Artificial Intelligence** | Google Gemini 3.5 Flash | Root-cause failure diagnostics with structured JSON output schemas |
| **Payment Gateway** | Razorpay Sandbox | Strict Test Mode (`rzp_test_...`) order and payment link generation |
| **Webhook Security** | HMAC SHA-256 | Timing-safe raw-body cryptographic webhook verification |

---

## 🗂️ Monorepo Structure

```text
Recover_AI/
├── client/                                # React 18 + Vite Frontend Dashboard
│   ├── src/components/                    # SystemPanel, StatusIndicator, MetricCard, Skeleton
│   ├── src/layouts/                       # DashboardLayout (Fixed Mission-Control), PublicLayout
│   ├── src/pages/                         # OverviewPage, TransactionsPage, TransactionDetailPage, SettingsPage
│   ├── src/pages/public/                  # LandingPage, LoginPage, SignupPage, OnboardingPage
│   └── src/services/                      # Typed REST API Client & Webhook Triggers
│
├── server/                                # Express REST API Backend
│   ├── src/modules/
│   │   ├── detection/                     # 01/ Recovery Probability Scoring Engine
│   │   ├── diagnosis/                     # 02/ Gemini 3.5 AI Root-Cause Diagnostics
│   │   ├── recovery-decision/             # 03/ Deterministic Policy & Intelligence Service
│   │   ├── recovery-executor/             # 04/ Orchestrator, Smart Scheduler & Executors
│   │   ├── webhooks/                      # 05/ Razorpay Webhook Ingestion & HMAC Validator
│   │   ├── dashboard/                     # 06/ Merchant Operations & Analytics Aggregator
│   │   ├── system/                        # Financial Safety, Circuit Breaker & Health Telemetry
│   │   ├── developer/                     # Webhook Testing Emulator, API Keys & Exporters
│   │   └── queue/                         # BullMQ Redis Queue Worker (concurrency = 5)
│   ├── src/integrations/razorpay/         # Strict Test Mode Razorpay Client
│   └── src/scripts/                       # Master Production Failure Simulation Engine
│
├── database/                              # PostgreSQL Layer via Prisma ORM
│   ├── prisma/schema.prisma               # Multi-Tenant RBAC, Payment Ledger, AuditLog
│   └── seed/seed.ts                       # Deterministic 1,000 synthetic transaction generator
│
├── PRODUCTION_ARCHITECTURE.md             # Complete Technical Architecture Specification
└── .env.example                           # Comprehensive Environment Blueprint
```

---

## 🔌 REST API & Webhook Reference

### Core Operations

| Method | Endpoint | Description | Headers |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/recovery-executor/:id/orchestrate` | Executes the full autonomous 6-stage lifecycle | `x-merchant-id` |
| `POST` | `/api/recovery-executor/:id/enqueue-pipeline` | Enqueues autonomous recovery job to BullMQ queue | `x-merchant-id` |
| `GET` | `/api/recovery-executor/:id/smart-schedule` | Computes taxonomy-aware smart retry schedule | `x-merchant-id` |
| `POST` | `/api/recovery-executor/:id/manual-review` | Resolves manual review case with human audit log | `x-merchant-id` |
| `GET` | `/api/recovery-decision/:id/intelligence` | Returns multi-strategy comparative matrix & EV report | `x-merchant-id` |
| `GET` | `/api/system/financial-safety` | Real-time circuit breaker states, drift metrics & budget usage | `x-merchant-id` |
| `POST` | `/api/system/financial-safety/reset-circuit-breaker` | Manually resets gateway circuit breaker to CLOSED | `x-merchant-id` |
| `POST` | `/api/developer/webhook-emulator/generate` | Generates HMAC SHA-256 signed test payloads + curl commands | None |
| `POST` | `/api/developer/webhook-emulator/replay/:eventId`| Replays ingested webhook event with new audit trail | `x-merchant-id` |
| `GET/POST`| `/api/developer/api-keys` | Lists or creates scoped developer API keys (`rec_live_...`) | `x-merchant-id` |
| `GET` | `/api/developer/audit/export` | Exports immutable audit trails as CSV or JSON | `x-merchant-id` |
| `POST` | `/api/webhooks/razorpay` | Ingests Razorpay webhook events with HMAC SHA-256 verification | `x-razorpay-signature` |
| `GET` | `/api/system/health` | Multi-service health & operational telemetry snapshot | `x-merchant-id` |
| `GET` | `/api/dashboard/overview` | Primary merchant KPI aggregates (Revenue at Risk, Recovered) | `x-merchant-id` |

---

## 🚀 Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/MVPAlok/Recover_AI.git
cd Recover_AI
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Ensure required environment variables are set:
```ini
# PostgreSQL Connection (Neon Cloud)
DATABASE_URL="postgresql://username:password@host/recoverai?sslmode=require"

# Upstash Redis & BullMQ
ENABLE_REDIS="true"
REDIS_URL="rediss://default:password@host:6379"

# Google Gemini AI (Diagnosis & Strategy Intelligence)
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-3.5-flash-lite"

# Razorpay Test Mode (Strict Sandbox)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
```

### 3. Database Migration & Synthetic Seeding
```bash
# Generate Prisma Client
npm run prisma:generate

# Deploy Schema Migrations
npx prisma migrate dev --name init --schema=database/prisma/schema.prisma

# Seed 1,000 Deterministic Synthetic Transactions
npm run db:seed
```

### 4. Start Development Servers
```bash
npm run dev
```
- **Frontend Dashboard**: `http://localhost:3000`
- **Express API Server**: `http://localhost:5000`

---

## 🧪 Automated Testing & Production Verification

RecoverAI maintains an institutional test suite of **86 automated tests** (79 unit & integration tests + 7 master production failure assertions):

```bash
# 🎯 Run Master Production Verification (All 14 test suites + failure simulation)
npm run verify:production

# 🧪 Run Full Unit & Integration Test Suite (79/79 passing)
npm run test:all

# 🔍 Run Individual Subsystem Test Suites
npm run test:detection        # Recovery probability scoring (8/8)
npm run test:diagnosis        # Gemini diagnosis & fallback safety (10/10)
npm run test:decision         # Authoritative policy matrix (12/12)
npm run test:intelligence     # Strategy comparison & EV calculations (4/4)
npm run test:executor         # Recovery executor & outcomes (17/17)
npm run test:pipeline         # Stage 2 event-driven lifecycle (5/5)
npm run test:capabilities     # Stage 3 smart retry & payment links (3/3)
npm run test:financial-safety # Stage 5 circuit breaker & drift monitor (5/5)
npm run test:developer        # Stage 6 developer tools & emulator (5/5)
npm run test:webhooks         # Razorpay HMAC signature & deduplication (6/6)
npm run test:dashboard        # Merchant dashboard aggregation (7/7)
npm run test:queue            # BullMQ & Redis queues (3/3)
npm run test:system           # System health & telemetry (7/7)

# 💥 Run Master Production Failure Simulation
npm run simulation:failure    # E2E 7-scenario failure simulation (100% pass)
```

---

## 🛡️ Sandbox Boundary & Security Invariants

1. **Strict Test Mode Boundary**: Hardcoded security guards reject any non-test Razorpay key (`rzp_test_` prefix required). Real money transactions are strictly prohibited in the current sandbox.
2. **Timing-Safe HMAC Verification**: All Razorpay webhooks require raw-body HMAC SHA-256 signature verification evaluated using `crypto.timingSafeEqual` to prevent timing attacks.
3. **Zero Secret Leakage**: Database URLs, API keys, and webhook secrets are sanitized and stripped from all client responses and health endpoints.
4. **Idempotency & Concurrency Locks**: Recovery attempts enforce unique constraints (`@@unique([transactionId, attemptNumber])`) and unique webhook event deduplication (`x-razorpay-event-id`).
5. **Tamper-Evident Audit Chain**: Audit logs link sequential entries via SHA-256 block hash chains for regulatory compliance.

---

## 🗺️ Progressive Roadmap (Stages 1–7)

RecoverAI is built progressively through 7 disciplined stages:

- [x] **Stage 1 — System Hardening**: Clean 2-CTA landing navbar, smart 0/1/N login routing, fixed-shell dashboard layout, and double-entry financial ledger aggregation.
- [x] **Stage 2 — Core Recovery Engine**: Canonical 6-stage lifecycle orchestrator (`Detect` $\rightarrow$ `Reconcile`), BullMQ queue pipeline, and correlation IDs.
- [x] **Stage 3 — Real Recovery Capabilities**: Taxonomy-aware smart retry scheduler, 1-click WhatsApp/UPI payment links, 30m delayed windows, and manual review desk.
- [x] **Stage 4 — Recovery Intelligence**: Multi-strategy comparative matrix, mathematical Expected Value ($EV = \text{Amount} \times \text{Probability}$), and AI counterfactual reasoning.
- [x] **Stage 5 — Financial Safety & Guardrails**: Rolling 24h merchant retry budgets, customer anti-spam cooldowns, gateway decline circuit breakers, and SHA-256 audit hash chains.
- [x] **Stage 6 — Developer Platform**: Sandbox webhook testing emulator, failed event replay engine, scoped API keys (`rec_live_...`), and CSV/JSON audit exporters.
- [x] **Stage 7 — Production Readiness & Packaging**: Master production failure simulation, environment blueprints, and production architecture specifications.

---

## 💡 Core Design Philosophy

1. **AI does not control money**: AI provides diagnostic reasoning and probabilistic recommendations. Deterministic policy rules maintain exclusive authority over what is executed.
2. **Execution does not equal recovery**: Disagreeing with naive dunning systems, RecoverAI never claims revenue until verified payment evidence is reconciled.
3. **Webhooks are evidence**: Payment state is reconciled strictly against cryptographically verified gateway webhook events.
4. **Every action is traceable**: Every operation propagates `requestId`, `correlationId`, `transactionId`, and `recoveryAttemptId`.
5. **Tenant boundaries are mandatory**: Multi-tenant RBAC ensures complete data isolation between merchants.
6. **Sandbox before production**: The platform strictly operates in Razorpay Test Mode until all operational and compliance controls are mature.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.