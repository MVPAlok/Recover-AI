import {
  AIAgentType,
  PaymentStatus,
  PrismaClient,
  RecoveryDecision,
  RecoveryStatus,
  TransactionRecoveryStatus,
  TransactionStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export interface SimulateEventOptions {
  scenario: string;
  amount?: number;
  outcome?: 'SUCCESS' | 'FAILED' | 'PENDING' | 'RANDOM';
  currency?: string;
}

interface ScenarioTemplate {
  category: 'RECOVERED' | 'REMIND' | 'STOP' | 'FAILED' | 'REVIEW';
  failureCode: string;
  failureReason: string;
  amount: number;
  paymentMethod: string;
  daysAgo: number;
  aiDecision: RecoveryDecision;
  confidence: number;
  reasoning: string;
  rootCause: string;
  failureCategory: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

const DEFAULT_SCENARIOS: ScenarioTemplate[] = [
  // ── 1. RECOVERED via Auto-Retry (16 items) ──
  { category: 'RECOVERED', failureCode: 'GATEWAY_TIMEOUT', failureReason: 'Temporary bank server timeout during 3DS callback', amount: 2499, paymentMethod: 'UPI', daysAgo: 0.1, aiDecision: RecoveryDecision.RETRY, confidence: 0.95, reasoning: 'Transient network glitch on acquirer switch. High probability immediate retry.', rootCause: 'TEMPORARY_GATEWAY_FAILURE', failureCategory: 'TEMPORARY_INFRASTRUCTURE', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'UPI_APP_TIMEOUT', failureReason: 'Customer UPI app took >60s to confirm push intent', amount: 1499, paymentMethod: 'UPI', daysAgo: 0.4, aiDecision: RecoveryDecision.RETRY, confidence: 0.92, reasoning: 'UPI PSP handle timeout. Safe automated retry with secondary router.', rootCause: 'PSP_LATENCY_SPIKE', failureCategory: 'NETWORK_LATENCY', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'BANK_SYSTEM_BUSY', failureReason: 'HDFC Bank core banking gateway throttling requests', amount: 8500, paymentMethod: 'NETBANKING', daysAgo: 0.8, aiDecision: RecoveryDecision.RETRY, confidence: 0.94, reasoning: 'Bank node concurrency limit reached. Circuit-breaker backoff and retry.', rootCause: 'ISSUING_BANK_THROTTLING', failureCategory: 'ISSUER_CONGESTION', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'NETWORK_ERROR', failureReason: 'Socket hangup on merchant acquirer pipeline', amount: 18000, paymentMethod: 'CARD', daysAgo: 1.2, aiDecision: RecoveryDecision.RETRY, confidence: 0.96, reasoning: 'Idempotent retry executed through standby payment route.', rootCause: 'TRANSIENT_CONNECTION_RESET', failureCategory: 'TRANSIENT_NETWORK', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'GATEWAY_TIMEOUT', failureReason: 'Razorpay gateway latency exceeded threshold', amount: 3200, paymentMethod: 'UPI', daysAgo: 2.1, aiDecision: RecoveryDecision.RETRY, confidence: 0.93, reasoning: 'Payment switch cleared after 90s delay. Verified successful capture.', rootCause: 'SWITCH_LATENCY', failureCategory: 'TEMPORARY_INFRASTRUCTURE', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'UPI_APP_TIMEOUT', failureReason: 'UPI collect request expired before user authorization', amount: 4850, paymentMethod: 'UPI', daysAgo: 3.0, aiDecision: RecoveryDecision.RETRY, confidence: 0.91, reasoning: 'Dispatched instant retry via alternate dynamic VPA endpoint.', rootCause: 'VPA_ROUTING_FALLBACK', failureCategory: 'NETWORK_LATENCY', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'BANK_SYSTEM_BUSY', failureReason: 'State Bank of India CBS maintenance window', amount: 12500, paymentMethod: 'NETBANKING', daysAgo: 4.3, aiDecision: RecoveryDecision.RETRY, confidence: 0.92, reasoning: 'Delayed execution scheduled 45 mins post CBS window. Capture verified.', rootCause: 'CBS_MAINTENANCE_RECOVERY', failureCategory: 'ISSUER_CONGESTION', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'TEMPORARY_ACQUIRER_ERROR', failureReason: 'Acquiring bank returned 502 bad gateway', amount: 6500, paymentMethod: 'CARD', daysAgo: 5.5, aiDecision: RecoveryDecision.RETRY, confidence: 0.94, reasoning: 'Rerouted through secondary processor. Payment authorized.', rootCause: 'SMART_ROUTING_OVERRIDE', failureCategory: 'TEMPORARY_INFRASTRUCTURE', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'NETWORK_ERROR', failureReason: 'TLS handshake interrupted during payment validation', amount: 24999, paymentMethod: 'CARD', daysAgo: 6.8, aiDecision: RecoveryDecision.RETRY, confidence: 0.95, reasoning: 'Session refreshed and re-executed with valid auth token.', rootCause: 'SECURITY_HANDSHAKE_RESET', failureCategory: 'TRANSIENT_NETWORK', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'GATEWAY_TIMEOUT', failureReason: 'Downstream bank acknowledgement timeout', amount: 9999, paymentMethod: 'UPI', daysAgo: 8.0, aiDecision: RecoveryDecision.RETRY, confidence: 0.93, reasoning: 'Automated status polling confirmed debit. Reconciled and recovered.', rootCause: 'ASYNC_RECONCILIATION_MATCH', failureCategory: 'TEMPORARY_INFRASTRUCTURE', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'UPI_APP_TIMEOUT', failureReason: 'PhonePe intent link timed out on client device', amount: 15000, paymentMethod: 'UPI', daysAgo: 9.5, aiDecision: RecoveryDecision.RETRY, confidence: 0.90, reasoning: 'Fallback QR code and push notification successfully authorized.', rootCause: 'MULTI_CHANNEL_FALLBACK', failureCategory: 'NETWORK_LATENCY', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'BANK_SYSTEM_BUSY', failureReason: 'ICICI netbanking switch dropped transaction', amount: 21500, paymentMethod: 'NETBANKING', daysAgo: 11.2, aiDecision: RecoveryDecision.RETRY, confidence: 0.92, reasoning: 'Intelligent retry with 120s backoff succeeded.', rootCause: 'EXPONENTIAL_BACKOFF_SUCCESS', failureCategory: 'ISSUER_CONGESTION', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'TEMPORARY_ACQUIRER_ERROR', failureReason: 'Mastercard 3DS challenge microservice restart', amount: 27500, paymentMethod: 'CARD', daysAgo: 13.0, aiDecision: RecoveryDecision.RETRY, confidence: 0.95, reasoning: 'Service recovery detected; retry executed with zero drop.', rootCause: 'SERVICE_RESTART_RETRY', failureCategory: 'TEMPORARY_INFRASTRUCTURE', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'NETWORK_ERROR', failureReason: 'Cloudflare edge timeout between payment gateway and core', amount: 32000, paymentMethod: 'CARD', daysAgo: 15.4, aiDecision: RecoveryDecision.RETRY, confidence: 0.94, reasoning: 'Direct API retry bypassing cached gateway route.', rootCause: 'BYPASS_EDGE_CACHE', failureCategory: 'TRANSIENT_NETWORK', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'GATEWAY_TIMEOUT', failureReason: 'Timeout on card issuing switch', amount: 38000, paymentMethod: 'CARD', daysAgo: 17.8, aiDecision: RecoveryDecision.RETRY, confidence: 0.93, reasoning: 'Idempotency key preserved; retry captured full funds.', rootCause: 'IDEMPOTENT_RETRY_CAPTURE', failureCategory: 'TEMPORARY_INFRASTRUCTURE', riskLevel: 'LOW' },
  { category: 'RECOVERED', failureCode: 'UPI_APP_TIMEOUT', failureReason: 'Google Pay UPI rail timeout during high peak hours', amount: 45000, paymentMethod: 'UPI', daysAgo: 20.2, aiDecision: RecoveryDecision.RETRY, confidence: 0.91, reasoning: 'Re-routed to BHIM NPCI switch; transaction confirmed.', rootCause: 'NPCI_FAILOVER_ROUTE', failureCategory: 'NETWORK_LATENCY', riskLevel: 'LOW' },

  // ── 2. IN_PROGRESS via Smart Remind (10 items) ──
  { category: 'REMIND', failureCode: 'AUTHENTICATION_FAILURE', failureReason: 'Customer abandoned OTP entry on bank 3DS page', amount: 4850, paymentMethod: 'CARD', daysAgo: 0.2, aiDecision: RecoveryDecision.REMIND, confidence: 0.85, reasoning: 'Customer dropped off at OTP screen. Generated 1-click recovery smart link.', rootCause: 'CUSTOMER_AUTH_DROPOUT', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },
  { category: 'REMIND', failureCode: 'CUSTOMER_ABANDONED_3DS', failureReason: 'User closed browser tab during bank verification', amount: 2100, paymentMethod: 'UPI', daysAgo: 0.6, aiDecision: RecoveryDecision.REMIND, confidence: 0.88, reasoning: 'Dispatched automated WhatsApp & SMS recovery link with 24h validity.', rootCause: 'CHECKOUT_ABANDONMENT', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },
  { category: 'REMIND', failureCode: 'OTP_TIMEOUT', failureReason: 'SMS OTP delayed by telecom provider beyond 3 minutes', amount: 7200, paymentMethod: 'CARD', daysAgo: 1.5, aiDecision: RecoveryDecision.REMIND, confidence: 0.82, reasoning: 'Telecom SMS latency. Sent backup email authorization link.', rootCause: 'TELCO_SMS_LATENCY', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },
  { category: 'REMIND', failureCode: 'USER_DROPOUT', failureReason: 'Biometric fingerprint challenge cancelled by customer', amount: 3499, paymentMethod: 'UPI', daysAgo: 2.8, aiDecision: RecoveryDecision.REMIND, confidence: 0.86, reasoning: 'Interactive reminder triggered with zero-friction checkout payment link.', rootCause: 'BIOMETRIC_CANCEL', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },
  { category: 'REMIND', failureCode: 'AUTHENTICATION_FAILURE', failureReason: 'Incorrect OTP entered twice by customer', amount: 5600, paymentMethod: 'CARD', daysAgo: 4.1, aiDecision: RecoveryDecision.REMIND, confidence: 0.83, reasoning: 'Customer requested assistance. Sent payment retry link with alternative card option.', rootCause: 'OTP_INPUT_ERROR', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },
  { category: 'REMIND', failureCode: 'CUSTOMER_ABANDONED_3DS', failureReason: 'Session expired while waiting for user PIN', amount: 8900, paymentMethod: 'UPI', daysAgo: 6.0, aiDecision: RecoveryDecision.REMIND, confidence: 0.84, reasoning: 'Recovery email link dispatched; awaiting customer checkout resumption.', rootCause: 'SESSION_EXPIRY', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },
  { category: 'REMIND', failureCode: 'OTP_TIMEOUT', failureReason: 'Carrier SMS timeout on international roaming number', amount: 11200, paymentMethod: 'CARD', daysAgo: 8.4, aiDecision: RecoveryDecision.REMIND, confidence: 0.81, reasoning: 'Generated WhatsApp interactive link with direct UPI intent.', rootCause: 'ROAMING_SMS_FAIL', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },
  { category: 'REMIND', failureCode: 'USER_DROPOUT', failureReason: 'Customer switched apps and tab lost focus', amount: 14000, paymentMethod: 'UPI', daysAgo: 11.0, aiDecision: RecoveryDecision.REMIND, confidence: 0.85, reasoning: 'Abandoned cart webhook dispatched. Recovery session active.', rootCause: 'APP_SWITCH_DROP', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },
  { category: 'REMIND', failureCode: 'AUTHENTICATION_FAILURE', failureReason: 'Card 3DS password failed', amount: 16500, paymentMethod: 'CARD', daysAgo: 14.5, aiDecision: RecoveryDecision.REMIND, confidence: 0.82, reasoning: 'Payment link active. Customer provided option to switch to UPI.', rootCause: 'AUTH_CHALLENGE_FAILED', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },
  { category: 'REMIND', failureCode: 'CUSTOMER_ABANDONED_3DS', failureReason: 'Customer exited during payment verification prompt', amount: 19800, paymentMethod: 'UPI', daysAgo: 18.0, aiDecision: RecoveryDecision.REMIND, confidence: 0.84, reasoning: 'Reminder workflow initialized; scheduled for follow-up ping.', rootCause: 'PROMPT_CANCELLED', failureCategory: 'CUSTOMER_AUTHENTICATION', riskLevel: 'LOW' },

  // ── 3. CANCELLED via Guardrail STOP (8 items) ──
  { category: 'STOP', failureCode: 'EXPIRED_CARD', failureReason: 'Payment instrument validity has expired (MM/YY in the past)', amount: 12000, paymentMethod: 'CARD', daysAgo: 0.3, aiDecision: RecoveryDecision.STOP, confidence: 0.99, reasoning: 'Card expired. Retrying will harm merchant reputation and gateway score. Hard Stop.', rootCause: 'HARD_DECLINE_EXPIRED', failureCategory: 'INSTRUMENT_EXPIRATION', riskLevel: 'HIGH' },
  { category: 'STOP', failureCode: 'INSUFFICIENT_FUNDS', failureReason: 'Customer bank account balance insufficient for debit', amount: 28000, paymentMethod: 'CARD', daysAgo: 1.0, aiDecision: RecoveryDecision.STOP, confidence: 0.98, reasoning: 'Hard decline for insufficient balance. Retries disabled by financial safety guardrail.', rootCause: 'HARD_DECLINE_INSUFFICIENT_FUNDS', failureCategory: 'INSUFFICIENT_FUNDS', riskLevel: 'HIGH' },
  { category: 'STOP', failureCode: 'CARD_SECURITY_VIOLATION', failureReason: 'CVV verification failed 3 times; card locked by issuer', amount: 7800, paymentMethod: 'CARD', daysAgo: 3.2, aiDecision: RecoveryDecision.STOP, confidence: 0.99, reasoning: 'Issuer security lockout. Further attempts will be flagged as fraud. Action Stopped.', rootCause: 'CVV_SECURITY_LOCKOUT', failureCategory: 'SECURITY_DECLINE', riskLevel: 'HIGH' },
  { category: 'STOP', failureCode: 'HIGH_RISK_FRAUD', failureReason: 'Risk engine flagged rapid multi-card velocity pattern', amount: 42000, paymentMethod: 'CARD', daysAgo: 5.8, aiDecision: RecoveryDecision.STOP, confidence: 0.99, reasoning: 'High risk fraud score (98/100). Auto-recovery permanently disabled.', rootCause: 'FRAUD_VELOCITY_TRIGGERED', failureCategory: 'FRAUD_RISK', riskLevel: 'HIGH' },
  { category: 'STOP', failureCode: 'ACCOUNT_BLOCKED', failureReason: 'Customer bank account frozen or flagged by RBI regulations', amount: 35000, paymentMethod: 'NETBANKING', daysAgo: 8.7, aiDecision: RecoveryDecision.STOP, confidence: 0.99, reasoning: 'Account blocked by issuing authority. Zero retry allowance.', rootCause: 'BANK_ACCOUNT_BLOCKED', failureCategory: 'ACCOUNT_STATUS', riskLevel: 'HIGH' },
  { category: 'STOP', failureCode: 'EXPIRED_CARD', failureReason: 'Prepaid corporate card validity expired', amount: 5000, paymentMethod: 'CARD', daysAgo: 12.0, aiDecision: RecoveryDecision.STOP, confidence: 0.99, reasoning: 'Expired payment instrument. Guardrail stopped automated recovery.', rootCause: 'PREPAID_CARD_EXPIRED', failureCategory: 'INSTRUMENT_EXPIRATION', riskLevel: 'HIGH' },
  { category: 'STOP', failureCode: 'INSUFFICIENT_FUNDS', failureReason: 'Insufficient account credit limit', amount: 22000, paymentMethod: 'CARD', daysAgo: 15.0, aiDecision: RecoveryDecision.STOP, confidence: 0.98, reasoning: 'Credit limit reached. Stopped by Authoritative Policy Guardrail.', rootCause: 'CREDIT_LIMIT_EXCEEDED', failureCategory: 'INSUFFICIENT_FUNDS', riskLevel: 'HIGH' },
  { category: 'STOP', failureCode: 'CARD_SECURITY_VIOLATION', failureReason: 'Card reported stolen or lost to issuing bank', amount: 15500, paymentMethod: 'CARD', daysAgo: 19.5, aiDecision: RecoveryDecision.STOP, confidence: 0.99, reasoning: 'Stolen card flag. Immediate quarantine and recovery cancellation.', rootCause: 'STOLEN_CARD_FLAG', failureCategory: 'SECURITY_DECLINE', riskLevel: 'HIGH' },

  // ── 4. NOT_RECOVERED / Retry Limit Exhausted (5 items) ──
  { category: 'FAILED', failureCode: 'GATEWAY_DOWNTIME', failureReason: 'Persistent 48-hour gateway downtime across multiple endpoints', amount: 9800, paymentMethod: 'NETBANKING', daysAgo: 2.5, aiDecision: RecoveryDecision.RETRY, confidence: 0.74, reasoning: 'Attempted 3 retries across 24h. Gateway remained unavailable. Max retries exhausted.', rootCause: 'PERSISTENT_DOWNSTREAM_OUTAGE', failureCategory: 'OUTAGE_EXHAUSTED', riskLevel: 'HIGH' },
  { category: 'FAILED', failureCode: 'ISSUING_BANK_DEBIT_FAILED', failureReason: 'Customer bank rejected consecutive retry attempts', amount: 3100, paymentMethod: 'UPI', daysAgo: 5.0, aiDecision: RecoveryDecision.RETRY, confidence: 0.68, reasoning: 'Exceeded maximum retry threshold (3 attempts). Marked NOT_RECOVERED.', rootCause: 'RETRY_BUDGET_CONSUMED', failureCategory: 'ISSUER_REJECTION', riskLevel: 'MEDIUM' },
  { category: 'FAILED', failureCode: 'MERCHANT_LIMIT_EXCEEDED', failureReason: 'Merchant daily UPI transaction volume quota exceeded', amount: 25000, paymentMethod: 'UPI', daysAgo: 9.0, aiDecision: RecoveryDecision.RETRY, confidence: 0.72, reasoning: 'Volume cap reached. Automated retries failed.', rootCause: 'MERCHANT_QUOTA_EXCEEDED', failureCategory: 'MERCHANT_LIMITS', riskLevel: 'MEDIUM' },
  { category: 'FAILED', failureCode: 'GATEWAY_DOWNTIME', failureReason: 'Payment processor outage on secondary gateway switch', amount: 6400, paymentMethod: 'CARD', daysAgo: 13.5, aiDecision: RecoveryDecision.RETRY, confidence: 0.71, reasoning: 'Max retries exhausted with no gateway response.', rootCause: 'DUAL_PROCESSOR_OUTAGE', failureCategory: 'OUTAGE_EXHAUSTED', riskLevel: 'HIGH' },
  { category: 'FAILED', failureCode: 'ISSUING_BANK_DEBIT_FAILED', failureReason: 'Persistent bank debit decline after multiple retries', amount: 13500, paymentMethod: 'NETBANKING', daysAgo: 17.0, aiDecision: RecoveryDecision.RETRY, confidence: 0.69, reasoning: 'All 3 retries returned recurring decline. Closed as unrecoverable.', rootCause: 'RECURRING_BANK_DECLINE', failureCategory: 'ISSUER_REJECTION', riskLevel: 'MEDIUM' },

  // ── 5. REQUIRES_REVIEW / In-Triage (3 items) ──
  { category: 'REVIEW', failureCode: 'UNRECOGNIZED_BANK_ERROR', failureReason: 'Bank returned ambiguous error code [ERR_RBI_9948]', amount: 29999, paymentMethod: 'NETBANKING', daysAgo: 0.05, aiDecision: RecoveryDecision.WAIT, confidence: 0.52, reasoning: 'Unrecognized banking code requires human validation. Escalated to triage.', rootCause: 'AMBIGUOUS_ERROR_CODE', failureCategory: 'UNKNOWN_SYSTEM_ERROR', riskLevel: 'MEDIUM' },
  { category: 'REVIEW', failureCode: 'GATEWAY_TIMEOUT', failureReason: 'Transaction failed 15 minutes ago. In active AI diagnosis.', amount: 4500, paymentMethod: 'UPI', daysAgo: 0.01, aiDecision: RecoveryDecision.RETRY, confidence: 0.94, reasoning: 'Newly detected failure in active evaluation queue.', rootCause: 'ACTIVE_TRIAGE', failureCategory: 'TEMPORARY_INFRASTRUCTURE', riskLevel: 'LOW' },
  { category: 'REVIEW', failureCode: 'CARD_AUTHENTICATION_PENDING', failureReason: 'Transaction under automated risk audit', amount: 12800, paymentMethod: 'CARD', daysAgo: 0.03, aiDecision: RecoveryDecision.WAIT, confidence: 0.65, reasoning: 'Awaiting webhook verification signal from payment gateway.', rootCause: 'WEBHOOK_PENDING', failureCategory: 'ASYNCHRONOUS_VERIFICATION', riskLevel: 'MEDIUM' },
];

const CUSTOMER_SEEDS = [
  { name: 'Priya Sharma', email: 'customer_priya@example.test', phone: '+919876543201' },
  { name: 'Aarav Mehta', email: 'customer_aarav@example.test', phone: '+919876543202' },
  { name: 'Neha Verma', email: 'customer_neha@example.test', phone: '+919876543203' },
  { name: 'Rohan Gupta', email: 'customer_rohan@example.test', phone: '+919876543204' },
  { name: 'Vikram Malhotra', email: 'customer_vikram@example.test', phone: '+919876543205' },
  { name: 'Ananya Iyer', email: 'customer_ananya@example.test', phone: '+919876543206' },
  { name: 'Kabir Singh', email: 'customer_kabir@example.test', phone: '+919876543207' },
  { name: 'Aditi Rao', email: 'customer_aditi@example.test', phone: '+919876543208' },
  { name: 'Siddharth Patel', email: 'customer_sid@example.test', phone: '+919876543209' },
  { name: 'Pooja Nair', email: 'customer_pooja@example.test', phone: '+919876543210' },
];

export class SandboxSeederService {
  private db: PrismaClient;

  constructor(customPrisma?: PrismaClient) {
    this.db = customPrisma || prisma;
  }

  /**
   * Seeds 42 structured synthetic transactions with realistic lifecycles into a merchant sandbox.
   */
  async seedMerchantSandbox(merchantId: string, currency: string = 'INR'): Promise<{
    transactionsCount: number;
    recoveryAttemptsCount: number;
    auditLogsCount: number;
    recoveredAmount: number;
  }> {
    logger.info(`[SandboxSeeder] Starting structured auto-seed for merchant ${merchantId}...`);

    // 1. Create or ensure 10 distinct customers
    const customers = [];
    for (const c of CUSTOMER_SEEDS) {
      let cust = await this.db.customer.findFirst({
        where: { merchantId, email: c.email },
      });
      if (!cust) {
        cust = await this.db.customer.create({
          data: {
            merchantId,
            name: c.name,
            email: c.email,
            phone: c.phone,
          },
        });
      }
      customers.push(cust);
    }

    const now = Date.now();
    let totalRecoveredAmount = 0;
    let attemptsCount = 0;
    let auditLogsCount = 0;

    // 2. Iterate and create 42 structured scenario transactions
    for (let i = 0; i < DEFAULT_SCENARIOS.length; i++) {
      const s = DEFAULT_SCENARIOS[i];
      const customer = customers[i % customers.length];
      const createdAt = new Date(now - s.daysAgo * 24 * 60 * 60 * 1000);
      const updatedAt = new Date(createdAt.getTime() + 1000 * 60 * 5);

      const isRecovered = s.category === 'RECOVERED';
      const isRemind = s.category === 'REMIND';
      const isStop = s.category === 'STOP';
      const isFailed = s.category === 'FAILED';
      const isReview = s.category === 'REVIEW';

      const status: TransactionStatus = isRecovered ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;
      const paymentStatus: PaymentStatus = isRecovered
        ? PaymentStatus.CAPTURED
        : isRemind
        ? PaymentStatus.PENDING
        : PaymentStatus.FAILED;

      const recoveryStatus: TransactionRecoveryStatus = isRecovered
        ? TransactionRecoveryStatus.RECOVERED
        : isRemind
        ? TransactionRecoveryStatus.IN_PROGRESS
        : isStop
        ? TransactionRecoveryStatus.CANCELLED
        : isFailed
        ? TransactionRecoveryStatus.NOT_RECOVERED
        : TransactionRecoveryStatus.REQUIRES_REVIEW;

      const correlationId = `sandbox_scenario_${i + 1}_${Math.floor(Math.random() * 10000)}`;

      // Create transaction
      const txn = await this.db.transaction.create({
        data: {
          merchantId,
          customerId: customer.id,
          amount: s.amount,
          currency,
          status,
          paymentStatus,
          recoveryStatus,
          paymentMethod: s.paymentMethod,
          failureCode: s.failureCode,
          failureReason: s.failureReason,
          retryCount: isRecovered ? 1 : isFailed ? 3 : 0,
          maxRetries: 3,
          razorpayPaymentId: isRecovered ? `pay_synth_${Math.floor(Math.random() * 1000000)}` : null,
          razorpayOrderId: `order_synth_${Math.floor(Math.random() * 1000000)}`,
          correlationId,
          createdAt,
          updatedAt,
        },
      });

      // Create AI Decision
      const aiDecision = await this.db.aIDecision.create({
        data: {
          merchantId,
          transactionId: txn.id,
          agentType: AIAgentType.RECOVERY_DECISION,
          decision: s.aiDecision,
          confidenceScore: s.confidence,
          recoveryProbability: isRecovered ? 0.94 : isRemind ? 0.84 : 0.05,
          reasoning: s.reasoning,
          failureCategory: s.failureCategory,
          rootCause: s.rootCause,
          riskLevel: s.riskLevel,
          modelName: 'gemini-3.5-flash-lite',
          correlationId,
          createdAt: new Date(createdAt.getTime() + 1000 * 30),
        },
      });

      // Create Recovery Attempt if applicable
      let attempt = null;
      if (isRecovered || isRemind || isFailed) {
        const attemptStatus: RecoveryStatus = isRecovered
          ? RecoveryStatus.SUCCESS
          : isRemind
          ? RecoveryStatus.PENDING
          : RecoveryStatus.FAILED;

        const amountRec = isRecovered ? s.amount : 0;
        if (isRecovered) totalRecoveredAmount += s.amount;

        attempt = await this.db.recoveryAttempt.create({
          data: {
            merchantId,
            transactionId: txn.id,
            aiDecisionId: aiDecision.id,
            attemptNumber: isFailed ? 3 : 1,
            idempotencyKey: `idemp_${txn.id}_${Math.floor(Math.random() * 10000)}`,
            actionType: s.aiDecision,
            status: attemptStatus,
            amountRecovered: amountRec,
            reason: s.reasoning,
            scheduledAt: new Date(createdAt.getTime() + 1000 * 45),
            executedAt: isRecovered ? new Date(createdAt.getTime() + 1000 * 120) : null,
            completedAt: isRecovered ? new Date(createdAt.getTime() + 1000 * 180) : null,
            correlationId,
            createdAt: new Date(createdAt.getTime() + 1000 * 40),
            updatedAt: new Date(createdAt.getTime() + 1000 * 180),
          },
        });
        attemptsCount++;

        // Create Payment record for recovered items
        if (isRecovered) {
          await this.db.payment.create({
            data: {
              merchantId,
              transactionId: txn.id,
              recoveryAttemptId: attempt.id,
              razorpayOrderId: txn.razorpayOrderId,
              razorpayPaymentId: txn.razorpayPaymentId,
              amount: s.amount,
              currency,
              status: PaymentStatus.CAPTURED,
              capturedAmount: s.amount,
              verified: true,
              reconciled: true,
              correlationId,
              createdAt: new Date(createdAt.getTime() + 1000 * 180),
            },
          });
        }
      }

      // Create structured Audit Logs for this transaction
      await this.db.auditLog.create({
        data: {
          merchantId,
          transactionId: txn.id,
          entityType: 'TRANSACTION',
          entityId: txn.id,
          action: 'TRANSACTION_FAILED_DETECTED',
          actor: 'RecoverAI Ingestion Daemon',
          actorType: 'SYSTEM',
          correlationId,
          details: {
            environment: 'SANDBOX',
            dataSource: 'SYNTHETIC',
            amount: s.amount,
            failureCode: s.failureCode,
            customer: customer.name,
          },
          createdAt: new Date(createdAt.getTime() + 1000 * 5),
        },
      });
      auditLogsCount++;

      await this.db.auditLog.create({
        data: {
          merchantId,
          transactionId: txn.id,
          entityType: 'AI_DECISION',
          entityId: aiDecision.id,
          action: `AI_DECISION_${s.aiDecision}`,
          actor: 'RecoverAI Neural Engine',
          actorType: 'AI_AGENT',
          correlationId,
          details: {
            environment: 'SANDBOX',
            decision: s.aiDecision,
            confidence: s.confidence,
            category: s.failureCategory,
          },
          createdAt: new Date(createdAt.getTime() + 1000 * 35),
        },
      });
      auditLogsCount++;

      if (isRecovered) {
        await this.db.auditLog.create({
          data: {
            merchantId,
            transactionId: txn.id,
            recoveryAttemptId: attempt ? attempt.id : null,
            entityType: 'RECOVERY_ATTEMPT',
            entityId: attempt ? attempt.id : txn.id,
            action: 'PAYMENT_RECOVERED_AND_VERIFIED',
            actor: 'RecoverAI Settlement Verifier',
            actorType: 'SYSTEM',
            correlationId,
            details: {
              environment: 'SANDBOX',
              amountRecovered: s.amount,
              status: 'SUCCESS',
            },
            createdAt: new Date(createdAt.getTime() + 1000 * 190),
          },
        });
        auditLogsCount++;
      }
    }

    logger.info(
      `[SandboxSeeder] Successfully auto-seeded ${DEFAULT_SCENARIOS.length} transactions, ${attemptsCount} attempts, ${auditLogsCount} audit logs for merchant ${merchantId}.`
    );

    return {
      transactionsCount: DEFAULT_SCENARIOS.length,
      recoveryAttemptsCount: attemptsCount,
      auditLogsCount,
      recoveredAmount: totalRecoveredAmount,
    };
  }

  /**
   * Resets all transactions and recovery records for a sandbox workspace and reseeds cleanly.
   */
  async resetMerchantSandbox(merchantId: string, currency: string = 'INR') {
    logger.info(`[SandboxSeeder] Resetting sandbox data for merchant ${merchantId}...`);

    // Clean only this merchant's transactional records (preserve user and merchant account)
    await this.db.$transaction([
      this.db.payment.deleteMany({ where: { merchantId } }),
      this.db.recoveryAttempt.deleteMany({ where: { merchantId } }),
      this.db.aIDecision.deleteMany({ where: { merchantId } }),
      this.db.auditLog.deleteMany({ where: { merchantId } }),
      this.db.transaction.deleteMany({ where: { merchantId } }),
    ]);

    // Reseed cleanly
    return this.seedMerchantSandbox(merchantId, currency);
  }

  /**
   * Simulates a single live recovery event on demand with realistic lifecycle records.
   */
  async simulateSingleEvent(merchantId: string, options: SimulateEventOptions) {
    const currency = options.currency || 'INR';
    const amount = options.amount || 2499;
    const scenarioKey = options.scenario || 'GATEWAY_TIMEOUT';

    // Pick a customer or create one
    let customer = await this.db.customer.findFirst({ where: { merchantId } });
    if (!customer) {
      customer = await this.db.customer.create({
        data: {
          merchantId,
          name: 'Live Demo Customer',
          email: `demo_user_${Date.now()}@example.test`,
          phone: '+919988776655',
        },
      });
    }

    // Determine outcome
    let outcome = options.outcome || 'SUCCESS';
    if (outcome === 'RANDOM') {
      const outcomes: ('SUCCESS' | 'FAILED' | 'PENDING')[] = ['SUCCESS', 'SUCCESS', 'PENDING', 'FAILED'];
      outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    }

    // Configure scenario metadata
    let failureReason = 'Downstream gateway connection timeout';
    let decision: RecoveryDecision = RecoveryDecision.RETRY;
    let confidence = 0.94;
    let rootCause = 'TEMPORARY_GATEWAY_TIMEOUT';
    let failureCategory = 'TEMPORARY_INFRASTRUCTURE';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    if (scenarioKey === 'OTP_DROPOUT') {
      failureReason = 'Customer dropped off at OTP 3DS challenge page';
      decision = RecoveryDecision.REMIND;
      confidence = 0.86;
      rootCause = 'CUSTOMER_AUTH_DROPOUT';
      failureCategory = 'CUSTOMER_AUTHENTICATION';
    } else if (scenarioKey === 'INSUFFICIENT_FUNDS') {
      failureReason = 'Account balance below debit amount requested';
      decision = RecoveryDecision.STOP;
      confidence = 0.99;
      rootCause = 'INSUFFICIENT_FUNDS';
      failureCategory = 'INSUFFICIENT_FUNDS';
      riskLevel = 'HIGH';
      outcome = 'FAILED';
    } else if (scenarioKey === 'EXPIRED_CARD') {
      failureReason = 'Card expiration date MM/YY is in the past';
      decision = RecoveryDecision.STOP;
      confidence = 0.99;
      rootCause = 'CARD_EXPIRED';
      failureCategory = 'INSTRUMENT_EXPIRATION';
      riskLevel = 'HIGH';
      outcome = 'FAILED';
    } else if (scenarioKey === 'UPI_TIMEOUT') {
      failureReason = 'UPI push notification expired before user approval';
      decision = RecoveryDecision.RETRY;
      confidence = 0.91;
      rootCause = 'UPI_RAIL_LATENCY';
      failureCategory = 'NETWORK_LATENCY';
    } else if (scenarioKey === 'BANK_MAINTENANCE') {
      failureReason = 'Core banking switch under scheduled midnight maintenance';
      decision = RecoveryDecision.WAIT;
      confidence = 0.88;
      rootCause = 'BANK_CBS_MAINTENANCE';
      failureCategory = 'ISSUER_CONGESTION';
      outcome = 'PENDING';
    }

    const now = new Date();
    const correlationId = `sim_evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const isSuccess = outcome === 'SUCCESS';
    const isPending = outcome === 'PENDING';

    const status: TransactionStatus = isSuccess ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;
    const paymentStatus: PaymentStatus = isSuccess
      ? PaymentStatus.CAPTURED
      : isPending
      ? PaymentStatus.PENDING
      : PaymentStatus.FAILED;

    const recoveryStatus: TransactionRecoveryStatus = isSuccess
      ? TransactionRecoveryStatus.RECOVERED
      : isPending
      ? TransactionRecoveryStatus.IN_PROGRESS
      : decision === RecoveryDecision.STOP
      ? TransactionRecoveryStatus.CANCELLED
      : TransactionRecoveryStatus.NOT_RECOVERED;

    const txn = await this.db.transaction.create({
      data: {
        merchantId,
        customerId: customer.id,
        amount,
        currency,
        status,
        paymentStatus,
        recoveryStatus,
        paymentMethod: scenarioKey.includes('UPI') ? 'UPI' : 'CARD',
        failureCode: scenarioKey,
        failureReason,
        retryCount: isSuccess ? 1 : outcome === 'FAILED' && decision === RecoveryDecision.RETRY ? 3 : 0,
        maxRetries: 3,
        razorpayPaymentId: isSuccess ? `pay_sim_${Date.now()}` : null,
        razorpayOrderId: `order_sim_${Date.now()}`,
        correlationId,
        createdAt: now,
        updatedAt: now,
      },
    });

    const aiDecision = await this.db.aIDecision.create({
      data: {
        merchantId,
        transactionId: txn.id,
        agentType: AIAgentType.RECOVERY_DECISION,
        decision,
        confidenceScore: confidence,
        recoveryProbability: isSuccess ? 0.95 : 0.8,
        reasoning: `[LIVE SIMULATION] ${failureReason}. Action: ${decision}`,
        failureCategory,
        rootCause,
        riskLevel,
        modelName: 'gemini-3.5-flash-lite',
        correlationId,
        createdAt: new Date(now.getTime() + 1000),
      },
    });

    let attempt = null;
    if (decision !== RecoveryDecision.STOP) {
      attempt = await this.db.recoveryAttempt.create({
        data: {
          merchantId,
          transactionId: txn.id,
          aiDecisionId: aiDecision.id,
          attemptNumber: 1,
          idempotencyKey: `idemp_${txn.id}_${Date.now()}`,
          actionType: decision,
          status: isSuccess ? RecoveryStatus.SUCCESS : isPending ? RecoveryStatus.PENDING : RecoveryStatus.FAILED,
          amountRecovered: isSuccess ? amount : 0,
          reason: `Simulated live execution of ${decision}`,
          executedAt: isSuccess ? new Date(now.getTime() + 2000) : null,
          correlationId,
          createdAt: new Date(now.getTime() + 1500),
        },
      });

      if (isSuccess) {
        await this.db.payment.create({
          data: {
            merchantId,
            transactionId: txn.id,
            recoveryAttemptId: attempt.id,
            razorpayOrderId: txn.razorpayOrderId,
            razorpayPaymentId: txn.razorpayPaymentId,
            amount,
            currency,
            status: PaymentStatus.CAPTURED,
            capturedAmount: amount,
            verified: true,
            reconciled: true,
            correlationId,
            createdAt: new Date(now.getTime() + 2500),
          },
        });
      }
    }

    // Audit log
    await this.db.auditLog.create({
      data: {
        merchantId,
        transactionId: txn.id,
        entityType: 'TRANSACTION',
        entityId: txn.id,
        action: 'LIVE_SIMULATION_EVENT_EXECUTED',
        actor: 'Developer Simulation Engine',
        actorType: 'SIMULATOR',
        correlationId,
        details: {
          scenario: scenarioKey,
          outcome,
          amount,
          decision,
          status,
        },
        createdAt: new Date(now.getTime() + 3000),
      },
    });

    return {
      transaction: txn,
      aiDecision,
      recoveryAttempt: attempt,
      scenario: scenarioKey,
      outcome,
    };
  }

  /**
   * Retrieves summary counts for the sandbox stats card.
   */
  async getSandboxStats(merchantId: string) {
    const [transactionsCount, recoveryAttemptsCount, auditLogsCount, recoveredPayments] = await Promise.all([
      this.db.transaction.count({ where: { merchantId } }),
      this.db.recoveryAttempt.count({ where: { merchantId } }),
      this.db.auditLog.count({ where: { merchantId } }),
      this.db.payment.aggregate({
        where: { merchantId, status: PaymentStatus.CAPTURED },
        _sum: { amount: true },
      }),
    ]);

    return {
      transactionsCount,
      recoveryAttemptsCount,
      auditLogsCount,
      totalRecoveredAmount: Number(recoveredPayments._sum.amount || 0),
    };
  }
}

export const sandboxSeeder = new SandboxSeederService();
