# Phase 8: Merchant Dashboard & Product Interface

## 1. Objective
Phase 8 delivers a production-grade, responsive, and data-driven Merchant Dashboard that visualizes the autonomous revenue recovery engine. It enables merchants to explore revenue at risk, inspect AI detection scores and root cause diagnoses, trigger controlled recovery executions, trace Razorpay Test Mode webhooks, and audit historical operations.

---

## 2. Product Vision & Story
The dashboard communicates a clear 30-second workflow:
$$\text{Failed Payment} \longrightarrow \text{AI Diagnosis} \longrightarrow \text{Recovery Scoring} \longrightarrow \text{Strategy Policy} \longrightarrow \text{Razorpay Execution} \longrightarrow \text{Webhook Confirmation} \longrightarrow \text{Revenue Recovered}$$

---

## 3. Architecture & Tech Stack

```text
  React 18 + Vite (Port 3000)
             │  (JSON / REST)
             ▼
  Express API Server (Port 5000)
             │
  Dashboard Controller (dashboard.controller.ts)
             │
  Dashboard Service (dashboard.service.ts)
             │
  Dashboard Repository (dashboard.repository.ts)
             │  (Prisma ORM with Multi-Tenant Filtering)
             ▼
  PostgreSQL Database (Neon Serverless)
```

- **Frontend**: React 18, Vite, React Router 6, Tailwind CSS, Lucide Icons.
- **Backend**: Express, TypeScript, Layered Service-Repository Pattern.
- **Data Isolation**: Strict multi-tenant isolation by `merchantId`.

---

## 4. Backend Dashboard APIs

| Route | Method | Description |
| :--- | :---: | :--- |
| `/api/dashboard/merchants` | `GET` | Lists available merchants for multi-merchant workspace switching |
| `/api/dashboard/overview` | `GET` | Aggregates Revenue at Risk, Recovered Revenue, Recovery Rate, and Failed Payment counts |
| `/api/dashboard/recovery-opportunities` | `GET` | High-potential failed transactions evaluated as recoverable candidates |
| `/api/transactions` | `GET` | Paginated transaction explorer with search, status, risk, and decision filters |
| `/api/transactions/:transactionId` | `GET` | Complete transaction lifecycle timeline, AI explainability factors, and audit trail |
| `/api/recoveries` | `GET` | Paginated recovery execution attempts with status and action filters |
| `/api/recoveries/:id` | `GET` | Single recovery attempt inspection with linked transaction and gateway context |
| `/api/analytics/overview` | `GET` | Grouped failure distributions, AI policy breakdowns, and outcome statistics |
| `/api/audit-log` | `GET` | Chronological system activity and event logs |
| `/api/integrations/razorpay/status` | `GET` | Safe gateway status (Test Mode verified, webhook health, no leaked secrets) |

---

## 5. Documented Metric Formulas

### Recovery Rate
$$\text{Recovery Rate} = \left( \frac{\text{Total Recovered Revenue}}{\text{Total Revenue at Risk}} \right) \times 100$$
- **Revenue at Risk**: $\sum \text{Transaction.amount}$ where $\text{status} = \text{FAILED}$
- **Recovered Revenue**: $\sum \text{RecoveryAttempt.amountRecovered}$ where $\text{status} = \text{SUCCESS}$

---

## 6. Frontend Pages & Components

1. **Dashboard Overview** (`/dashboard`):
   - Hero KPI metric cards with INR formatting (`₹8.72L` / `₹2,499`).
   - Recovery opportunities grid with click-to-detail navigation.
   - Gateway operational status widget.

2. **Transaction Explorer** (`/transactions`):
   - Debounced search across transaction IDs, customer names, emails, and decline codes.
   - Filters for Status (`FAILED`, `SUCCESS`, `PENDING`), AI Decision (`RETRY`, `REMIND`, `ESCALATE`, `WAIT`, `STOP`), and Risk Level.
   - Full server-side pagination with clean table/card responsive layouts.

3. **Transaction Details** (`/transactions/:transactionId`):
   - Visual 7-step interactive lifecycle timeline.
   - AI Decision Explainability panel with positive signals, risk factors, model confidence, and rule trail.
   - "Execute Recovery Action" trigger invoking Razorpay Test Mode execution.
   - Immutable audit trail stream.

4. **Recovery Center** (`/recoveries`):
   - Status filtering tabs (`All`, `Successful`, `Executed`, `Pending`, `Failed`, `Cancelled`).
   - Action type filtering.

5. **Analytics & Intelligence** (`/analytics`):
   - Real-time failure cause distribution charts.
   - AI policy decision breakdown.

6. **System Audit Log** (`/audit-log`):
   - Chronological event timeline with entity and actor filtering.

7. **Settings & Gateway Status** (`/settings`):
   - Merchant configuration profile and strict Test Mode validation.

---

## 7. Security & Isolation Guardrails
- **Credential Protection**: The frontend never receives `DATABASE_URL`, `RAZORPAY_KEY_SECRET`, or `RAZORPAY_WEBHOOK_SECRET`.
- **Sandbox Confinement**: Live keys (`rzp_live_`) are blocked immediately by fail-closed guards.
- **Multi-Tenant Row Isolation**: Database queries strictly filter by `merchantId`.

---

## 8. Verification & Test Suite

```bash
npm run test:dashboard   # 7/7 Passed (100%) - Unit tests for aggregations, filters, security, and formulas
npm run test:detection   # 7/7 Passed (100%) - Detection & scoring
npm run test:diagnosis   # 10/10 Passed (100%) - Diagnosis agent & prompt injection defense
npm run test:decision    # 12/12 Passed (100%) - Decision safety guardrails
npm run test:safety      # 7/7 Passed (100%) - Fail-closed execution security
npm run test:webhooks    # 6/6 Passed (100%) - HMAC SHA-256 webhook validation
npm run test:queue       # 3/3 Passed (100%) - Background worker & BullMQ queues
npm run build            # Clean build (0 errors) across client and server
npm run prisma:validate  # Prisma schema valid
```
