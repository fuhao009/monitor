import { DatabaseOutlined, DeploymentUnitOutlined, HddOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Card, Progress, Space, Tag, Typography } from 'antd';
import type { ServerItem } from '../../../types/dashboard';

function getIcon(type: ServerItem['type']) {
  if (type === 'db') return <DatabaseOutlined />;
  if (type === 'cache') return <ThunderboltOutlined />;
  if (type === 'storage') return <HddOutlined />;
  return <DeploymentUnitOutlined />;
}

interface Props {
  servers: ServerItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  summary: { total: number; online: number; warning: number; offline: number };
}

export function ServerClusterPanel({ servers, selectedId, onSelect, summary }: Props) {
  return (
    <div style={{ width: 320, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Title level={5} style={{ margin: 0 }}>服务器集群</Typography.Title>
            <Tag color="blue">{summary.total} 台</Tag>
          </Space>
          <Space size={12} wrap>
            <Typography.Text type="secondary">正常 {summary.online}</Typography.Text>
            <Typography.Text type="secondary">警告 {summary.warning}</Typography.Text>
            <Typography.Text type="secondary">离线 {summary.offline}</Typography.Text>
          </Space>
        </Space>
      </div>
      <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {servers.map((server) => (
            <Card
              key={server.id}
              hoverable
              onClick={() => onSelect(server.id)}
              styles={{ body: { padding: 16 } }}
              style={{
                borderColor: selectedId === server.id ? '#1677ff' : '#e2e8f0',
                background: selectedId === server.id ? '#eff6ff' : '#fff',
              }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    {getIcon(server.type)}
                    <div>
                      <Typography.Text strong>{server.name}</Typography.Text>
                      <div><Typography.Text type="secondary">{server.ip}</Typography.Text></div>
                    </div>
                  </Space>
                  <Tag color={server.status === 'online' ? 'green' : server.status === 'warning' ? 'gold' : 'red'}>
                    {server.status}
                  </Tag>
                </Space>
                <div>
                  <Typography.Text type="secondary">CPU {server.cpuPercent}%</Typography.Text>
                  <Progress percent={server.cpuPercent} showInfo={false} strokeColor={server.cpuPercent > 80 ? '#ef4444' : server.cpuPercent > 60 ? '#f59e0b' : '#1677ff'} />
                </div>
                <div>
                  <Typography.Text type="secondary">内存 {server.memoryPercent}%</Typography.Text>
                  <Progress percent={server.memoryPercent} showInfo={false} strokeColor={server.memoryPercent > 80 ? '#ef4444' : server.memoryPercent > 60 ? '#f59e0b' : '#1677ff'} />
                </div>
              </Space>
            </Card>
          ))}
        </Space>
      </div>
    </div>
  );
}
