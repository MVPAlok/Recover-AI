# System Health & Observability Architecture

## 1. Overview

RecoverAI includes a dedicated, production-hardened **System Health & Observability** subsystem that aggregates real telemetry across the autonomous recovery lifecycle without faking metrics or exposing sensitive credentials.

The health layer surfaces the health and operational metrics of six core infrastructural services:
1. **PostgreSQL Database** (Source of Financial Truth)
2. **Redis Queue & Cache** (Upstash Redis)
3. **Google Gemini LLM Engine** (Structured Diagnosis & Deterministic Fallback)
4. **Razorpay Gateway** (Strict Test Mode Sandbox)
5. **Webhook Worker** (HMAC SHA-256 Ingestion & Idempotency)
6. **Recovery Worker** (BullMQ Background Execution Engine)

---

## 2. API Contract

### Endpoint
`GET /api/system/health`

### Request Headers
- `x-merchant-id` (optional): Restricts decision and webhook telemetry to the authenticated merchant tenant.

### Response Schema (`200 OK` / `503 Service Unavailable`)
```json
{
  "success": true,
  "status": "healthy", // "healthy" | "degraded" | "critical"
  "environment": "TEST_MODE",
  "timestamp": "2026-08-24T02:30:00.000Z",
  "services": {
    "postgresql": {
      "status": "healthy",
      "latencyMs": 12,
      "message": "PostgreSQL connection healthy & responsive"
    },
    "redis": {
      "status": "healthy",
      "latencyMs": 4,
      "message": "Redis queue and cache operational"
    },
    "gemini": {
      "status": "healthy",
      "model": "gemini-3.5-flash-lite",
      "fallbackActive": false,
      "fallbackRate": 0,
      "avgLatencyMs": 842,
      "message": "Google Gemini structured diagnosis operational"
    },
    "razorpay": {
      "status": "healthy",
      "mode": "test",
      "keyPrefix": "rzp_test",
      "message": "Razorpay Sandbox connected. Test mode payment isolation active."
    },
    "webhookWorker": {
      "status": "healthy",
      "lastProcessedAt": "2026-08-24T02:29:48.000Z",
      "lastEventId": "evt_00123",
      "errorRate": 0.0,
      "totalEvents24h": 48,
      "message": "HMAC SHA-256 webhook listener operational"
    },
    "recoveryWorker": {
      "status": "healthy",
      "queueDepth": 0,
      "activeJobs": 0,
      "waitingJobs": 0,
      "failedJobs": 0,
      "delayedJobs": 0,
      "concurrency": 5,
      "message": "Recovery worker idle & listening for failed payments"
    }
  },
  "metrics": {
    "lastWebhookSecondsAgo": 12,
    "queueDepth": 0,
    "failedJobs": 0,
    "aiFallbackRate": 0.0,
    "webhookErrorRate": 0.0
  }
}
```

---

## 3. Service Health Determination Rules

| Service | Healthy Condition | Degraded Condition | Unavailable / Critical Condition |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | `SELECT 1` passes in $\le 1000\text{ms}$ | Latency $> 1000\text{ms}$ | Connection refused or query fails |
| **Redis** | `PING` responds with `PONG` in $\le 500\text{ms}$ | Latency $> 500\text{ms}$ or memory fallback active | Redis cluster down (fallback active) |
| **Google Gemini** | Valid API key, fallback rate $< 10\%$ over past 24h | Fallback rate $\ge 10\%$ over past 24h | API key not configured |
| **Razorpay** | `rzp_test_` key prefix configured | Missing credentials or live key prefix blocked | Gateway unreachable |
| **Webhook Worker** | Error rate $< 5\%$ over past 24h | Error rate $\ge 5\%$ over past 24h | Database webhook table error |
| **Recovery Worker** | Failed jobs $= 0$ and queue depth $\le 100$ | Failed jobs $> 5$ or queue depth $> 100$ | Queue broker down |

---

## 4. Overall System Severity Classification

- **`healthy` (OPERATIONAL)**:
  - All critical dependencies (PostgreSQL, BullMQ, Razorpay Sandbox) are operational.
  - LLM fallback rate $< 10\%$.
  - Webhook error rate $< 5\%$.
- **`degraded` (DEGRADED)**:
  - Any non-critical dependency is degraded (e.g. Gemini engaging fallback, Redis latency elevated, or webhook error rate $\ge 5\%$).
  - Returns HTTP `200` with warning callouts in the dashboard.
- **`critical` (CRITICAL)**:
  - PostgreSQL database connection is unavailable.
  - Returns HTTP `503 Service Unavailable`.

---

## 5. Security & Isolation Safeguards

1. **Credential Sanitization**: Under no circumstances are database connection strings, passwords, Redis URLs, Gemini API keys, or Razorpay webhook secrets returned to the client.
2. **Razorpay Test Mode Guardrail**: If a non-test key is provided in environment variables, the system flags Razorpay as degraded and strictly prevents execution against live banking rails.
3. **Multi-Tenant Isolation**: Telemetry queries honor `x-merchant-id` to avoid leaking cross-merchant metrics.

---

## 6. Frontend Polling & UI Strategy

- **Component**: `client/src/components/ui/SystemHealthCard.tsx`
- **Auto-Refresh Interval**: Every 20 seconds.
- **Live Counter**: "Updated X seconds ago" increments dynamically every second.
- **Manual Refresh**: On-demand refresh button with spinning state indicator.
- **Accessibility & Status Colors**:
  - `Healthy` $\rightarrow$ Emerald green with pulsing dot
  - `Degraded` $\rightarrow$ Amber with warning icon
  - `Unavailable` / `Critical` $\rightarrow$ Rose red with error icon
  - `TEST MODE` $\rightarrow$ Cyan badge with shield
  - `Not Configured` $\rightarrow$ Slate neutral
