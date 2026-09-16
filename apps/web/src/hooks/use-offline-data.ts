"use client";

import { useCallback, useEffect, useState } from "react";
import { getCached, setCached } from "@/lib/offline-cache";

interface OfflineDataState<T> {
  data: T | null;
  loading: boolean;
  isStale: boolean;
  cachedAt: number | null;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches fresh data and caches it on success. On failure (offline, API
 * down), falls back to whatever was last cached and marks it stale -- the
 * caller decides how to show that; this hook never pretends stale data is fresh.
 */
export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
): OfflineDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetcher();
      setData(fresh);
      setIsStale(false);
      setCachedAt(Date.now());
      await setCached(key, fresh);
    } catch (err) {
      const cached = await getCached<T>(key);
      if (cached) {
        setData(cached.data);
        setCachedAt(cached.cachedAt);
        setIsStale(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load data");
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, isStale, cachedAt, error, refresh: load };
}
