import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';

const router = Router();
const controller = new DashboardController();

// Dashboard overview & opportunities
router.get('/merchants', controller.getMerchants);
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

export default router;
