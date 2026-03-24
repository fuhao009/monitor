import type { CSSProperties } from 'react';
import type { ConnectionItem, ServerItem } from '../../../types/dashboard';
import { getLatencyState, getStatusColor } from '../../../utils/thresholds';

interface Props {
  servers: ServerItem[];
  connections: ConnectionItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function TopologyCanvas({ servers, connections, selectedId, onSelect }: Props) {
  const getServer = (id: string) => servers.find((server) => server.id === id);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox="0 0 800 400" style={{ width: '100%', height: '100%' }}>
        {connections.map((connection) => {
          const from = getServer(connection.from);
          const to = getServer(connection.to);
          if (!from || !to) return null;
          const lineColor = connection.status === 'offline' ? '#cbd5e1' : getStatusColor(connection.status);
          return (
            <g key={connection.id}>
              <line
                x1={from.position.x}
                y1={from.position.y}
                x2={to.position.x}
                y2={to.position.y}
                stroke={lineColor}
                strokeWidth={connection.status === 'offline' ? 2 : 3}
                opacity={connection.status === 'offline' ? 0.4 : 1}
                strokeDasharray={connection.status !== 'online' ? '6 6' : undefined}
              />
            </g>
          );
        })}
        {servers.map((server) => (
          <g key={server.id} transform={`translate(${server.position.x}, ${server.position.y})`} onClick={() => onSelect(server.id)} style={{ cursor: 'pointer' }}>
            <circle r="30" fill={getStatusColor(server.status)} stroke={selectedId === server.id ? '#0f172a' : '#fff'} strokeWidth="4" />
            <text textAnchor="middle" y="52" fontSize="12" fontWeight="700" fill="#0f172a">{server.name}</text>
            <text textAnchor="middle" y="68" fontSize="10" fill="#64748b">{server.ip}</text>
          </g>
        ))}
      </svg>
      {connections.map((connection) => {
        if (connection.status === 'offline') return null;
        const from = getServer(connection.from);
        const to = getServer(connection.to);
        if (!from || !to) return null;
        const left = `${((from.position.x + to.position.x) / 2 / 800) * 100}%`;
        const top = `${((from.position.y + to.position.y) / 2 / 400) * 100}%`;
        const state = getLatencyState(connection.latencyMs);
        const style: CSSProperties = {
          position: 'absolute',
          left,
          top,
          transform: 'translate(-50%, -50%)',
          padding: '4px 10px',
          borderRadius: 999,
          background: state === 'good' ? '#ecfdf5' : state === 'warning' ? '#fffbeb' : '#fef2f2',
          border: `1px solid ${state === 'good' ? '#10b981' : state === 'warning' ? '#f59e0b' : '#ef4444'}`,
          fontSize: 12,
          fontWeight: 700,
        };
        return <div key={connection.id} style={style}>{connection.latencyMs}ms</div>;
      })}
    </div>
  );
}
