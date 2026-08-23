export * from './dashboard';

export interface ApiHealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}
