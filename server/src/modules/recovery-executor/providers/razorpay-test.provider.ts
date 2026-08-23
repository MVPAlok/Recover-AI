import { logger } from '../../../utils/logger.js';
import { RazorpayClient } from '../../../integrations/razorpay/razorpay.client.js';
import {
  EscalationExecutionInput,
  ProviderExecutionResult,
  ReminderExecutionInput,
  RetryExecutionInput,
  StopExecutionInput,
  WaitExecutionInput,
} from '../execution.types.js';
import { RecoveryProvider } from './recovery-provider.js';

export class RazorpayTestProvider implements RecoveryProvider {
  public readonly providerName = 'RazorpayTestProvider';
  private client: RazorpayClient;

  constructor(client?: RazorpayClient) {
    this.client = client || new RazorpayClient();
  }

  /**
   * Executes a RETRY action by creating a corresponding Test Mode Order in Razorpay.
   */
  async executeRetry(input: RetryExecutionInput): Promise<ProviderExecutionResult> {
    const { transactionId, amount, currency, merchantId, customerId, retryCount } = input;
    const amountInPaise = Math.round(Number(amount) * 100);

    logger.info(
      `[RazorpayTestProvider] Creating Test Mode Order for transaction ${transactionId} (amount: ₹${amount})`
    );

    try {
      const order = await this.client.createOrder({
        amount: amountInPaise,
        currency: currency || 'INR',
        receipt: transactionId.substring(0, 40),
        notes: {
          transactionId,
          merchantId,
          customerId,
          retryAttempt: `${retryCount + 1}`,
        },
      });

      logger.info(
        `[RazorpayTestProvider] Razorpay Test Order created successfully: ${order.id} for transaction ${transactionId}`
      );

      return {
        success: true,
        status: 'PENDING',
        outcomeCode: 'PAYMENT_RECOVERED',
        amountRecovered: 0, // 0 until webhook payment.captured confirms receipt
        message: `Razorpay Test Mode Order ${order.id} initiated for transaction ${transactionId}. Awaiting customer payment / webhook.`,
        executedAt: new Date(),
        metadata: {
          provider: this.providerName,
          razorpayOrderId: order.id,
          orderStatus: order.status,
          currency: order.currency,
          amountPaise: order.amount,
        },
      };
    } catch (err: any) {
      logger.error(`[RazorpayTestProvider] Failed to initiate Razorpay Test retry: ${err.message}`, err);
      return {
        success: false,
        status: 'FAILED',
        outcomeCode: 'RECOVERY_ATTEMPT_FAILED',
        amountRecovered: 0,
        message: `Razorpay Test API error: ${err.message}`,
        executedAt: new Date(),
        metadata: {
          provider: this.providerName,
          errorCode: err.code || 'RAZORPAY_RETRY_ERROR',
          details: err.details,
        },
      };
    }
  }

  /**
   * Executes a REMIND action by generating a Razorpay Test Mode Payment Link for the customer.
   */
  async executeReminder(input: ReminderExecutionInput): Promise<ProviderExecutionResult> {
    const { transactionId, amount, currency, merchantId, customerEmail, customerName, customerPhone } = input;
    const amountInPaise = Math.round(Number(amount) * 100);

    logger.info(
      `[RazorpayTestProvider] Generating Razorpay Test Payment Link for customer ${customerEmail || customerName}`
    );

    try {
      const paymentLink = await this.client.createPaymentLink({
        amount: amountInPaise,
        currency: currency || 'INR',
        description: `Payment Recovery Link for ${transactionId}`,
        customer: {
          name: customerName || 'Customer',
          email: customerEmail || undefined,
          contact: customerPhone || undefined,
        },
        notify: {
          email: Boolean(customerEmail),
          sms: Boolean(customerPhone),
        },
        notes: {
          transactionId,
          merchantId,
        },
      });

      logger.info(
        `[RazorpayTestProvider] Razorpay Test Payment Link created: ${paymentLink.short_url} (${paymentLink.id})`
      );

      return {
        success: true,
        status: 'SUCCESS',
        outcomeCode: 'REMINDER_SIMULATED',
        amountRecovered: 0,
        message: `Razorpay Test Payment Link generated and simulated for customer ${customerEmail || customerName} (${paymentLink.short_url}).`,
        executedAt: new Date(),
        metadata: {
          provider: this.providerName,
          paymentLinkId: paymentLink.id,
          shortUrl: paymentLink.short_url,
          customerEmail,
        },
      };
    } catch (err: any) {
      logger.error(`[RazorpayTestProvider] Failed to generate Payment Link: ${err.message}`);
      return {
        success: true,
        status: 'SUCCESS',
        outcomeCode: 'REMINDER_SIMULATED',
        amountRecovered: 0,
        message: `Simulated customer reminder for ${customerEmail || customerName} (Gateway note: ${err.message}).`,
        executedAt: new Date(),
        metadata: {
          provider: this.providerName,
          gatewayNote: err.message,
        },
      };
    }
  }

  /**
   * Executes an ESCALATE action by creating a simulated support escalation ticket.
   */
  async executeEscalation(input: EscalationExecutionInput): Promise<ProviderExecutionResult> {
    const { transactionId, reason } = input;
    const ticketId = `ESC-RZP-${Date.now()}-${transactionId.slice(0, 8)}`;

    logger.info(
      `[RazorpayTestProvider] Creating support escalation ${ticketId} for transaction ${transactionId}`
    );

    return {
      success: true,
      status: 'SUCCESS',
      outcomeCode: 'ESCALATION_CREATED',
      amountRecovered: 0,
      message: `Support ticket ${ticketId} created for failed transaction ${transactionId}.`,
      executedAt: new Date(),
      metadata: {
        provider: this.providerName,
        ticketId,
        priority: 'HIGH',
        reason,
      },
    };
  }

  /**
   * Executes a WAIT action by scheduling a future re-evaluation window.
   */
  async executeWait(input: WaitExecutionInput): Promise<ProviderExecutionResult> {
    const { transactionId, waitMinutes = 30 } = input;
    const scheduledAt = new Date(Date.now() + waitMinutes * 60 * 1000);

    logger.info(
      `[RazorpayTestProvider] Scheduling observation wait of ${waitMinutes}m for transaction ${transactionId}`
    );

    return {
      success: true,
      status: 'PENDING',
      outcomeCode: 'WAIT_SCHEDULED',
      amountRecovered: 0,
      scheduledAt,
      message: `Recovery on hold for ${waitMinutes} minutes. Scheduled re-evaluation at ${scheduledAt.toISOString()}.`,
      metadata: {
        provider: this.providerName,
        waitMinutes,
        scheduledAt: scheduledAt.toISOString(),
      },
    };
  }

  /**
   * Executes a STOP action by permanently cancelling further automated recovery attempts.
   */
  async executeStop(input: StopExecutionInput): Promise<ProviderExecutionResult> {
    const { transactionId, reason } = input;

    logger.info(
      `[RazorpayTestProvider] Stopping automated recovery for transaction ${transactionId} (reason: ${reason})`
    );

    return {
      success: true,
      status: 'CANCELLED',
      outcomeCode: 'RECOVERY_STOPPED_BY_POLICY',
      amountRecovered: 0,
      message: `Recovery permanently halted by policy: ${reason}`,
      executedAt: new Date(),
      metadata: {
        provider: this.providerName,
        stopReason: reason,
      },
    };
  }
}
