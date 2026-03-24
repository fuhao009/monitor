import { PageContainer } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import {
  Alert,
  Card,
  Empty,
  Progress,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ReactNode } from 'react';
import {
  DatabaseOutlined,
  DeploymentUnitOutlined,
  HddOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type {
  MonitorAlertItem,
  MonitorAvailabilityReport,
  MonitorCapacityReport,
  MonitorDiagnosticItem,
  MonitorEventItem,
  MonitorHealthStatus,
  MonitorProbeSummary,
  MonitorQuickLink,
  MonitorServerItem,
  MonitorServerStatus,
  MonitorServerType,
  MonitorServiceCatalogItem,
  MonitorTrendMetric,
} from '@/services/monitor/types';
import { useMonitorDashboardPolling } from './useMonitorDashboardPolling';

type MonitorToken = ReturnType<typeof theme.useToken>['token'];

export function clampPercent(value: number) {
  return Math.min(Math.max(Number(value) || 0, 0), 100);
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return '暂无';
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString('zh-CN', { hour12: false });
}

export function formatTime(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleTimeString('zh-CN', { hour12: false });
}

export function formatMetric(value: number, fractionDigits = 1) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(fractionDigits);
}

export function getStatusMeta(status: MonitorHealthStatus | MonitorServerStatus, token: MonitorToken) {
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

  if (status === 'info') {
    return {
      label: '信息',
      color: token.colorInfo,
      background: token.colorInfoBg,
      borderColor: token.colorInfoBorder,
    };
  }

  return {
    label: '离线',
    color: token.colorError,
    background: token.colorErrorBg,
    borderColor: token.colorErrorBorder,
  };
}

export function getAlertSeverityMeta(severity: 'critical' | 'warning' | 'info', token: MonitorToken) {
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

export function getServerTypeIcon(type: MonitorServerType, token: MonitorToken) {
  const iconStyle = { color: token.colorPrimary, fontSize: token.fontSizeHeading4 };

  if (type === 'db') {
    return <DatabaseOutlined style={iconStyle} />;
  }

  if (type === 'storage') {
    return <HddOutlined style={iconStyle} />;
  }

  if (type === 'cache') {
    return <ThunderboltOutlined style={iconStyle} />;
  }

  return <DeploymentUnitOutlined style={iconStyle} />;
}

export function MonitorStatusTag({ status }: { status: MonitorHealthStatus | MonitorServerStatus }) {
  const { token } = theme.useToken();
  const meta = getStatusMeta(status, token);

  return (
    <Tag
      style={{
        marginInlineEnd: 0,
        borderRadius: 999,
        color: meta.color,
        background: meta.background,
        borderColor: meta.borderColor,
      }}
    >
      {meta.label}
    </Tag>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  const { token } = theme.useToken();

  if (!values.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无趋势数据" />;
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

export function DashboardPageFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: (payload: ReturnType<typeof useMonitorDashboardPolling>) => ReactNode;
}) {
  const { token } = theme.useToken();
  const state = useMonitorDashboardPolling();

  if (state.loading && !state.data) {
    return (
      <PageContainer title={title} content={subtitle ? <Typography.Text type="secondary">{subtitle}</Typography.Text> : undefined}>
        <Card
          style={{ borderRadius: token.borderRadiusLG }}
          bodyStyle={{ minHeight: 480, display: 'grid', placeItems: 'center' }}
        >
          <Space direction="vertical" size={token.marginSM} align="center">
            <Spin size="large" />
            <Typography.Text type="secondary">正在加载监控快照...</Typography.Text>
          </Space>
        </Card>
      </PageContainer>
    );
  }

  if (!state.data) {
    return (
      <PageContainer title={title} content={subtitle ? <Typography.Text type="secondary">{subtitle}</Typography.Text> : undefined}>
        <Alert type="error" showIcon message={`${title}加载失败`} description={state.error ?? 'dashboard unavailable'} />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={title} content={<Typography.Text type="secondary">{subtitle || state.data.page.subtitle}</Typography.Text>}>
      {children(state)}
    </PageContainer>
  );
}

export function SectionCard({
  title,
  extra,
  testId,
  children,
}: {
  title: string;
  extra?: ReactNode;
  testId?: string;
  children: ReactNode;
}) {
  const { token } = theme.useToken();

  return (
    <Card
      title={title}
      extra={extra}
      data-testid={testId}
      style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
      bodyStyle={{ padding: token.paddingLG }}
    >
      {children}
    </Card>
  );
}

export function OverviewCardGrid({ items }: { items: Array<{ id: string; title: string; value: string; description: string; status: MonitorHealthStatus; path?: string }> }) {
  const { token } = theme.useToken();

  return (
    <div
      data-testid="monitor-overview-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: token.margin,
      }}
    >
      {items.map((item) => (
        <SectionCard
          key={item.id}
          title={item.title}
          extra={<MonitorStatusTag status={item.status} />}
          testId={`monitor-overview-${item.id}`}
        >
          <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {item.value}
            </Typography.Title>
            <Typography.Text type="secondary">{item.description}</Typography.Text>
            {item.path ? <Link to={item.path}>查看详情</Link> : null}
          </Space>
        </SectionCard>
      ))}
    </div>
  );
}

export function QuickLinksGrid({ links }: { links: MonitorQuickLink[] }) {
  const { token } = theme.useToken();

  return (
    <div
      data-testid="monitor-quick-links"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: token.margin,
      }}
    >
      {links.map((item) => (
        <SectionCard
          key={item.id}
          title={item.title}
          extra={item.status ? <MonitorStatusTag status={item.status} /> : undefined}
        >
          <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
            <Typography.Text>{item.description}</Typography.Text>
            {item.badge ? <Tag color="processing">{item.badge}</Tag> : null}
            <Link to={item.path}>进入页面</Link>
          </Space>
        </SectionCard>
      ))}
    </div>
  );
}

