export type ServerStatus = 'online' | 'warning' | 'offline';
export type ServerType = 'app' | 'db' | 'cache' | 'lb' | 'storage';
export type DashboardViewMode = 'topology' | 'list' | 'trends';

export interface Position {
  x: number;
  y: number;
}

export interface DiskMetric {
  name: string;
  usagePercent: number;
}

export interface NetworkMetric {
  latencyMs: number;
  ingressMbps: number;
  egressMbps: number;
  connectionCount: number;
  tcpRetransmitPercent: number;
}

export interface ServerDetail {
  cpuHistory: number[];
  memoryUsedGb: number;
  memoryTotalGb: number;
  diskIoMbps: number;
  disks: DiskMetric[];
  network: NetworkMetric;
}

export interface ServerItem {
  id: string;
  name: string;
  ip: string;
  type: ServerType;
  status: ServerStatus;
  uptimeDays: number;
  cpuPercent: number;
  memoryPercent: number;
  position: Position;
  detail: ServerDetail;
}

export interface ConnectionItem {
  id: string;
  from: string;
  to: string;
  status: ServerStatus;
  latencyMs: number;
  bandwidthMbps: number;
}

export interface LogItem {
  id: string;
  time: string;
  level: 'info' | 'warning' | 'error';
  source: string;
  message: string;
}

export interface DashboardRefresh {
  intervalSeconds: number;
  staleAfterSeconds: number;
  lastSuccessAt: string;
}

export interface AlertsSummary {
  critical: number;
  warning: number;
  acknowledged: number;
}

export interface DashboardCapabilities {
  alerts: boolean;
  trends: boolean;
  diagnostics: boolean;
}

export interface DashboardResponse {
  generatedAt: string;
  refresh: DashboardRefresh;
  page: {
    title: string;
    subtitle: string;
    realtimeLabel: string;
  };
  clusterSummary: {
    total: number;
    online: number;
    warning: number;
    offline: number;
  };
  connectionSummary: {
    averageLatencyMs: number;
    packetLossRatePercent: number;
    bandwidthUsageGbps: number;
  };
  alertsSummary: AlertsSummary;
  capabilities: DashboardCapabilities;
  servers: ServerItem[];
  connections: ConnectionItem[];
  logs: LogItem[];
}
