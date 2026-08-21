import app from './app.js';
import { config } from './config/env.config.js';
import { logger } from './utils/logger.js';

const PORT = config.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

export default server;
