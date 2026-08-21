# Phase 3 — Detection & Scoring Engine

## 1. Phase Objective

The objective of **Phase 3: Detection & Scoring Engine** is to implement the first autonomous decision-making layer of **RecoverAI**.

The engine evaluates failed payment transactions to determine:
1. Whether the failed transaction is potentially recoverable.
2. The estimated probability of successful recovery.
3. The risk level (`LOW`, `MEDIUM`, `HIGH`).
4. Structured, explainable factors contributing to the score.
5. A preliminary recommendation (`RETRY`, `WAIT`, `STOP`) persisted to the `AIDecision` table.

This phase is **100% deterministic, rule-based, and explainable**, without invoking any LLMs or random heuristics.

---

## 2. Why Detection is Decoupled from Diagnosis

In payment recovery systems, separating **Detection** from **Diagnosis** provides critical benefits:
- **High-Throughput Filtering**: Detection acts as a fast, computationally inexpensive mathematical filter that scans thousands of failed transactions in milliseconds, identifying recoverable candidates before expensive LLM agents are invoked.
- **Explainable Baseline**: Establishes verifiable, audit-proof baseline rules that do not suffer from non-deterministic LLM hallucinations.
- **Pipeline Modularity**: Allows diagnosis engines (Phase 4) and human review loops to evaluate why a transaction was flagged without entangling score calculations with execution logic.

---

## 3. Detection Pipeline Architecture

```text
Failed Payment Ingestion (status = FAILED)
          │
          ▼
Load Customer Transaction History (Batch query / no N+1)
          │
          ▼
Feature Extraction (Transaction, Customer History, Failure Taxonomy)
          │
          ▼
Deterministic Scoring Engine (Weighted components + Safety guardrails)
          │
          ▼
Risk Level & Recoverability Classification (LOW / MEDIUM / HIGH)
          │
          ▼
Explainability Builder (Positive & negative factor generation)
          │
          ▼
Persistence to PostgreSQL (`AIDecision` table with modelName = 'deterministic-scoring-v1')
          │
          ▼
Structured JSON API Output
```

---

## 4. Feature Extraction Layer

The `FeatureExtractor` transforms raw database records into normalized, strongly typed features:

### Transaction Features
- `amount`: Monetary value in INR.
- `currency`: Default currency (`INR`).
- `paymentMethod`: `UPI`, `CREDIT_CARD`, `DEBIT_CARD`, `NET_BANKING`, `WALLET`.
- `failureCode` & `failureReason`: Normalized gateway failure codes.
- `retryCount`: Count of previous execution attempts.
- `transactionAgeHours`: Time elapsed since transaction attempt.

### Customer History Features
- `totalTransactions`: Count of prior customer transactions.
- `successfulTransactions`: Count of successful prior transactions.
- `failedTransactions`: Count of failed prior transactions.
- `successRate`: Historical success ratio ($0.0 \rightarrow 1.0$).
- `failureRate`: Historical failure ratio ($0.0 \rightarrow 1.0$).
- `consecutiveFailures`: Current streak of consecutive failed attempts.
- `averageTransactionAmount`: Historical average payment size.
- `historicalSpend`: Cumulative customer lifetime value (CLV).
- `hasHistory`: Boolean flag.

---

## 5. Failure Taxonomy & Classification

Failure codes are grouped into centralized functional categories:

| Category | Typical Codes | Recovery Orientation |
| :--- | :--- | :--- |
| **`TEMPORARY_INFRASTRUCTURE`** | `BANK_TIMEOUT`, `GATEWAY_TIMEOUT`, `NETWORK_ERROR`, `UPI_FAILURE` | **Positive** (+0.25) — Transient network/banking glitches. |
| **`CUSTOMER_AUTHENTICATION`** | `AUTHENTICATION_FAILURE` | **Positive** (+0.12) — OTP/3DS drop-offs recoverable via customer reminders. |
| **`FINANCIAL_HARD`** | `INSUFFICIENT_FUNDS`, `CARD_DECLINED` | **Negative** (-0.30) — Account limits or bank declines. |
| **`INSTRUMENT_EXPIRATION`** | `EXPIRED_CARD` | **Negative** (-0.35) — Hard card instrument expiry. |
| **`UNKNOWN`** | Fallback / unlisted codes | **Negative** (-0.10) — Unverified error conditions. |

