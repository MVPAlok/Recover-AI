# 💸 RecoverAI — Autonomous AI Payment Recovery Platform

<div align="center">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/Express-Node-green?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind--CSS-3.4-cyan?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-5.22-darkblue?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-Upstash%20%2B%20BullMQ-red?style=for-the-badge&logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/Google%20Gemini-3.5%20Flash-purple?style=for-the-badge&logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Razorpay-Test%20Mode-blue?style=for-the-badge&logo=razorpay" alt="Razorpay" />
</div>

<br />

**RecoverAI** is an institutional-grade, autonomous revenue recovery platform designed to detect, diagnose, and recover lost merchant revenue from failed payment transactions. 

Utilizing structured diagnostic agents powered by Google Gemini, deterministic policy safety engines, Upstash Redis background queues, and Razorpay Test Mode webhooks, RecoverAI transforms passive churn into recovered revenue while maintaining a cryptographically reconciled financial ledger.

---

## 📌 Problem & Core Value Proposition

Every year, merchants lose billions in revenue due to payment failures—caused by card expirations, temporary bank timeouts, 3D-Secure drop-offs, or false-positive fraud flags. Traditional recovery systems rely on static, generic email chains that irritate customers and yield low retention.

**RecoverAI** replaces manual outreach with an autonomous 8-phase pipeline:
1. **Real-time Detection & Recovery Probability Scoring**: Evaluates candidate transactions based on historical customer spend and payment signals.
2. **AI-Powered Root Cause Diagnosis**: Leverages Google Gemini with structured JSON schema outputs and transparent deterministic fallback.
3. **Authoritative Decision Engine**: Enforces hard policy safety rules (`RETRY`, `REMIND`, `WAIT`, `ESCALATE`, `STOP`) that override LLM hallucinations.
4. **Cryptographic Financial Reconciliation**: Implements a dedicated `Payment` ledger where revenue is credited **if and only if** a signed Razorpay `payment.captured` webhook matches the exact transaction amount.

---

## ⏱️ Recovery Timelines & Payment Retention by Policy Strategy

Payment recovery does not follow a static timeline. Instead, execution timing and customer retention are dynamically tuned to the **failure root cause**:

```text
+---------------------------------------------------------------------------------------------------+
|                                 RECOVERAI DECISION LIFECYCLE                                      |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|   Failed Payment ---> Detection Score ---> AI Diagnosis (Gemini) ---> Authoritative Policy Engine |
|                                                                                |                  |
|          +----------------------+--------------------+-------------------------+                  |
|          |                      |                    |                         |                  |
|          v                      v                    v                         v                  |
|     [ RETRY ]                [ WAIT ]            [ REMIND ]                 [ STOP ]              |
|   Smart Re-attempt      Cooldown Window       Customer Link             Hard Policy Block         |
|   (0 - 5 Minutes)      (15 - 30 Minutes)     (1 - 24 Hours)                (Terminated)           |
|          |                      |                    |                                            |
|          +----------------------+--------------------+                                            |
|                                 |                                                                 |
|                                 v                                                                 |
|                   Razorpay Test Mode Order / Link                                                 |
|                                 |                                                                 |
|                                 v (HMAC SHA-256 Webhook: payment.captured)                        |
|                                                                                                   |
|           PostgreSQL Payment Ledger Reconciled (Verified Recovered = ₹Amount)                     |
+---------------------------------------------------------------------------------------------------+
```

### Policy Timeline Matrix

