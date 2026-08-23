import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import { RazorpayClientConfig, RazorpayConfig } from './razorpay.config.js';
import {
  RazorpayAuthError,
  RazorpayError,
  RazorpayNetworkError,
  RazorpayRateLimitError,
  RazorpayTimeoutError,
  RazorpayValidationError,
  RazorpayWebhookSignatureError,
} from './razorpay.errors.js';
import {
  RazorpayOrder,
  RazorpayOrderInput,
  RazorpayPayment,
  RazorpayPaymentLink,
  RazorpayPaymentLinkInput,
} from './razorpay.types.js';

export class RazorpayClient {
  private config: RazorpayClientConfig;

  constructor(configOverrides?: Partial<RazorpayClientConfig>) {
    this.config = RazorpayConfig.getTestConfig(configOverrides);
  }

  /**
   * Generates the Basic Auth header for Razorpay API.
   */
  private getAuthHeader(): string {
    RazorpayConfig.validateTestCredentials(this.config);
    const token = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64');
    return `Basic ${token}`;
  }

  /**
   * Executes an HTTP request to the Razorpay API with timeout and error mapping.
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const authHeader = this.getAuthHeader();

    const headers: Record<string, string> = {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      logger.info(`[RazorpayClient] ${method} ${endpoint} (key: ${RazorpayConfig.maskSecret(this.config.keyId)})`);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        this.handleErrorResponse(response.status, responseData);
      }

      return responseData as T;
    } catch (err: any) {
      if (err instanceof RazorpayError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new RazorpayTimeoutError(
          `Razorpay API request to ${endpoint} timed out after ${this.config.timeoutMs}ms.`
        );
      }
      throw new RazorpayNetworkError(`Network failure while calling Razorpay API: ${err.message}`, err);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Maps HTTP error statuses and Razorpay error payloads into structured errors.
   */
  private handleErrorResponse(status: number, data: any): never {
    const errorDetail = data?.error || {};
    const description = errorDetail.description || data.message || `Razorpay API error (${status})`;
    const code = errorDetail.code || 'RAZORPAY_API_ERROR';

    switch (status) {
      case 400:
        throw new RazorpayValidationError(description, errorDetail);
      case 401:
        throw new RazorpayAuthError(description, errorDetail);
      case 429:
        throw new RazorpayRateLimitError(description, errorDetail);
      default:
        throw new RazorpayError(description, code, status, errorDetail);
    }
  }

  /**
   * Creates a new order in Razorpay Test Mode.
   */
  async createOrder(input: RazorpayOrderInput): Promise<RazorpayOrder> {
    if (!input.amount || input.amount <= 0) {
      throw new RazorpayValidationError('Order amount must be a positive integer in paise.');
    }

    return this.request<RazorpayOrder>('/orders', 'POST', {
      amount: input.amount,
      currency: input.currency || 'INR',
      receipt: input.receipt,
      notes: input.notes || {},
      payment_capture: input.paymentCapture ?? true,
    });
  }

  /**
   * Fetches details of a specific payment by ID.
   */
  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    if (!paymentId) {
      throw new RazorpayValidationError('Payment ID is required.');
    }
    return this.request<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`, 'GET');
  }

  /**
   * Creates a customer payment link in Razorpay Test Mode (used for REMIND action).
   */
  async createPaymentLink(input: RazorpayPaymentLinkInput): Promise<RazorpayPaymentLink> {
    if (!input.amount || input.amount <= 0) {
      throw new RazorpayValidationError('Payment link amount must be a positive integer in paise.');
    }

    return this.request<RazorpayPaymentLink>('/payment_links', 'POST', {
      amount: input.amount,
      currency: input.currency || 'INR',
      description: input.description,
      customer: input.customer,
      notify: input.notify || { email: true, sms: false },
      reminder_enable: input.reminder_enable ?? true,
      notes: input.notes || {},
    });
  }

  /**
   * Verifies Razorpay Webhook signature using HMAC SHA-256 with constant-time equality check.
   *
   * @param rawBody Raw Buffer or string of the incoming request body
   * @param signature The X-Razorpay-Signature header value
   * @param secret Optional webhook secret override
   */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string, secret?: string): boolean {
    const webhookSecret = secret || this.config.webhookSecret;
    if (!webhookSecret) {
      throw new RazorpayValidationError('RAZORPAY_WEBHOOK_SECRET is not configured.');
    }
    if (!signature) {
      throw new RazorpayWebhookSignatureError('Missing X-Razorpay-Signature header.');
    }

    const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

    try {
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }
}