---

## 6. Scoring Model Formula

$$P(\text{Recovery}) = \text{Base} + M_{\text{Customer}} + M_{\text{Failure}} + M_{\text{Retry}} + M_{\text{Streak}}$$

Where:
- $\text{Base} = 0.50$
- $M_{\text{Customer}} = (\text{successRate} - 0.50) \times 0.30 \times \min(1.0, \frac{\text{totalTxs}}{4})$
- $M_{\text{Failure}} = \text{CATEGORY\_MODIFIERS}[\text{category}]$
- $M_{\text{Retry}} = +0.05 \text{ (0 retries)}, 0.00 \text{ (1 retry)}, -0.15 \text{ (2 retries)}, -0.40 \text{ (}\ge 3\text{ retries)}$
- $M_{\text{Streak}} = -0.08 \times (\text{consecutiveFailures} - 1) \quad (\text{if streak} \ge 2)$
- *Safety Rule*: If `retryCount` $\ge 3$, probability is strictly capped at $0.30$.

---

## 7. Weight & Penalty Configuration (`scoring-config.ts`)

```typescript
export const SCORING_CONFIG = {
  MODEL_NAME: 'deterministic-scoring-v1',
  BASE_SCORE: 0.50,
  CATEGORY_MODIFIERS: {
    TEMPORARY_INFRASTRUCTURE: 0.25,
    CUSTOMER_AUTHENTICATION: 0.12,
    FINANCIAL_HARD: -0.30,
    INSTRUMENT_EXPIRATION: -0.35,
    UNKNOWN: -0.10,
  },
  RETRY_PENALTIES: {
    0: 0.05,
    1: 0.00,
    2: -0.15,
    3: -0.40,
  },
  MAX_RETRY_LIMIT: 3,
  MAX_RETRY_PROBABILITY_CAP: 0.30,
  REPEATED_INSUFFICIENT_FUNDS_PENALTY: -0.20,
  CUSTOMER_RELIABILITY_WEIGHT: 0.30,
  MIN_TRANSACTIONS_FOR_FULL_RELIABILITY: 4,
  THRESHOLDS: {
    HIGH_PROBABILITY: 0.75,
    MEDIUM_PROBABILITY: 0.45,
    RECOVERABLE_CUTOFF: 0.45,
  },
};
```

---

## 8. Risk Level Semantics

| Risk Level | Probability Range | Semantics | Preliminary Decision |
| :--- | :---: | :--- | :---: |
| **`LOW`** | $\ge 75\%$ | Highly safe and favorable candidate for automated retry. | `RETRY` |
| **`MEDIUM`** | $45\% - 74\%$ | Recoverable with customer outreach, reminder, or diagnosis. | `WAIT` |
| **`HIGH`** | $< 45\%$ | Hard decline or exhausted retries; recovery counterproductive. | `STOP` |

---

## 9. Explainability & Factor Generation

Every score produces structured factors explaining positive signals and risk concerns:

```json
{
  "recoveryProbability": 0.95,
  "riskLevel": "LOW",
  "recoverable": true,
  "factors": [
    {
      "factor": "CUSTOMER_HISTORY",
      "impact": "POSITIVE",
      "description": "Customer has strong history with 100% success rate across 4 past transactions.",
      "scoreContribution": 0.15
    },
    {
      "factor": "FAILURE_TYPE",
      "impact": "POSITIVE",
      "description": "Failure code 'BANK_TIMEOUT' represents a temporary infrastructure or network timeout.",
      "scoreContribution": 0.25
    },
    {
      "factor": "RETRY_HISTORY",
      "impact": "POSITIVE",
      "description": "Fresh failure with 0 previous retry attempts.",
      "scoreContribution": 0.05
    }
  ],
  "reasoningSummary": "Recovery probability evaluated at 95.0% (LOW risk). Positive signals: Customer has strong history with 100% success rate across 4 past transactions. Failure code 'BANK_TIMEOUT' represents a temporary infrastructure or network timeout. Fresh failure with 0 previous retry attempts."
}
```

