# RecoverAI — System Architecture Overview

## Overview

RecoverAI is designed as a modular, decoupled revenue recovery system. The key design goal is to isolate business logic, payment gateway interactions, and autonomous AI decision-making into clean architectural boundaries.

---

## Architectural Principles

1. **Strict Client-Server Separation**: The frontend (React SPA) and backend (Express REST API) operate completely independently over HTTP REST APIs.
2. **Layered Express Architecture**: HTTP Request handling (`controllers`) is separated from business operations (`services`) and database access (`Prisma ORM`).
3. **Strict Validation at System Boundaries**: External inputs are validated using Zod schemas before hitting business logic.
4. **Decoupled AI Engine & Recovery Attempts**: AI reasoning/prescriptions (`AIDecision`) are strictly decoupled from physical execution outcomes (`RecoveryAttempt`), providing clean audit trails and accurate revenue recovery tracking.
5. **Gateway Isolation Layer**: Payment gateway integrations (Razorpay Test Mode) are wrapped in dedicated service interfaces, shielding internal domains from gateway-specific payload formats.
6. **Immutable Audit Logging**: Every system and agent decision produces an audit log record for merchant compliance and analytics.

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
           │      └── Recovery Decision
           │
           ├── Recovery Attempts (attemptNumber, actionType, status, amountRecovered)
           │      │
           │      └── Amount Recovered (Measured revenue)
           │
           └── Audit Logs (entityType, entityId, action, actor, details)
```

- **Merchant**: Root account for a business owner using RecoverAI.
- **Customer**: End-user who attempted a transaction, indexed per merchant.
- **Transaction**: Ingested payment record (Pending, Success, Failed) with structured `failureCode`, `failureReason`, `retryCount`, and optional Razorpay parameters.
- **AIDecision**: Autonomous decision prescribed by an AI agent (Detection, Diagnosis, Recovery Decision).
- **RecoveryAttempt**: Physical execution attempt corresponding to an AI decision, capturing precise `amountRecovered`.
- **AuditLog**: Comprehensive log recording all system, user, and agent activities.
