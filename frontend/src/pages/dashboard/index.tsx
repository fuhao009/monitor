import { PageContainer } from '@ant-design/pro-components';
import { Alert, Layout, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useDashboardPolling } from '../../hooks/useDashboardPolling';
import type { ConnectionItem, DashboardViewMode, ServerItem } from '../../types/dashboard';
import { AlertSummaryCard } from './components/AlertSummaryCard';
import { ConnectionListView } from './components/ConnectionListView';
import { ConnectionOverviewCard } from './components/ConnectionOverviewCard';
import { HeaderBar } from './components/HeaderBar';
import { RealTimeLogPanel } from './components/RealTimeLogPanel';
import { ServerClusterPanel } from './components/ServerClusterPanel';
import { ServerDetailPanel } from './components/ServerDetailPanel';
import { TopologyCanvas } from './components/TopologyCanvas';
import { TrendPlaceholderView } from './components/TrendPlaceholderView';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';

function filterServers(servers: ServerItem[], filter: 'all' | 'issues' | 'database') {
  if (filter === 'issues') return servers.filter((server) => server.status !== 'online');
  if (filter === 'database') return servers.filter((server) => server.type === 'db');
  return servers;
}

function filterConnections(connections: ConnectionItem[], servers: ServerItem[], filter: 'all' | 'issues' | 'database') {
  if (filter === 'all') return connections;
  const visibleIds = new Set(filterServers(servers, filter).map((server) => server.id));
  return connections.filter((connection) => visibleIds.has(connection.from) || visibleIds.has(connection.to) || (filter === 'issues' && connection.status !== 'online'));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '暂无';
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString('zh-CN', { hour12: false });
}

export default function DashboardPage() {
  const { data, loading, refreshing, stale, error, lastUpdated } = useDashboardPolling();
  const [selectedId, setSelectedId] = useState<string>('');
  const [mode, setMode] = useState<DashboardViewMode>('topology');
  const [filter, setFilter] = useState<'all' | 'issues' | 'database'>('all');
  const [clock, setClock] = useState<string>('');

  useEffect(() => {
    const sync = () => setClock(new Date().toLocaleString('zh-CN', { hour12: false }));
    sync();
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data?.servers[0] && (!selectedId || !data.servers.some((server) => server.id === selectedId))) {
      setSelectedId(data.servers[0].id);
    }
  }, [data, selectedId]);

  const selectedServer = data?.servers.find((server) => server.id === selectedId) ?? data?.servers[0];
  const visibleServers = useMemo(() => (data ? filterServers(data.servers, filter) : []), [data, filter]);
  const visibleConnections = useMemo(() => (data ? filterConnections(data.connections, data.servers, filter) : []), [data, filter]);
  const refreshWarning = data && (error || stale)
    ? {
        message: stale ? '数据已进入陈旧状态，当前展示最近一次成功快照' : '数据刷新失败，当前继续展示最近一次成功快照',
        description: `${error ? `最近错误：${error}。` : ''}最近成功时间 ${formatDateTime(lastUpdated)}，系统仍会按 ${data.refresh.intervalSeconds} 秒节奏继续重试。`,
      }
    : null;

  if (loading && !data) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>;
  }

  if (!data || !selectedServer) {
    return <Alert type="error" message="加载失败" description={error ?? 'dashboard unavailable'} />;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <HeaderBar
        title={data.page.title}
        subtitle={data.page.subtitle}
        realtimeLabel={data.page.realtimeLabel}
        refreshing={refreshing}
        stale={stale}
        error={error}
        lastUpdated={lastUpdated}
        now={clock}
      />
      <Layout hasSider style={{ height: 'calc(100vh - 64px)' }}>
        <ServerClusterPanel servers={visibleServers} selectedId={selectedServer.id} onSelect={setSelectedId} summary={data.clusterSummary} />
        <Layout.Content>
          <PageContainer title={false} breadcrumb={undefined} style={{ height: '100%' }}>
            <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {refreshWarning ? <Alert type="warning" showIcon message={refreshWarning.message} description={refreshWarning.description} /> : null}
              <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#f1f5f9', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <WorkspaceToolbar
                  mode={mode}
                  filter={filter}
                  trendsEnabled={data.capabilities.trends}
                  onModeChange={setMode}
                  onFilterChange={setFilter}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 2,
                    width: 280,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <ConnectionOverviewCard {...data.connectionSummary} />
                  <AlertSummaryCard enabled={data.capabilities.alerts} summary={data.alertsSummary} />
                </div>
                <div style={{ position: 'absolute', inset: 0, paddingTop: 72 }}>
                  {mode === 'topology' ? (
                    <TopologyCanvas servers={visibleServers} connections={visibleConnections} selectedId={selectedServer.id} onSelect={setSelectedId} />
                  ) : mode === 'list' ? (
                    <div style={{ padding: 16 }}>
                      <ConnectionListView connections={visibleConnections} />
                    </div>
                  ) : (
                    <TrendPlaceholderView
                      alertsSummary={data.alertsSummary}
                      capabilities={data.capabilities}
                      lastUpdated={lastUpdated}
                      refresh={data.refresh}
                      stale={stale}
                    />
                  )}
                </div>
              </div>
              <div style={{ height: 280, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, display: 'flex', overflow: 'hidden' }}>
                <ServerDetailPanel server={selectedServer} />
                <RealTimeLogPanel logs={data.logs} />
              </div>
            </div>
          </PageContainer>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
