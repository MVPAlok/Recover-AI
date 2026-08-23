import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { metricsService } from './services/metrics.service.js';

const app: Express = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors());

// Request latency & observability tracking
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - start;
    const isError = res.statusCode >= 400;
    metricsService.recordRequest(latency, isError);
  });
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody: Buffer }).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