---

## 10. Confidence Metric

Confidence ($0.30 \rightarrow 0.95$) measures the completeness and credibility of data:
- $+0.25$: Sufficient customer transaction history ($\ge 3$ records).
- $+0.15$: Standardized, recognized failure code.
- $+0.10$: Verified payment method.
- $+0.10$: Explicit retry count known.

---

## 11. Database Persistence (`AIDecision`)

All scoring outputs are recorded into the database:
- `agentType`: `AIAgentType.DETECTION`
- `decision`: `RETRY` / `WAIT` / `STOP`
- `recoveryProbability`: Decimal float ($0.0 \rightarrow 1.0$)
- `confidenceScore`: Decimal float ($0.0 \rightarrow 1.0$)
- `reasoning`: Natural-language structured reasoning summary
- `modelName`: `"deterministic-scoring-v1"`
- `promptVersion`: `null` (LLM-independent)

---

## 12. REST API Endpoints

### 1. Batch Detection Runner
- **Endpoint**: `POST /api/detection/run`
- **Body**: `{ "limit": 100, "unprocessedOnly": true }`
- **Response**:
```json
{
  "success": true,
  "processed": 100,
  "recoverable": 68,
  "notRecoverable": 32,
  "lowRisk": 52,
  "mediumRisk": 16,
  "highRisk": 32,
  "persistedDecisions": 100,
  "durationMs": 1420
}
```

### 2. Single Transaction Inspection
- **Endpoint**: `GET /api/detection/:transactionId`
- **Response**: Returns complete `DetectionResult` without modifying database state.

### 3. Analyze & Persist Single Transaction
- **Endpoint**: `POST /api/detection/:transactionId/analyze`
- **Response**: Analyzes transaction and persists `AIDecision` row.

---

## 13. Testing & Scenario Evaluation Results

Run the automated evaluation suite:
```bash
npm run detection:eval
```

### Scenario Evaluation Report (100% Alignment):
```text
[✅ PASS] Scenario A (Strong Customer + Bank Timeout + 0 Retries)
       Probability : 95.0% | Risk: LOW | Decision: RETRY
[✅ PASS] Scenario B (Repeated Failures + Insufficient Funds + 2 Retries)
       Probability : 2.0%  | Risk: HIGH | Decision: STOP
[✅ PASS] Scenario C (Strong Customer + Authentication Failure)
       Probability : 78.3% | Risk: LOW | Decision: RETRY
[✅ PASS] Scenario D (Strong Customer + Gateway Timeout + 0 Retries)
       Probability : 87.5% | Risk: LOW | Decision: RETRY
[✅ PASS] Scenario E (Exceeded Retry Limit: retryCount >= 3)
       Probability : 2.0%  | Risk: HIGH | Decision: STOP
[✅ PASS] Edge Case (Expired Card Instrument Failure)
       Probability : 23.7% | Risk: HIGH | Decision: STOP
[✅ PASS] Edge Case (New Customer with Zero Prior History + Timeout)
       Probability : 80.0% | Risk: LOW | Decision: RETRY
```

---

## 14. Performance & Batch Query Optimization

- **Zero N+1 Queries**: Batch scoring retrieves customer histories for all candidate transactions using a single `in: customerIds` SQL query, grouped efficiently in memory.
- **Throughput**: Processes **275 transactions in 2.74 seconds** on remote Neon PostgreSQL.

---

## 15. Known Limitations & Phase 4 Bridge

- **Heuristic-Driven**: Weights are calibrated expert heuristics rather than gradient-boosted ML weights.
- **Static Penalty Curves**: Retry penalties decrease linearly.
- **Phase 4 Transition**: In Phase 4, high-scoring recoverable transactions will be handed off to the **Diagnosis Agent** and **Recovery Decision Agent** for dynamic webhook execution via Razorpay Test Mode.