export function EventList({ events }: { events: MonitorEventItem[] }) {
  const { token } = theme.useToken();

  return (
    <SectionCard title="最近事件" testId="monitor-events-list">
      <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginSM }}>
        {events.length ? (
          events.map((event) => (
            <div
              key={event.id}
              style={{
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
                padding: token.paddingSM,
              }}
            >
              <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                  <Space size={token.marginXS} wrap>
                    <Tag color="default" style={{ marginInlineEnd: 0 }}>
                      {event.category}
                    </Tag>
                    <Tag color="default" style={{ marginInlineEnd: 0 }}>
                      {event.source}
                    </Tag>
                  </Space>
                  <Typography.Text type="secondary">{formatDateTime(event.time)}</Typography.Text>
                </Space>
                <Typography.Text strong>{event.title}</Typography.Text>
                <Typography.Text>{event.summary}</Typography.Text>
              </Space>
            </div>
          ))
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无最近事件" />
        )}
      </div>
    </SectionCard>
  );
}

export function ProbeSummaryTable({ probes }: { probes: MonitorProbeSummary[] }) {
  return (
    <SectionCard title="数据源 / 探针状态" testId="monitor-probe-table">
      <Table<MonitorProbeSummary>
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: '暂无探针数据' }}
        dataSource={probes}
        columns={[
          { title: '名称', dataIndex: 'title' },
          { title: '目标', dataIndex: 'target' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (value: MonitorProbeSummary['status']) => <MonitorStatusTag status={value} />,
          },
          {
            title: '延迟',
            dataIndex: 'latencyMs',
            render: (value: number | null) => (value === null ? 'N/A' : `${formatMetric(value, 0)} ms`),
          },
          {
            title: '说明',
            dataIndex: 'description',
          },
        ]}
      />
    </SectionCard>
  );
}

export function ServerInventoryTable({ servers }: { servers: MonitorServerItem[] }) {
  const { token } = theme.useToken();

  return (
    <SectionCard title="主机资源清单" testId="monitor-hosts-table">
      <Table<MonitorServerItem>
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: '暂无主机数据' }}
        dataSource={servers}
        columns={[
          {
            title: '主机',
            render: (_: unknown, record: MonitorServerItem) => (
              <Space>
                {getServerTypeIcon(record.type, token)}
                <Link to={`/hosts/${record.id}`}>{record.name}</Link>
              </Space>
            ),
          },
          { title: '地址', dataIndex: 'ip' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (value: MonitorServerStatus) => <MonitorStatusTag status={value} />,
          },
          {
            title: 'CPU',
            dataIndex: 'cpuPercent',
            render: (value: number) => `${formatMetric(value, 0)}%`,
          },
          {
            title: '内存',
            dataIndex: 'memoryPercent',
            render: (value: number) => `${formatMetric(value, 0)}%`,
          },
          {
            title: '延迟',
            render: (_: unknown, record: MonitorServerItem) => `${formatMetric(record.detail.network.latencyMs, 0)} ms`,
          },
        ]}
      />
    </SectionCard>
  );
}

