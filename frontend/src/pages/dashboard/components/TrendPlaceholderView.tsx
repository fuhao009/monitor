import { Card, Space, Tag, Typography } from 'antd';
import type { AlertsSummary, DashboardCapabilities, DashboardRefresh } from '../../../types/dashboard';

interface TrendPlaceholderViewProps {
  alertsSummary: AlertsSummary;
  capabilities: DashboardCapabilities;
  lastUpdated: string | null;
  refresh: DashboardRefresh;
  stale: boolean;
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

export function TrendPlaceholderView({ alertsSummary, capabilities, lastUpdated, refresh, stale }: TrendPlaceholderViewProps) {
  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card
          style={{
            borderColor: stale ? '#fdba74' : '#dbeafe',
            background: stale ? '#fff7ed' : '#eff6ff',
          }}
          styles={{ body: { padding: 20 } }}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
              <Typography.Title level={4} style={{ margin: 0 }}>
                趋势视图占位
              </Typography.Title>
              <Space size={8} wrap>
                <Tag color={capabilities.trends ? 'blue' : 'default'}>
                  {capabilities.trends ? '趋势能力已预留' : '趋势能力未启用'}
                </Tag>
                <Tag color={stale ? 'gold' : 'green'}>{stale ? '数据偏旧' : '快照新鲜'}</Tag>
              </Space>
            </Space>
            <Typography.Text>
              当前阶段先保留趋势模式入口，不引入图表库；后续可在这里接入时序数据、容量走势和告警变化曲线。
            </Typography.Text>
            <Typography.Text type="secondary">
              最近成功时间 {formatDateTime(lastUpdated)}，自动轮询间隔 {refresh.intervalSeconds} 秒，超过 {refresh.staleAfterSeconds} 秒未成功刷新将标记为陈旧。
            </Typography.Text>
          </Space>
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <Card size="small" title="网络趋势预留" styles={{ body: { padding: 16 } }}>
            <Space direction="vertical" size={8}>
              <Typography.Text strong>连接质量</Typography.Text>
              <Typography.Text type="secondary">后续将在这里展示延迟、丢包与带宽的连续时间窗口。</Typography.Text>
            </Space>
          </Card>
          <Card size="small" title="容量趋势预留" styles={{ body: { padding: 16 } }}>
            <Space direction="vertical" size={8}>
              <Typography.Text strong>资源走势</Typography.Text>
              <Typography.Text type="secondary">后续将在这里接入 CPU、内存和磁盘的历史序列变化。</Typography.Text>
            </Space>
          </Card>
          <Card size="small" title="告警趋势预留" styles={{ body: { padding: 16 } }}>
            <Space direction="vertical" size={8}>
              <Typography.Text strong>当前汇总</Typography.Text>
              <Typography.Text type="secondary">
                严重 {alertsSummary.critical} / 警告 {alertsSummary.warning} / 已确认 {alertsSummary.acknowledged}
              </Typography.Text>
            </Space>
          </Card>
        </div>
      </Space>
    </div>
  );
}
