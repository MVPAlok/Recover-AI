import { RazorpayAuthError, RazorpayValidationError } from './razorpay.errors.js';

export interface RazorpayClientConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
  baseUrl: string;
  timeoutMs: number;
  toleranceSeconds: number;
}

export class RazorpayConfig {
  public static readonly DEFAULT_BASE_URL = 'https://api.razorpay.com/v1';
  public static readonly DEFAULT_TIMEOUT_MS = 10000;
  public static readonly DEFAULT_TOLERANCE_SECONDS = 300;

  /**
   * Validates and returns the active Razorpay Test configuration.
   * Fails closed if live keys or invalid configurations are provided.
   */
  public static getTestConfig(overrides?: Partial<RazorpayClientConfig>): RazorpayClientConfig {
    const keyId = overrides?.keyId || process.env.RAZORPAY_KEY_ID || '';
    const keySecret = overrides?.keySecret || process.env.RAZORPAY_KEY_SECRET || '';
    const webhookSecret = overrides?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const baseUrl = overrides?.baseUrl || process.env.RAZORPAY_BASE_URL || this.DEFAULT_BASE_URL;
    const timeoutMs = overrides?.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const toleranceSeconds =
      overrides?.toleranceSeconds ||
      parseInt(process.env.RAZORPAY_WEBHOOK_TOLERANCE_SECONDS || `${this.DEFAULT_TOLERANCE_SECONDS}`, 10);

    // Fail closed if live keys are detected
    if (keyId.startsWith('rzp_live_')) {
      throw new RazorpayAuthError(
        'Live Razorpay credentials (rzp_live_...) are strictly prohibited in RecoverAI Phase 7 Test Mode.'
      );
    }

    return {
      keyId,
      keySecret,
      webhookSecret,
      baseUrl,
      timeoutMs,
      toleranceSeconds,
    };
  }

  /**
   * Validates that test credentials are present and correctly formatted.
   */
  public static validateTestCredentials(config: RazorpayClientConfig): void {
    if (!config.keyId) {
      throw new RazorpayValidationError('RAZORPAY_KEY_ID is required for Razorpay Test Mode execution.');
    }
    if (!config.keySecret) {
      throw new RazorpayValidationError('RAZORPAY_KEY_SECRET is required for Razorpay Test Mode execution.');
    }
    if (!config.keyId.startsWith('rzp_test_')) {
      throw new RazorpayAuthError(
        `Invalid Key ID '${config.keyId}'. Razorpay Test Mode requires keys beginning with 'rzp_test_'.`
      );
    }
  }

  /**
   * Safely masks a key or secret for non-sensitive logging.
   */
  public static maskSecret(secret?: string): string {
    if (!secret || secret.length < 8) return '****';
    return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
  }
}
