import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';

const router = Router();
const controller = new DashboardController();

// Dashboard overview & opportunities
router.get('/merchants', controller.getMerchants);
router.post('/merchants', controller.createMerchant);
router.get('/overview', controller.getOverview);
router.get('/recovery-opportunities', controller.getRecoveryOpportunities);

// Transactions Explorer
router.get('/transactions', controller.getTransactions);
router.get('/transactions/:transactionId', controller.getTransactionDetail);

// Recovery Center
router.get('/recoveries', controller.getRecoveries);
router.get('/recoveries/:id', controller.getRecoveryDetail);

// Analytics
router.get('/analytics/overview', controller.getAnalyticsOverview);

// Audit Log
router.get('/audit-log', controller.getAuditLogs);

// Integrations Status
router.get('/integrations/razorpay/status', controller.getRazorpayStatus);

// Sandbox Simulation & Data Management
router.post('/sandbox/reset', controller.resetSandbox);
router.post('/sandbox/simulate-event', controller.simulateEvent);
router.get('/sandbox/stats', controller.getSandboxStats);

export default router;
