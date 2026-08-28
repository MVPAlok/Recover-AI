# RecoverAI — Production Architecture & Operational Blueprint

RecoverAI is an autonomous, event-driven payment recovery platform engineered to reclaim failed revenue through AI-assisted diagnosis, deterministic financial policy guardrails, and cryptographic reconciliation.

---

## 1. Autonomous 6-Stage Recovery Lifecycle

```
[ PAYMENT FAILURE / WEBHOOK INGESTION ]
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: Detect & Score                                    │
│  - Feature extraction from transaction payload             │
│  - Mathematical recovery probability scoring                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 2: Diagnose (Gemini 3.5 AI Engine)                   │
│  - Failure taxonomy classification                          │
│  - Transparent fallback on LLM timeout or schema rejection  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 3: Decide (Authoritative Safety Policies)            │
│  - Deterministic hard constraints (retryCount >= 3 -> STOP) │
│  - Card expiration and irreversible failure halting         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 4: Execute (BullMQ Queue / Razorpay Test Mode)       │
│  - Financial safety guardrails (Budget & Circuit Breaker)   │
│  - Dispatches Auto-Retry, Payment Link, or Delayed Wait     │
│  - Invariant: amountRecovered remains ₹0 upon dispatch      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 5: Verify (Cryptographic Ingestion)                  │
│  - HMAC SHA-256 webhook validation (constant-time check)    │
│  - Idempotency deduplication by unique x-razorpay-event-id  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 6: Reconcile (PostgreSQL Double-Entry Ledger)        │
│  - Exact amount match verification (capturedPaise == amount)│
│  - Promotes state to RECOVERED in PostgreSQL ledger         │
│  - Logs tamper-evident SHA-256 Audit Trail Hash Chain       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Subsystems

### A. Event Ingestion & Webhook Verification
- **Ingestion Route**: `POST /api/webhooks/razorpay`
- **Security**: Validates incoming payload signatures against `RAZORPAY_WEBHOOK_SECRET` using `crypto.timingSafeEqual`.
- **Deduplication**: Enforces unique event keys in `RazorpayWebhookEvent` table (`@@unique([eventId])`). Duplicate deliveries return `DUPLICATE_IGNORED` with zero financial side effects.

### B. Recovery Intelligence & Comparative Expected Value (EV)
- **Service**: `RecoveryIntelligenceService`
- **Formulas**:
  $$\text{Expected Recovery Value (EV)} = \text{Amount} \times \text{Recovery Probability}$$
- **Comparative Strategy Vectors**:
  1. **Strategy A (Auto-Retry)**: Optimized for infrastructure timeouts and transient network errors.
  2. **Strategy B (1-Click Interactive Payment Link)**: Dynamic UPI/Card links dispatched via WhatsApp & SMS for OTP drop-offs.
  3. **Strategy C (Email/SMS Reminder)**: Non-intrusive recovery notification with checkout session resumption.
  4. **Strategy D (Scheduled Delayed Window)**: 30-minute observation window for issuer bank degradations.

### C. Financial Safety Controls & Circuit Breakers
- **Service**: `FinancialSafetyService`
- **Merchant Retry Budget**: Limits automated recovery executions to 250 attempts per rolling 24-hour window.
- **Customer Contact Cooldown**: Enforces a strict 24-hour cooldown per customer across all notification channels.
- **Gateway Circuit Breaker**: Evaluates real-time 15-minute failure sliding windows. If decline rate exceeds 60%, trips to `OPEN`, preventing further attempts and engaging observation holds.
- **Audit Hash Chain**: Computes SHA-256 cryptographic chain hashes linking audit log entries for regulatory compliance.

### D. Developer & Enterprise Toolkit
- **Webhook Testing Emulator**: Generates HMAC SHA-256 signed test payloads with instant `curl` commands.
- **Event Replay Engine**: Replays previous webhook events with fresh correlation tracking.
- **Developer API Keys**: Generates scoped `rec_live_...` API tokens with SHA-256 storage and one-time display.
- **Outbound Webhook Subscriptions**: Delivers signed events (`x-recoverai-signature`) to merchant-configured URLs.
- **Compliance Audit Exports**: Streams audit records as standard `CSV` or structured `JSON`.

---

## 3. Real vs Simulated Behaviors in Sandbox Mode

| Capability | Behavior in Sandbox / Test Mode | Production Behavior |
| :--- | :--- | :--- |
| **Razorpay Gateway** | Test Mode Orders & Payment Links (`rzp_test_...`) | Live Mode Gateway Orders (`rzp_live_...`) |
| **Payment Verification** | Cryptographic HMAC Webhook signature matching test secret | Cryptographic HMAC Webhook signature matching live secret |
| **Revenue Recognition** | Strictly requires verified `payment.captured` event | Strictly requires verified `payment.captured` event |
| **AI Diagnosis** | Gemini 3.5 Flash Lite with deterministic fallback | Gemini 3.5 Flash Lite with deterministic fallback |
| **Queue Worker** | BullMQ with Upstash Redis (concurrency = 5) | BullMQ with Dedicated Redis Cluster |
| **Safety Limits** | Enforced across all tests & simulations | Enforced across all live merchant workspaces |

---

## 4. Master Verification Procedure

To run the complete production verification suite (79 Unit & Integration Tests + 7 Master Production Failure Assertions):

```bash
# 1. Run all 14 test suites
npm run test:all

# 2. Run master production failure simulation
npm run simulation:failure

# 3. Build server and client for production
npm run build:server
npm run build:client
```