export function ServiceCatalogTable({ services }: { services: MonitorServiceCatalogItem[] }) {
  return (
    <SectionCard title="服务清单" testId="monitor-services-table">
      <Table<MonitorServiceCatalogItem>
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: '暂无服务数据' }}
        dataSource={services}
        columns={[
          {
            title: '服务',
            render: (_: unknown, record: MonitorServiceCatalogItem) => (
              <Link to={`/services/${record.id}`}>{record.name}</Link>
            ),
          },
          { title: '分类', dataIndex: 'category' },
          { title: '目标', dataIndex: 'target' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (value: MonitorServerStatus) => <MonitorStatusTag status={value} />,
          },
          {
            title: '延迟',
            dataIndex: 'latencyMs',
            render: (value: number) => `${formatMetric(value, 0)} ms`,
          },
          {
            title: '告警 / 诊断',
            render: (_: unknown, record: MonitorServiceCatalogItem) => `${record.alertsCount} / ${record.diagnosticsCount}`,
          },
        ]}
      />
    </SectionCard>
  );
}

export function AlertList({ alerts }: { alerts: MonitorAlertItem[] }) {
  const { token } = theme.useToken();

  return (
    <SectionCard title="活动告警" testId="monitor-alerts-page-list">
      <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginSM }}>
        {alerts.length ? (
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
                      <Tag style={{ marginInlineEnd: 0, color: severity.color, background: severity.background, borderColor: severity.borderColor }}>
                        {severity.label}
                      </Tag>
                      <Tag color="default" style={{ marginInlineEnd: 0 }}>{alert.source}</Tag>
                    </Space>
                    <Typography.Text type="secondary">{formatDateTime(alert.lastChangeAt)}</Typography.Text>
                  </Space>
                  <Typography.Text strong>{alert.title}</Typography.Text>
                  <Typography.Text>{alert.summary}</Typography.Text>
                </Space>
              </div>
            );
          })
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无活动告警" />
        )}
      </div>
    </SectionCard>
  );
}

export function DiagnosticList({ diagnostics }: { diagnostics: MonitorDiagnosticItem[] }) {
  const { token } = theme.useToken();

  return (
    <SectionCard title="诊断建议" testId="monitor-diagnostics-page-list">
      <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginSM }}>
        {diagnostics.length ? (
          diagnostics.map((item) => {
            const severity = getAlertSeverityMeta(item.severity, token);
            return (
              <div
                key={item.id}
                style={{
                  borderRadius: token.borderRadiusLG,
                  border: `1px solid ${severity.borderColor}`,
                  background: token.colorBgContainer,
                  padding: token.paddingSM,
                }}
              >
                <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                    <Tag style={{ marginInlineEnd: 0, color: severity.color, background: severity.background, borderColor: severity.borderColor }}>
                      {severity.label}
                    </Tag>
                    <Typography.Text type="secondary">{formatDateTime(item.observedAt)}</Typography.Text>
                  </Space>
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <Typography.Text>{item.summary}</Typography.Text>
                  <ul style={{ margin: 0 }}>
                    {item.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </Space>
              </div>
            );
          })
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无诊断建议" />
        )}
      </div>
    </SectionCard>
  );
}

export function LogList({ logs }: { logs: Array<{ id: string; time: string; level: 'info' | 'warning' | 'error'; source: string; message: string }> }) {
  const { token } = theme.useToken();

  return (
    <SectionCard title="日志列表" testId="monitor-logs-list">
      <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginSM }}>
        {logs.length ? (
          logs.map((log) => (
            <div key={log.id} style={{ borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer, padding: token.paddingSM }}>
              <Space direction="vertical" size={token.marginXS} style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                  <Typography.Text type="secondary">{formatTime(log.time)}</Typography.Text>
                  <Space size={token.marginXS}>
                    <Tag color={log.level === 'error' ? 'error' : log.level === 'warning' ? 'warning' : 'processing'} style={{ marginInlineEnd: 0 }}>{log.level}</Tag>
                    <Tag color="default" style={{ marginInlineEnd: 0 }}>{log.source}</Tag>
                  </Space>
                </Space>
                <Typography.Text>{log.message}</Typography.Text>
              </Space>
            </div>
          ))
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无日志" />
        )}
      </div>
    </SectionCard>
  );
}

