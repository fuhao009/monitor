export type MonitorServerStatus = 'online' | 'warning' | 'offline';
export type MonitorServerType = 'app' | 'db' | 'cache' | 'lb' | 'storage';
export type MonitorDashboardViewMode = 'topology' | 'list' | 'trends';
export type MonitorDashboardFilter = 'all' | 'issues' | 'database';
export type MonitorAlertSeverity = 'critical' | 'warning' | 'info';
export type MonitorAlertState = 'open' | 'acknowledged' | 'resolved';
export type MonitorHealthStatus = 'online' | 'warning' | 'offline' | 'info';

export interface MonitorPosition {
  x: number;
  y: number;
}

export interface MonitorDiskMetric {
  name: string;
  usagePercent: number;
}

export interface MonitorNetworkMetric {
  latencyMs: number;
  ingressMbps: number;
  egressMbps: number;
  connectionCount: number;
  tcpRetransmitPercent: number;
}

export interface MonitorServerDetail {
  cpuHistory: number[];
  memoryUsedGb: number;
  memoryTotalGb: number;
  diskIoMbps: number;
  disks: MonitorDiskMetric[];
  network: MonitorNetworkMetric;
}

export interface MonitorServerItem {
  id: string;
  name: string;
  ip: string;
  type: MonitorServerType;
  status: MonitorServerStatus;
  uptimeDays: number;
  cpuPercent: number;
  memoryPercent: number;
  position: MonitorPosition;
  detail: MonitorServerDetail;
}

export interface MonitorConnectionItem {
  id: string;
  from: string;
  to: string;
  status: MonitorServerStatus;
  latencyMs: number;
  bandwidthMbps: number;
}

export interface MonitorLogItem {
  id: string;
  time: string;
  level: 'info' | 'warning' | 'error';
  source: string;
  message: string;
}

export interface MonitorDashboardRefresh {
  intervalSeconds: number;
  staleAfterSeconds: number;
  lastSuccessAt: string;
}

export interface MonitorAlertsSummary {
  critical: number;
  warning: number;
  acknowledged: number;
}

export interface MonitorDashboardCapabilities {
  alerts: boolean;
  trends: boolean;
  diagnostics: boolean;
  notifications: boolean;
}

export interface MonitorAlertItem {
  id: string;
  dedupeKey: string;
  severity: MonitorAlertSeverity;
  state: MonitorAlertState;
  scope: string;
  source: string;
  title: string;
  summary: string;
  triggerRule: string;
  recoveryRule: string;
  observedAt: string;
  lastChangeAt: string;
}

export interface MonitorDiagnosticItem {
  id: string;
  severity: MonitorAlertSeverity;
  title: string;
  summary: string;
  steps: string[];
  relatedSources: string[];
  observedAt: string;
}

export interface MonitorDashboardConfigSnapshot {
  refresh: {
    intervalSeconds: number;
    staleAfterSeconds: number;
  };
  thresholds: {
    memoryWarningPercent: number;
    databaseLatencyWarningMs: number;
    serviceLatencyWarningMs: number;
    serviceLatencyOfflineMs: number;
  };
  probes: {
    timeoutMs: number;
    upstreamPath: string;
    filePath: string;
  };
}

export interface MonitorRuntimeSummary {
  env: string;
  packageName: string;
  packageVersion: string;
  hostname: string;
  port: number | string;
  pid: number;
  nodeVersion: string;
  cpuCount: number;
  loadAverage: number;
  cpuPercent: number;
  totalMemoryGb: number;
  freeMemoryGb: number;
  rssGb: number;
  heapUsedGb: number;
  heapTotalGb: number;
  memoryPercent: number;
  uptimeSeconds: number;
  uptimeDays: number;
}

export interface MonitorDatabaseCounts {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  adminUsers: number;
  linkedAccountUsers: number;
  totalGroups: number;
  activeGroups: number;
  inactiveGroups: number;
  totalTokens: number;
  activeTokens: number;
  inactiveTokens: number;
}

export interface MonitorDatabaseSummary {
  reachable: boolean;
  latencyMs: number;
  latestUpdateAt: string | null;
  visibleGroupIds: number[];
  counts: MonitorDatabaseCounts;
}

