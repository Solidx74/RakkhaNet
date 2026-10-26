"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCached, setCached } from "@/lib/offline-cache";

interface OfflineDataState<T> {
  data: T | null;
  loading: boolean;
  isStale: boolean;
  cachedAt: number | null;
  error: string | null;
  refresh: () => void;
}

/** Everything the hook reports, tagged with the key it belongs to. */
interface Snapshot<T> {
  key: string;
  data: T | null;
  loading: boolean;
  isStale: boolean;
  cachedAt: number | null;
  error: string | null;
}

function emptySnapshot<T>(key: string): Snapshot<T> {
  return {
    key,
    data: null,
    loading: true,
    isStale: false,
    cachedAt: null,
    error: null,
  };
}

/**
 * Fetches fresh data and caches it on success. On failure (offline, API
 * down), falls back to whatever was last cached and marks it stale -- the
 * caller decides how to show that; this hook never pretends stale data is fresh.
 *
 * Three guarantees that matter when `key` changes with the user's location:
 *  - Only the LATEST request may update the screen. A slow answer for an
 *    earlier key (e.g. a route for the fallback position that took 5s) can
 *    no longer overwrite the answer for the current key.
 *  - Data from a previous key is never shown under the new key. After a key
 *    change the hook reports "loading, no data" until the new key's own
 *    data (fresh or cached) arrives.
 *  - The newest `fetcher` is always the one called, even if the caller
 *    doesn't memoise it, without re-fetching every time it changes.
 *
 * Pass `null` as the key to mean "not ready to load yet" (e.g. the user's
 * location hasn't been read from the device): nothing is fetched, and the
 * hook reports "loading, no data" until a real key arrives.
 */
export function useOfflineData<T>(
  key: string | null,
  fetcher: () => Promise<T>,
): OfflineDataState<T> {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>(() =>
    emptySnapshot<T>(key ?? ""),
  );

  // Declared before the load effect below, so on a key change the ref
  // already holds the new fetcher when load() runs.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    // Not ready: nothing to load, and nothing to refresh.
    if (key === null) return;
    const k: string = key;

    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;

    // Same key (a refresh): keep what is on screen and just mark it loading.
    // New key: start empty.
    setSnapshot((prev) =>
      prev.key === k
        ? { ...prev, loading: true, error: null }
        : emptySnapshot<T>(k),
    );

    try {
      const fresh = await fetcherRef.current();

      if (isCurrent()) {
        setSnapshot({
          key: k,
          data: fresh,
          loading: false,
          isStale: false,
          cachedAt: Date.now(),
          error: null,
        });
      }

      // Cached under THIS request's own key even if it was superseded --
      // the data really does belong to that key. A failed cache write
      // (private mode, quota) must not turn fresh data into an error.
      try {
        await setCached(k, fresh);
      } catch (cacheErr) {
        console.warn("[offline-cache] couldn't save", k, cacheErr);
      }
    } catch (err) {
      let cached: Awaited<ReturnType<typeof getCached<T>>> = null;
      try {
        cached = await getCached<T>(k);
      } catch {
        // Cache unreadable too -- handled as "nothing cached" below.
      }

      if (!isCurrent()) return;

      if (cached) {
        setSnapshot({
          key: k,
          data: cached.data,
          loading: false,
          isStale: true,
          cachedAt: cached.cachedAt,
          error: null,
        });
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        setSnapshot((prev) => ({
          ...(prev.key === k ? prev : emptySnapshot<T>(k)),
          loading: false,
          error: message,
        }));
      }
    }
  }, [key]);

  useEffect(() => {
    void load();
    // Runs when the key changes or the component unmounts: whatever is still
    // in flight is now out of date and must not touch the screen.
    return () => {
      requestIdRef.current++;
    };
  }, [load]);

  // Derived, not reset in an effect: on the render where `key` changes there
  // is no frame that shows the previous key's data.
  const current =
    key !== null && snapshot.key === key
      ? snapshot
      : emptySnapshot<T>(key ?? "");

  return {
    data: current.data,
    loading: current.loading,
    isStale: current.isStale,
    cachedAt: current.cachedAt,
    error: current.error,
    refresh: load,
  };
}
