# RecoverAI — Phase 7: Razorpay Test Mode Integration Architecture

## 1. Executive Summary

Phase 7 integrates RecoverAI with **Razorpay Test Mode**, allowing the Phase 6 Recovery Executor to execute, observe, and confirm real gateway-level payment recovery workflows without moving real money or touching production systems.

```
Phase 3 — Detection & Scoring
          ↓
Phase 4 — Diagnosis Agent
          ↓
Phase 5 — Recovery Decision Engine
          ↓
Phase 6 — Recovery Executor
          ↓
   RecoveryProvider
    ├── SimulationRecoveryProvider (PRNG Simulation)
    └── RazorpayTestProvider (Razorpay Test Mode API)
          ↓
   Razorpay Test Orders / Payment Links
          ↓
   Razorpay Webhook (POST /api/webhooks/razorpay)
          ↓
   HMAC SHA-256 Raw-Body Signature Verification
          ↓
   Event Idempotency (x-razorpay-event-id)
          ↓
   RecoveryAttempt State Synchronization + AuditLog
```

---

## 2. Strict Security Boundaries & Fail-Closed Guardrails

1. **Test Mode Exclusivity**:
   - Only `rzp_test_` API key identifiers are permitted.
   - Any key with prefix `rzp_live_` or execution mode set to `razorpay_live` / `live` causes immediate process termination (`process.exit(1)`) or throws unrecoverable `RazorpayAuthError`.
2. **Server-Side Secret Isolation**:
   - `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are never exposed to clients or returned via API responses.
   - All loggers and audit trails employ secret masking (e.g. `rzp_test_****cdef`).
3. **Financial Integrity Protection**:
   - Amount captured via webhook is validated against the exact expected transaction amount.
   - If captured amount != transaction amount, recovery is **not** marked `SUCCESS`, and a `GATEWAY_AMOUNT_MISMATCH_WARNING` audit entry is created.
4. **Preserved Simulation Mode**:
   - `RECOVERY_EXECUTION_MODE=simulation` remains completely functional without requiring any Razorpay credentials.

---

## 3. Integration Client Layer (`server/src/integrations/razorpay/`)

The integration client encapsulates all direct HTTP interactions with Razorpay:
- **`RazorpayConfig`**: Loads environment configuration, validates `rzp_test_` credentials, and provides masking utilities.
- **`RazorpayClient`**:
  - `createOrder(params)`: Generates Razorpay Test Mode order (`payment_capture: true`).
  - `createPaymentLink(params)`: Generates customer payment reminder links for the `REMIND` action.
  - `fetchPayment(paymentId)`: Fetches payment status directly from the gateway.
  - `verifyWebhookSignature(rawBody, signature, secret)`: Computes HMAC SHA-256 over the unmodified raw Buffer and verifies using `crypto.timingSafeEqual`.
- **`RazorpayErrors`**: Standardized hierarchy (`RazorpayAuthError`, `RazorpayValidationError`, `RazorpayTimeoutError`, `RazorpayRateLimitError`, `RazorpayWebhookSignatureError`).

---

## 4. Recovery Provider Implementation

The `RazorpayTestProvider` implements the existing `RecoveryProvider` interface:

| Recovery Action | Razorpay Test Implementation | Outcome Code | Status | Amount Recovered |
| :--- | :--- | :--- | :--- | :--- |
| **`RETRY`** | Creates Razorpay Test Order (`/v1/orders`) with receipt and transaction notes. | `PAYMENT_RECOVERED` | `PENDING` | ₹0 (Confirmed on webhook) |
| **`REMIND`** | Creates Razorpay Test Payment Link (`/v1/payment_links`) with customer email/SMS notify. | `REMINDER_SIMULATED` | `SUCCESS` | ₹0 |
| **`ESCALATE`** | Simulates high-priority customer support ticket with Razorpay error context. | `ESCALATION_CREATED` | `SUCCESS` | ₹0 |
| **`WAIT`** | Schedules a +30 minute observation re-evaluation window. | `WAIT_SCHEDULED` | `PENDING` | ₹0 |
| **`STOP`** | Permanently halts automated recovery per policy. | `RECOVERY_STOPPED_BY_POLICY` | `CANCELLED` | ₹0 |

---

## 5. Webhook Architecture & Processing Flow

### Webhook Endpoint: `POST /api/webhooks/razorpay`

```
1. Incoming HTTP Request (Headers: X-Razorpay-Signature, X-Razorpay-Event-Id)
   ↓
2. Raw Body HMAC SHA-256 Signature Verification (timingSafeEqual)
   ↓ (Invalid -> HTTP 400 Bad Request, Audit Log)
3. Idempotency Check (razorpay_webhook_events table by eventId)
   ↓ (Duplicate -> HTTP 200 OK DUPLICATE_IGNORED)
4. Persist Webhook Event (status: unprocessed)
   ↓
5. Dispatch Event:
   - payment.captured  → Verify Amount → Update RecoveryAttempt to SUCCESS → AuditLog
   - payment.failed    → Update RecoveryAttempt to FAILED → AuditLog
   - payment.authorized→ Log Audit entry
   ↓
6. Mark Webhook Event as Processed → Fast HTTP 200 Response
```

---

## 6. Manual Setup Guide for Razorpay Dashboard

### Step 1: Generate Test API Keys
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Toggle the switch at the top to **Test Mode**.
3. Navigate to **Account & Settings** → **API Keys**.
4. Click **Generate Test Key**.
5. Copy `Key ID` and `Key Secret` into your `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyy
   ```

### Step 2: Configure Test Webhook
1. Navigate to **Account & Settings** → **Webhooks**.
2. Click **Add New Webhook**.
3. Set Webhook URL to your public HTTPS endpoint:
   `https://<your-public-tunnel-domain>/api/webhooks/razorpay`
4. Set Webhook Secret and copy it to your `.env`:
   ```env
   RAZORPAY_WEBHOOK_SECRET=zzzzzzzzzzzzzzzz
   ```
5. Select active events:
   - `payment.failed`
   - `payment.authorized`
   - `payment.captured`
6. Save the webhook.

---

## 7. Manual Testing Checklist

- [x] Test Mode keys generated and validated with `rzp_test_` prefix.
- [x] Live keys (`rzp_live_`) fail closed and prevent startup.
- [x] Raw body buffer captured in Express for HMAC SHA-256 verification.
- [x] `X-Razorpay-Signature` verified with `crypto.timingSafeEqual`.
- [x] Tampered webhook payloads rejected.
- [x] `x-razorpay-event-id` persisted in `razorpay_webhook_events` for idempotency.
- [x] Duplicate webhooks ignored without re-mutating state.
- [x] `payment.captured` validates amount before marking `SUCCESS`.
- [x] `payment.failed` updates `RecoveryAttempt` to `FAILED`.
- [x] Audit logs record every gateway event without logging secrets.
- [x] Simulation mode remains 100% functional and testable without keys.
