# Phase 8: Redis Queues & Asynchronous Recovery Processing

## Overview
Phase 8 decouples the Phase 5 Recovery Decision Engine from the Phase 6 Recovery Executor using asynchronous Redis job queues (BullMQ + ioredis). This ensures high system availability, automatic job retry policies with exponential backoff, and non-blocking API response times.

---

## Key Architecture Components

1. **Redis Connection Management** (`server/src/config/redis.ts`):
   - Initializes `ioredis` client configured via `REDIS_URL` or fallback settings.
   - Configured with `maxRetriesPerRequest: null` (required for BullMQ).
   - Handles offline Redis instances gracefully without crashing the main HTTP server process.

2. **BullMQ Queue & Worker Layer** (`server/src/modules/queue/`):
   - **Queue**: `recovery-execution-queue` manages asynchronous recovery execution payloads (`transactionId`, `decisionId`, `executionMode`).
   - **Worker**: Processes jobs with concurrency = 5, invoking `RecoveryExecutorService.executeDecision()` asynchronously.
   - **Retry Policy**: Configured with 3 retry attempts and exponential backoff.

3. **Asynchronous API Endpoint** (`POST /api/recovery-executor/:transactionId/enqueue`):
   - Immediately returns HTTP 202 Accepted with a unique `jobId`.
   - Leaves synchronous `POST /api/recovery-executor/:transactionId/execute` intact for backward compatibility.

---

## Running Phase 8 Unit Tests & Evaluation

- Unit Tests:
  ```bash
  npm run test:queue
  ```
- Evaluation Runner:
  ```bash
  npm run queue:eval
  ```
