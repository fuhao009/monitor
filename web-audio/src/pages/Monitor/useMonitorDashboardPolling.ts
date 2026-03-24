import { useEffect, useRef, useState } from 'react';
import { getMonitorDashboard } from '@/services/monitor/dashboard';
import type { MonitorDashboardResponse } from '@/services/monitor/types';

function isSnapshotStale(snapshot: MonitorDashboardResponse | null, lastUpdated: string | null) {
  if (!snapshot || !lastUpdated) {
    return false;
  }

  const lastSuccessTimestamp = new Date(lastUpdated).getTime();
  if (Number.isNaN(lastSuccessTimestamp)) {
    return false;
  }

  return Date.now() - lastSuccessTimestamp >= snapshot.refresh.staleAfterSeconds * 1000;
}

export function useMonitorDashboardPolling() {
  const [data, setData] = useState<MonitorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const dataRef = useRef<MonitorDashboardResponse | null>(null);
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
        const nextData = await getMonitorDashboard();
        if (!active) {
          return;
        }

        dataRef.current = nextData;
        lastUpdatedRef.current = nextData.refresh.lastSuccessAt;
        refreshIntervalRef.current = nextData.refresh.intervalSeconds * 1000;

        setData(nextData);
        setLastUpdated(nextData.refresh.lastSuccessAt);
        setError(null);
        setStale(isSnapshotStale(nextData, nextData.refresh.lastSuccessAt));
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : 'unknown error');
      } finally {
        if (!active) {
          return;
        }

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

  return {
    data,
    loading,
    refreshing,
    stale,
    error,
    lastUpdated,
  };
}