| Policy Action | Root Cause & Failure Category | Typical Recovery Window | How It Works & Lifecycle | Retention Benchmark |
| :--- | :--- | :---: | :--- | :---: |
| **`RETRY`** *(Smart Retry)* | Bank Gateway Timeout, Temporary Infrastructure Failure, Network Drop | **0 – 5 Minutes** | Immediately dispatches a background retry order to Razorpay. As soon as the customer or bank captures the transaction, webhook confirms settlement. | **70% – 85%** of temporary failures |
| **`WAIT`** *(Cooldown Window)* | Bank Server Congestion, UPI Peak Hour Spike, High Churn Risk | **15 – 30 Minutes** | Halts immediate retries to prevent duplicate friction. Schedules a cooldown window (`defaultWaitMinutes = 30`) and retries once bank rails stabilize. | **50% – 65%** of transient failures |
| **`REMIND`** *(Customer Link)* | 3D-Secure Drop-off, OTP Timeout, Authentication Failure | **1 – 24 Hours** | Dispatches a customized payment recovery link via Email/SMS. Amount is recovered when the customer clicks the link and authenticates. | **35% – 55%** of drop-offs |
| **`ESCALATE`** *(Manual Review)* | High-Value VIP Transaction, Unclassified Error, Low Confidence | **2 – 12 Hours** | Flags the transaction in the dashboard for manual agent/merchant support review. | **40% – 60%** of escalated volume |
| **`STOP`** *(Hard Safety Block)* | Expired Card, Max 3 Retries Exceeded, Repeated Insufficient Funds | **Immediate (0s)** | Permanently halts recovery to protect the merchant from chargebacks, bank penalties, or customer annoyance. | *N/A (Loss Prevention)* |

> [!IMPORTANT]
> **Core Financial Invariant**: *Execution Succeeded $\neq$ Money Recovered*. When an action is dispatched, RecoverAI marks the attempt as `Pending` with `₹0 (Pending Webhook)`. Revenue is ONLY credited to analytics when verified via cryptographic webhook matching the exact paise amount.

---

## 🏗️ System Architecture & Stack

```text
                               +----------------------------+
                               |   React 18 + Vite UI       |  (Port 3000)
                               |  - Recovery Center         |
                               |  - Transaction Explorer    |
                               |  - System Health Dashboard |
                               |  - Payment Ledger Card     |
                               +--------------+-------------+
                                              |
                                              | REST JSON / Observability
                                              v
                               +----------------------------+
                               |    Express API Server      |  (Port 5000)
                               |  - Policy Engine           |
                               |  - Gemini AI Diagnostics   |
                               |  - Webhook Ingestion       |
                               |  - RBAC Multi-Tenant Auth  |
                               +----+---------+--------+----+
                                    |         |        |
                   BullMQ Job Queue |         |        | Neon Serverless
                                    v         |        v
                       +------------+----+    |    +---+-----------+
                       | Upstash Redis   |    |    |  PostgreSQL   |
                       | - Recovery Queue|    |    |  - Payment    |
                       | - Worker (x5)   |    |    |  - AuditLog   |
                       +-----------------+    |    +---------------+
                                              |
                                              v
                                   +----------+----------+
                                   |  Razorpay Test Mode |  (Sandbox Isolation)
                                   |  - Orders & Links   |
                                   |  - HMAC Webhooks    |
                                   +---------------------+
```

### Stack Components
- **Frontend (Client)**: React 18, Vite, React Router 6, Tailwind CSS 3.4, Lucide Icons.
- **Backend (Server)**: Express, TypeScript, Zod Input Validation, Cors, Helmet.
- **Queue Layer**: BullMQ + Upstash Redis (`recovery-execution-queue` with concurrency = 5).
- **Intelligence Layer**: Google Gemini (`gemini-3.5-flash-lite`) with transparent deterministic fallback.
- **Payment Gateway**: Razorpay Test Mode Sandbox (`rzp_test_...`) with HMAC SHA-256 verification.
- **Database & ORM**: Prisma 5.22, PostgreSQL (Hosted via Neon Serverless Postgres).

---

## 🚦 System Capabilities & Phase Roadmap

