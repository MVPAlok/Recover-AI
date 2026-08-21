import { SeededRandom } from '../utils/random.js';
import { GeneratedCustomer } from './customer.generator.js';
import {
  FAILURE_TAXONOMY,
  FAILURE_CODE_TO_REASON_MAP,
  PAYMENT_METHODS,
  REALISTIC_PRICE_TIERS,
  RecoveryScenarioType,
} from '../utils/distributions.js';
import {
  generateScenarioTransactions,
  RawTransactionData,
} from '../scenarios/recovery-scenarios.js';

export function generateAllTransactions(
  customers: GeneratedCustomer[],
  targetTransactionCount: number,
  rng: SeededRandom,
  baseDate: Date
): { transactions: RawTransactionData[]; scenarioCounts: Record<string, number> } {
  const transactions: RawTransactionData[] = [];
  const txIdCounter = { value: 0 };
  const scenarioCounts: Record<string, number> = {
    [RecoveryScenarioType.SCENARIO_A_STRONG_CUSTOMER_TEMP_FAILURE]: 0,
    [RecoveryScenarioType.SCENARIO_B_REPEATED_FAILURE_INSUFFICIENT_FUNDS]: 0,
    [RecoveryScenarioType.SCENARIO_C_AUTHENTICATION_FAILURE]: 0,
    [RecoveryScenarioType.SCENARIO_D_GATEWAY_TIMEOUT]: 0,
    [RecoveryScenarioType.SCENARIO_E_REPEATED_RETRY_LIMIT]: 0,
  };

  // Customers set aside for deliberate scenarios
  const shuffledCustomers = rng.shuffle([...customers]);
  const scenarioCustomers = {
    scenarioA: shuffledCustomers.slice(0, 8),
    scenarioB: shuffledCustomers.slice(8, 16),
    scenarioC: shuffledCustomers.slice(16, 24),
    scenarioD: shuffledCustomers.slice(24, 32),
    scenarioE: shuffledCustomers.slice(32, 40),
  };

  const scenarioCustomerIds = new Set(
    [
      ...scenarioCustomers.scenarioA,
      ...scenarioCustomers.scenarioB,
      ...scenarioCustomers.scenarioC,
      ...scenarioCustomers.scenarioD,
      ...scenarioCustomers.scenarioE,
    ].map((c) => c.id)
  );

  // 1. Generate deliberate recovery scenarios
  const generateScenarioBatch = (
    custList: GeneratedCustomer[],
    scenarioType: RecoveryScenarioType
  ) => {
    for (const cust of custList) {
      const startTime = new Date(cust.createdAt.getTime() + 1000 * 60 * 60 * 24);
      const endTime = baseDate;
      const scenarioTxs = generateScenarioTransactions(
        cust,
        scenarioType,
        rng,
        startTime,
        endTime,
        txIdCounter
      );
      transactions.push(...scenarioTxs);
      scenarioCounts[scenarioType]++;
    }
  };

  generateScenarioBatch(scenarioCustomers.scenarioA, RecoveryScenarioType.SCENARIO_A_STRONG_CUSTOMER_TEMP_FAILURE);
  generateScenarioBatch(scenarioCustomers.scenarioB, RecoveryScenarioType.SCENARIO_B_REPEATED_FAILURE_INSUFFICIENT_FUNDS);
  generateScenarioBatch(scenarioCustomers.scenarioC, RecoveryScenarioType.SCENARIO_C_AUTHENTICATION_FAILURE);
  generateScenarioBatch(scenarioCustomers.scenarioD, RecoveryScenarioType.SCENARIO_D_GATEWAY_TIMEOUT);
  generateScenarioBatch(scenarioCustomers.scenarioE, RecoveryScenarioType.SCENARIO_E_REPEATED_RETRY_LIMIT);

  // 2. Generate standard background transactions for remaining & all customers to reach target count
  const remainingCount = targetTransactionCount - transactions.length;
  if (remainingCount > 0) {
    const allCustomers = customers;
    // Calculate weights based on customer average transactions
    const txPerCustomerEstimate = Math.ceil(remainingCount / allCustomers.length);

    for (const cust of allCustomers) {
      if (transactions.length >= targetTransactionCount) break;

      const numTxsForCust = rng.nextInt(
        Math.max(1, txPerCustomerEstimate - 3),
        txPerCustomerEstimate + 4
      );

      const custStartMs = cust.createdAt.getTime() + 1000 * 60 * 60 * 6;
      const custEndMs = baseDate.getTime();
      const timeSpanMs = custEndMs - custStartMs;

      for (let i = 0; i < numTxsForCust; i++) {
        if (transactions.length >= targetTransactionCount) break;

        txIdCounter.value++;
        const txId = `txn_${txIdCounter.value.toString().padStart(6, '0')}`;

        // Chronological timestamp
        const txTimeMs = custStartMs + (timeSpanMs * (i + 1)) / (numTxsForCust + 1) + rng.nextInt(-3600000, 3600000);
        const txTime = new Date(Math.min(custEndMs, Math.max(custStartMs, txTimeMs)));

        // Amount selection
        const tierWeights = REALISTIC_PRICE_TIERS.map((t) => t.weight);
        const selectedTier = rng.weightedChoice(REALISTIC_PRICE_TIERS, tierWeights);
        const basePrice = rng.choice(selectedTier.standardAmounts);
        const mult = rng.nextFloat(
          cust.profile.amountMultiplierRange[0],
          cust.profile.amountMultiplierRange[1]
        );
        const rawAmount = Math.round(basePrice * mult);
        const amount = Math.max(99, rawAmount);

        // Payment method selection
        const methodWeights = PAYMENT_METHODS.map((m) => m.weight);
        const paymentMethod = rng.weightedChoice(PAYMENT_METHODS, methodWeights).method;

        // Status selection (~5% PENDING for recent in-flight txns, ~70% SUCCESS, ~25% FAILED)
        const isRecent = baseDate.getTime() - txTime.getTime() < 7 * 24 * 60 * 60 * 1000;
        let status: 'SUCCESS' | 'FAILED' | 'PENDING' = 'SUCCESS';
        let failureCode: string | null = null;
        let failureReason: string | null = null;
        let retryCount = 0;
        let razorpayPaymentId: string | null = null;
        const razorpayOrderId: string | null = `order_test_${rng.nextInt(10000000, 99999999)}`;

        if (isRecent && rng.next() < 0.22) {
          status = 'PENDING';
        } else {
          const successChance = cust.profile.successProbability * 0.96;
          if (rng.next() < successChance) {
            status = 'SUCCESS';
            razorpayPaymentId = `pay_test_${rng.nextInt(10000000, 99999999)}`;
          } else {
            status = 'FAILED';
            // Pick failure code matching payment method if possible
            const applicableFailures = FAILURE_TAXONOMY.filter((f) =>
              f.typicalPaymentMethods.includes(paymentMethod)
            );
            const failureDetail =
              applicableFailures.length > 0
                ? rng.weightedChoice(applicableFailures, applicableFailures.map((f) => f.weight))
                : rng.choice(FAILURE_TAXONOMY);

            failureCode = failureDetail.code;
            failureReason = failureDetail.reason;
            retryCount = rng.next() < 0.25 ? rng.nextInt(1, 2) : 0;
          }
        }

        transactions.push({
          id: txId,
          merchantId: cust.merchantId,
          customerId: cust.id,
          amount,
          currency: 'INR',
          status,
          paymentMethod,
          failureCode,
          failureReason,
          retryCount,
          razorpayPaymentId,
          razorpayOrderId,
          createdAt: txTime,
          updatedAt: new Date(txTime.getTime() + 1000 * 60 * (status === 'SUCCESS' ? 2 : 0)),
        });
      }
    }
  }

  // Sort overall chronologically by createdAt
  transactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // If slightly exceeding or needing exact count adjustment
  const finalTransactions = transactions.slice(0, targetTransactionCount);

  return {
    transactions: finalTransactions,
    scenarioCounts,
  };
}
