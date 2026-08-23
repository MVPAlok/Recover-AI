import { useState, useEffect } from 'react';
import { checkBackendHealth } from '../services/api';
import { ApiHealthResponse } from '../types';

export function useHealth() {
  const [data, setData] = useState<ApiHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBackendHealth()
      .then((res: ApiHealthResponse) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || 'Error connecting to server');
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
