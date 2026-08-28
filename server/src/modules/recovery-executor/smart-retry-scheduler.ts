export interface SmartRetrySchedule {
  recommendedDelayMinutes: number;
  scheduledExecutionTime: Date;
  strategyReason: string;
  channelRecommendation: 'GATEWAY_AUTO_RETRY' | 'PAYMENT_LINK_WHATSAPP' | 'PAYMENT_LINK_SMS_EMAIL' | 'MANUAL_REVIEW';
  paymentLinkParameters?: {
    expiresInHours: number;
    upiIntentEnabled: boolean;
    smsNotification: boolean;
    emailNotification: boolean;
  };
}

export class SmartRetryScheduler {
  /**
   * Computes an optimal retry schedule and engagement channel based on failure classification.
   *
   * @param failureCode Gateway decline code (e.g., 'GATEWAY_TIMEOUT', 'AUTHENTICATION_FAILURE')
   * @param retryCount Number of previous attempts (0-3)
   * @param amount Transaction amount in INR
   */
  public static calculateSchedule(params: {
    failureCode?: string | null;
    retryCount: number;
    amount: number;
  }): SmartRetrySchedule {
    const { failureCode = 'UNKNOWN', retryCount, amount } = params;
    const normalizedCode = (failureCode || '').toUpperCase();

    // 1. High-Value Transaction with Unknown / Ambiguous Failure -> Manual Review Escalation
    if (amount >= 50000 && retryCount >= 1) {
      return {
        recommendedDelayMinutes: 0,
        scheduledExecutionTime: new Date(),
        strategyReason: `High-value transaction (₹${amount.toLocaleString('en-IN')}) requires finance desk review before further recovery attempts.`,
        channelRecommendation: 'MANUAL_REVIEW',
      };
    }

    // 2. Customer Authentication Failures (3DS / OTP Drop-off) -> 1-Click Payment Link via WhatsApp/SMS
    if (
      normalizedCode.includes('AUTH') ||
      normalizedCode.includes('OTP') ||
      normalizedCode.includes('CUSTOMER') ||
      normalizedCode.includes('CHALLENGE')
    ) {
      return {
        recommendedDelayMinutes: 0, // Immediate link generation
        scheduledExecutionTime: new Date(),
        strategyReason: 'Customer abandoned OTP/3DS verification. Immediate 1-click Payment Link recommended.',
        channelRecommendation: 'PAYMENT_LINK_WHATSAPP',
        paymentLinkParameters: {
          expiresInHours: 24,
          upiIntentEnabled: true,
          smsNotification: true,
          emailNotification: true,
        },
      };
    }

    // 3. Temporary Bank Maintenance / Downtime
    if (normalizedCode.includes('BANK') || normalizedCode.includes('UNAVAILABLE') || normalizedCode.includes('SYSTEM')) {
      const delayMinutes = 30;
      const scheduledExecutionTime = new Date(Date.now() + delayMinutes * 60 * 1000);

      return {
        recommendedDelayMinutes: delayMinutes,
        scheduledExecutionTime,
        strategyReason: 'Issuer bank experiencing degradation. Scheduled observation window for 30 minutes.',
        channelRecommendation: 'GATEWAY_AUTO_RETRY',
      };
    }

    // 4. Gateway Timeout / Network Glitch -> Smart Exponential Retry Window
    if (
      normalizedCode.includes('TIMEOUT') ||
      normalizedCode.includes('NETWORK') ||
      normalizedCode.includes('GATEWAY') ||
      normalizedCode.includes('CONNECTION')
    ) {
      const delayMinutes = retryCount === 0 ? 3 : retryCount === 1 ? 15 : 45;
      const scheduledExecutionTime = new Date(Date.now() + delayMinutes * 60 * 1000);

      return {
        recommendedDelayMinutes: delayMinutes,
        scheduledExecutionTime,
        strategyReason: `Transient gateway timeout detected. Exponential backoff retry scheduled after ${delayMinutes} minutes.`,
        channelRecommendation: 'GATEWAY_AUTO_RETRY',
      };
    }

    // 5. Default Fallback Policy
    const defaultDelay = retryCount === 0 ? 5 : 20;
    return {
      recommendedDelayMinutes: defaultDelay,
      scheduledExecutionTime: new Date(Date.now() + defaultDelay * 60 * 1000),
      strategyReason: `Standard automated recovery schedule with ${defaultDelay} min observation delay.`,
      channelRecommendation: 'GATEWAY_AUTO_RETRY',
    };
  }
}
