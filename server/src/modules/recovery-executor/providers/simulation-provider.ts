import {
  EscalationExecutionInput,
  ProviderExecutionResult,
  ReminderExecutionInput,
  RetryExecutionInput,
  StopExecutionInput,
  WaitExecutionInput,
} from '../execution.types.js';
import { RecoveryProvider } from './recovery-provider.js';
import { ExecutionPolicy } from '../execution-policy.js';

export class SimulationRecoveryProvider implements RecoveryProvider {
  public readonly providerName = 'SimulationRecoveryProvider';
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? ExecutionPolicy.getConfig().simulationSeed;
  }

  /**
   * Generates a deterministic floating point number in [0, 1) for a given transaction ID and seed.
   */
  private getDeterministicFloat(transactionId: string, salt = ''): number {
    const combined = `${this.seed}:${transactionId}:${salt}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash % 100000) / 100000;
  }

  /**
   * Executes a simulated payment retry without invoking real payment gateways.
   */
  async executeRetry(input: RetryExecutionInput): Promise<ProviderExecutionResult> {
    const probability = input.recoveryProbability ?? 0.75;
    const roll = this.getDeterministicFloat(input.transactionId, `retry_${input.retryCount}`);

    const isSuccessful = roll < probability;

    if (isSuccessful) {
      return {
        success: true,
        status: 'SUCCESS',
        outcomeCode: 'PAYMENT_RECOVERED',
        amountRecovered: input.amount,
        message: 'Simulated retry successfully recovered the transaction.',
        executedAt: new Date(),
        metadata: {
          simulationSeed: this.seed,
          simulatedRoll: roll,
          recoveryProbability: probability,
          recoveredAmount: input.amount,
        },
      };
    } else {
      return {
        success: false,
        status: 'FAILED',
        outcomeCode: 'RECOVERY_ATTEMPT_FAILED',
        amountRecovered: 0,
        message: 'Simulated retry did not recover the payment.',
        executedAt: new Date(),
        metadata: {
          simulationSeed: this.seed,
          simulatedRoll: roll,
          recoveryProbability: probability,
        },
      };
    }
  }

  /**
   * Simulates sending a customer reminder.
   */
  async executeReminder(input: ReminderExecutionInput): Promise<ProviderExecutionResult> {
    return {
      success: true,
      status: 'SUCCESS',
      outcomeCode: 'REMINDER_SIMULATED',
      amountRecovered: 0,
      message: 'Simulated customer reminder dispatched via configured channels.',
      executedAt: new Date(),
      metadata: {
        simulationSeed: this.seed,
        channel: 'EMAIL_AND_SMS',
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
      },
    };
  }

  /**
   * Simulates opening an escalation case for customer support.
   */
  async executeEscalation(input: EscalationExecutionInput): Promise<ProviderExecutionResult> {
    return {
      success: true,
      status: 'SUCCESS',
      outcomeCode: 'ESCALATION_CREATED',
      amountRecovered: 0,
      message: 'Simulated escalation case created for manual agent review.',
      executedAt: new Date(),
      metadata: {
        simulationSeed: this.seed,
        ticketId: `SIM_ESC_${input.transactionId.slice(-6).toUpperCase()}`,
        reason: input.reason || input.failureReason,
      },
    };
  }

  /**
   * Simulates scheduling a future wait window for the recovery attempt.
   */
  async executeWait(input: WaitExecutionInput): Promise<ProviderExecutionResult> {
    const waitMinutes = input.waitMinutes || ExecutionPolicy.getConfig().defaultWaitMinutes;
    const scheduledAt = new Date(Date.now() + waitMinutes * 60 * 1000);

    return {
      success: true,
      status: 'PENDING',
      outcomeCode: 'WAIT_SCHEDULED',
      amountRecovered: 0,
      message: `Recovery execution wait window scheduled for ${waitMinutes} minutes.`,
      scheduledAt,
      metadata: {
        simulationSeed: this.seed,
        waitMinutes,
        scheduledAt: scheduledAt.toISOString(),
      },
    };
  }

  /**
   * Simulates stopping recovery attempts per policy.
   */
  async executeStop(input: StopExecutionInput): Promise<ProviderExecutionResult> {
    return {
      success: true,
      status: 'CANCELLED',
      outcomeCode: 'RECOVERY_STOPPED_BY_POLICY',
      amountRecovered: 0,
      message: 'Recovery aborted by policy - no action taken.',
      executedAt: new Date(),
      metadata: {
        simulationSeed: this.seed,
        reason: input.reason || 'RECOVERY_STOPPED_BY_POLICY',
      },
    };
  }
}
