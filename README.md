# 💸 RecoverAI — AI-Powered Revenue Recovery Agent

<div align="center">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/Express-Node-green?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind--CSS-3.4-cyan?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-5.22-darkblue?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
</div>

<br />

RecoverAI is a production-grade, modular, autonomous revenue recovery agent designed to save lost merchant revenue from failed payment transactions. Utilizing smart diagnostic agents, it identifies recovery probabilities, recommends actions, executes retries through Razorpay Test Mode, and leaves an immutable audit trail.

---

## 📌 Problem Statement

Every year, merchants lose billions in revenue due to payment failures—caused by card expirations, insufficient funds, network timeouts, or false-positive fraud flags. Traditional recovery systems rely on static, generic email chains.

**RecoverAI** addresses this by deploying multi-agent AI systems that:
1. Detect transaction failures in real-time.
2. Diagnose failure causes using structured codes and human-readable reasons.
3. Formulate recovery strategies using custom LLM logic.
4. Execute and measure recovered revenue seamlessly.

---

## 🏗️ System Architecture & Stack

RecoverAI separates UI rendering, API servers, database ORM, and future intelligence queues into clear boundaries.

```text
                               +----------------------------+
                               |     React + Vite SPA       |  (Port 3000)
                               +--------------+-------------+
                                              |
                                              | JSON / REST
                                              v
                               +----------------------------+
                               |    Express API Server      |  (Port 5000)
                               +-------+--------------+-----+
                                       |              |
                       Validation (Zod)|              | Prisma ORM
                                       v              v
                               +-------+-----+  +-----+-----+
                               | Env Config  |  |  Postgres |  (Neon Database Cloud)
                               +-------------+  +-----------+
```

### Stack Components
- **Client (Frontend)**: React 18, Vite, React Router, Tailwind CSS, Lucide Icons.
- **Server (Backend)**: Express, TypeScript, Zod Input Validation, Cors, Helmet.
- **Database (Data Layer)**: Prisma ORM, PostgreSQL (Hosted via Neon Serverless Postgres).

---

## 🚦 Features & Roadmap

| Feature | Description | Status |
| :--- | :--- | :---: |
| **Monorepo Structure** | Controlled from root via npm workspaces | ✅ Completed |
| **Express REST Server** | Layered Controller -> Service architecture | ✅ Completed |
| **Prisma PG Schema** | Core schemas (`Merchant`, `Customer`, `Transaction`, `AIDecision`, `RecoveryAttempt`, `AuditLog`) | ✅ Completed |
| **Decoupled AI Engine** | AI logic (`AIDecision`) completely separated from attempts | ✅ Completed |
| **Immutable Audit Trails** | Non-cascaded logs (`onDelete: SetNull`) that persist | ✅ Completed |
| **Synthetic Transaction Generator**| Deterministic 1,000+ transaction seed engine with customer profiles & recovery scenarios ([Phase 2 Docs](docs/architecture/phase-2-transaction-data-engine.md)) | ✅ Completed |
| **Detection & Scoring Engine** | Deterministic, explainable recovery scoring engine with REST API & scenario alignment ([Phase 3 Docs](docs/architecture/phase-3-detection-scoring.md)) | ✅ Completed |
| **Diagnosis Agent** | LLM-powered root-cause diagnosis agent with structured outputs, prompt injection defenses & provider abstraction ([Phase 4 Docs](docs/architecture/phase-4-diagnosis-agent.md)) | ✅ Completed |
| **Recovery Decision Engine** | Formulates optimal recovery policies (`RETRY`, `REMIND`, `ESCALATE`, `WAIT`, `STOP`) with authoritative safety guardrails ([Phase 5 Docs](docs/architecture/phase-5-recovery-decision-engine.md)) | ✅ Completed |
| **Recovery Executor** | Controlled execution workflow for recovery policies in simulation mode with strict guardrails, idempotency & audit logging ([Phase 6 Docs](docs/architecture/phase-6-recovery-executor.md)) | ✅ Completed |
| **Razorpay Test Integration** | Real execution gateway for smart retries & payment links | 📅 Planned (Phase 7) |
| **Redis Queues** | Asynchronous job processing for recovery actions | 📅 Planned |

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (version 18 or above)
- npm (version 9 or above)
- PostgreSQL Database instance (e.g. Neon Cloud Postgres)

### 1. Repository Setup
Clone the repository and install the workspace-wide dependencies:
```bash
git clone https://github.com/MVPAlok/Recover_AI.git
cd Recover_AI
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Open `.env` and configure your database URL:
```ini
DATABASE_URL="postgresql://neondb_owner:<password>@ep-wispy-sun-az9ye8b1.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

### 3. Database Migration & Synthetic Seeding
Deploy the schema migrations to sync your Postgres database and seed deterministic transaction data:
```bash
# Apply schema migration
npx prisma migrate dev --name init --schema=database/prisma/schema.prisma

# Seed 1,000 synthetic transactions (deterministic seed 42)
npm run db:seed
```

### 4. Running the Development Workspace
Start the frontend (port 3000) and backend (port 5000) servers concurrently with:
```bash
npm run dev
```

---

## 🚀 Workspace Commands Reference

Run these commands from the root workspace folder:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Spins up both Vite and Express dev servers concurrently |
| `npm run dev:server` | Starts the backend Express server only (reloads on changes) |
| `npm run dev:client` | Starts the frontend client only (port 3000) |
| `npm run db:seed` | Seeds database with synthetic transactions (`--transactions=1000 --seed=42`) |
| `npm run detection:eval` | Runs Detection Engine evaluation against deliberate recovery scenarios |
| `npm run test:unit` | Executes isolated unit tests for detection feature extraction and scoring guardrails |
| `npm run test:diagnosis` | Runs 10 comprehensive unit and prompt-injection security tests for Diagnosis Agent |
| `npm run diagnosis:eval` | Runs Diagnosis Agent scenario evaluation and live batch diagnostics |
| `npm run test:decision` | Runs 12 comprehensive unit and safety override tests for Recovery Decision Engine |
| `npm run decision:eval` | Runs Recovery Decision scenario alignment and live batch policy evaluation |
| `npm run test:executor` | Runs 10 comprehensive unit tests for Recovery Executor actions and outcomes |
| `npm run test:idempotency` | Runs idempotency and duplicate prevention test suite |
| `npm run test:safety` | Runs fail-closed safety and security guardrail tests |
| `npm run executor:eval` | Runs E2E scenario simulation and bounded live database execution evaluation |
| `npm run build` | Builds client and server for production deployment |
| `npm run lint` | Runs ESLint analysis across the workspace |
| `npm run prisma:validate` | Validates your database schema definitions |
| `npm run prisma:generate` | Regenerates Prisma Client types |

---

## 🛡️ License
Distributed under the MIT License.