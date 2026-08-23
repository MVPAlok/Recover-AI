export class RazorpayError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor(message: string, code = 'RAZORPAY_ERROR', statusCode = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class RazorpayAuthError extends RazorpayError {
  constructor(message = 'Invalid Razorpay credentials or unauthorized request.', details?: unknown) {
    super(message, 'RAZORPAY_AUTH_ERROR', 401, details);
  }
}

export class RazorpayValidationError extends RazorpayError {
  constructor(message: string, details?: unknown) {
    super(message, 'RAZORPAY_VALIDATION_ERROR', 400, details);
  }
}

export class RazorpayNetworkError extends RazorpayError {
  constructor(message = 'Network error while contacting Razorpay API.', details?: unknown) {
    super(message, 'RAZORPAY_NETWORK_ERROR', 502, details);
  }
}

export class RazorpayTimeoutError extends RazorpayError {
  constructor(message = 'Razorpay API request timed out.', details?: unknown) {
    super(message, 'RAZORPAY_TIMEOUT', 504, details);
  }
}

export class RazorpayRateLimitError extends RazorpayError {
  constructor(message = 'Razorpay API rate limit exceeded.', details?: unknown) {
    super(message, 'RAZORPAY_RATE_LIMIT', 429, details);
  }
}

export class RazorpayPaymentError extends RazorpayError {
  constructor(message: string, details?: unknown) {
    super(message, 'RAZORPAY_PAYMENT_FAILED', 400, details);
  }
}

export class RazorpayWebhookSignatureError extends RazorpayError {
  constructor(message = 'Invalid Razorpay webhook signature.', details?: unknown) {
    super(message, 'RAZORPAY_INVALID_WEBHOOK', 400, details);
  }
}

export class RazorpayDuplicateWebhookError extends RazorpayError {
  constructor(eventId: string) {
    super(`Duplicate webhook event with ID '${eventId}' received.`, 'RAZORPAY_DUPLICATE_WEBHOOK', 200, { eventId });
  }
}
