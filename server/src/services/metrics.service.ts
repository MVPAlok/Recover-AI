/**
 * RecoverAI Operational Metrics Tracker
 * In-memory high-performance metrics aggregator for observability.
 */

export interface SystemMetrics {
  uptimeSeconds: number;
  environment: string;
  requests: {
    total: number;
    success: number;
    errors: number;
    errorRate: number;
    averageLatencyMs: number;
  };
  webhooks: {
    received: number;
    processed: number;
    failed: number;
    amountMismatches: number;
    duplicatesIgnored: number;
    successRate: number;
  };
  recoveryExecutions: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
  };
  geminiAi: {
    requests: number;
    successes: number;
    fallbacks: number;
    errors: number;
    averageLatencyMs: number;
  };
  timestamp: string;
}

class MetricsService {
  private startTime = Date.now();
  private totalRequests = 0;
  private totalErrors = 0;
  private totalLatencies = 0;

  private webhooksReceived = 0;
  private webhooksProcessed = 0;
  private webhooksFailed = 0;
  private webhooksAmountMismatches = 0;
  private webhooksDuplicates = 0;

  private executionsTotal = 0;
  private executionsSuccess = 0;
  private executionsFailed = 0;
  private executionsPending = 0;

  private aiRequests = 0;
  private aiSuccesses = 0;
  private aiFallbacks = 0;
  private aiErrors = 0;
  private aiLatencies = 0;

  recordRequest(latencyMs: number, isError = false) {
    this.totalRequests++;
    this.totalLatencies += latencyMs;
    if (isError) this.totalErrors++;
  }

  recordWebhook(event: {
    status: 'PROCESSED' | 'FAILED' | 'AMOUNT_MISMATCH' | 'DUPLICATE_IGNORED';
  }) {
    this.webhooksReceived++;
    if (event.status === 'PROCESSED') this.webhooksProcessed++;
    if (event.status === 'FAILED') this.webhooksFailed++;
    if (event.status === 'AMOUNT_MISMATCH') this.webhooksAmountMismatches++;
    if (event.status === 'DUPLICATE_IGNORED') this.webhooksDuplicates++;
  }

  recordExecution(status: 'PENDING' | 'SUCCESS' | 'FAILED') {
    this.executionsTotal++;
    if (status === 'SUCCESS') this.executionsSuccess++;
    if (status === 'FAILED') this.executionsFailed++;
    if (status === 'PENDING') this.executionsPending++;
  }

  recordAIInference(latencyMs: number, status: 'SUCCESS' | 'FALLBACK' | 'ERROR') {
    this.aiRequests++;
    this.aiLatencies += latencyMs;
    if (status === 'SUCCESS') this.aiSuccesses++;
    if (status === 'FALLBACK') this.aiFallbacks++;
    if (status === 'ERROR') this.aiErrors++;
  }

  getSnapshot(): SystemMetrics {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const avgRequestLatency =
      this.totalRequests > 0 ? Math.round(this.totalLatencies / this.totalRequests) : 0;
    const reqErrorRate =
      this.totalRequests > 0
        ? Number(((this.totalErrors / this.totalRequests) * 100).toFixed(2))
        : 0;

    const webhookSuccessRate =
      this.webhooksReceived > 0
        ? Number(((this.webhooksProcessed / this.webhooksReceived) * 100).toFixed(2))
        : 100;

    const avgAiLatency =
      this.aiRequests > 0 ? Math.round(this.aiLatencies / this.aiRequests) : 0;

    return {
      uptimeSeconds,
      environment: process.env.NODE_ENV || 'development',
      requests: {
        total: this.totalRequests,
        success: this.totalRequests - this.totalErrors,
        errors: this.totalErrors,
        errorRate: reqErrorRate,
        averageLatencyMs: avgRequestLatency,
      },
      webhooks: {
        received: this.webhooksReceived,
        processed: this.webhooksProcessed,
        failed: this.webhooksFailed,
        amountMismatches: this.webhooksAmountMismatches,
        duplicatesIgnored: this.webhooksDuplicates,
        successRate: webhookSuccessRate,
      },
      recoveryExecutions: {
        total: this.executionsTotal,
        successful: this.executionsSuccess,
        failed: this.executionsFailed,
        pending: this.executionsPending,
      },
      geminiAi: {
        requests: this.aiRequests,
        successes: this.aiSuccesses,
        fallbacks: this.aiFallbacks,
        errors: this.aiErrors,
        averageLatencyMs: avgAiLatency,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const metricsService = new MetricsService();
