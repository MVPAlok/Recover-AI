import { RazorpayClient } from '../../integrations/razorpay/razorpay.client.js';
import {
  RazorpayValidationError,
  RazorpayWebhookSignatureError,
} from '../../integrations/razorpay/razorpay.errors.js';
import { RazorpayWebhookPayload } from '../../integrations/razorpay/razorpay.types.js';

export interface WebhookValidationResult {
  isValid: boolean;
  eventId: string;
  eventType: string;
  payload: RazorpayWebhookPayload;
  rawBody: Buffer | string;
}

export class RazorpayWebhookValidator {
  private client: RazorpayClient;

  constructor(client?: RazorpayClient) {
    this.client = client || new RazorpayClient();
  }

  /**
   * Validates raw body, webhook signature, and event structure.
   */
  public validate(params: {
    rawBody?: Buffer | string;
    signature?: string;
    headerEventId?: string;
    bodyPayload?: unknown;
    webhookSecret?: string;
  }): WebhookValidationResult {
    const { rawBody, signature, headerEventId, bodyPayload, webhookSecret } = params;

    if (!rawBody) {
      throw new RazorpayValidationError('Missing raw request body for webhook signature verification.');
    }

    if (!signature) {
      throw new RazorpayWebhookSignatureError('Missing X-Razorpay-Signature header.');
    }

    // 1. Verify HMAC SHA-256 signature
    const isSignatureValid = this.client.verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isSignatureValid) {
      throw new RazorpayWebhookSignatureError('Invalid Razorpay webhook signature.');
    }

    // 2. Parse and validate JSON payload
    let payload: RazorpayWebhookPayload;
    if (typeof bodyPayload === 'object' && bodyPayload !== null) {
      payload = bodyPayload as RazorpayWebhookPayload;
    } else {
      try {
        const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
        payload = JSON.parse(bodyStr);
      } catch (err: any) {
        throw new RazorpayValidationError(`Malformed JSON payload in webhook: ${err.message}`);
      }
    }

    if (!payload.event) {
      throw new RazorpayValidationError("Webhook payload missing required 'event' field.");
    }

    // 3. Resolve eventId from header or payload
    const eventId =
      headerEventId ||
      (payload as any).event_id ||
      (payload as any).id ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      isValid: true,
      eventId,
      eventType: payload.event,
      payload,
      rawBody,
    };
  }
}
