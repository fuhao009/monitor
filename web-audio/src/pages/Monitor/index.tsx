import {
  DatabaseOutlined,
  DeploymentUnitOutlined,
  HddOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Empty,
  Grid,
  Progress,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  MonitorAlertItem,
  MonitorAlertSeverity,
  MonitorAlertsSummary,
  MonitorConnectionItem,
  MonitorDashboardCapabilities,
  MonitorDashboardConfigSnapshot,
  MonitorDashboardFilter,
  MonitorDashboardRefresh,
  MonitorDashboardResponse,
  MonitorDiagnosticItem,
  MonitorDashboardViewMode,
  MonitorServerItem,
  MonitorServerStatus,
  MonitorServerType,
} from '@/services/monitor/types';
import { useMonitorDashboardPolling } from './useMonitorDashboardPolling';
import { EventList, OverviewCardGrid, QuickLinksGrid, TrendSummaryGrid } from './shared';

type MonitorToken = ReturnType<typeof theme.useToken>['token'];

const MONITOR_LAYOUT = {
  clusterWidth: 320,
  logWidth: 320,
  summaryCardMinWidth: 240,
  workspaceMinHeight: 520,
  detailMinHeight: 320,
  topologyMinWidth: 960,
  topologyMinHeight: 520,
  topologyNodeRadius: 28,
  latencyBadgeWidth: 70,
  latencyBadgeHeight: 24,
} as const;

function clampPercent(value: number) {
  return Math.min(Math.max(Number(value) || 0, 0), 100);
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

function formatTime(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleTimeString('zh-CN', { hour12: false });
}

function formatMetric(value: number, fractionDigits = 1) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(fractionDigits);
}

function filterServers(servers: MonitorServerItem[], filter: MonitorDashboardFilter) {
  if (filter === 'issues') {
    return servers.filter((server) => server.status !== 'online');
  }

  if (filter === 'database') {
    return servers.filter((server) => server.type === 'db');
  }

  return servers;
}

function filterConnections(
  connections: MonitorConnectionItem[],
  servers: MonitorServerItem[],
  filter: MonitorDashboardFilter,
) {
  if (filter === 'all') {
    return connections;
  }

  const visibleIds = new Set(filterServers(servers, filter).map((server) => server.id));
  return connections.filter(
    (connection) =>
      visibleIds.has(connection.from) ||
      visibleIds.has(connection.to) ||
      (filter === 'issues' && connection.status !== 'online'),
  );
}

function getStatusMeta(status: MonitorServerStatus, token: MonitorToken) {
  if (status === 'online') {
    return {
      label: '在线',
      color: token.colorSuccess,
      background: token.colorSuccessBg,
      borderColor: token.colorSuccessBorder,
    };
  }

  if (status === 'warning') {
    return {
      label: '告警',
      color: token.colorWarning,
      background: token.colorWarningBg,
      borderColor: token.colorWarningBorder,
    };
  }

  return {
    label: '离线',
    color: token.colorError,
    background: token.colorErrorBg,
    borderColor: token.colorErrorBorder,
  };
}

function getAlertSeverityMeta(severity: MonitorAlertSeverity, token: MonitorToken) {
  if (severity === 'critical') {
    return {
      label: '严重',
      color: token.colorError,
      background: token.colorErrorBg,
      borderColor: token.colorErrorBorder,
    };
  }

  if (severity === 'warning') {
    return {
      label: '警告',
      color: token.colorWarning,
      background: token.colorWarningBg,
      borderColor: token.colorWarningBorder,
    };
  }

  return {
    label: '信息',
    color: token.colorInfo,
    background: token.colorInfoBg,
    borderColor: token.colorInfoBorder,
  };
}

function getNotificationPermissionLabel(permission: string) {
  if (permission === 'granted') {
    return '桌面消息已开启';
  }
  if (permission === 'denied') {
    return '桌面消息已被浏览器禁用';
  }
  if (permission === 'unsupported') {
    return '当前浏览器不支持桌面消息';
  }
  return '桌面消息待授权';
}

function getFreshnessMeta(
  refreshing: boolean,
  stale: boolean,
  error: string | null,
  realtimeLabel: string,
  token: MonitorToken,
) {
  if (stale) {
    return {
      label: '数据陈旧',
      color: token.colorWarning,
      background: token.colorWarningBg,
      borderColor: token.colorWarningBorder,
    };
  }

  if (error) {
    return {
      label: refreshing ? '重试刷新中' : '刷新异常',
      color: token.colorError,
      background: token.colorErrorBg,
      borderColor: token.colorErrorBorder,
    };
  }

  if (refreshing) {
    return {
      label: '正在刷新',
      color: token.colorInfo,
      background: token.colorInfoBg,
      borderColor: token.colorInfoBorder,
    };
  }

  return {
    label: realtimeLabel,
    color: token.colorSuccess,
    background: token.colorSuccessBg,
    borderColor: token.colorSuccessBorder,
  };
}

function getLatencyMeta(latencyMs: number, token: MonitorToken) {
  if (latencyMs > 100) {
    return {
      color: token.colorError,
      background: token.colorErrorBg,
      borderColor: token.colorErrorBorder,
    };
  }

  if (latencyMs > 50) {
    return {
      color: token.colorWarning,
      background: token.colorWarningBg,
      borderColor: token.colorWarningBorder,
    };
  }

  return {
    color: token.colorSuccess,
    background: token.colorSuccessBg,
    borderColor: token.colorSuccessBorder,
  };
}

