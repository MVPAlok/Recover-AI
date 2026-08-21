# Phase 2 — Transaction Data Engine

## 1. Phase Objective

The objective of **Phase 2: Transaction Data Engine** is to build a deterministic, realistic synthetic transaction-data engine for **RecoverAI**. 

This engine populates a controlled, high-fidelity development and evaluation environment representing realistic merchant payment behavior, customer behavioral histories, failure distributions, and deliberate recovery scenarios. This data serves as the ground truth foundation for the upcoming Detection, Diagnosis, and Recovery Decision engines in subsequent phases.

---

## 2. Why Synthetic Data is Required

In payment recovery and financial technology systems:
1. **Privacy & Security**: Real payment data contains Personally Identifiable Information (PII), card data, and sensitive banking records that cannot be stored or transmitted in development/demo environments.
2. **Controlled Edge-Case Evaluation**: Real merchant datasets are skewed and lack balanced representations of specific recovery edge cases (e.g., transient network failures vs. recurring hard declines).
3. **Deterministic Reproducibility**: AI agent evaluation requires repeatable test runs. Using fixed PRNG seeds guarantees that detection and diagnosis benchmarks are 100% reproducible.

---

## 3. Dataset Architecture & Domain Entities

Phase 2 strictly generates and populates three core models:

```text
+---------------------+
|      Merchant       | (1 - 3 Merchants)
+----------+----------+
           | 1:N
           v
+---------------------+
|      Customer       | (~100 Customers with Behavioral Profiles)
+----------+----------+
           | 1:N
           v
+---------------------+
|     Transaction     | (1,000 - 10,000+ Transactions)
+---------------------+
```

> [!NOTE]
> `AIDecision`, `RecoveryAttempt`, and `AuditLog` models are intentionally **NOT** populated in Phase 2. Those records will be generated autonomously by AI agent services in Phase 3 and Phase 4.

---

## 4. Customer Behavioral Profiles

Customers are categorized into behavioral profiles to generate realistic historical success rates and payment volumes:

| Profile | Weight | Base Success Rate | Typical Amount Multiplier | Behavior Description |
| :--- | :---: | :---: | :---: | :--- |
| **Reliable Customer** | 50% | 92% | 0.8x – 1.2x | High transaction frequency, established history, low failure frequency. |
| **Mixed Customer** | 30% | 70% | 0.7x – 1.3x | Moderate success/failure ratio with occasional transient failures. |
| **High-Failure Customer**| 10% | 35% | 0.5x – 1.1x | Frequent declines, multiple consecutive failures, low recovery probability. |
| **High-Value Customer** | 10% | 88% | 3.0x – 8.0x | High average order values (₹18,000 – ₹75,000+). High revenue-at-risk. |

---

## 5. Transaction Distributions & Failure Taxonomy

### Transaction Status Distribution
- **SUCCESS**: ~70%
- **FAILED**: ~25%
- **PENDING**: ~5% (In-flight authorizations within the last 7 days)

### Payment Methods
- `UPI`: 55%
- `CREDIT_CARD`: 20%
- `DEBIT_CARD`: 15%
- `NET_BANKING`: 5%
- `WALLET`: 5%

### Standard Failure Taxonomy
| `failureCode` | `failureReason` | Weight | Typical Methods |
| :--- | :--- | :---: | :--- |
| `BANK_TIMEOUT` | Bank gateway timed out during payment authorization | 20% | NET_BANKING, UPI, CARDS |
| `GATEWAY_TIMEOUT` | Payment gateway processing timed out | 15% | CREDIT_CARD, DEBIT_CARD, UPI |
| `NETWORK_ERROR` | Network connection interrupted during transaction processing | 10% | UPI, WALLET, CREDIT_CARD |
| `UPI_FAILURE` | UPI payment request failed or timed out on user device | 20% | UPI |
| `AUTHENTICATION_FAILURE` | Card 3D-Secure / OTP verification failed | 15% | CREDIT_CARD, DEBIT_CARD |
| `INSUFFICIENT_FUNDS` | Account or credit card limit has insufficient funds | 10% | DEBIT_CARD, NET_BANKING, CARDS |
| `CARD_DECLINED` | Card issuer declined the payment request | 5% | CREDIT_CARD, DEBIT_CARD |
| `EXPIRED_CARD` | Card expiration date has passed | 5% | CREDIT_CARD, DEBIT_CARD |

