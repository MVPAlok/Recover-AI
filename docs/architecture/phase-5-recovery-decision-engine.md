# RecoverAI — Phase 5: Recovery Decision Engine Architecture

## 1. Phase Objective

The **Recovery Decision Engine** is the authoritative policy-making layer of RecoverAI.

It synthesizes multi-stage intelligence from:
1. **Phase 3: Detection & Scoring Engine** (statistical recovery probability, risk level, and scoring factors).
2. **Phase 4: Diagnosis Agent** (root-cause classification, failure category, severity, evidence, and transient indicators).
3. **Transaction Context** (amount, payment method, retry history, age, gateway failure codes).
4. **Customer History** (lifetime spend, historical success rate, consecutive failure streaks).
5. **Authoritative Hard Safety Rules** (immutable business risk limits).

Its core responsibility is answering:
> **"Given everything RecoverAI currently knows about this failed payment, what should RecoverAI do next?"**

> [!IMPORTANT]
> **Phase 5 determines WHAT RecoverAI should do. It does NOT perform the action.**
> All payment retries, customer notifications, and Razorpay API executions belong exclusively to **Phase 6 — Recovery Executor**.

---

## 2. Why Decision is Separate from Diagnosis

In a production revenue recovery system, **diagnosis** and **decision-making** must remain decoupled:

| Aspect | Phase 4 Diagnosis Agent | Phase 5 Recovery Decision Engine |
| :--- | :--- | :--- |
| **Primary Question** | *Why did this payment fail?* | *What is the safest business action to take next?* |
| **Nature of Logic** | Diagnostic reasoning & evidence extraction (LLM-powered) | Authoritative policy enforcement & risk control (Deterministic) |
| **Authority** | Advisory | Authoritative |
| **Safety Overrides** | Cannot alter business rules | Enforces hard safety overrides over any AI suggestion |
| **Output** | Diagnosis code, failure category, severity, evidence | Action (`RETRY`, `REMIND`, `ESCALATE`, `WAIT`, `STOP`), rules applied, blocked actions |

---

## 3. Decision Hierarchy & Priority

The policy engine evaluates rules in strict hierarchical sequence:

```
HARD SAFETY RULES (Immutable / Uncompromisable)
       ↓
BUSINESS POLICY MATRIX (Categorical & Probability Mapping)
       ↓
DETECTION RECOVERY PROBABILITY & CONFIDENCE
       ↓
DIAGNOSIS CATEGORY & SEVERITY
       ↓
ECONOMIC CONTEXT (Business Priority: HIGH / MEDIUM / LOW)
       ↓
OPTIONAL LLM ADVISORY REASONING (Advisory Only)
       ↓
POLICY OVERRIDE FILTER (Enforces Hard Rule if LLM Conflicts)
       ↓
FINAL RECOVERY DECISION
```

---

## 4. Supported Recovery Actions (`RecoveryDecision`)

| Action | When Applied | Blocked Actions |
| :--- | :--- | :--- |
| **`RETRY`** | Transient infrastructure/bank timeout with high recovery likelihood ($\ge 70\%$) and remaining retry budget ($< 3$). | `STOP` |
| **`REMIND`** | Customer-actionable failure (e.g. 3D-Secure / OTP drop-off) where automated retry is futile but notifying the customer enables recovery. | `RETRY` |
| **`ESCALATE`** | Unclassified failure or low diagnostic confidence where automated action is unsafe; requires operational review. | `RETRY` |
| **`WAIT`** | Transient situation with moderate probability ($20\% \le p < 70\%$) or conflicting signals requiring delay before retry window. | `RETRY` |
| **`STOP`** | Hard failure (retries $\ge 3$, expired instrument, repeated insufficient funds, recovery probability $< 20\%$). | `RETRY`, `REMIND`, `WAIT`, `ESCALATE` |

---

## 5. Authoritative Hard Safety Rules

Hard safety rules are non-negotiable and strictly override any model suggestion:

1. **Rule 1 — Maximum Retry Limit**:
   - `retryCount >= 3` $\rightarrow$ `STOP` (`MAX_RETRY_LIMIT_EXCEEDED`).
   - Even if recovery probability is 0.99.
2. **Rule 2 — Expired Instrument**:
   - `diagnosisCode === 'EXPIRED_PAYMENT_INSTRUMENT'` or `failureCategory === 'INSTRUMENT_EXPIRATION'` $\rightarrow$ `STOP` (`EXPIRED_PAYMENT_INSTRUMENT`).
3. **Rule 3 — Repeated Insufficient Funds**:
   - `diagnosisCode === 'INSUFFICIENT_FUNDS'` AND `retryCount >= 2` $\rightarrow$ `STOP` (`REPEATED_INSUFFICIENT_FUNDS`).
4. **Rule 4 — Very Low Recovery Probability**:
   - `recoveryProbability < 0.20` $\rightarrow$ `STOP` (`VERY_LOW_RECOVERY_PROBABILITY`).

---

## 6. Centralized Policy Matrix

| Condition / Signals | Final Action | Rule Applied |
| :--- | :---: | :--- |
| `retryCount >= 3` | `STOP` | `MAX_RETRY_LIMIT_EXCEEDED` |
| Expired Card / Instrument | `STOP` | `EXPIRED_PAYMENT_INSTRUMENT` |
| Insufficient Funds + `retryCount >= 2` | `STOP` | `REPEATED_INSUFFICIENT_FUNDS` |
| Recovery Probability $< 20\%$ | `STOP` | `VERY_LOW_RECOVERY_PROBABILITY` |
| Authentication / 3D-Secure drop-off | `REMIND` | `CUSTOMER_AUTHENTICATION_REQUIRED` |
| Temporary bank/gateway timeout + $p \ge 70\%$ + retries $< 3$ | `RETRY` | `TEMPORARY_FAILURE_RETRY_POLICY` |
| Unknown diagnosis + low confidence ($< 60\%$) | `ESCALATE` | `UNKNOWN_FAILURE_ESCALATION` |
| Conflicting Detection / Diagnosis signals | `WAIT` | `CONFLICTING_SIGNALS_POLICY` |
| Moderate probability ($20\% \le p < 70\%$) | `WAIT` | `TRANSIENT_WAIT_WINDOW_POLICY` |
| Default / Fallback | `WAIT` | `FALLBACK_WAIT_POLICY` |

