import * as React from 'react';
import { MOCK_DATA } from '../utils/mockData';
import { logError } from '../utils/logError';

export type ResourceName = keyof typeof MOCK_DATA | 'dashboard' | 'expenses';

interface DataSourceResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  mode: 'db' | 'mock';
}

/**
 * useDataSource
 * 
 * A hook to abstract data fetching. Supports toggling between 'db' and 'mock'.
 */
export function useDataSource<T>(resource: ResourceName, sources?: { db?: T | null }): DataSourceResult<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [tick, setTick] = React.useState(0);

  const mode = React.useMemo<'db' | 'mock'>(() => {
    if (typeof window === 'undefined') return 'mock';
    // Default dashboard to 'db' since it was already implemented
    const defaultMode = resource === 'dashboard' ? 'db' : 'mock';
    const saved = localStorage.getItem(`buildsync:ds:${resource}`);
    return (saved as 'db' | 'mock') || defaultMode;
  }, [resource]);

  const refetch = React.useCallback(() => {
    setTick(t => t + 1);
  }, []);

  React.useEffect(() => {
    if (mode === 'db') {
      if (sources?.db !== undefined) {
        setData(sources.db);
        setLoading(sources.db === undefined); // Loading while useQuery returns undefined
        setError(null);
      } else {
        // If we are in DB mode but no source provided, don't crash.
        // Just stay in loading or show a more graceful error.
        setLoading(true);
      }
      return;
    }

    // Mock Mode
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      try {
        const result = MOCK_DATA[resource as keyof typeof MOCK_DATA];
        if (result === undefined) {
          throw new Error(`Resource "${resource}" not found in mock data.`);
        }
        setData(result as T);
        setLoading(false);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Unknown error fetching data');
        setError(errorObj);
        setLoading(false);
        logError(errorObj, { op: 'useDataSource', args: { resource, mode } });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [resource, tick, mode, sources?.db]);

  return { data, loading, error, refetch, mode };
}
