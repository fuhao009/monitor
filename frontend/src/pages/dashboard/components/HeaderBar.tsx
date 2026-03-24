import { BellOutlined, SettingOutlined } from '@ant-design/icons';
import { Avatar, Badge, Layout, Space, Typography } from 'antd';

interface HeaderBarProps {
  title: string;
  subtitle: string;
  realtimeLabel: string;
  refreshing: boolean;
  stale: boolean;
  error: string | null;
  lastUpdated: string | null;
  now: string;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '等待首个成功快照';
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString('zh-CN', { hour12: false });
}

function getFreshnessState(refreshing: boolean, stale: boolean, error: string | null, realtimeLabel: string) {
  if (stale) {
    return {
      label: '数据陈旧',
      background: '#fff7ed',
      borderColor: '#fdba74',
      color: '#c2410c',
    };
  }

  if (error) {
    return {
      label: refreshing ? '重试刷新中' : '刷新异常',
      background: '#fffbeb',
      borderColor: '#fde68a',
      color: '#b45309',
    };
  }

  if (refreshing) {
    return {
      label: '正在刷新',
      background: '#eff6ff',
      borderColor: '#bfdbfe',
      color: '#1d4ed8',
    };
  }

  return {
    label: realtimeLabel,
    background: '#f0fdf4',
    borderColor: '#bbf7d0',
    color: '#16a34a',
  };
}

export function HeaderBar({ title, subtitle, realtimeLabel, refreshing, stale, error, lastUpdated, now }: HeaderBarProps) {
  const freshnessState = getFreshnessState(refreshing, stale, error, realtimeLabel);
  const lastSuccessLabel = lastUpdated ? `最近成功 ${formatDateTime(lastUpdated)}${error ? ' · 已保留最近快照' : ''}` : formatDateTime(lastUpdated);

  return (
    <Layout.Header
      style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        height: 64,
        paddingInline: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Space size={16}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: '#1677ff',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          网
        </div>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          <Typography.Text type="secondary">{subtitle}</Typography.Text>
        </div>
      </Space>
      <Space size={20}>
        <div style={{ minWidth: 220, textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '8px 14px',
              borderRadius: 999,
              background: freshnessState.background,
              border: `1px solid ${freshnessState.borderColor}`,
              color: freshnessState.color,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {freshnessState.label}
          </div>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
            {lastSuccessLabel}
          </Typography.Text>
        </div>
        <Typography.Text code>{now}</Typography.Text>
        <Badge dot>
          <BellOutlined style={{ fontSize: 18, color: '#64748b' }} />
        </Badge>
        <SettingOutlined style={{ fontSize: 18, color: '#64748b' }} />
        <Avatar style={{ backgroundColor: '#1677ff' }}>管</Avatar>
      </Space>
    </Layout.Header>
  );
}
