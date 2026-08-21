# RecoverAI — System Architecture Overview

## Overview

RecoverAI is designed as a modular, decoupled revenue recovery system. The key design goal is to isolate business logic, payment gateway interactions, and autonomous AI decision-making into clean, traceable architectural boundaries.

---

## Architectural Principles

1. **Strict Client-Server Separation**: The frontend (React SPA running on Vite) and backend (Express REST API running on Node.js) operate completely independently over HTTP REST APIs.
2. **Layered Express Architecture**: The backend uses a structured **Controller → Service → Database** layout. HTTP request handling is separated from core business processes, which in turn interface with the database via Prisma ORM.
3. **Strict Validation at System Boundaries**: Zod is used at the API boundary to validate incoming HTTP request payloads, ensuring type-safe inputs before business logic executes.
4. **Decoupled AI Engine & Recovery Attempts**: 
   - AI reasoning and classifications (`AIDecision`) are strictly decoupled from physical execution attempts (`RecoveryAttempt`).
   - This provides clean metrics for recovery predictions (e.g., success probabilities) and actual recovery performance (e.g., recovered revenue).
5. **Immutable Audit Trail**: 
   - Audit logs are treated as historical, immutable records. 
   - Relations to `Transaction` and `RecoveryAttempt` are configured with `onDelete: SetNull`. If an associated transaction or recovery attempt is deleted, the corresponding audit log entry remains intact for auditing purposes.
6. **Gateway Isolation Layer**: Payment gateway integrations (Razorpay Test Mode) are wrapped inside specialized service modules. Core database models remain independent of gateway-specific API structures.

---

## High-Level Domain Blueprint

```text
Merchant
   │
   ├── Customers (Unique per merchant email: @@unique([merchantId, email]))
   │
   └── Transactions (failureCode, failureReason, retryCount, Razorpay IDs)
           │
           ├── AI Decisions (agentType, decision, recoveryProbability, confidenceScore, reasoning)
           │      │
           │      └── Recovery Decision (One-to-Many with Recovery Attempt)
           │
           ├── Recovery Attempts (attemptNumber, actionType, status, amountRecovered)
           │      │
           │      └── Amount Recovered (Measured revenue metrics)
           │
           └── Audit Logs (Immutable; onDelete: SetNull on Transaction/RecoveryAttempt)
```

### Entity Descriptions
- **Merchant**: Root tenant account for a business owner using RecoverAI.
- **Customer**: Customer record associated with a Merchant, identified uniquely by email per merchant.
- **Transaction**: Ingested payment attempt (Pending, Success, Failed) capturing `failureCode`, `failureReason`, `retryCount`, and optional payment gateway order/payment identifiers.
- **AIDecision**: Autonomous decision prescribed by an AI agent (e.g., `DETECTION`, `DIAGNOSIS`, `RECOVERY_DECISION`). Saves natural language reasoning, prompt metadata, and confidence scores.
- **RecoveryAttempt**: Represents an actual execution attempt (e.g., executing a smart retry, sending a reminder link) based on an AI decision, capturing precise `amountRecovered` to measure recovery performance.
- **AuditLog**: An immutable logging record mapping changes across Merchants, Transactions, and Recovery Attempts. Specially configured not to cascade delete if transactions or attempts are pruned.

---

## Technology & Infrastructure Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + React Router
- **Backend**: Express + Node.js + TypeScript + Zod
- **Database**: PostgreSQL (Neon Serverless PostgreSQL)
- **ORM**: Prisma ORM
- **Deployment & Config**: Workspace structured monorepo using npm workspaces, with environment configurations isolated in `.env` files.
