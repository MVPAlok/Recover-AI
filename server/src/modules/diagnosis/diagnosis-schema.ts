import { z } from 'zod';

export const diagnosisResponseSchema = z.object({
  diagnosisCode: z.enum([
    'TEMPORARY_BANK_FAILURE',
    'TEMPORARY_GATEWAY_FAILURE',
    'NETWORK_FAILURE',
    'UPI_PROCESSING_FAILURE',
    'CUSTOMER_AUTHENTICATION_FAILURE',
    'INSUFFICIENT_FUNDS',
    'CARD_DECLINED',
    'EXPIRED_PAYMENT_INSTRUMENT',
    'UNKNOWN_PAYMENT_FAILURE',
  ]),
  failureCategory: z.enum([
    'TEMPORARY_INFRASTRUCTURE',
    'CUSTOMER_AUTHENTICATION',
    'FINANCIAL_HARD',
    'INSTRUMENT_EXPIRATION',
    'UNKNOWN',
  ]),
  confidence: z
    .number()
    .min(0.0, 'Confidence must be at least 0.0')
    .max(1.0, 'Confidence cannot exceed 1.0'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  isLikelyTemporary: z.boolean(),
  evidence: z
    .array(z.string().min(1, 'Evidence item cannot be empty'))
    .min(1, 'At least one piece of evidence is required'),
  reasoning: z.string().min(10, 'Reasoning explanation must be descriptive'),
  recommendedNextStep: z.enum([
    'EVALUATE_RETRY',
    'EVALUATE_REMINDER',
    'EVALUATE_ESCALATION',
    'WAIT_FOR_RETRY_WINDOW',
    'NO_RECOVERY_RECOMMENDED',
    'NEEDS_MORE_INFORMATION',
  ]),
});

export type RawDiagnosisLLMOutput = z.infer<typeof diagnosisResponseSchema>;