export function TrendSummaryGrid({ metrics }: { metrics: MonitorTrendMetric[] }) {
  const { token } = theme.useToken();

  return (
    <div
      data-testid="monitor-trend-summary"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: token.margin,
      }}
    >
      {metrics.map((metric) => (
        <SectionCard key={metric.id} title={metric.title}>
          <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
            <Statistic value={`${formatMetric(metric.currentValue, metric.unit === '%' ? 0 : 1)} ${metric.unit}`} />
            <Sparkline values={metric.points} />
            {typeof metric.threshold !== 'undefined' ? (
              <Typography.Text type="secondary">阈值 {metric.threshold}{metric.unit}</Typography.Text>
            ) : null}
          </Space>
        </SectionCard>
      ))}
    </div>
  );
}

export function AvailabilityReportCard({ report }: { report: MonitorAvailabilityReport }) {
  const { token } = theme.useToken();

  return (
    <SectionCard title="可用率报表" testId="monitor-availability-report">
      <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: token.marginSM }}>
          <Statistic title="总体可用率" value={`${formatMetric(report.overallPercent, 2)}%`} />
          <Statistic title="降级服务数" value={report.degradedCount} />
        </div>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={report.services}
          columns={[
            { title: '服务', dataIndex: 'name' },
            { title: '状态', dataIndex: 'status', render: (value: MonitorServerStatus) => <MonitorStatusTag status={value} /> },
            { title: '可用率', dataIndex: 'availabilityPercent', render: (value: number) => `${formatMetric(value, 2)}%` },
            { title: '延迟', dataIndex: 'latencyMs', render: (value: number) => `${formatMetric(value, 0)} ms` },
            { title: '告警数', dataIndex: 'alertsCount' },
          ]}
        />
      </Space>
    </SectionCard>
  );
}

export function CapacityReportCard({ report }: { report: MonitorCapacityReport }) {
  const { token } = theme.useToken();

  return (
    <SectionCard title="容量分析" testId="monitor-capacity-report">
      <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: token.marginSM }}>
          <Statistic title="最高使用率" value={`${formatMetric(report.highestUsagePercent, 0)}%`} />
          <Statistic title="风险项" value={report.atRiskCount} />
        </div>
        {report.items.map((item) => (
          <div key={item.id}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography.Text>{item.name}</Typography.Text>
              <MonitorStatusTag status={item.riskLevel} />
            </Space>
            <Progress percent={clampPercent(item.usagePercent)} showInfo={false} />
            <Typography.Text type="secondary">
              当前 {item.currentLabel} / 阈值 {item.thresholdPercent}% / {item.forecastLabel}
            </Typography.Text>
          </div>
        ))}
      </Space>
    </SectionCard>
  );
}

export function KeyValueCard({
  title,
  testId,
  items,
}: {
  title: string;
  testId?: string;
  items: Array<{ label: string; value: ReactNode }>;
}) {
  const { token } = theme.useToken();

  return (
    <SectionCard title={title} testId={testId}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: token.marginSM,
        }}
      >
        {items.map((item) => (
          <div key={item.label}>
            <Typography.Text type="secondary">{item.label}</Typography.Text>
            <div>{item.value}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function ServerDetailCard({ server }: { server: MonitorServerItem | null }) {
  const { token } = theme.useToken();

  if (!server) {
    return (
      <SectionCard title="资源详情" testId="monitor-resource-detail">
        <Empty description="未找到对应资源" />
      </SectionCard>
    );
  }

  return (
    <SectionCard title={server.name} extra={<MonitorStatusTag status={server.status} />} testId="monitor-resource-detail">
      <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Space direction="vertical" size={token.marginXS}>
            <Typography.Text code>{server.ip}</Typography.Text>
            <Typography.Text type="secondary">运行 {server.uptimeDays} 天</Typography.Text>
          </Space>
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
              <Progress percent={clampPercent(server.memoryPercent)} strokeColor={token.colorPrimary} />
              <Typography.Text type="secondary">
                总容量 {formatMetric(server.detail.memoryTotalGb, 1)} GB
              </Typography.Text>
            </Space>
          </Card>
          <Card size="small" title="磁盘 I/O" style={{ borderRadius: token.borderRadiusLG }}>
            <Space direction="vertical" size={token.marginSM} style={{ width: '100%' }}>
              <Statistic value={`${formatMetric(server.detail.diskIoMbps, 1)} MB/s`} />
              {server.detail.disks.map((disk) => (
                <div key={disk.name}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Typography.Text>{disk.name}</Typography.Text>
                    <Typography.Text type="secondary">{formatMetric(disk.usagePercent, 0)}%</Typography.Text>
                  </Space>
                  <Progress percent={clampPercent(disk.usagePercent)} showInfo={false} />
                </div>
              ))}
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
            </div>
          </Card>
        </div>
      </Space>
    </SectionCard>
  );
}