---

## 7. Economic Prioritization vs Safety

To prevent high-value transactions from overriding risk limits, economic awareness is separated from safety logic:

- **`businessPriority`** (`LOW` | `MEDIUM` | `HIGH`):
  - `HIGH`: Transaction amount $\ge ₹10,000$ OR customer lifetime spend $\ge ₹25,000$.
  - `MEDIUM`: Transaction amount $\ge ₹2,500$ OR customer lifetime spend $\ge ₹5,000$.
  - `LOW`: Standard transaction.

> [!NOTE]
> A transaction can be **HIGH business priority** and **STOP recovery action** (e.g. ₹85,000 failed transaction with an expired card). Economic priority signals operational importance without violating safety rules.

---

## 8. Role of LLM & Safety Overrides

If optional LLM advisory reasoning is requested:
1. LLM recommendation is validated via strict Zod schema (`decisionRecommendationSchema`).
2. The Deterministic Policy Engine checks whether any hard safety rule was triggered.
3. If a hard safety rule contradicts the LLM, the hard rule **overrides** the LLM.
4. The override is explicitly logged in `policyOverride`, `rulesApplied`, and the audit trail.

---

## 9. Database Persistence & Audit Logging

### `AIDecision` Record
- `agentType`: `RECOVERY_DECISION`
- `decision`: `RETRY` | `REMIND` | `ESCALATE` | `WAIT` | `STOP`
- `recoveryProbability`: Detection probability
- `confidenceScore`: Decision confidence
- `reasoning`: Grounded explanation including rules applied
- `modelName`: `"recovery-policy-v1"` (or LLM model name)
- `promptVersion`: `"v1.0.0"`

### `AuditLog` Record
Every finalized decision produces an immutable audit log:
- `entityType`: `"AIDecision"`
- `action`: `"RECOVERY_DECISION_CREATED"`
- `actor`: `"RecoverAI:RecoveryDecisionEngine"`
- `details`:
  ```json
  {
    "decision": "STOP",
    "confidence": 0.98,
    "businessPriority": "HIGH",
    "detectionProbability": 0.95,
    "diagnosisConfidence": 0.92,
    "rulesApplied": ["MAX_RETRY_LIMIT_EXCEEDED", "LLM_ADVISORY_OVERRIDDEN"],
    "blockedActions": ["RETRY", "REMIND", "WAIT", "ESCALATE"],
    "llmRecommendation": "RETRY",
    "policyOverride": "MAX_RETRY_LIMIT_EXCEEDED",
    "evaluatedAt": "2026-08-21T02:18:48.387Z"
  }
  ```

---

## 10. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/recovery-decision/:transactionId` | Pure, side-effect free inspection of recovery decision. |
| `POST` | `/api/recovery-decision/:transactionId/decide` | Evaluates decision, creates `AIDecision` and `AuditLog`, returns result. |
| `POST` | `/api/recovery-decision/run` | Batch processes candidate failed transactions (max limit 100). |

---

## 11. Verification & Test Metrics

### Unit Tests (`npm run test:decision`)
- **12/12 Unit Tests Passed**
  - ✓ Test 1: Strong temporary failure $\rightarrow$ `RETRY`
  - ✓ Test 2: Authentication failure $\rightarrow$ `REMIND`
  - ✓ Test 3: Repeated insufficient funds $\rightarrow$ `STOP`
  - ✓ Test 4: Retry count $\ge 3$ forces `STOP`
  - ✓ Test 5: Expired payment instrument forces `STOP`
  - ✓ Test 6: Unknown failure with low confidence $\rightarrow$ `ESCALATE`
  - ✓ Test 7: Conflicting detection/diagnosis signals $\rightarrow$ `WAIT`
  - ✓ Test 8: High economic value sets HIGH priority while enforcing safety `STOP`
  - ✓ Test 9: 98% recovery probability does not bypass max retry limit
  - ✓ Test 10: Explainability factors and rule trail
  - ✓ Test 11: LLM advisory recommendation overridden by hard rule with audit trail
  - ✓ Test 12: Zod schema rejection for malformed LLM outputs

### Scenario Alignment (`npm run decision:eval`)
- **Policy Alignment Score**: 5/5 Scenarios (100.0%)

### Live PostgreSQL Batch Dataset Results
- **Failed Transactions Evaluated**: 50
- **Decision Distribution**:
  - `RETRY`: 28 (56%)
  - `REMIND`: 9 (18%)
  - `WAIT`: 4 (8%)
  - `STOP`: 9 (18%)
  - `ESCALATE`: 0 (0%)
- **AIDecisions Persisted**: 50
- **AuditLogs Created**: 50
- **Revenue at Risk Evaluated**: ₹276,095
- **Potential Recovery Value**: ₹176,437.57

---

## 12. Security & Execution Boundaries

- **Zero Payment Execution**: Phase 5 contains zero integration with Razorpay APIs, charges, or webhooks.
- **Zero Secrets Exfiltration**: Credentials and database URLs are never passed to reasoning layers.
- **Immutable Safety**: Hard safety rules cannot be bypassed by client requests or AI prompts.