function getServerTypeIcon(type: MonitorServerType, token: MonitorToken) {
  const iconStyle = { color: token.colorPrimary, fontSize: token.fontSizeHeading4 };

  if (type === 'db') {
    return <DatabaseOutlined style={iconStyle} />;
  }

  if (type === 'cache') {
    return <ThunderboltOutlined style={iconStyle} />;
  }

  if (type === 'storage') {
    return <HddOutlined style={iconStyle} />;
  }

  return <DeploymentUnitOutlined style={iconStyle} />;
}

function getTopologyBounds(servers: MonitorServerItem[]) {
  if (!servers.length) {
    return {
      minX: 0,
      minY: 0,
      width: MONITOR_LAYOUT.topologyMinWidth,
      height: MONITOR_LAYOUT.topologyMinHeight,
    };
  }

  const xValues = servers.map((server) => server.position.x);
  const yValues = servers.map((server) => server.position.y);
  const paddingX = 96;
  const paddingY = 84;
  const minX = Math.min(...xValues) - paddingX;
  const minY = Math.min(...yValues) - paddingY;
  const width = Math.max(
    Math.max(...xValues) - Math.min(...xValues) + paddingX * 2,
    MONITOR_LAYOUT.topologyMinWidth,
  );
  const height = Math.max(
    Math.max(...yValues) - Math.min(...yValues) + paddingY * 2,
    MONITOR_LAYOUT.topologyMinHeight,
  );

  return {
    minX,
    minY,
    width,
    height,
  };
}

function SummaryCard({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children?: ReactNode;
}) {
  const { token } = theme.useToken();

  return (
    <Card
      size="small"
      title={title}
      extra={extra}
      style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
      bodyStyle={{ padding: token.paddingLG }}
    >
      {children}
    </Card>
  );
}

function RefreshStateCard({
  data,
  refreshing,
  stale,
  error,
  lastUpdated,
  now,
}: {
  data: MonitorDashboardResponse;
  refreshing: boolean;
  stale: boolean;
  error: string | null;
  lastUpdated: string | null;
  now: string;
}) {
  const { token } = theme.useToken();
  const freshness = getFreshnessMeta(refreshing, stale, error, data.page.realtimeLabel, token);

  return (
    <SummaryCard
      title="刷新状态"
      extra={
        <Tag
          style={{
            marginInlineEnd: 0,
            borderRadius: 999,
            color: freshness.color,
            background: freshness.background,
            borderColor: freshness.borderColor,
          }}
        >
          {freshness.label}
        </Tag>
      }
    >
      <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {now}
        </Typography.Title>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: token.marginSM,
          }}
        >
          <div>
            <Typography.Text type="secondary">最近成功</Typography.Text>
            <div>{formatDateTime(lastUpdated)}</div>
          </div>
          <div>
            <Typography.Text type="secondary">轮询节奏</Typography.Text>
            <div>
              {data.refresh.intervalSeconds}s / {data.refresh.staleAfterSeconds}s
            </div>
          </div>
        </div>
        <Typography.Text type="secondary">
          快照生成时间 {formatDateTime(data.generatedAt)}
        </Typography.Text>
        {error ? (
          <Typography.Text style={{ color: token.colorWarning }}>{error}</Typography.Text>
        ) : null}
      </Space>
    </SummaryCard>
  );
}

function ConnectionSummaryCard({
  averageLatencyMs,
  packetLossRatePercent,
  bandwidthUsageGbps,
}: MonitorDashboardResponse['connectionSummary']) {
  const { token } = theme.useToken();

  return (
    <SummaryCard title="连接质量概览">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: token.marginSM,
        }}
      >
        <Statistic title="平均延迟" value={`${formatMetric(averageLatencyMs, 0)} ms`} />
        <Statistic title="丢包率" value={`${formatMetric(packetLossRatePercent, 2)} %`} />
        <Statistic title="带宽使用" value={`${formatMetric(bandwidthUsageGbps, 2)} Gbps`} />
      </div>
    </SummaryCard>
  );
}

function AlertsSummaryCard({
  summary,
  capabilities,
}: {
  summary: MonitorAlertsSummary;
  capabilities: MonitorDashboardCapabilities;
}) {
  const { token } = theme.useToken();
  const total = summary.critical + summary.warning + summary.acknowledged;

  return (
    <SummaryCard
      title="告警摘要"
      extra={
        <Tag color={capabilities.alerts ? 'processing' : 'default'} style={{ marginInlineEnd: 0 }}>
          {capabilities.alerts ? `${total} 条` : '未启用'}
        </Tag>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: token.marginSM,
        }}
      >
        <Statistic title="严重" value={summary.critical} valueStyle={{ color: token.colorError }} />
        <Statistic
          title="警告"
          value={summary.warning}
          valueStyle={{ color: token.colorWarning }}
        />
        <Statistic
          title="已确认"
          value={summary.acknowledged}
          valueStyle={{ color: token.colorInfo }}
        />
      </div>
    </SummaryCard>
  );
}

