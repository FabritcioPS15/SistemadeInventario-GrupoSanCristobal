import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

export function invalidateCache(key: string) {
  cache.delete(key);
}

export function invalidateCacheByPrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearAllCache() {
  cache.clear();
}

interface UseSupabaseQueryOptions {
  enabled?: boolean;
  ttl?: number;
}

export function useSupabaseQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: UseSupabaseQueryOptions
) {
  const { enabled = true, ttl = 5 * 60 * 1000 } = options ?? {};
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const mountedRef = useRef(true);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < ttl) {
        if (mountedRef.current) {
          setData(cached.data);
          setLoading(false);
          setError(null);
        }
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await queryFnRef.current();
      if (!mountedRef.current) return;

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        cache.set(cacheKey, { data: result.data, timestamp: Date.now() });
        setData(result.data);
      } else {
        setData(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, ttl]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refetch };
}
