import { SeededRandom } from '../utils/random.js';
import { GeneratedCustomer } from '../generators/customer.generator.js';
import {
  FAILURE_CODE_TO_REASON_MAP,
  RecoveryScenarioType,
} from '../utils/distributions.js';

export interface RawTransactionData {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  paymentMethod: string;
  failureCode: string | null;
  failureReason: string | null;
  retryCount: number;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  scenarioTag?: RecoveryScenarioType;
}

export function generateScenarioTransactions(
  customer: GeneratedCustomer,
  scenarioType: RecoveryScenarioType,
  rng: SeededRandom,
  startTime: Date,
  endTime: Date,
  txIdCounter: { value: number }
): RawTransactionData[] {
  const txs: RawTransactionData[] = [];
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();
  const spanMs = endMs - startMs;

  const baseAmount = customer.profile.type === 'HIGH_VALUE' ? 18000 : 2499;

  switch (scenarioType) {
    case RecoveryScenarioType.SCENARIO_A_STRONG_CUSTOMER_TEMP_FAILURE: {
      // 4 previous successes, then 1 BANK_TIMEOUT with retryCount = 0
      const historyCount = 4;
      for (let i = 0; i < historyCount; i++) {
        const time = new Date(startMs + (spanMs * (i + 1)) / (historyCount + 2));
        txIdCounter.value++;
        txs.push({
          id: `txn_${txIdCounter.value.toString().padStart(6, '0')}`,
          merchantId: customer.merchantId,
          customerId: customer.id,
          amount: baseAmount,
          currency: 'INR',
          status: 'SUCCESS',
          paymentMethod: 'UPI',
          failureCode: null,
          failureReason: null,
          retryCount: 0,
          razorpayPaymentId: `pay_test_${rng.nextInt(10000000, 99999999)}`,
          razorpayOrderId: `order_test_${rng.nextInt(10000000, 99999999)}`,
          createdAt: time,
          updatedAt: new Date(time.getTime() + 1000 * 60 * 2),
        });
      }

      // Target current failed transaction
      const targetTime = new Date(endMs - 1000 * 60 * 30);
      txIdCounter.value++;
      txs.push({
        id: `txn_${txIdCounter.value.toString().padStart(6, '0')}`,
        merchantId: customer.merchantId,
        customerId: customer.id,
        amount: baseAmount,
        currency: 'INR',
        status: 'FAILED',
        paymentMethod: 'UPI',
        failureCode: 'BANK_TIMEOUT',
        failureReason: FAILURE_CODE_TO_REASON_MAP['BANK_TIMEOUT'],
        retryCount: 0,
        razorpayPaymentId: null,
        razorpayOrderId: `order_test_${rng.nextInt(10000000, 99999999)}`,
        createdAt: targetTime,
        updatedAt: targetTime,
        scenarioTag: RecoveryScenarioType.SCENARIO_A_STRONG_CUSTOMER_TEMP_FAILURE,
      });
      break;
    }

    case RecoveryScenarioType.SCENARIO_B_REPEATED_FAILURE_INSUFFICIENT_FUNDS: {
      // 2 failures, then current failure with INSUFFICIENT_FUNDS and retryCount >= 2
      const historyCount = 2;
      for (let i = 0; i < historyCount; i++) {
        const time = new Date(startMs + (spanMs * (i + 1)) / (historyCount + 2));
        txIdCounter.value++;
        txs.push({
          id: `txn_${txIdCounter.value.toString().padStart(6, '0')}`,
          merchantId: customer.merchantId,
          customerId: customer.id,
          amount: baseAmount,
          currency: 'INR',
          status: 'FAILED',
          paymentMethod: 'DEBIT_CARD',
          failureCode: 'INSUFFICIENT_FUNDS',
          failureReason: FAILURE_CODE_TO_REASON_MAP['INSUFFICIENT_FUNDS'],
          retryCount: i,
          razorpayPaymentId: null,
          razorpayOrderId: `order_test_${rng.nextInt(10000000, 99999999)}`,
          createdAt: time,
          updatedAt: time,
        });
      }

      const targetTime = new Date(endMs - 1000 * 60 * 20);
      txIdCounter.value++;
      txs.push({
        id: `txn_${txIdCounter.value.toString().padStart(6, '0')}`,
        merchantId: customer.merchantId,
        customerId: customer.id,
        amount: baseAmount,
        currency: 'INR',
        status: 'FAILED',
        paymentMethod: 'DEBIT_CARD',
        failureCode: 'INSUFFICIENT_FUNDS',
        failureReason: FAILURE_CODE_TO_REASON_MAP['INSUFFICIENT_FUNDS'],
        retryCount: 2,
        razorpayPaymentId: null,
        razorpayOrderId: `order_test_${rng.nextInt(10000000, 99999999)}`,
        createdAt: targetTime,
        updatedAt: targetTime,
        scenarioTag: RecoveryScenarioType.SCENARIO_B_REPEATED_FAILURE_INSUFFICIENT_FUNDS,
      });
      break;
    }

    case RecoveryScenarioType.SCENARIO_C_AUTHENTICATION_FAILURE: {
      // 3 successes, then 1 AUTHENTICATION_FAILURE
      const historyCount = 3;
      for (let i = 0; i < historyCount; i++) {
        const time = new Date(startMs + (spanMs * (i + 1)) / (historyCount + 2));
        txIdCounter.value++;
        txs.push({
          id: `txn_${txIdCounter.value.toString().padStart(6, '0')}`,
          merchantId: customer.merchantId,
          customerId: customer.id,
          amount: baseAmount,
          currency: 'INR',
          status: 'SUCCESS',
          paymentMethod: 'CREDIT_CARD',
          failureCode: null,
          failureReason: null,
          retryCount: 0,
          razorpayPaymentId: `pay_test_${rng.nextInt(10000000, 99999999)}`,
          razorpayOrderId: `order_test_${rng.nextInt(10000000, 99999999)}`,
          createdAt: time,
          updatedAt: new Date(time.getTime() + 1000 * 60 * 2),
        });
      }

      const targetTime = new Date(endMs - 1000 * 60 * 45);
      txIdCounter.value++;
      txs.push({
        id: `txn_${txIdCounter.value.toString().padStart(6, '0')}`,
        merchantId: customer.merchantId,
        customerId: customer.id,
        amount: baseAmount,
        currency: 'INR',
        status: 'FAILED',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'AUTHENTICATION_FAILURE',
        failureReason: FAILURE_CODE_TO_REASON_MAP['AUTHENTICATION_FAILURE'],
        retryCount: 0,
        razorpayPaymentId: null,
        razorpayOrderId: `order_test_${rng.nextInt(10000000, 99999999)}`,
        createdAt: targetTime,
        updatedAt: targetTime,
        scenarioTag: RecoveryScenarioType.SCENARIO_C_AUTHENTICATION_FAILURE,
      });
      break;
    }

    case RecoveryScenarioType.SCENARIO_D_GATEWAY_TIMEOUT: {
      // 2 successes, then 1 GATEWAY_TIMEOUT with retryCount = 0
      const historyCount = 2;
      for (let i = 0; i < historyCount; i++) {
        const time = new Date(startMs + (spanMs * (i + 1)) / (historyCount + 2));
        txIdCounter.value++;
        txs.push({
          id: `txn_${txIdCounter.value.toString().padStart(6, '0')}`,
          merchantId: customer.merchantId,
          customerId: customer.id,
          amount: baseAmount,
          currency: 'INR',
          status: 'SUCCESS',
          paymentMethod: 'CREDIT_CARD',
          failureCode: null,
          failureReason: null,
          retryCount: 0,
          razorpayPaymentId: `pay_test_${rng.nextInt(10000000, 99999999)}`,
          razorpayOrderId: `order_test_${rng.nextInt(10000000, 99999999)}`,
          createdAt: time,
          updatedAt: new Date(time.getTime() + 1000 * 60 * 2),
        });
      }

      const targetTime = new Date(endMs - 1000 * 60 * 15);
      txIdCounter.value++;
      txs.push({
        id: `txn_${txIdCounter.value.toString().padStart(6, '0')}`,
        merchantId: customer.merchantId,
        customerId: customer.id,
        amount: baseAmount,
        currency: 'INR',
        status: 'FAILED',
        paymentMethod: 'CREDIT_CARD',
        failureCode: 'GATEWAY_TIMEOUT',
        failureReason: FAILURE_CODE_TO_REASON_MAP['GATEWAY_TIMEOUT'],
        retryCount: 0,
        razorpayPaymentId: null,
        razorpayOrderId: `order_test_${rng.nextInt(10000000, 99999999)}`,
        createdAt: targetTime,
        updatedAt: targetTime,
        scenarioTag: RecoveryScenarioType.SCENARIO_D_GATEWAY_TIMEOUT,
      });
      break;
    }

    case RecoveryScenarioType.SCENARIO_E_REPEATED_RETRY_LIMIT: {
      // 1 initial failure + 3 retries (total retryCount = 3), status FAILED
      const retryAttempts = 3;
      for (let i = 0; i <= retryAttempts; i++) {
        const time = new Date(startMs + (spanMs * (i + 1)) / (retryAttempts + 2));
        txIdCounter.value++;
        const isFinal = i === retryAttempts;
        txs.push({
          id: `txn_${txIdCounter.value.toString().padStart(6, '0')}`,
          merchantId: customer.merchantId,
          customerId: customer.id,
          amount: baseAmount,
          currency: 'INR',
          status: 'FAILED',
          paymentMethod: 'UPI',
          failureCode: 'CARD_DECLINED',
          failureReason: FAILURE_CODE_TO_REASON_MAP['CARD_DECLINED'],
          retryCount: i,
          razorpayPaymentId: null,
          razorpayOrderId: `order_test_${rng.nextInt(10000000, 99999999)}`,
          createdAt: time,
          updatedAt: time,
          scenarioTag: isFinal ? RecoveryScenarioType.SCENARIO_E_REPEATED_RETRY_LIMIT : undefined,
        });
      }
      break;
    }
  }

  return txs;
}