---

## 6. Injected Recovery-Oriented Scenarios

The generator deliberately injects realistic scenarios for testing AI agent decision-making:

- **Scenario A (Strong Customer + Temporary Failure)**:
  - *Pattern*: 4 previous successful payments → 1 current `FAILED` transaction (`BANK_TIMEOUT`, `retryCount = 0`).
  - *Future AI Expectation*: High recovery probability → Recommend action: `RETRY`.
- **Scenario B (Repeated Failure + Insufficient Funds)**:
  - *Pattern*: 2 previous `FAILED` transactions → 1 current `FAILED` transaction (`INSUFFICIENT_FUNDS`, `retryCount = 2`).
  - *Future AI Expectation*: Low recovery probability → Recommend action: `STOP` or `WAIT`.
- **Scenario C (Authentication Failure)**:
  - *Pattern*: 3 previous successful payments → 1 current `FAILED` transaction (`AUTHENTICATION_FAILURE`).
  - *Future AI Expectation*: Medium/High recovery probability → Recommend action: `REMIND` (send payment link).
- **Scenario D (Gateway Timeout)**:
  - *Pattern*: 2 previous successful payments → 1 current `FAILED` transaction (`GATEWAY_TIMEOUT`, `retryCount = 0`).
  - *Future AI Expectation*: High recovery probability → Recommend action: `RETRY`.
- **Scenario E (Repeated Retry Limit)**:
  - *Pattern*: Multiple retries already executed on transaction (`retryCount >= 3`, `status = FAILED`).
  - *Future AI Expectation*: Threshold reached → Recommend action: `STOP`.

---

## 7. Seed Engine Architecture & File Structure

```text
database/seed/
├── seed.ts                               # CLI argument parser, batch database insertion, summary & validator
├── index.ts                              # Re-export entrypoint
├── generators/
│   ├── merchant.generator.ts             # Synthetic merchant factory
│   ├── customer.generator.ts             # Customer factory with behavioral profile assignment
│   └── transaction.generator.ts          # Chronological transaction & scenario synthesizer
├── scenarios/
│   └── recovery-scenarios.ts             # Deliberate scenario generators (Scenarios A through E)
└── utils/
    ├── random.ts                         # Mulberry32 Seeded PRNG for 100% deterministic reproducibility
    └── distributions.ts                  # Distribution weights, price tiers, and failure mappings
```

---

## 8. Post-Seed Integrity Validation Rules

Every seed execution automatically triggers strict validation checks before completing:
1. **Count Verification**: Total database transactions match the requested `--transactions` count.
2. **Zero Orphan Records**: All customers link to valid merchants; all transactions link to valid customers and matching merchants.
3. **Failure Code Integrity**:
   - `FAILED` transactions must have non-null `failureCode` and `failureReason`.
   - `SUCCESS` and `PENDING` transactions must have `null` for `failureCode` and `failureReason`.
4. **Value & Range Constraints**: All amounts are positive (> 0); `retryCount` is non-negative (>= 0).
5. **Customer Email Uniqueness**: Enforces `@@unique([merchantId, email])` per merchant tenant.

If any check fails, the seed script halts immediately with an explicit error.

---

## 9. CLI Usage & Commands

```bash
# Standard 1,000 transaction seed with fixed seed 42
npm run db:seed

# Custom transaction volume and seed
npm run db:seed -- --transactions=2500 --seed=100

# Custom merchant count
npm run db:seed -- --transactions=5000 --merchants=3 --seed=999

# Retain existing data (append mode without cleaning)
npm run db:seed -- --clean=false
```

---

## 10. Connection to Phase 3 (Detection Engine)

In Phase 3, the **Detection Engine** will consume the transactions created by Phase 2:
1. Scan for `status = FAILED` or `status = PENDING` transactions.
2. Parse `failureCode`, customer profile history, transaction amounts, and past `retryCount`.
3. Feed structured context to the Diagnosis & Recovery Decision AI agents to output `AIDecision` and `RecoveryAttempt` records.

---

## 11. Intentionally Excluded from Phase 2

- ❌ AI detection and autonomous diagnosis agents (Planned for Phase 3)
- ❌ Razorpay live/test API webhook triggers (Planned for Phase 4)
- ❌ Redis job queue workers
- ❌ Customer notification dispatch (Email/WhatsApp)
- ❌ Merchant Analytics UI Dashboard
