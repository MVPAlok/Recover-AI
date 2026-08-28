# 💸 RecoverAI — Autonomous AI Payment Recovery Platform

<div align="center">
  <img src="https://img.shields.io/badge/React-18.3-blue?style=for-the-badge&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/Express-4.19-green?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge&logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind--CSS-3.4-cyan?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-5.22-darkblue?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-Upstash%20%2B%20BullMQ-red?style=for-the-badge&logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/Google%20Gemini-3.5%20Flash-purple?style=for-the-badge&logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Razorpay-Strict%20Test%20Mode-blue?style=for-the-badge&logo=razorpay" alt="Razorpay" />
  <img src="https://img.shields.io/badge/Tests-86%2F86%20Passing%20(100%25)-brightgreen?style=for-the-badge" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</div>

<br />

**RecoverAI** is an institutional-grade, event-driven payment recovery platform designed to detect, diagnose, and reclaim lost merchant revenue from failed payment transactions.

By combining multi-agent LLM diagnostics (Google Gemini 3.5), deterministic policy guardrails, Upstash Redis background queues, and Razorpay Test Mode webhooks, RecoverAI transforms passive churn into recovered revenue while maintaining a cryptographically reconciled double-entry ledger.

---

## 📑 Table of Contents

- [Problem Statement & Solution](#-problem-statement--solution)
- [RecoverAI vs. Legacy Dunning Systems](#-recoverai-vs-legacy-dunning-systems)
- [Autonomous 6-Stage Recovery Lifecycle](#-autonomous-6-stage-recovery-lifecycle)
- [Master Product Evolution (Stages 1–7)](#-master-product-evolution-stages-17)
- [Multi-Strategy Recovery Intelligence & EV Engine](#-multi-strategy-recovery-intelligence--ev-engine)
- [Financial Safety & Circuit Breakers](#-financial-safety--circuit-breakers)
- [Developer Experience & Sandbox Tools](#-developer-experience--sandbox-tools)
- [Monorepo Project Structure](#-monorepo-project-structure)
- [REST API & Webhook Reference](#-rest-api--webhook-reference)
- [Local Development Setup](#-local-development-setup)
- [Automated Testing & Production Verification](#-automated-testing--production-verification)
- [Security & Sandbox Invariants](#-security--sandbox-invariants)

---

## 📌 Problem Statement & Solution

Every year, digital merchants lose up to **9% of total revenue** due to payment failures—caused by temporary bank timeouts, 3D-Secure drop-offs, OTP latency, or false-positive fraud flags.

Traditional payment recovery relies on static, generic email dunning cycles that alienate customers, trigger card network penalties, and report false-positive recoveries.

**RecoverAI** solves this through an autonomous event-driven architecture:
1. **Real-time Detection & Probability Scoring**: Evaluates recoverable revenue using transaction features and prior customer spend.
2. **AI-Powered Root Cause Diagnosis**: Leverages Google Gemini with structured JSON schema outputs and transparent deterministic fallback.
3. **Authoritative Decision Engine**: Enforces hard safety rules (`RETRY`, `REMIND`, `WAIT`, `ESCALATE`, `STOP`) that override LLM hallucinations.
4. **Cryptographic Financial Reconciliation**: Implements a dedicated PostgreSQL `Payment` ledger where revenue is credited **if and only if** a signed Razorpay `payment.captured` webhook matches the exact transaction amount.

---

## ⚖️ RecoverAI vs. Legacy Dunning Systems

| Feature / Capability | Legacy Dunning (Stripe Billing / Chargebee) | **RecoverAI Autonomous Platform** |
| :--- | :--- | :--- |
| **Recovery Strategy** | Static timed intervals (e.g. Day 1, Day 3, Day 5) | **Dynamic, Root-Cause-Aware Policy** (`RETRY`, `WAIT`, `REMIND`, `ESCALATE`, `STOP`) |
| **Failure Diagnosis** | Generic raw gateway error strings | **Google Gemini AI Root Cause Analysis** with structured JSON output |
| **Hallucination Protection** | N/A (Rule only) | **Authoritative Deterministic Safety Rules** (Hard guardrails override AI when unsafe) |
| **Financial Source of Truth** | Prematurely claims recovery on attempt trigger | **Cryptographic `Payment` Ledger** (Confirmed strictly upon HMAC SHA-256 webhook capture) |
| **Strategy Intelligence** | Single fixed retry attempt | **Comparative Strategy Matrix with Expected Recovery Value (EV)** |
| **Safety Circuit Breakers** | No gateway error throttling | **Real-Time Gateway Circuit Breakers** & Daily Velocity Budgets |
| **Background Processing** | Cron job batch polling | **Upstash Redis + BullMQ Queue** with concurrency = 5 and exponential backoff |
| **Developer Tools** | Basic webhook documentation | **Full Webhook Emulator, Event Replay & CSV/JSON Audit Exporter** |
| **Tenant Isolation** | Single-tenant or shared state | **Multi-Tenant RBAC** (`User` + `MerchantMembership` with granular roles) |

---

## 🏗️ Autonomous 6-Stage Recovery Lifecycle

```mermaid
flowchart TD
    subgraph Ingestion ["1. DETECT & SCORE"]
        TxFail[Failed Payment Event] --> DetScore[Feature Extraction & Recovery Probability]
    end

    subgraph Diagnosis ["2. DIAGNOSE"]
        DetScore -->|Failure Features| DiagAgent[Gemini 3.5 AI Root-Cause Engine]
        DiagAgent -.->|Timeout / Fallback| FallbackDiag[Transparent Deterministic Fallback]
    end

    subgraph Decision ["3. DECIDE"]
        DiagAgent & FallbackDiag --> PolicyEngine[Authoritative Safety Policy Matrix]
        PolicyEngine -->|Hard Safety Rule Override| SafeAction{Authoritative Decision}
    end

    subgraph Execution ["4. EXECUTE"]
        SafeAction -->|Auto-Retry| BullMQ[BullMQ Redis Queue Worker]
        SafeAction -->|Auth Drop-off| RemindLink[1-Click WhatsApp / UPI Payment Link]
        SafeAction -->|Bank Degradation| WaitSched[30m Delayed Observation Window]
        SafeAction -->|Max Retries / Expired Card| StopHalt[Halted by Safety Policy]
        BullMQ --> RazorpayTest[Razorpay Test Mode Order]
    end

    subgraph Verification ["5. VERIFY"]
        RazorpayTest & RemindLink --> WebhookIngest[Razorpay Webhook Ingestion]
        WebhookIngest --> HMACCheck[Constant-Time HMAC SHA-256 Check]
        HMACCheck --> Deduplication[Idempotent Event Deduplication]
    end

    subgraph Settlement ["6. RECONCILE"]
        Deduplication --> ExactMatch[Exact Amount Verification (capturedPaise == txPaise)]
        ExactMatch --> Ledger[(PostgreSQL Double-Entry Payment Ledger)]
        Ledger --> AuditChain[Tamper-Evident SHA-256 Audit Hash Chain]
        Ledger --> Dashboard[Merchant Operations UI: RECOVERED ✓]
    end

    style TxFail fill:#881337,stroke:#f43f5e,stroke-width:2px,color:#fff
    style SafeAction fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
    style Ledger fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff
    style Dashboard fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff
```

---

## 🚀 Master Product Evolution (Stages 1–7)

RecoverAI was engineered through 7 production-hardening stages:

* **Stage 1: System Hardening**
  * Simplified 2-CTA Landing Page hierarchy (`Sign In` + `Create Sandbox`)
  * Smart `0 / 1 / N` authentication routing with hidden merchant UUID complexity
  * Fixed-shell mission control layout with independent content scrolling
  * Financial calculations strictly aggregating verified ledger captures

* **Stage 2: Core Event-Driven Recovery Engine**
  * Canonical 6-stage lifecycle (`RecoveryOrchestratorService`)
  * BullMQ Queue & Worker architecture with exponential backoff & dead-letter audit logs
  * End-to-end traceable `correlationId` and `requestId` propagation

* **Stage 3: Real Recovery Capabilities**
  * Taxonomy-Aware Smart Retry Scheduler (`SmartRetryScheduler`)
  * 1-Click interactive Razorpay Payment Links with dynamic UPI Intent (`upi://pay`)
  * 30-minute scheduled delayed queue observation windows for bank rail recovery
  * Interactive Manual Review Desk for high-value exposures (₹50,000+)

* **Stage 4: Recovery Intelligence**
  * Multi-Strategy Comparative Matrix evaluating Strategy A vs B vs C vs D
  * Mathematical **Expected Recovery Value ($EV = \text{Amount} \times \text{Probability}$)**
  * AI counterfactual explanations articulating why preferred strategies outperform alternatives

* **Stage 5: Financial Safety & Drift Protection**
  * Merchant Daily Retry Velocity Budgets (rolling 24 hours)
  * Customer anti-spam contact cooldown (24-hour frequency limit)
  * Real-time Gateway Decline Circuit Breaker (auto-trips to `OPEN` at >60% decline rate)
  * Rolling AI model drift monitor detecting confidence degradation (<0.65)
  * Tamper-evident SHA-256 Audit Trail Cryptographic Hash Chains

* **Stage 6: Enterprise & Developer Experience**
  * Sandbox Webhook Testing Emulator with real HMAC SHA-256 generator
  * Failed Webhook Event Replay Engine with fresh correlation tracking
  * Scoped Developer API Keys (`rec_live_...` with masked prefix storage)
  * Outbound Webhook Subscriptions (`x-recoverai-signature`)
  * Compliance & Finance Audit Report Exporters (CSV & JSON Streams)

* **Stage 7: Production Readiness & Packaging**
  * Master Production Failure Simulation (100% pass across 7 real-world failure modes)
  * Complete Production Architecture Specification ([`PRODUCTION_ARCHITECTURE.md`](PRODUCTION_ARCHITECTURE.md))
  * Documented Environment Variables & Deployment Secrets Blueprint ([`.env.example`](.env.example))

---

## 🧠 Multi-Strategy Recovery Intelligence & EV Engine

For every failed transaction, RecoverAI calculates a multi-strategy comparative matrix:

$$\text{Expected Recovery Value (EV)} = \text{Transaction Amount} \times \text{Recovery Probability}$$

### Strategy Comparison Matrix Example (₹20,000 Failure)

```text
+---------------------------------------------------------------------------------------------------------+
| STRATEGY MATRIX: Transaction ₹20,000 (Failure: Customer OTP 3DS Abandoned)                             |
+-----------------------------------+-------------+------------------+---------------+--------------------+
| Strategy Option                   | Probability | Expected Value   | Policy Status | Trade-off Summary  |
+-----------------------------------+-------------+------------------+---------------+--------------------+
| Strategy A: Automated Retry       | 35%         | ₹7,000           | SUBOPTIMAL    | Zero user friction |
| Strategy B: 1-Click Payment Link  | 71%         | ₹14,200          | PREFERRED ⭐  | Biometric UPI re-auth|
| Strategy C: Multi-Channel SMS/Mail| 55%         | ₹11,000          | VIABLE        | Non-intrusive flow |
| Strategy D: Scheduled Delay Window| 35%         | ₹7,000           | VIABLE        | 30m bank cooldown  |
+-----------------------------------+-------------+------------------+---------------+--------------------+
```

> **AI Counterfactual Explanation**:
> *"Strategy B (Payment Link) is preferred over Strategy A (Auto-Retry): Because the failure was caused by 3DS OTP drop-off, background gateway retries will repeatedly fail without customer interaction (35% / EV ₹7,000). A 1-click interactive payment link enables instant biometric approval via WhatsApp/UPI Intent (71% / EV ₹14,200)."*

---

## 🛡️ Financial Safety & Circuit Breakers

```
[ RECOVERY REQUEST ]
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                 FinancialSafetyService                      │
│                                                             │
│ 1. Gateway Circuit Breaker   ──► [ CLOSED | OPEN | HALF_OPEN ]
│ 2. Daily Merchant Budget     ──► [ Max 250 attempts / 24h ] │
│ 3. Customer Anti-Spam Guard  ──► [ 24h Contact Cooldown ]   │
│ 4. AI Drift Monitor          ──► [ Avg Confidence >= 0.65 ] │
│ 5. Audit Hash Chain          ──► [ SHA-256 Block Integrity ]│
└──────────────────────────────┬──────────────────────────────┘
                               │
                      ALLOWED? │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
            [ YES (PROCEED) ]       [ NO (SAFETY HALT) ]
```

---

## 🗂️ Monorepo Project Structure

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
│   │   ├── detection/                     # Stage 1: Recovery Probability Scoring Engine
│   │   ├── diagnosis/                     # Stage 2: Gemini 3.5 AI Root-Cause Diagnostics
│   │   ├── recovery-decision/             # Stage 3: Policy Engine & Recovery Intelligence Service
│   │   ├── recovery-executor/             # Stage 4: Orchestrator, Smart Scheduler & Executors
│   │   ├── webhooks/                      # Stage 5: Razorpay Webhook Ingestion & HMAC Validator
│   │   ├── dashboard/                     # Stage 6: Merchant Operations & Analytics Aggregator
│   │   ├── system/                        # Stage 5: System Telemetry & Financial Safety Service
│   │   ├── developer/                     # Stage 6: Webhook Emulator, API Keys & Exporters
│   │   └── queue/                         # BullMQ Redis Queue Worker (concurrency = 5)
│   ├── src/integrations/razorpay/         # Strict Test Mode Razorpay Client
│   └── src/scripts/                       # Master Production Failure Simulation Engine
│
├── database/                              # PostgreSQL Layer via Prisma ORM
│   ├── prisma/schema.prisma               # Multi-Tenant RBAC, Payment Ledger, AuditLog
│   └── seed/seed.ts                       # Deterministic synthetic transaction generator
│
├── PRODUCTION_ARCHITECTURE.md             # Complete Production Architecture Specification
└── .env.example                           # Comprehensive Environment Blueprint
```

---

## 🔌 REST API & Webhook Reference

### Primary Endpoints

| Method | Endpoint | Description | Auth / Headers |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/recovery-executor/:id/orchestrate` | Executes the full autonomous 6-stage lifecycle | `x-merchant-id` |
| `POST` | `/api/recovery-executor/:id/enqueue-pipeline` | Enqueues autonomous pipeline job to BullMQ queue | `x-merchant-id` |
| `GET` | `/api/recovery-executor/:id/smart-schedule` | Computes taxonomy-aware smart retry schedule | `x-merchant-id` |
| `POST` | `/api/recovery-executor/:id/manual-review` | Resolves manual review with human approval & audit log | `x-merchant-id` |
| `GET` | `/api/recovery-decision/:id/intelligence` | Returns multi-strategy comparative matrix & EV report | `x-merchant-id` |
| `GET` | `/api/system/financial-safety` | Real-time circuit breaker states, drift metrics & budget usage | `x-merchant-id` |
| `POST` | `/api/system/financial-safety/reset-circuit-breaker` | Manually resets gateway circuit breaker to CLOSED | `x-merchant-id` |
| `POST` | `/api/developer/webhook-emulator/generate` | Generates HMAC SHA-256 signed test payloads + curl commands | None |
| `POST` | `/api/developer/webhook-emulator/replay/:eventId`| Replays ingested webhook event with new audit trail | `x-merchant-id` |
| `GET/POST`| `/api/developer/api-keys` | Lists or creates scoped developer API keys (`rec_live_...`) | `x-merchant-id` |
| `GET/POST`| `/api/developer/webhooks/subscriptions` | Manages outbound webhook subscription destinations | `x-merchant-id` |
| `GET` | `/api/developer/audit/export` | Exports immutable audit trails as CSV or JSON | `x-merchant-id` |
| `POST` | `/api/webhooks/razorpay` | Ingests Razorpay webhook events with HMAC SHA-256 verification | `x-razorpay-signature` |
| `GET` | `/api/system/health` | Multi-service health & operational telemetry snapshot | `x-merchant-id` |
| `GET` | `/api/dashboard/overview` | Primary merchant KPI aggregates (Revenue at Risk, Recovered) | `x-merchant-id` |

---

## 🛠️ Local Development Setup

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

# Google Gemini AI (Phase 4 & Stage 4 Intelligence)
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

# Seed Deterministic Synthetic Transactions
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
# Run Master Production Verification (All 14 test suites + failure simulation)
npm run verify:production

# Run Full Unit & Integration Test Suite (79/79 passing)
npm run test:all

# Run Individual Subsystem Suites
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

# Run Master Production Failure Simulation
npm run simulation:failure    # E2E 7-scenario failure simulation (100% pass)
```

---

## 🛡️ Security & Sandbox Invariants

1. **Strict Test Mode Guardrail**: RecoverAI enforces hardcoded safety checks that reject non-test Razorpay credentials (`rzp_test_` prefix required). Real money transactions are strictly isolated.
2. **Timing-Safe HMAC Verification**: All Razorpay webhooks require raw-body HMAC SHA-256 signature verification evaluated using `crypto.timingSafeEqual`.
3. **Zero Secret Leakage**: Database URLs, API keys, and webhook secrets are sanitized and stripped from all client responses and health endpoints.
4. **Idempotency & Concurrency Locks**: Recovery attempts enforce unique constraints (`@@unique([transactionId, attemptNumber])`) and unique webhook event deduplication (`x-razorpay-event-id`).
5. **Cryptographic Audit Chain**: Audit logs link sequential entries via SHA-256 block hash chains for tamper-evident compliance.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.