import crypto from 'crypto';
import { prisma as defaultPrisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { PrismaClient } from '@prisma/client';
import { RazorpayWebhookService } from '../webhooks/razorpay.webhook.service.js';

export interface WebhookEmulationResult {
  eventType: string;
  signature: string;
  headerEventId: string;
  payload: any;
  rawBody: string;
  curlCommand: string;
}

export interface ApiKeyRecord {
  id: string;
  merchantId: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  permissions: string[];
  lastUsedAt: string | null;
}

export interface WebhookSubscription {
  id: string;
  merchantId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

export class DeveloperService {
  private prisma: PrismaClient;
  private webhookService: RazorpayWebhookService;

  // In-memory key & subscription registry (backed by AuditLog)
  private static apiKeys: Map<string, { merchantId: string; hash: string; name: string; prefix: string; createdAt: Date }> = new Map();
  private static webhookSubscriptions: Map<string, WebhookSubscription[]> = new Map();

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.webhookService = new RazorpayWebhookService();
  }

  /**
   * 1. Webhook Testing Tool: Generates sandbox failure/captured payloads with HMAC signatures.
   */
  generateTestWebhook(params: {
    eventType?: 'payment.failed' | 'payment.captured' | 'order.paid';
    transactionId?: string;
    amount?: number;
    currency?: string;
    failureCode?: string;
    failureReason?: string;
    secret?: string;
  }): WebhookEmulationResult {
    const eventType = params.eventType || 'payment.failed';
    const amount = params.amount || 2500.0;
    const amountInPaise = Math.round(amount * 100);
    const currency = params.currency || 'INR';
    const txId = params.transactionId || `tx_sandbox_${Date.now()}`;
    const orderId = `order_sim_${Date.now()}`;
    const paymentId = `pay_sim_${Date.now()}`;
    const secret = params.secret || process.env.RAZORPAY_WEBHOOK_SECRET || 'alok_webhook_secret_123';
    const headerEventId = `evt_sandbox_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    let payload: any;

    if (eventType === 'payment.captured') {
      payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: orderId,
              amount: amountInPaise,
              currency,
              status: 'captured',
              method: 'upi',
              notes: { transactionId: txId },
            },
          },
        },
      };
    } else {
      payload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: orderId,
              amount: amountInPaise,
              currency,
              status: 'failed',
              error_code: params.failureCode || 'BAD_REQUEST_ERROR',
              error_description: params.failureReason || 'Customer entered incorrect 3DS OTP',
              error_source: 'customer',
              error_step: 'payment_authentication',
              error_reason: params.failureCode || 'payment_failed',
              notes: { transactionId: txId },
            },
          },
        },
      };
    }

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const curlCommand = `curl -X POST http://localhost:5000/api/webhooks/razorpay \\
  -H "Content-Type: application/json" \\
  -H "x-razorpay-signature: ${signature}" \\
  -H "x-razorpay-event-id: ${headerEventId}" \\
  -d '${rawBody}'`;

    return {
      eventType,
      signature,
      headerEventId,
      payload,
      rawBody,
      curlCommand,
    };
  }

  /**
   * 2. Failed Webhook Replay Mechanism.
   */
  async replayWebhook(eventId: string): Promise<{ success: boolean; eventId: string; status: string; message: string }> {
    logger.info(`[DeveloperService] Initiating webhook replay for eventId: ${eventId}`);

    const existingEvent = await this.prisma.razorpayWebhookEvent.findUnique({
      where: { eventId },
    });

    if (!existingEvent) {
      throw new Error(`Webhook event '${eventId}' not found in event repository.`);
    }

    // Process replayed event through webhook engine with replay indicator
    const replayEventId = `replay_${Date.now()}_${eventId}`;
    const payload = existingEvent.payload as any;
    const rawBody = JSON.stringify(payload);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'alok_webhook_secret_123';
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const result = await this.webhookService.handleWebhook({
      rawBody,
      signature,
      headerEventId: replayEventId,
      bodyPayload: payload,
    });

    await this.prisma.auditLog.create({
      data: {
        merchantId: existingEvent.merchantId || 'system',
        transactionId: existingEvent.transactionId,
        entityType: 'WEBHOOK_REPLAY',
        entityId: eventId,
        action: 'DEVELOPER_WEBHOOK_REPLAYED',
        actor: 'Developer Desk',
        actorType: 'DEVELOPER',
        details: { originalEventId: eventId, replayEventId, resultStatus: result.status },
      },
    });

    return {
      success: true,
      eventId,
      status: result.status,
      message: `Webhook ${eventId} replayed successfully as ${replayEventId}.`,
    };
  }

  /**
   * 3. Developer API Key Management.
   */
  async createApiKey(merchantId: string, name: string): Promise<{ keyId: string; token: string; prefix: string; name: string }> {
    const rawToken = `rec_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawToken.substring(0, 12) + '...';
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const keyId = `key_${Date.now()}`;

    DeveloperService.apiKeys.set(keyId, {
      merchantId,
      hash,
      name,
      prefix: keyPrefix,
      createdAt: new Date(),
    });

    await this.prisma.auditLog.create({
      data: {
        merchantId,
        entityType: 'API_KEY',
        entityId: keyId,
        action: 'DEVELOPER_API_KEY_CREATED',
        actor: 'Merchant Administrator',
        actorType: 'MERCHANT_ADMIN',
        details: { keyId, name, prefix: keyPrefix },
      },
    });

    return {
      keyId,
      token: rawToken, // Displayed ONLY once upon creation
      prefix: keyPrefix,
      name,
    };
  }

  listApiKeys(merchantId: string): ApiKeyRecord[] {
    const keys: ApiKeyRecord[] = [];
    for (const [id, item] of DeveloperService.apiKeys.entries()) {
      if (item.merchantId === merchantId) {
        keys.push({
          id,
          merchantId: item.merchantId,
          name: item.name,
          keyPrefix: item.prefix,
          createdAt: item.createdAt.toISOString(),
          permissions: ['recovery:read', 'recovery:execute', 'webhooks:manage'],
          lastUsedAt: new Date().toISOString(),
        });
      }
    }
    return keys;
  }

  /**
   * 4. Outbound Webhook Subscriptions (RecoverAI -> Merchant Systems).
   */
  registerWebhookSubscription(params: {
    merchantId: string;
    url: string;
    events: string[];
    secret?: string;
  }): WebhookSubscription {
    const { merchantId, url, events, secret = `whsec_${crypto.randomBytes(16).toString('hex')}` } = params;
    const subId = `sub_${Date.now()}`;

    const sub: WebhookSubscription = {
      id: subId,
      merchantId,
      url,
      events: events.length > 0 ? events : ['recovery.started', 'recovery.succeeded', 'recovery.halted'],
      secret,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const existing = DeveloperService.webhookSubscriptions.get(merchantId) || [];
    existing.push(sub);
    DeveloperService.webhookSubscriptions.set(merchantId, existing);

    logger.info(`[DeveloperService] Registered outbound webhook subscription ${subId} for merchant ${merchantId} (${url})`);
    return sub;
  }

  listWebhookSubscriptions(merchantId: string): WebhookSubscription[] {
    return DeveloperService.webhookSubscriptions.get(merchantId) || [];
  }

  /**
   * 5. Compliance & Finance Audit Report Exporter (CSV / JSON).
   */
  async exportAuditReport(params: {
    merchantId: string;
    format: 'csv' | 'json';
    limit?: number;
  }): Promise<{ format: 'csv' | 'json'; data: string; rowCount: number }> {
    const { merchantId, format, limit = 500 } = params;

    const logs = await this.prisma.auditLog.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(1000, limit),
    });

    if (format === 'json') {
      return {
        format: 'json',
        data: JSON.stringify(logs, null, 2),
        rowCount: logs.length,
      };
    }

    // CSV format
    const headers = ['id', 'timestamp', 'transactionId', 'entityType', 'action', 'actor', 'actorType', 'details'];
    const rows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.transactionId || 'N/A',
      log.entityType,
      log.action,
      log.actor || 'SYSTEM',
      log.actorType || 'SYSTEM',
      `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return {
      format: 'csv',
      data: csvContent,
      rowCount: logs.length,
    };
  }
}
