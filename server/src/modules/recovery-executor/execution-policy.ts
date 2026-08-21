import { ExecutionMode } from './execution.types.js';

export interface ExecutionConfig {
  mode: ExecutionMode;
  maxRetryLimit: number;
  decisionMaxAgeMinutes: number;
  defaultWaitMinutes: number;
  simulationSeed: number;
  supportedModes: ExecutionMode[];
}

export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  mode: (process.env.RECOVERY_EXECUTION_MODE as ExecutionMode) || 'simulation',
  maxRetryLimit: 3,
  decisionMaxAgeMinutes: parseInt(process.env.DECISION_MAX_AGE_MINUTES || '30', 10),
  defaultWaitMinutes: 30,
  simulationSeed: parseInt(process.env.SIMULATION_SEED || '42', 10),
  supportedModes: ['simulation'],
};

export class ExecutionPolicy {
  public static getConfig(): ExecutionConfig {
    const configuredMode = (process.env.RECOVERY_EXECUTION_MODE || 'simulation').toLowerCase() as ExecutionMode;
    const simulationSeed = parseInt(process.env.SIMULATION_SEED || '42', 10);
    const decisionMaxAgeMinutes = parseInt(process.env.DECISION_MAX_AGE_MINUTES || '30', 10);

    return {
      ...DEFAULT_EXECUTION_CONFIG,
      mode: configuredMode,
      simulationSeed,
      decisionMaxAgeMinutes,
    };
  }

  public static validateExecutionMode(mode: string): ExecutionMode {
    const normalized = mode.toLowerCase() as ExecutionMode;
    if (normalized !== 'simulation') {
      throw new Error(
        `[ExecutionPolicy] Execution mode '${mode}' is unsupported in Phase 6. Only 'simulation' mode is permitted. System fails closed.`
      );
    }
    return normalized;
  }
}
