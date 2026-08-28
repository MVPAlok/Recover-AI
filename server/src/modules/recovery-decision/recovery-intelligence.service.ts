import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { AIAgentType, RecoveryDecision, TransactionStatus } from '@prisma/client';

export interface StrategyOption {
  strategyId: 'RETRY' | 'PAYMENT_LINK' | 'REMIND' | 'SCHEDULED_WAIT' | 'MANUAL_REVIEW' | 'STOP';
  name: string;
  action: string;
  probability: number; // 0-100 percentage
  expectedRecoveryValue: number; // INR
  status: 'PREFERRED' | 'VIABLE' | 'SUBOPTIMAL' | 'DISQUALIFIED';
  reasoning: string;
  tradeoffs: string[];
}

export interface CustomerRecoveryProfile {
  customerId: string;
  customerName: string;
  customerEmail: string;
  totalHistoricalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  historicalRecoveryRate: number;
  lifetimeSpend: number;
  responsivenessTier: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RecoveryIntelligenceReport {
  transactionId: string;
  amount: number;
  currency: string;
  failureCode: string;
  customerProfile: CustomerRecoveryProfile;
  strategies: StrategyOption[];
  preferredStrategy: StrategyOption;
  aiExplanation: {
    primaryReason: string;
    counterfactuals: string[];
    riskAssessment: string;
    confidenceScore: number;
  };
  environment: 'TEST_MODE';
  generatedAt: string;
}

export class RecoveryIntelligenceService {
  /**
   * Generates a multi-strategy comparative intelligence report with Expected Recovery Values (EV)
   * and counterfactual AI explanations.
   */
  async generateIntelligenceReport(transactionId: string): Promise<RecoveryIntelligenceReport> {
    logger.info(`[RecoveryIntelligence] Generating comparative intelligence for transaction ${transactionId}`);

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        merchant: true,
        aiDecisions: { orderBy: { createdAt: 'desc' } },
        recoveryAttempts: { orderBy: { attemptNumber: 'desc' } },
      },
    });

    if (!tx) {
      throw new Error(`Transaction '${transactionId}' not found.`);
    }

    const amount = tx.amount.toNumber();
    const failureCode = (tx.failureCode || 'UNKNOWN').toUpperCase();
    const retryCount = tx.retryCount;

    // Load customer prior history
    const priorTransactions = await prisma.transaction.findMany({
      where: {
        customerId: tx.customerId,
        id: { not: tx.id },
      },
      select: { amount: true, status: true },
    });

    const totalPrior = priorTransactions.length;
    const successfulPrior = priorTransactions.filter((t) => t.status === TransactionStatus.SUCCESS).length;
    const failedPrior = priorTransactions.filter((t) => t.status === TransactionStatus.FAILED).length;
    const lifetimeSpend = priorTransactions
      .filter((t) => t.status === TransactionStatus.SUCCESS)
      .reduce((sum, t) => sum + t.amount.toNumber(), 0);

    const historicalRecoveryRate = totalPrior > 0 ? Number(((successfulPrior / totalPrior) * 100).toFixed(1)) : 75.0;
    const responsivenessTier: 'HIGH' | 'MEDIUM' | 'LOW' =
      historicalRecoveryRate >= 80 ? 'HIGH' : historicalRecoveryRate >= 50 ? 'MEDIUM' : 'LOW';

    const customerProfile: CustomerRecoveryProfile = {
      customerId: tx.customerId,
      customerName: tx.customer.name,
      customerEmail: tx.customer.email,
      totalHistoricalTransactions: totalPrior,
      successfulTransactions: successfulPrior,
      failedTransactions: failedPrior,
      historicalRecoveryRate,
      lifetimeSpend,
      responsivenessTier,
    };

    // Calculate Comparative Strategy Matrix
    const strategies: StrategyOption[] = [];

    // Strategy 1: Gateway Auto-Retry (Background)
    let retryProb = 0;
    let retryReason = '';
    let retryStatus: StrategyOption['status'] = 'VIABLE';

    if (retryCount >= 3) {
      retryProb = 0;
      retryStatus = 'DISQUALIFIED';
      retryReason = 'Hard policy stop: Retry limit of 3 exceeded to protect merchant reputation.';
    } else if (failureCode.includes('TIMEOUT') || failureCode.includes('GATEWAY') || failureCode.includes('NETWORK')) {
      retryProb = retryCount === 0 ? 82 : retryCount === 1 ? 65 : 40;
      retryStatus = 'PREFERRED';
      retryReason = 'High recovery probability for transient infrastructure timeout.';
    } else if (failureCode.includes('AUTH') || failureCode.includes('OTP')) {
      retryProb = 35;
      retryStatus = 'SUBOPTIMAL';
      retryReason = 'Automated gateway retry will likely fail because customer interaction is required for 3DS OTP.';
    } else if (failureCode.includes('FUNDS')) {
      retryProb = 20;
      retryStatus = 'SUBOPTIMAL';
      retryReason = 'Immediate retry has low yield for insufficient funds without account reload.';
    } else {
      retryProb = 45;
      retryReason = 'Standard background retry attempt.';
    }

    strategies.push({
      strategyId: 'RETRY',
      name: 'Strategy A: Automated Gateway Retry',
      action: 'Background retry via Razorpay Test Mode Order',
      probability: retryProb,
      expectedRecoveryValue: Math.round(amount * (retryProb / 100)),
      status: retryStatus,
      reasoning: retryReason,
      tradeoffs: ['Zero friction for user', 'May consume merchant retry quota if decline is permanent'],
    });

    // Strategy 2: 1-Click Payment Link (WhatsApp / UPI Intent)
    let linkProb = 0;
    let linkReason = '';
    let linkStatus: StrategyOption['status'] = 'VIABLE';

    if (failureCode.includes('AUTH') || failureCode.includes('OTP') || failureCode.includes('CUSTOMER')) {
      linkProb = responsivenessTier === 'HIGH' ? 78 : responsivenessTier === 'MEDIUM' ? 71 : 58;
      linkStatus = 'PREFERRED';
      linkReason = '1-click dynamic UPI Intent bypasses card entry drop-off and allows instant biometric approval.';
    } else if (failureCode.includes('FUNDS')) {
      linkProb = 52;
      linkReason = 'Allows customer to switch payment instrument (e.g. from low-balance bank to UPI/Credit Card).';
    } else {
      linkProb = 60;
      linkReason = 'Offers alternate payment methods directly to customer.';
    }

    strategies.push({
      strategyId: 'PAYMENT_LINK',
      name: 'Strategy B: 1-Click Interactive Payment Link',
      action: 'Generate Razorpay Test Payment Link with WhatsApp/UPI intent',
      probability: linkProb,
      expectedRecoveryValue: Math.round(amount * (linkProb / 100)),
      status: linkStatus,
      reasoning: linkReason,
      tradeoffs: ['Requires customer click/interaction', 'Higher conversion for auth and balance issues'],
    });

    // Strategy 3: Multi-Channel Reminder (Email / SMS)
    let reminderProb = Math.max(15, Math.min(85, Math.round(linkProb * 0.78)));
    strategies.push({
      strategyId: 'REMIND',
      name: 'Strategy C: Email & SMS Recovery Reminder',
      action: 'Dispatch branded recovery email and SMS notice',
      probability: reminderProb,
      expectedRecoveryValue: Math.round(amount * (reminderProb / 100)),
      status: linkStatus === 'PREFERRED' ? 'VIABLE' : 'SUBOPTIMAL',
      reasoning: 'Non-intrusive reminder notifying customer of pending cart with direct checkout resume.',
      tradeoffs: ['Lower open rates than WhatsApp', 'Gentle customer experience'],
    });

    // Strategy 4: Scheduled Observation Delay (Bank Downtime Window)
    let waitProb = failureCode.includes('BANK') ? 74 : 35;
    strategies.push({
      strategyId: 'SCHEDULED_WAIT',
      name: 'Strategy D: Scheduled Window Wait (30 min)',
      action: 'Hold execution in BullMQ delayed queue until bank nodes recover',
      probability: waitProb,
      expectedRecoveryValue: Math.round(amount * (waitProb / 100)),
      status: failureCode.includes('BANK') ? 'PREFERRED' : 'VIABLE',
      reasoning: 'Prevents immediate decline loops while issuer bank settlement nodes are degraded.',
      tradeoffs: ['Delays immediate recovery', 'Protects merchant authorization score'],
    });

    // Sort or resolve preferred strategy based on EV (Expected Value) and policy rules
    let preferred = strategies.find((s) => s.status === 'PREFERRED') || strategies[0];
    if (retryCount >= 3) {
      preferred = strategies.find((s) => s.strategyId === 'PAYMENT_LINK') || strategies[1];
    }

    // AI Explanation & Counterfactuals
    const counterfactuals: string[] = [];
    if (preferred.strategyId === 'PAYMENT_LINK') {
      counterfactuals.push(
        `If Automated Retry were chosen instead, recovery probability would drop from ${preferred.probability}% (EV ₹${preferred.expectedRecoveryValue.toLocaleString('en-IN')}) to ${retryProb}% (EV ₹${Math.round(amount * (retryProb / 100)).toLocaleString('en-IN')}) due to lack of customer biometric re-authentication.`
      );
    } else if (preferred.strategyId === 'RETRY') {
      counterfactuals.push(
        `Automated Retry provides immediate zero-touch reconciliation (Probability ${preferred.probability}%, EV ₹${preferred.expectedRecoveryValue.toLocaleString('en-IN')}) without burdening the customer with manual payment link clicks.`
      );
    }

    return {
      transactionId,
      amount,
      currency: tx.currency,
      failureCode: tx.failureCode || 'UNKNOWN',
      customerProfile,
      strategies,
      preferredStrategy: preferred,
      aiExplanation: {
        primaryReason: preferred.reasoning,
        counterfactuals,
        riskAssessment:
          amount >= 50000 ? 'HIGH_EXPOSURE_TRANSACTION' : responsivenessTier === 'HIGH' ? 'TRUSTED_CUSTOMER' : 'STANDARD_RISK',
        confidenceScore: 0.92,
      },
      environment: 'TEST_MODE',
      generatedAt: new Date().toISOString(),
    };
  }
}