function AlertCenterPanel({
  alerts,
  enabled,
  notificationsEnabled,
  notificationPermission,
  notificationsAvailable,
  onEnableNotifications,
}: {
  alerts: MonitorAlertItem[];
  enabled: boolean;
  notificationsEnabled: boolean;
  notificationPermission: string;
  notificationsAvailable: boolean;
  onEnableNotifications: () => void;
}) {
  const { token } = theme.useToken();

  return (
    <Card
      title="告警中心"
      extra={
        <Space size={token.marginXS} wrap>
          <Tag color={alerts.length ? 'processing' : 'default'} style={{ marginInlineEnd: 0 }}>
            {alerts.length ? `${alerts.length} 条活动告警` : '当前无活动告警'}
          </Tag>
          {notificationsAvailable ? (
            <Button
              data-testid="monitor-enable-notifications"
              size="small"
              type={notificationsEnabled ? 'default' : 'primary'}
              onClick={onEnableNotifications}
            >
              {notificationsEnabled ? '桌面消息已授权' : '开启桌面消息'}
            </Button>
          ) : null}
        </Space>
      }
      style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
      bodyStyle={{ padding: token.paddingLG }}
    >
      <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
        <Alert
          showIcon
          type={notificationPermission === 'granted' ? 'success' : 'info'}
          message={getNotificationPermissionLabel(notificationPermission)}
          description="桌面消息仅在浏览器授权后触发，并基于告警 dedupeKey 去重，避免轮询重复打扰。"
        />

        <div
          data-testid="monitor-alert-list"
          style={{ display: 'flex', flexDirection: 'column', gap: token.marginSM }}
        >
          {!enabled ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前环境未启用告警中心" />
          ) : alerts.length ? (
            alerts.map((alert) => {
              const severity = getAlertSeverityMeta(alert.severity, token);

              return (
                <div
                  key={alert.id}
                  style={{
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${severity.borderColor}`,
                    background: token.colorBgContainer,
                    padding: token.paddingSM,
                  }}
                >
                  <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                      <Space size={token.marginXS} wrap>
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            color: severity.color,
                            background: severity.background,
                            borderColor: severity.borderColor,
                          }}
                        >
                          {severity.label}
                        </Tag>
                        <Tag color="default" style={{ marginInlineEnd: 0 }}>
                          {alert.source}
                        </Tag>
                        <Tag color="default" style={{ marginInlineEnd: 0 }}>
                          {alert.scope}
                        </Tag>
                      </Space>
                      <Typography.Text type="secondary">
                        {formatDateTime(alert.lastChangeAt)}
                      </Typography.Text>
                    </Space>
                    <Typography.Text strong>{alert.title}</Typography.Text>
                    <Typography.Text>{alert.summary}</Typography.Text>
                    <Typography.Text type="secondary">
                      触发条件：{alert.triggerRule}；恢复条件：{alert.recoveryRule}
                    </Typography.Text>
                  </Space>
                </div>
              );
            })
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前无活动告警" />
          )}
        </div>
      </Space>
    </Card>
  );
}

function DiagnosticsPanel({
  diagnostics,
  config,
  enabled,
}: {
  diagnostics: MonitorDiagnosticItem[];
  config: MonitorDashboardConfigSnapshot;
  enabled: boolean;
}) {
  const { token } = theme.useToken();

  return (
    <Card
      title="诊断建议"
      extra={<Tag color="processing">{diagnostics.length} 条建议</Tag>}
      style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
      bodyStyle={{ padding: token.paddingLG }}
    >
      <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
        <div
          data-testid="monitor-diagnostic-list"
          style={{ display: 'flex', flexDirection: 'column', gap: token.marginSM }}
        >
          {!enabled ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前环境未启用诊断建议" />
          ) : diagnostics.length ? (
            diagnostics.map((diagnostic) => {
              const severity = getAlertSeverityMeta(diagnostic.severity, token);

              return (
                <div
                  key={diagnostic.id}
                  style={{
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${severity.borderColor}`,
                    background: token.colorBgContainer,
                    padding: token.paddingSM,
                  }}
                >
                  <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                      <Space size={token.marginXS} wrap>
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            color: severity.color,
                            background: severity.background,
                            borderColor: severity.borderColor,
                          }}
                        >
                          {severity.label}
                        </Tag>
                        {diagnostic.relatedSources.map((source) => (
                          <Tag key={source} color="default" style={{ marginInlineEnd: 0 }}>
                            {source}
                          </Tag>
                        ))}
                      </Space>
                      <Typography.Text type="secondary">
                        {formatDateTime(diagnostic.observedAt)}
                      </Typography.Text>
                    </Space>
                    <Typography.Text strong>{diagnostic.title}</Typography.Text>
                    <Typography.Text>{diagnostic.summary}</Typography.Text>
                    <ul style={{ margin: 0, paddingInlineStart: token.paddingLG }}>
                      {diagnostic.steps.map((step) => (
                        <li key={step}>
                          <Typography.Text>{step}</Typography.Text>
                        </li>
                      ))}
                    </ul>
                  </Space>
                </div>
              );
            })
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前无诊断建议" />
          )}
        </div>

        <Card size="small" title="当前监控策略" style={{ borderRadius: token.borderRadiusLG }}>
          <Space size={token.marginXS} wrap>
            <Tag color="default">轮询 {config.refresh.intervalSeconds}s</Tag>
            <Tag color="default">陈旧阈值 {config.refresh.staleAfterSeconds}s</Tag>
            <Tag color="default">内存阈值 {config.thresholds.memoryWarningPercent}%</Tag>
            <Tag color="default">数据库阈值 {config.thresholds.databaseLatencyWarningMs}ms</Tag>
            <Tag color="default">服务告警阈值 {config.thresholds.serviceLatencyWarningMs}ms</Tag>
            <Tag color="default">服务离线阈值 {config.thresholds.serviceLatencyOfflineMs}ms</Tag>
            <Tag color="default">Upstream 探测 {config.probes.upstreamPath}</Tag>
            <Tag color="default">File 探测 {config.probes.filePath}</Tag>
            <Tag color={enabled ? 'processing' : 'default'}>
              诊断建议{enabled ? '已启用' : '未启用'}
            </Tag>
          </Space>
        </Card>
      </Space>
    </Card>
  );
}

