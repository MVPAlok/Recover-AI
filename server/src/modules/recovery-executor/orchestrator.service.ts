import { randomUUID } from 'crypto';
import {
  AIAgentType,
  PaymentStatus,
  RecoveryDecision,
  RecoveryStatus,
  TransactionRecoveryStatus,
  TransactionStatus,
  WebhookProcessingStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { DetectionService } from '../detection/detection.service.js';
import { DiagnosisService } from '../diagnosis/diagnosis.service.js';
import { DecisionService } from '../recovery-decision/decision.service.js';
import { RecoveryExecutorService } from './recovery-executor.service.js';
import { ExecutionMode, RecoveryExecutionResult } from './execution.types.js';

export interface AutonomousPipelineResult {
  success: boolean;
  transactionId: string;
  correlationId: string;
  requestId: string;
  detectionScore?: number;
  diagnosisCode?: string;
  decision?: RecoveryDecision;
  executionResult?: RecoveryExecutionResult;
  status: 'EXECUTED' | 'HALTED_BY_POLICY' | 'FAILED' | 'SKIPPED';
  message: string;
  stagesCompleted: string[];
}

export class RecoveryOrchestratorService {
  private detectionService: DetectionService;
  private diagnosisService: DiagnosisService;
  private decisionService: DecisionService;
  private executorService: RecoveryExecutorService;

  constructor(
    detectionService?: DetectionService,
    diagnosisService?: DiagnosisService,
    decisionService?: DecisionService,
    executorService?: RecoveryExecutorService
  ) {
    this.detectionService = detectionService || new DetectionService();
    this.diagnosisService = diagnosisService || new DiagnosisService();
    this.decisionService = decisionService || new DecisionService();
    this.executorService = executorService || new RecoveryExecutorService();
  }

  /**
   * Executes the canonical 6-stage autonomous recovery lifecycle for a failed transaction.
   *
   * Stage 1: Detect & Score
   * Stage 2: Diagnose (Gemini AI + Fallback)
   * Stage 3: Decide (Deterministic Safety Policies)
   * Stage 4: Execute (Dispatched via BullMQ/Queue Provider)
   * Stage 5 & 6: Prepares State for Verification & Reconciliation
   */
  async runAutonomousRecovery(params: {
    transactionId: string;
    correlationId?: string;
    requestId?: string;
    executionMode?: ExecutionMode;
  }): Promise<AutonomousPipelineResult> {
    const { transactionId } = params;
    const correlationId = params.correlationId || randomUUID();
    const requestId = params.requestId || randomUUID();
    const stagesCompleted: string[] = [];

    logger.info(
      `[RecoveryOrchestrator] Starting autonomous recovery pipeline for transaction: ${transactionId} (Correlation: ${correlationId})`
    );

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        merchant: true,
        aiDecisions: true,
        recoveryAttempts: { orderBy: { attemptNumber: 'desc' } },
      },
    });

    if (!tx) {
      throw new Error(`Transaction with ID '${transactionId}' not found.`);
    }

    if (tx.status === TransactionStatus.SUCCESS || tx.recoveryStatus === TransactionRecoveryStatus.RECOVERED) {
      logger.info(`[RecoveryOrchestrator] Transaction ${transactionId} is already RECOVERED. Skipping pipeline.`);
      return {
        success: true,
        transactionId,
        correlationId,
        requestId,
        status: 'SKIPPED',
        message: `Transaction ${transactionId} is already recovered.`,
        stagesCompleted,
      };
    }

    // Set Recovery State to IN_PROGRESS
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        recoveryStatus: TransactionRecoveryStatus.IN_PROGRESS,
        correlationId,
      },
    });

    try {
      // -------------------------------------------------------------
      // STAGE 1: DETECT & SCORE
      // -------------------------------------------------------------
      logger.info(`[RecoveryOrchestrator] [01 / DETECT] Analyzing transaction failure features...`);
      const detectionResult = await this.detectionService.analyzeTransaction(transactionId, true);
      stagesCompleted.push('01_DETECT');

      // -------------------------------------------------------------
      // STAGE 2: DIAGNOSE (Gemini AI + Transparent Fallback)
      // -------------------------------------------------------------
      logger.info(`[RecoveryOrchestrator] [02 / DIAGNOSE] Performing root-cause diagnosis...`);
      const diagnosisResult = await this.diagnosisService.diagnoseTransaction(transactionId, true);
      stagesCompleted.push('02_DIAGNOSE');

      // -------------------------------------------------------------
      // STAGE 3: DECIDE (Deterministic Safety Rules)
      // -------------------------------------------------------------
      logger.info(`[RecoveryOrchestrator] [03 / DECIDE] Evaluating authoritative recovery safety policy...`);
      const decisionResult = await this.decisionService.evaluateTransaction(transactionId, true, true);
      stagesCompleted.push('03_DECIDE');

      // -------------------------------------------------------------
      // STAGE 4: EXECUTE (Queue / Provider Execution)
      // -------------------------------------------------------------
      logger.info(`[RecoveryOrchestrator] [04 / EXECUTE] Dispatching recovery action '${decisionResult.decision}'...`);
      const executionResult = await this.executorService.executeDecision({
        transactionId,
        executionMode: params.executionMode || 'simulation',
      });
      stagesCompleted.push('04_EXECUTE');

      const isPolicyHalt =
        decisionResult.decision === RecoveryDecision.STOP ||
        executionResult.status === RecoveryStatus.CANCELLED;

      // Create Audit Log of Autonomous Pipeline Execution
      await prisma.auditLog.create({
        data: {
          merchantId: tx.merchantId,
          transactionId: tx.id,
          recoveryAttemptId: executionResult.recoveryAttemptId,
          entityType: 'AUTONOMOUS_PIPELINE',
          entityId: transactionId,
          action: isPolicyHalt ? 'PIPELINE_HALTED_BY_POLICY' : 'PIPELINE_ACTION_DISPATCHED',
          actor: 'RecoverAI Autonomous Agent',
          actorType: 'SYSTEM_AGENT',
          correlationId,
          requestId,
          details: {
            detectionScore: detectionResult.recoveryProbability,
            diagnosisCode: diagnosisResult.diagnosisCode,
            decision: decisionResult.decision,
            executionOutcome: executionResult.outcomeCode,
            status: executionResult.status,
            stagesCompleted,
          },
        },
      });

      return {
        success: true,
        transactionId,
        correlationId,
        requestId,
        detectionScore: detectionResult.recoveryProbability,
        diagnosisCode: diagnosisResult.diagnosisCode,
        decision: decisionResult.decision,
        executionResult,
        status: isPolicyHalt ? 'HALTED_BY_POLICY' : 'EXECUTED',
        message: executionResult.message || `Autonomous pipeline completed with decision '${decisionResult.decision}'`,
        stagesCompleted,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`[RecoveryOrchestrator] Autonomous pipeline failed for ${transactionId}: ${errorMessage}`);

      await prisma.auditLog.create({
        data: {
          merchantId: tx.merchantId,
          transactionId: tx.id,
          entityType: 'AUTONOMOUS_PIPELINE',
          entityId: transactionId,
          action: 'PIPELINE_ERROR',
          actor: 'RecoverAI Autonomous Agent',
          actorType: 'SYSTEM_AGENT',
          correlationId,
          requestId,
          details: {
            error: errorMessage,
            stagesCompleted,
          },
        },
      });

      return {
        success: false,
        transactionId,
        correlationId,
        requestId,
        status: 'FAILED',
        message: `Pipeline failure: ${errorMessage}`,
        stagesCompleted,
      };
    }
  }
}
