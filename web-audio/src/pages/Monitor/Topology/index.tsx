import { Card, Empty, Space, theme } from 'antd';
import type { MonitorConnectionItem, MonitorServerItem } from '@/services/monitor/types';
import { DashboardPageFrame, getStatusMeta } from '../shared';

function getTopologyBounds(servers: MonitorServerItem[]) {
  if (!servers.length) {
    return { minX: 0, minY: 0, width: 960, height: 520 };
  }

  const xValues = servers.map((server) => server.position.x);
  const yValues = servers.map((server) => server.position.y);
  const paddingX = 96;
  const paddingY = 84;
  const minX = Math.min(...xValues) - paddingX;
  const minY = Math.min(...yValues) - paddingY;

  return {
    minX,
    minY,
    width: Math.max(Math.max(...xValues) - Math.min(...xValues) + paddingX * 2, 960),
    height: Math.max(Math.max(...yValues) - Math.min(...yValues) + paddingY * 2, 520),
  };
}

function TopologyCanvas({ servers, connections }: { servers: MonitorServerItem[]; connections: MonitorConnectionItem[] }) {
  const { token } = theme.useToken();
  const serverLookup = new Map(servers.map((server) => [server.id, server] as const));

  if (!servers.length) {
    return <Empty description="暂无拓扑节点" />;
  }

  const bounds = getTopologyBounds(servers);

  return (
    <svg viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`} style={{ width: '100%', minHeight: 520 }}>
      {connections.map((connection) => {
        const from = serverLookup.get(connection.from);
        const to = serverLookup.get(connection.to);
        if (!from || !to) {
          return null;
        }
        const status = getStatusMeta(connection.status, token);

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
          </g>
        );
      })}
      {servers.map((server) => {
        const status = getStatusMeta(server.status, token);
        return (
          <g key={server.id} transform={`translate(${server.position.x}, ${server.position.y})`}>
            <circle r={36} fill={token.colorBgContainer} stroke={token.colorBorderSecondary} strokeWidth="2" />
            <circle r={28} fill={status.background} stroke={status.color} strokeWidth="3" />
            <text textAnchor="middle" dominantBaseline="central" fill={status.color} fontSize="13" fontWeight="700">
              {server.name}
            </text>
            <text textAnchor="middle" y={56} fill={token.colorTextSecondary} fontSize="12">
              {server.ip}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TopologyPage() {
  return (
    <DashboardPageFrame title="网络拓扑" subtitle="查看节点关系、链路状态和当前拓扑布局。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card title="拓扑视图" data-testid="monitor-topology-page" style={{ borderRadius: 12 }}>
              <TopologyCanvas servers={data.servers} connections={data.connections} />
            </Card>
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
