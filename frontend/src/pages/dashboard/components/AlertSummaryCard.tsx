import { Card, Space, Tag, Typography } from 'antd';
import type { AlertsSummary } from '../../../types/dashboard';

interface AlertSummaryCardProps {
  enabled: boolean;
  summary: AlertsSummary;
}

function getHeadlineColor(enabled: boolean, summary: AlertsSummary) {
  if (!enabled) {
    return '#64748b';
  }

  if (summary.critical > 0) {
    return '#ef4444';
  }

  if (summary.warning > 0) {
    return '#f59e0b';
  }

  return '#16a34a';
}

export function AlertSummaryCard({ enabled, summary }: AlertSummaryCardProps) {
  const headlineColor = getHeadlineColor(enabled, summary);
  const total = summary.critical + summary.warning + summary.acknowledged;

  return (
    <Card
      size="small"
      styles={{ body: { padding: 16 } }}
      style={{
        width: '100%',
        borderColor: '#e2e8f0',
        background: enabled ? '#fff' : '#f8fafc',
      }}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            告警摘要
          </Typography.Title>
          <Tag color={enabled ? 'blue' : 'default'}>{enabled ? `${total} 条` : '未启用'}</Tag>
        </Space>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <Typography.Text type="secondary">严重</Typography.Text>
            <Typography.Title level={4} style={{ margin: '4px 0 0', color: headlineColor }}>
              {summary.critical}
            </Typography.Title>
          </div>
          <div>
            <Typography.Text type="secondary">警告</Typography.Text>
            <Typography.Title level={4} style={{ margin: '4px 0 0', color: summary.warning > 0 ? '#f59e0b' : '#0f172a' }}>
              {summary.warning}
            </Typography.Title>
          </div>
          <div>
            <Typography.Text type="secondary">已确认</Typography.Text>
            <Typography.Title level={4} style={{ margin: '4px 0 0', color: '#1677ff' }}>
              {summary.acknowledged}
            </Typography.Title>
          </div>
        </div>
        <Typography.Text type="secondary">
          {enabled ? '汇总当前告警态势，详情能力将在后续阶段继续扩展。' : '当前环境未开启告警能力，先保留汇总占位。'}
        </Typography.Text>
      </Space>
    </Card>
  );
}