| Phase / Feature | Architectural Description | Status |
| :--- | :--- | :---: |
| **Phase 1–2: Synthetic Foundation** | Deterministic 1,000+ transaction seed engine with customer profiles and recovery scenarios ([Docs](docs/architecture/phase-2-transaction-data-engine.md)) | ✅ Production-Hardened |
| **Phase 3: Detection & Probability** | Recovery scoring engine with feature extraction, recovery probabilities, and explainable signals ([Docs](docs/architecture/phase-3-detection-scoring.md)) | ✅ Production-Hardened |
| **Phase 4: AI Diagnosis Agent** | LLM-powered root-cause diagnosis via Google Gemini with structured output schemas and injection defenses ([Docs](docs/architecture/phase-4-diagnosis-agent.md)) | ✅ Production-Hardened |
| **Phase 5: Decision Policy Engine** | Deterministic policy engine (`RETRY`, `REMIND`, `WAIT`, `ESCALATE`, `STOP`) with authoritative safety guardrails ([Docs](docs/architecture/phase-5-recovery-decision-engine.md)) | ✅ Production-Hardened |
| **Phase 6: Recovery Executor** | Background worker queue (BullMQ), idempotency protection, stale decision guards, and simulation provider ([Docs](docs/architecture/phase-6-recovery-executor.md)) | ✅ Production-Hardened |
| **Phase 7: Razorpay Test Integration**| Real test mode orders, customer payment links, HMAC raw-body signature verification, and idempotency ([Docs](docs/architecture/phase-7-razorpay-test-integration.md)) | ✅ Production-Hardened |
| **Phase 8: Merchant Dashboard** | React fintech UI with real-time Recovery Center, Transaction Explorer, AI Timeline, and Analytics ([Docs](docs/architecture/phase-8-merchant-dashboard.md)) | ✅ Production-Hardened |
| **Financial Source of Truth Ledger** | Dedicated PostgreSQL `Payment` evidence ledger with cryptographic reconciliation and zero false positives ([Walkthrough](walkthrough.md)) | ✅ Production-Hardened |
| **Multi-Tenant RBAC** | `User` and `MerchantMembership` models with granular roles (`OWNER`, `ADMIN`, `ANALYST`, `SUPPORT`, `VIEWER`) | ✅ Production-Hardened |
| **System Health & Observability** | Real-time telemetry dashboard (`/api/system/health`) tracking live PostgreSQL/Redis latencies, queue depth, AI fallback rate, and webhook error rate ([Docs](docs/architecture/system-health.md)) | ✅ Production-Hardened |

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (version 18 or above)
- npm (version 9 or above)
- PostgreSQL Database instance (e.g. Neon Cloud Postgres)
- Redis instance (e.g. Upstash Redis)

### 1. Repository Setup
```bash
git clone https://github.com/MVPAlok/Recover_AI.git
cd Recover_AI
npm install
```

### 2. Environment Configuration
Create `.env` in the root directory:
```bash
cp .env.example .env
```
Ensure the following variables are configured:
```ini
# PostgreSQL (Neon Cloud)
DATABASE_URL="postgresql://neondb_owner:<password>@<host>/neondb?sslmode=require"

# Upstash Redis
REDIS_URL="rediss://default:<password>@<host>:6379"
ENABLE_REDIS="true"

# Google Gemini AI
LLM_API_KEY="AIzaSy..."
LLM_MODEL="gemini-3.5-flash-lite"

# Razorpay Test Mode (Strict Sandbox)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
```

### 3. Database Migration & Synthetic Seeding
```bash
# Apply schema migrations
npx prisma migrate dev --name init --schema=database/prisma/schema.prisma

# Seed 1,000 synthetic transactions (deterministic seed 42)
npm run db:seed
```

### 4. Running the Development Workspace
Start frontend (port 3000) and backend (port 5000) concurrently:
```bash
npm run dev
```

---

## 🧪 Testing & Verification Suite

RecoverAI includes a complete 58-test multi-phase automated test suite:

```bash
# Run all phase unit tests (58/58 tests)
npm run test:all

# Run individual subsystems
npm run test:detection        # Detection & probability scoring tests (8/8)
npm run test:diagnosis        # Diagnosis Agent & prompt injection defense tests (10/10)
npm run test:decision         # Recovery Decision Engine policy tests (12/12)
npm run test:executor         # Recovery Executor & outcome tests (10/10)
npm run test:webhooks         # Razorpay Webhook validation & idempotency tests (6/6)
npm run test:dashboard        # Merchant Dashboard backend tests (7/7)
npm run test:queue            # BullMQ & Redis queue tests (3/3)
npm run test:system           # Real-Time System Health & Observability tests (7/7)

# Master Production Failure Simulation
npm run simulation:failure    # E2E 7-scenario master production failure simulation (100% pass)
```

---

## 🛡️ License
Distributed under the MIT License.