function ClusterPanel({
  servers,
  summary,
  selectedId,
  onSelect,
}: {
  servers: MonitorServerItem[];
  summary: MonitorDashboardResponse['clusterSummary'];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const { token } = theme.useToken();

  return (
    <Card
      title="服务器集群"
      extra={<Tag color="processing">{summary.total} 台</Tag>}
      style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
      bodyStyle={{ padding: token.paddingSM }}
    >
      <Space
        direction="vertical"
        size={token.marginSM}
        style={{ width: '100%' }}
        data-testid="monitor-cluster-panel"
      >
        <Space size={token.marginSM} wrap>
          <Typography.Text type="secondary">正常 {summary.online}</Typography.Text>
          <Typography.Text type="secondary">警告 {summary.warning}</Typography.Text>
          <Typography.Text type="secondary">离线 {summary.offline}</Typography.Text>
        </Space>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: token.marginSM,
            minHeight: MONITOR_LAYOUT.workspaceMinHeight - token.paddingLG,
            maxHeight: MONITOR_LAYOUT.workspaceMinHeight - token.paddingLG,
            overflow: 'auto',
            paddingRight: token.paddingXS,
          }}
        >
          {servers.length ? (
            servers.map((server) => {
              const status = getStatusMeta(server.status, token);
              const selected = selectedId === server.id;

              return (
                <div
                  key={server.id}
                  data-testid={`monitor-server-${server.id}`}
                  onClick={() => onSelect(server.id)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${
                      selected ? token.colorPrimaryBorder : token.colorBorderSecondary
                    }`,
                    background: selected ? token.colorPrimaryBg : token.colorBgContainer,
                    boxShadow: selected ? token.boxShadowSecondary : 'none',
                    padding: token.paddingSM,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
                    <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space align="start" size={token.marginSM}>
                        {getServerTypeIcon(server.type, token)}
                        <div>
                          <Typography.Text strong>{server.name}</Typography.Text>
                          <div>
                            <Typography.Text type="secondary">{server.ip}</Typography.Text>
                          </div>
                        </div>
                      </Space>
                      <Tag
                        style={{
                          marginInlineEnd: 0,
                          borderRadius: 999,
                          color: status.color,
                          background: status.background,
                          borderColor: status.borderColor,
                        }}
                      >
                        {status.label}
                      </Tag>
                    </Space>
                    <div>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Typography.Text type="secondary">CPU</Typography.Text>
                        <Typography.Text>{formatMetric(server.cpuPercent, 0)}%</Typography.Text>
                      </Space>
                      <Progress
                        percent={clampPercent(server.cpuPercent)}
                        showInfo={false}
                        strokeColor={status.color}
                        trailColor={token.colorFillTertiary}
                      />
                    </div>
                    <div>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Typography.Text type="secondary">内存</Typography.Text>
                        <Typography.Text>{formatMetric(server.memoryPercent, 0)}%</Typography.Text>
                      </Space>
                      <Progress
                        percent={clampPercent(server.memoryPercent)}
                        showInfo={false}
                        strokeColor={token.colorPrimary}
                        trailColor={token.colorFillTertiary}
                      />
                    </div>
                  </Space>
                </div>
              );
            })
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              <Empty description="当前筛选条件下无服务器" />
            </div>
          )}
        </div>
      </Space>
    </Card>
  );
}

function TopologyCanvas({
  servers,
  connections,
  selectedId,
  onSelect,
}: {
  servers: MonitorServerItem[];
  connections: MonitorConnectionItem[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const { token } = theme.useToken();
  const serverLookup = useMemo(
    () => new Map(servers.map((server) => [server.id, server] as const)),
    [servers],
  );

  if (!servers.length) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: MONITOR_LAYOUT.workspaceMinHeight,
        }}
      >
        <Empty description="当前筛选条件下无拓扑节点" />
      </div>
    );
  }

  const bounds = getTopologyBounds(servers);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        style={{ width: '100%', height: '100%', minHeight: MONITOR_LAYOUT.workspaceMinHeight - 92 }}
      >
        {connections.map((connection) => {
          const from = serverLookup.get(connection.from);
          const to = serverLookup.get(connection.to);
          if (!from || !to) {
            return null;
          }

          const status = getStatusMeta(connection.status, token);
          const latency = getLatencyMeta(connection.latencyMs, token);
          const midX = (from.position.x + to.position.x) / 2;
          const midY = (from.position.y + to.position.y) / 2;

          return (
            <g key={connection.id}>
              <line
                x1={from.position.x}
                y1={from.position.y}
                x2={to.position.x}
                y2={to.position.y}
                stroke={status.color}
                strokeWidth={connection.status === 'offline' ? 2 : 3}
                opacity={connection.status === 'offline' ? 0.45 : 0.95}
                strokeDasharray={connection.status === 'online' ? undefined : '10 8'}
              />
              {connection.status !== 'offline' ? (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x={-MONITOR_LAYOUT.latencyBadgeWidth / 2}
                    y={-MONITOR_LAYOUT.latencyBadgeHeight / 2}
                    width={MONITOR_LAYOUT.latencyBadgeWidth}
                    height={MONITOR_LAYOUT.latencyBadgeHeight}
                    rx={MONITOR_LAYOUT.latencyBadgeHeight / 2}
                    fill={latency.background}
                    stroke={latency.borderColor}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={latency.color}
                    fontSize="12"
                    fontWeight="700"
                  >
                    {connection.latencyMs}ms
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
        {servers.map((server) => {
          const status = getStatusMeta(server.status, token);
          const selected = selectedId === server.id;

          return (
            <g
              key={server.id}
              transform={`translate(${server.position.x}, ${server.position.y})`}
              onClick={() => onSelect(server.id)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                r={MONITOR_LAYOUT.topologyNodeRadius + 8}
                fill={selected ? token.colorPrimaryBg : token.colorBgContainer}
                stroke={selected ? token.colorPrimary : token.colorBorderSecondary}
                strokeWidth="2"
              />
              <circle
                r={MONITOR_LAYOUT.topologyNodeRadius}
                fill={status.background}
                stroke={status.color}
                strokeWidth="3"
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill={status.color}
                fontSize="13"
                fontWeight="700"
              >
                {server.name}
              </text>
              <text
                textAnchor="middle"
                y={MONITOR_LAYOUT.topologyNodeRadius + 28}
                fill={token.colorTextSecondary}
                fontSize="12"
              >
                {server.ip}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ConnectionListView({
  connections,
  serverLookup,
  onSelect,
}: {
  connections: MonitorConnectionItem[];
  serverLookup: Map<string, MonitorServerItem>;
  onSelect: (id: string) => void;
}) {
  return (
    <Table<MonitorConnectionItem>
      rowKey="id"
      size="small"
      pagination={false}
      locale={{ emptyText: '暂无连接数据' }}
      dataSource={connections}
      onRow={(record: MonitorConnectionItem) => ({
        onClick: () => onSelect(record.from),
        style: { cursor: 'pointer' },
      })}
      columns={[
        {
          title: '源服务器',
          render: (_: unknown, record: MonitorConnectionItem) =>
            serverLookup.get(record.from)?.name ?? record.from,
        },
        {
          title: '目标服务器',
          render: (_: unknown, record: MonitorConnectionItem) =>
            serverLookup.get(record.to)?.name ?? record.to,
        },
        {
          title: '延迟',
          dataIndex: 'latencyMs',
          render: (value: number) => `${value} ms`,
        },
        {
          title: '带宽',
          dataIndex: 'bandwidthMbps',
          render: (value: number) => `${formatMetric(value, 1)} Mbps`,
        },
        {
          title: '状态',
          dataIndex: 'status',
          render: (value: MonitorServerStatus) => (
            <Tag color={value === 'online' ? 'success' : value === 'warning' ? 'warning' : 'error'}>
              {value}
            </Tag>
          ),
        },
      ]}
    />
  );
}

function TrendPlaceholderView({
  alertsSummary,
  capabilities,
  lastUpdated,
  refresh,
  stale,
}: {
  alertsSummary: MonitorAlertsSummary;
  capabilities: MonitorDashboardCapabilities;
  lastUpdated: string | null;
  refresh: MonitorDashboardRefresh;
  stale: boolean;
}) {
  const { token } = theme.useToken();
  const staleColor = stale ? token.colorWarning : token.colorSuccess;
  const staleBackground = stale ? token.colorWarningBg : token.colorSuccessBg;
  const staleBorder = stale ? token.colorWarningBorder : token.colorSuccessBorder;

  return (
    <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
      <Card
        style={{
          borderRadius: token.borderRadiusLG,
          background: staleBackground,
          borderColor: staleBorder,
        }}
      >
        <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Typography.Title level={4} style={{ margin: 0 }}>
              趋势视图占位
            </Typography.Title>
            <Space wrap>
              <Tag color={capabilities.trends ? 'processing' : 'default'}>
                {capabilities.trends ? '趋势能力已预留' : '趋势能力未启用'}
              </Tag>
              <Tag
                style={{ color: staleColor, background: staleBackground, borderColor: staleBorder }}
              >
                {stale ? '数据偏旧' : '快照新鲜'}
              </Tag>
            </Space>
          </Space>
          <Typography.Text>
            当前阶段先保留趋势模式入口，不引入额外图表库；后续可在这里接入时序数据、容量走势和告警变化曲线。
          </Typography.Text>
          <Typography.Text type="secondary">
            最近成功时间 {formatDateTime(lastUpdated)}，自动轮询间隔 {refresh.intervalSeconds}{' '}
            秒，超过 {refresh.staleAfterSeconds} 秒未成功刷新将标记为陈旧。
          </Typography.Text>
        </Space>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: token.margin,
        }}
      >
        <Card size="small" title="网络趋势预留" style={{ borderRadius: token.borderRadiusLG }}>
          <Typography.Text type="secondary">
            后续将在这里展示延迟、丢包与带宽的连续时间窗口。
          </Typography.Text>
        </Card>
        <Card size="small" title="容量趋势预留" style={{ borderRadius: token.borderRadiusLG }}>
          <Typography.Text type="secondary">
            后续将在这里接入 CPU、内存和磁盘的历史序列变化。
          </Typography.Text>
        </Card>
        <Card size="small" title="告警趋势预留" style={{ borderRadius: token.borderRadiusLG }}>
          <Typography.Text type="secondary">
            严重 {alertsSummary.critical} / 警告 {alertsSummary.warning} / 已确认{' '}
            {alertsSummary.acknowledged}
          </Typography.Text>
        </Card>
      </div>
    </Space>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const { token } = theme.useToken();

  if (!values.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 CPU 历史数据" />;
  }

  const width = 240;
  const height = 90;
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / Math.max(max - min, 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 90 }}>
      <polyline fill="none" stroke={token.colorPrimary} strokeWidth="3" points={points} />
    </svg>
  );
}

function ServerDetailPanel({ server }: { server: MonitorServerItem | null }) {
  const { token } = theme.useToken();

  if (!server) {
    return (
      <Card
        title="服务器详情"
        style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
        bodyStyle={{
          minHeight: MONITOR_LAYOUT.detailMinHeight,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Empty description="暂无服务器详情" />
      </Card>
    );
  }

  const status = getStatusMeta(server.status, token);

  return (
    <Card
      title="服务器详情"
      extra={
        <Tag
          style={{
            marginInlineEnd: 0,
            borderRadius: 999,
            color: status.color,
            background: status.background,
            borderColor: status.borderColor,
          }}
        >
          {status.label}
        </Tag>
      }
      style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
      bodyStyle={{ padding: token.paddingLG }}
    >
      <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              <span data-testid="monitor-server-detail-title">{server.name}</span>
            </Typography.Title>
            <Space size={token.marginSM} wrap>
              <Typography.Text code>{server.ip}</Typography.Text>
              <Typography.Text type="secondary">运行 {server.uptimeDays} 天</Typography.Text>
            </Space>
          </div>
          {getServerTypeIcon(server.type, token)}
        </Space>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: token.margin,
          }}
        >
          <Card size="small" title="CPU 使用率" style={{ borderRadius: token.borderRadiusLG }}>
            <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
              <Statistic value={`${formatMetric(server.cpuPercent, 0)}%`} />
              <Sparkline values={server.detail.cpuHistory} />
            </Space>
          </Card>

          <Card size="small" title="内存使用" style={{ borderRadius: token.borderRadiusLG }}>
            <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
              <Statistic value={`${formatMetric(server.detail.memoryUsedGb, 1)} GB`} />
              <Progress
                percent={clampPercent(server.memoryPercent)}
                strokeColor={token.colorPrimary}
              />
              <Typography.Text type="secondary">
                总容量 {formatMetric(server.detail.memoryTotalGb, 1)} GB
              </Typography.Text>
            </Space>
          </Card>

          <Card size="small" title="磁盘 I/O" style={{ borderRadius: token.borderRadiusLG }}>
            <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
              <Statistic value={`${formatMetric(server.detail.diskIoMbps, 1)} MB/s`} />
              {server.detail.disks.length ? (
                server.detail.disks.map((disk) => (
                  <div key={disk.name}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Typography.Text>{disk.name}</Typography.Text>
                      <Typography.Text type="secondary">
                        {formatMetric(disk.usagePercent, 0)}%
                      </Typography.Text>
                    </Space>
                    <Progress percent={clampPercent(disk.usagePercent)} showInfo={false} />
                  </div>
                ))
              ) : (
                <Typography.Text type="secondary">暂无磁盘指标</Typography.Text>
              )}
            </Space>
          </Card>

          <Card size="small" title="网络连接" style={{ borderRadius: token.borderRadiusLG }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: token.marginSM,
              }}
            >
              <div>
                <Typography.Text type="secondary">延迟</Typography.Text>
                <div>{formatMetric(server.detail.network.latencyMs, 0)} ms</div>
              </div>
              <div>
                <Typography.Text type="secondary">连接数</Typography.Text>
                <div>{formatMetric(server.detail.network.connectionCount, 0)}</div>
              </div>
              <div>
                <Typography.Text type="secondary">入站</Typography.Text>
                <div>{formatMetric(server.detail.network.ingressMbps, 1)} Mbps</div>
              </div>
              <div>
                <Typography.Text type="secondary">出站</Typography.Text>
                <div>{formatMetric(server.detail.network.egressMbps, 1)} Mbps</div>
              </div>
              <div>
                <Typography.Text type="secondary">TCP 重传</Typography.Text>
                <div>{formatMetric(server.detail.network.tcpRetransmitPercent, 2)}%</div>
              </div>
            </div>
          </Card>
        </div>
      </Space>
    </Card>
  );
}

function RealTimeLogPanel({ logs }: { logs: MonitorDashboardResponse['logs'] }) {
  const { token } = theme.useToken();

  return (
    <Card
      title="实时日志"
      extra={<Tag color="processing">{logs.length} 条</Tag>}
      style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
      bodyStyle={{ padding: token.paddingSM }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: token.marginSM,
          minHeight: MONITOR_LAYOUT.detailMinHeight,
          maxHeight: MONITOR_LAYOUT.detailMinHeight,
          overflow: 'auto',
        }}
      >
        {logs.length ? (
          logs.map((log) => {
            const levelStatus =
              log.level === 'error'
                ? getStatusMeta('offline', token)
                : log.level === 'warning'
                ? getStatusMeta('warning', token)
                : {
                    label: '信息',
                    color: token.colorInfo,
                    background: token.colorInfoBg,
                    borderColor: token.colorInfoBorder,
                  };

            return (
              <div
                key={log.id}
                style={{
                  borderRadius: token.borderRadiusLG,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorBgContainer,
                  padding: token.paddingSM,
                }}
              >
                <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                    <Typography.Text type="secondary">{formatTime(log.time)}</Typography.Text>
                    <Space size={token.marginXS} wrap>
                      <Tag
                        style={{
                          marginInlineEnd: 0,
                          color: levelStatus.color,
                          background: levelStatus.background,
                          borderColor: levelStatus.borderColor,
                        }}
                      >
                        {log.level}
                      </Tag>
                      <Tag color="default" style={{ marginInlineEnd: 0 }}>
                        {log.source}
                      </Tag>
                    </Space>
                  </Space>
                  <Typography.Text>{log.message}</Typography.Text>
                </Space>
              </div>
            );
          })
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <Empty description="暂无实时日志" />
          </div>
        )}
      </div>
    </Card>
  );
}

function WorkspaceCard({
  mode,
  filter,
  data,
  servers,
  connections,
  selectedId,
  onSelect,
  onModeChange,
  onFilterChange,
  lastUpdated,
  stale,
}: {
  mode: MonitorDashboardViewMode;
  filter: MonitorDashboardFilter;
  data: MonitorDashboardResponse;
  servers: MonitorServerItem[];
  connections: MonitorConnectionItem[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onModeChange: (value: MonitorDashboardViewMode) => void;
  onFilterChange: (value: MonitorDashboardFilter) => void;
  lastUpdated: string | null;
  stale: boolean;
}) {
  const { token } = theme.useToken();
  const serverLookup = useMemo(
    () => new Map(data.servers.map((server) => [server.id, server] as const)),
    [data.servers],
  );

  return (
    <Card
      title="网络工作区"
      style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
      bodyStyle={{ padding: token.padding }}
    >
      <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Segmented
              data-testid="monitor-view-mode"
              value={mode}
              options={[
                { label: '网络拓扑', value: 'topology' },
                { label: '列表视图', value: 'list' },
                { label: data.capabilities.trends ? '趋势视图' : '趋势占位', value: 'trends' },
              ]}
              onChange={(value: string | number) => onModeChange(value as MonitorDashboardViewMode)}
            />
            <Select
              data-testid="monitor-filter-select"
              value={filter}
              style={{ width: 168 }}
              onChange={(value: string | number) => onFilterChange(value as MonitorDashboardFilter)}
              options={[
                { label: '全部显示', value: 'all' },
                { label: '仅显示异常', value: 'issues' },
                { label: '仅显示数据库', value: 'database' },
              ]}
            />
          </Space>
          <Typography.Text type="secondary">
            当前选择 {selectedId ?? '无'} · 最近成功 {formatDateTime(lastUpdated)}
          </Typography.Text>
        </Space>

        <div
          style={{
            minHeight: MONITOR_LAYOUT.workspaceMinHeight,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgLayout,
            padding: token.padding,
            overflow: 'hidden',
          }}
        >
          {mode === 'topology' ? (
            <TopologyCanvas
              servers={servers}
              connections={connections}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ) : mode === 'list' ? (
            <ConnectionListView
              connections={connections}
              serverLookup={serverLookup}
              onSelect={onSelect}
            />
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
      </Space>
    </Card>
  );
}

export default function MonitorPage() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isWide = Boolean(screens.lg || screens.xl);
  const { data, loading, refreshing, stale, error, lastUpdated } = useMonitorDashboardPolling();
  const [selectedId, setSelectedId] = useState<string>();
  const [mode, setMode] = useState<MonitorDashboardViewMode>('topology');
  const [filter, setFilter] = useState<MonitorDashboardFilter>('all');
  const [clock, setClock] = useState('');
  const [notificationPermission, setNotificationPermission] = useState('unsupported');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const notifiedAlertRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const syncClock = () => {
      setClock(new Date().toLocaleString('zh-CN', { hour12: false }));
    };

    syncClock();
    const timer = window.setInterval(syncClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    setNotificationPermission(window.Notification.permission);
    setNotificationsEnabled(window.localStorage.getItem('monitor.notifications.enabled') === '1');
  }, []);

  const visibleServers = useMemo(
    () => (data ? filterServers(data.servers, filter) : []),
    [data, filter],
  );

  const visibleConnections = useMemo(
    () => (data ? filterConnections(data.connections, data.servers, filter) : []),
    [data, filter],
  );

  useEffect(() => {
    if (!data?.servers.length) {
      return;
    }

    const selectableServers = visibleServers.length ? visibleServers : data.servers;
    if (
      !selectedId ||
      !selectableServers.some((server: MonitorServerItem) => server.id === selectedId)
    ) {
      setSelectedId(selectableServers[0].id);
    }
  }, [data, selectedId, visibleServers]);

  const selectedServer = useMemo(() => {
    if (!data) {
      return null;
    }

    return (
      visibleServers.find((server: MonitorServerItem) => server.id === selectedId) ||
      data.servers.find((server: MonitorServerItem) => server.id === selectedId) ||
      visibleServers[0] ||
      data.servers[0] ||
      null
    );
  }, [data, selectedId, visibleServers]);

  const refreshWarning =
    data && (error || stale)
      ? {
          message: stale
            ? '数据已进入陈旧状态，当前展示最近一次成功快照'
            : '数据刷新失败，当前继续展示最近一次成功快照',
          description: `${error ? `最近错误：${error}。` : ''}最近成功时间 ${formatDateTime(
            lastUpdated,
          )}，系统仍会按 ${data.refresh.intervalSeconds} 秒节奏继续重试。`,
        }
      : null;

  useEffect(() => {
    if (!data?.alerts.length) {
      return;
    }

    const nextSnapshot: Record<string, string> = {};
    data.alerts.forEach((alert) => {
      nextSnapshot[alert.dedupeKey] = `${alert.state}:${alert.lastChangeAt}`;
    });

    if (!Object.keys(notifiedAlertRef.current).length) {
      notifiedAlertRef.current = nextSnapshot;
      return;
    }

    if (
      !data.capabilities.alerts ||
      !data.capabilities.notifications ||
      !notificationsEnabled ||
      notificationPermission !== 'granted' ||
      typeof window === 'undefined' ||
      !('Notification' in window)
    ) {
      notifiedAlertRef.current = nextSnapshot;
      return;
    }

    data.alerts.forEach((alert) => {
      if (alert.state !== 'open' || alert.severity === 'info') {
        return;
      }

      const nextVersion = `${alert.state}:${alert.lastChangeAt}`;
      if (notifiedAlertRef.current[alert.dedupeKey] === nextVersion) {
        return;
      }

      const notification = new window.Notification(`${alert.title} · ${alert.source}`, {
        body: alert.summary,
        tag: alert.dedupeKey,
      });

      notification.onclick = () => {
        window.focus();
      };
    });

    notifiedAlertRef.current = nextSnapshot;
  }, [data, notificationsEnabled, notificationPermission]);

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    const result = await window.Notification.requestPermission();
    setNotificationPermission(result);

    if (result === 'granted') {
      window.localStorage.setItem('monitor.notifications.enabled', '1');
      setNotificationsEnabled(true);
    }
  };

  if (loading && !data) {
    return (
      <PageContainer title="监控页">
        <Card
          style={{ borderRadius: token.borderRadiusLG }}
          bodyStyle={{
            minHeight: MONITOR_LAYOUT.workspaceMinHeight,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Space direction="vertical" size={token.marginSM} align="center">
            <Spin size="large" />
            <Typography.Text type="secondary">正在加载监控快照...</Typography.Text>
          </Space>
        </Card>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer title="监控页">
        <Alert
          type="error"
          showIcon
          message="监控页加载失败"
          description={error ?? 'dashboard unavailable'}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={data.page.title}
      content={<Typography.Text type="secondary">{data.page.subtitle}</Typography.Text>}
    >
      <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
        {refreshWarning ? (
          <Alert
            data-testid="monitor-stale-banner"
            type="warning"
            showIcon
            message={refreshWarning.message}
            description={refreshWarning.description}
          />
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(${MONITOR_LAYOUT.summaryCardMinWidth}px, 1fr))`,
            gap: token.margin,
          }}
        >
          <RefreshStateCard
            data={data}
            refreshing={refreshing}
            stale={stale}
            error={error}
            lastUpdated={lastUpdated}
            now={clock}
          />
          <ConnectionSummaryCard {...data.connectionSummary} />
          <AlertsSummaryCard summary={data.alertsSummary} capabilities={data.capabilities} />
        </div>

        <OverviewCardGrid items={data.overview} />

        <QuickLinksGrid links={data.quickLinks} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isWide ? 'minmax(0, 1.2fr) minmax(0, 0.8fr)' : 'minmax(0, 1fr)',
            gap: token.margin,
            alignItems: 'stretch',
          }}
        >
          <TrendSummaryGrid metrics={data.trendSummary.metrics} />
          <EventList events={data.recentEvents.slice(0, 8)} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isWide ? 'minmax(0, 1.2fr) minmax(0, 0.8fr)' : 'minmax(0, 1fr)',
            gap: token.margin,
            alignItems: 'stretch',
          }}
        >
          <AlertCenterPanel
            alerts={data.alerts}
            enabled={data.capabilities.alerts}
            notificationsEnabled={notificationsEnabled}
            notificationPermission={notificationPermission}
            notificationsAvailable={data.capabilities.notifications && notificationPermission !== 'unsupported'}
            onEnableNotifications={() => {
              void handleEnableNotifications();
            }}
          />
          <DiagnosticsPanel
            diagnostics={data.diagnostics}
            config={data.config}
            enabled={data.capabilities.diagnostics}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isWide
              ? `${MONITOR_LAYOUT.clusterWidth}px minmax(0, 1fr)`
              : 'minmax(0, 1fr)',
            gap: token.margin,
            alignItems: 'stretch',
          }}
        >
          <ClusterPanel
            servers={visibleServers}
            summary={data.clusterSummary}
            selectedId={selectedServer?.id}
            onSelect={setSelectedId}
          />
          <WorkspaceCard
            mode={mode}
            filter={filter}
            data={data}
            servers={visibleServers}
            connections={visibleConnections}
            selectedId={selectedServer?.id}
            onSelect={setSelectedId}
            onModeChange={setMode}
            onFilterChange={setFilter}
            lastUpdated={lastUpdated}
            stale={stale}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isWide
              ? `minmax(0, 1fr) ${MONITOR_LAYOUT.logWidth}px`
              : 'minmax(0, 1fr)',
            gap: token.margin,
            alignItems: 'stretch',
          }}
        >
          <ServerDetailPanel server={selectedServer} />
          <RealTimeLogPanel logs={data.logs} />
        </div>
      </Space>
    </PageContainer>
  );
}
