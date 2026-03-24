import { useEffect, useRef, useState } from 'react';
import { fetchDashboard } from '../services/dashboard';
import type { DashboardResponse } from '../types/dashboard';

function isSnapshotStale(snapshot: DashboardResponse | null, lastUpdated: string | null) {
  if (!snapshot || !lastUpdated) {
    return false;
  }

  const lastSuccessTime = new Date(lastUpdated).getTime();
  if (Number.isNaN(lastSuccessTime)) {
    return false;
  }

  return Date.now() - lastSuccessTime >= snapshot.refresh.staleAfterSeconds * 1000;
}

export function useDashboardPolling() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const dataRef = useRef<DashboardResponse | null>(null);
  const lastUpdatedRef = useRef<string | null>(null);
  const refreshIntervalRef = useRef(3000);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | null = null;

    const syncStaleState = () => {
      if (!active) {
        return;
      }

      setStale(isSnapshotStale(dataRef.current, lastUpdatedRef.current));
    };

    const scheduleRefresh = () => {
      if (!active) {
        return;
      }

      refreshTimer = window.setTimeout(() => {
        void load(false);
      }, refreshIntervalRef.current);
    };

    const load = async (initialLoad: boolean) => {
      if (initialLoad || !dataRef.current) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const next = await fetchDashboard();
        if (!active) return;

        dataRef.current = next;
        lastUpdatedRef.current = next.refresh.lastSuccessAt;
        refreshIntervalRef.current = next.refresh.intervalSeconds * 1000;

        setData(next);
        setLastUpdated(next.refresh.lastSuccessAt);
        setError(null);
        setStale(isSnapshotStale(next, next.refresh.lastSuccessAt));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'unknown error');
      } finally {
        if (!active) return;

        setLoading(false);
        setRefreshing(false);
        syncStaleState();
        scheduleRefresh();
      }
    };

    void load(true);
    const staleTimer = window.setInterval(syncStaleState, 1000);

    return () => {
      active = false;
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
      window.clearInterval(staleTimer);
    };
  }, []);

  return { data, loading, refreshing, stale, error, lastUpdated };
}
