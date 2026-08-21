# RecoverAI — Phase 6: Recovery Executor Architecture

## 1. Executive Summary

Phase 6 implements the **Recovery Executor**, the component in the RecoverAI revenue recovery pipeline responsible for translating approved Phase 5 recovery decisions (`RETRY`, `REMIND`, `ESCALATE`, `WAIT`, `STOP`) into a strictly controlled, deterministic, and auditable execution workflow.

> [!IMPORTANT]
> **Simulation Mode Only & Fail-Closed Guardrails**:
> Phase 6 executes approved recovery decisions in a **controlled simulation environment (`RECOVERY_EXECUTION_MODE=simulation`)**. It does not perform real-money payment operations, invoke live payment gateways (e.g. Razorpay), or send unsolicited customer communications. Any attempt to use live modes fails closed.

---

## 2. Pipeline Positioning & Separation of Concerns

```
Payment Failure
      ↓
Phase 3 — Detection & Scoring (Probability & Risk)
      ↓
Phase 4 — Diagnosis Agent (Root Cause & Evidence)
      ↓
Phase 5 — Recovery Decision Engine (Policy & Guardrails)
      ↓
Phase 6 — Recovery Executor
      ├── 1. Decision Validation & Freshness Check (≤ 30 mins)
      ├── 2. Pre-Execution Safety Guardrails (Retry Limit < 3, Status = FAILED)
      ├── 3. Idempotency & Concurrency Check
      ├── 4. RecoveryAttempt Lifecycle Creation (PENDING)
      ├── 5. Provider Execution (SimulationRecoveryProvider)
      ├── 6. Outcome Persistence & Audit Logging
      └── 7. Atomic Retry Count Update (RETRY only)
```

### Key Architectural Boundary
- **Phase 5 asks**: *"What is the safest and most optimal recovery action to recommend?"*
- **Phase 6 asks**: *"Can this approved action be safely executed right now, and what is its outcome?"*
- **State Isolation**: `Transaction.status` remains `FAILED` even if a `RecoveryAttempt` succeeds in simulation. Transaction state is cleanly separated from recovery execution state.

---

## 3. Provider Abstraction

The execution engine is decoupled from payment processors using the `RecoveryProvider` interface:

```typescript
export interface RecoveryProvider {
  readonly providerName: string;
  executeRetry(input: RetryExecutionInput): Promise<ProviderExecutionResult>;
  executeReminder(input: ReminderExecutionInput): Promise<ProviderExecutionResult>;
  executeEscalation(input: EscalationExecutionInput): Promise<ProviderExecutionResult>;
  executeWait(input: WaitExecutionInput): Promise<ProviderExecutionResult>;
  executeStop(input: StopExecutionInput): Promise<ProviderExecutionResult>;
}
```

### `SimulationRecoveryProvider`
- Uses deterministic PRNG hashing based on `SIMULATION_SEED` (default: 42) and transaction ID.
- Identical seed + transaction yields 100% reproducible recovery outcomes.
- For `RETRY`:
  - Roll `< recoveryProbability` → `SUCCESS` (`PAYMENT_RECOVERED`), `amountRecovered = transaction.amount`.
  - Roll `≥ recoveryProbability` → `FAILED` (`RECOVERY_ATTEMPT_FAILED`), `amountRecovered = 0`.
- For `REMIND`: `SUCCESS` (`REMINDER_SIMULATED`), `amountRecovered = 0`.
- For `ESCALATE`: `SUCCESS` (`ESCALATION_CREATED`), `amountRecovered = 0`.
- For `WAIT`: `PENDING` (`WAIT_SCHEDULED`), `amountRecovered = 0`, `scheduledAt = now + 30m`.
- For `STOP`: `CANCELLED` (`RECOVERY_STOPPED_BY_POLICY`), `amountRecovered = 0`.

---

## 4. Execution Lifecycle & Safety Guardrails

### `RecoveryAttempt` Lifecycle
```
PENDING ──► EXECUTED ──► SUCCESS / FAILED
   │
   └──────► CANCELLED (Guardrail breach or STOP policy)
```

### Guardrails
1. **Transaction State**: Must exist and have status `FAILED`.
2. **Merchant Integrity**: Merchant record must be present and linked.
3. **Decision Verification**: Must be `AIAgentType.RECOVERY_DECISION` and linked to the same `transactionId`.
4. **Decision Freshness**: Rejects decisions older than `DECISION_MAX_AGE_MINUTES` (30 mins).
5. **Retry Safety**: Re-enforces `retryCount < 3`. If `retryCount >= 3`, blocks execution with `MAX_RETRY_LIMIT_EXCEEDED`.
6. **Retry Count Increment**: `transaction.retryCount` is incremented **only** when an actual `RETRY` action executes (not on `REMIND`, `ESCALATE`, `WAIT`, `STOP`, or blocked/cancelled attempts).
7. **Idempotency**: Prevents executing the same `decisionId` twice, returning cached results.

---

## 5. Audit Logging

Every execution event generates a structured `AuditLog` record with actor `"RecoverAI:RecoveryExecutor"`:
- `RECOVERY_EXECUTION_STARTED`
- `RECOVERY_EXECUTION_BLOCKED`
- `RECOVERY_EXECUTION_COMPLETED`

---

## 6. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/recovery-executor/:transactionId/execute` | Executes an approved decision for a single transaction |
| `GET` | `/api/recovery-executor/:transactionId` | Inspects the latest recovery attempt (side-effect free) |
| `POST` | `/api/recovery-executor/run` | Runs batch execution for up to 100 candidate transactions |
| `GET` | `/api/recovery-executor/metrics` | Retrieves aggregated recovery rates and amount metrics |

---

## 7. Security & Real-Money Protection

1. **Default Mode**: Always `simulation`.
2. **Fail-Closed**: Non-simulation modes throw an explicit error and halt execution immediately.
3. **No Direct Gateway Calls**: Zero network requests to Razorpay or bank APIs.
4. **Secret Sanitization**: No credentials or private tokens are logged or serialized in responses.