export interface MonitorOperatorSummary {
  username: string;
  role: number;
  isAdmin: boolean;
  visibleGroupCount: number;
  visibleGroupIds: number[];
  activeTokenCount: number;
  linkedAccountUsers: number;
}

export interface MonitorOverviewCard {
  id: string;
  title: string;
  value: string;
  description: string;
  status: MonitorHealthStatus;
  path?: string;
}

export interface MonitorQuickLink {
  id: string;
  title: string;
  path: string;
  description: string;
  badge?: string;
  status?: MonitorHealthStatus;
}

export interface MonitorProbeSummary {
  id: string;
  title: string;
  target: string;
  configured: boolean;
  status: MonitorServerStatus;
  latencyMs: number | null;
  statusCode: number | null;
  description: string;
  errorMessage: string | null;
}

export interface MonitorServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  status: MonitorServerStatus;
  target: string;
  latencyMs: number;
  alertsCount: number;
  diagnosticsCount: number;
  summary: string;
  relatedServerIds: string[];
}

export interface MonitorEventItem {
  id: string;
  time: string;
  level: 'info' | 'warning' | 'error';
  category: string;
  source: string;
  title: string;
  summary: string;
}

export interface MonitorTrendMetric {
  id: string;
  title: string;
  unit: string;
  currentValue: number;
  points: number[];
  threshold?: number;
}

export interface MonitorTrendSummary {
  updatedAt: string;
  metrics: MonitorTrendMetric[];
}

export interface MonitorAvailabilityServiceItem {
  id: string;
  name: string;
  status: MonitorServerStatus;
  availabilityPercent: number;
  latencyMs: number;
  alertsCount: number;
}

export interface MonitorAvailabilityReport {
  overallPercent: number;
  degradedCount: number;
  services: MonitorAvailabilityServiceItem[];
}

export interface MonitorCapacityItem {
  id: string;
  name: string;
  usagePercent: number;
  currentLabel: string;
  thresholdPercent: number;
  riskLevel: MonitorServerStatus;
  forecastLabel: string;
}

export interface MonitorCapacityReport {
  atRiskCount: number;
  highestUsagePercent: number;
  items: MonitorCapacityItem[];
}

export interface MonitorSettingsSnapshot {
  monitor: {
    source: string;
    refresh: MonitorDashboardConfigSnapshot['refresh'];
    thresholds: MonitorDashboardConfigSnapshot['thresholds'];
    capabilities: MonitorDashboardCapabilities;
    probes: MonitorDashboardConfigSnapshot['probes'];
  };
  notifications: {
    enabled: boolean;
    channels: string[];
    dedupeStrategy: string;
  };
  datasources: MonitorProbeSummary[];
  userAccess: MonitorOperatorSummary;
}

export interface MonitorDashboardPageMeta {
  title: string;
  subtitle: string;
  realtimeLabel: string;
}

export interface MonitorClusterSummary {
  total: number;
  online: number;
  warning: number;
  offline: number;
}

export interface MonitorConnectionSummary {
  averageLatencyMs: number;
  packetLossRatePercent: number;
  bandwidthUsageGbps: number;
}

export interface MonitorDashboardResponse {
  generatedAt: string;
  refresh: MonitorDashboardRefresh;
  page: MonitorDashboardPageMeta;
  runtime: MonitorRuntimeSummary;
  database: MonitorDatabaseSummary;
  operator: MonitorOperatorSummary;
  clusterSummary: MonitorClusterSummary;
  connectionSummary: MonitorConnectionSummary;
  alertsSummary: MonitorAlertsSummary;
  alerts: MonitorAlertItem[];
  diagnostics: MonitorDiagnosticItem[];
  overview: MonitorOverviewCard[];
  quickLinks: MonitorQuickLink[];
  probes: MonitorProbeSummary[];
  services: MonitorServiceCatalogItem[];
  recentEvents: MonitorEventItem[];
  trendSummary: MonitorTrendSummary;
  availabilityReport: MonitorAvailabilityReport;
  capacityReport: MonitorCapacityReport;
  settings: MonitorSettingsSnapshot;
  config: MonitorDashboardConfigSnapshot;
  capabilities: MonitorDashboardCapabilities;
  servers: MonitorServerItem[];
  connections: MonitorConnectionItem[];
  logs: MonitorLogItem[];
}
