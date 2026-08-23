import app from './app.js';
import { config } from './config/env.config.js';
import { logger } from './utils/logger.js';

const PORT = config.PORT || 5000;

const server = app.listen(PORT, async () => {
  logger.info(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
  try {
    const { startRecoveryWorker } = await import('./modules/queue/recovery.queue.js');
    startRecoveryWorker();
    logger.info('[BullMQ] Background Recovery Queue Worker initialized.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[BullMQ] Could not initialize queue worker (Redis may be offline): ${msg}`);
  }
});

process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

export default server;
