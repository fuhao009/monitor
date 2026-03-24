import { Card, Space, Tag, Typography } from 'antd';
import type { LogItem } from '../../../types/dashboard';

interface Props {
  logs: LogItem[];
}

export function RealTimeLogPanel({ logs }: Props) {
  return (
    <div style={{ width: 320, borderLeft: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>实时日志</Typography.Title>
      </div>
      <div style={{ padding: 8, overflow: 'auto', flex: 1 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {logs.map((log) => (
            <Card key={log.id} size="small">
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Typography.Text type="secondary">{new Date(log.time).toLocaleTimeString('zh-CN', { hour12: false })}</Typography.Text>
                  <Tag color={log.level === 'info' ? 'blue' : log.level === 'warning' ? 'gold' : 'red'}>{log.source}</Tag>
                </Space>
                <Typography.Text>{log.message}</Typography.Text>
              </Space>
            </Card>
          ))}
        </Space>
      </div>
    </div>
  );
}
