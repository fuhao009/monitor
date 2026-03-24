import { request } from '@umijs/max';
import type {
  MonitorAlertItem,
  MonitorAlertsSummary,
  MonitorAvailabilityReport,
  MonitorCapacityReport,
  MonitorClusterSummary,
  MonitorDashboardConfigSnapshot,
  MonitorConnectionSummary,
  MonitorDashboardCapabilities,
  MonitorDiagnosticItem,
  MonitorDashboardPageMeta,
  MonitorDashboardRefresh,
  MonitorDashboardResponse,
  MonitorDatabaseSummary,
  MonitorEventItem,
  MonitorOperatorSummary,
  MonitorOverviewCard,
  MonitorProbeSummary,
  MonitorQuickLink,
  MonitorRuntimeSummary,
  MonitorServiceCatalogItem,
  MonitorSettingsSnapshot,
  MonitorTrendSummary,
} from './types';

interface MonitorDashboardEnvelope {
  success: boolean;
  data: MonitorDashboardResponse;
}

const DEFAULT_REFRESH: MonitorDashboardRefresh = {
  intervalSeconds: 3,
  staleAfterSeconds: 9,
  lastSuccessAt: '',
};

const DEFAULT_PAGE: MonitorDashboardPageMeta = {
  title: '监控页',
  subtitle: '集群监控概览',
  realtimeLabel: '实时监控中',
};

const DEFAULT_CLUSTER_SUMMARY: MonitorClusterSummary = {
  total: 0,
  online: 0,
  warning: 0,
  offline: 0,
};

const DEFAULT_CONNECTION_SUMMARY: MonitorConnectionSummary = {
  averageLatencyMs: 0,
  packetLossRatePercent: 0,
  bandwidthUsageGbps: 0,
};

const DEFAULT_ALERTS_SUMMARY: MonitorAlertsSummary = {
  critical: 0,
  warning: 0,
  acknowledged: 0,
};

const DEFAULT_CAPABILITIES: MonitorDashboardCapabilities = {
  alerts: true,
  trends: false,
  diagnostics: false,
  notifications: true,
};

const DEFAULT_CONFIG: MonitorDashboardConfigSnapshot = {
  refresh: {
    intervalSeconds: DEFAULT_REFRESH.intervalSeconds,
    staleAfterSeconds: DEFAULT_REFRESH.staleAfterSeconds,
  },
  thresholds: {
    memoryWarningPercent: 82,
    databaseLatencyWarningMs: 250,
    serviceLatencyWarningMs: 180,
    serviceLatencyOfflineMs: 1200,
  },
  probes: {
    timeoutMs: 4000,
    upstreamPath: '/',
    filePath: '/',
  },
};

const DEFAULT_ALERTS: MonitorAlertItem[] = [];
const DEFAULT_DIAGNOSTICS: MonitorDiagnosticItem[] = [];
const DEFAULT_RUNTIME: MonitorRuntimeSummary = {
  env: 'unknown',
  packageName: 'monitor',
  packageVersion: '0.0.0',
  hostname: 'unknown',
  port: 0,
  pid: 0,
  nodeVersion: 'unknown',
  cpuCount: 0,
  loadAverage: 0,
  cpuPercent: 0,
  totalMemoryGb: 0,
  freeMemoryGb: 0,
  rssGb: 0,
  heapUsedGb: 0,
  heapTotalGb: 0,
  memoryPercent: 0,
  uptimeSeconds: 0,
  uptimeDays: 0,
};
const DEFAULT_DATABASE: MonitorDatabaseSummary = {
  reachable: false,
  latencyMs: 0,
  latestUpdateAt: null,
  visibleGroupIds: [],
  counts: {
    totalUsers: 0,
    activeUsers: 0,
    disabledUsers: 0,
    adminUsers: 0,
    linkedAccountUsers: 0,
    totalGroups: 0,
    activeGroups: 0,
    inactiveGroups: 0,
    totalTokens: 0,
    activeTokens: 0,
    inactiveTokens: 0,
  },
};
const DEFAULT_OPERATOR: MonitorOperatorSummary = {
  username: 'unknown',
  role: 0,
  isAdmin: false,
  visibleGroupCount: 0,
  visibleGroupIds: [],
  activeTokenCount: 0,
  linkedAccountUsers: 0,
};
const DEFAULT_OVERVIEW: MonitorOverviewCard[] = [];
const DEFAULT_QUICK_LINKS: MonitorQuickLink[] = [];
const DEFAULT_PROBES: MonitorProbeSummary[] = [];
const DEFAULT_SERVICES: MonitorServiceCatalogItem[] = [];
const DEFAULT_EVENTS: MonitorEventItem[] = [];
const DEFAULT_TREND_SUMMARY: MonitorTrendSummary = {
  updatedAt: '',
  metrics: [],
};
const DEFAULT_AVAILABILITY_REPORT: MonitorAvailabilityReport = {
  overallPercent: 0,
  degradedCount: 0,
  services: [],
};
const DEFAULT_CAPACITY_REPORT: MonitorCapacityReport = {
  atRiskCount: 0,
  highestUsagePercent: 0,
  items: [],
};
const DEFAULT_SETTINGS: MonitorSettingsSnapshot = {
  monitor: {
    source: 'runtime',
    refresh: DEFAULT_CONFIG.refresh,
    thresholds: DEFAULT_CONFIG.thresholds,
    capabilities: DEFAULT_CAPABILITIES,
    probes: DEFAULT_CONFIG.probes,
  },
  notifications: {
    enabled: DEFAULT_CAPABILITIES.notifications,
    channels: ['browser'],
    dedupeStrategy: 'dedupeKey + lastChangeAt',
  },
  datasources: DEFAULT_PROBES,
  userAccess: DEFAULT_OPERATOR,
};

function normalizeDashboardResponse(payload: MonitorDashboardResponse): MonitorDashboardResponse {
  return {
    ...payload,
    generatedAt: payload.generatedAt ?? '',
    refresh: {
      intervalSeconds: payload.refresh?.intervalSeconds ?? DEFAULT_REFRESH.intervalSeconds,
      staleAfterSeconds: payload.refresh?.staleAfterSeconds ?? DEFAULT_REFRESH.staleAfterSeconds,
      lastSuccessAt:
        payload.refresh?.lastSuccessAt ?? payload.generatedAt ?? DEFAULT_REFRESH.lastSuccessAt,
    },
    page: {
      title: payload.page?.title ?? DEFAULT_PAGE.title,
      subtitle: payload.page?.subtitle ?? DEFAULT_PAGE.subtitle,
      realtimeLabel: payload.page?.realtimeLabel ?? DEFAULT_PAGE.realtimeLabel,
    },
    runtime: {
      ...DEFAULT_RUNTIME,
      ...(payload.runtime || {}),
    },
    database: {
      ...DEFAULT_DATABASE,
      ...(payload.database || {}),
      counts: {
        ...DEFAULT_DATABASE.counts,
        ...(payload.database?.counts || {}),
      },
      visibleGroupIds: payload.database?.visibleGroupIds ?? DEFAULT_DATABASE.visibleGroupIds,
    },
    operator: {
      ...DEFAULT_OPERATOR,
      ...(payload.operator || {}),
      visibleGroupIds: payload.operator?.visibleGroupIds ?? DEFAULT_OPERATOR.visibleGroupIds,
    },
    clusterSummary: {
      total: payload.clusterSummary?.total ?? DEFAULT_CLUSTER_SUMMARY.total,
      online: payload.clusterSummary?.online ?? DEFAULT_CLUSTER_SUMMARY.online,
      warning: payload.clusterSummary?.warning ?? DEFAULT_CLUSTER_SUMMARY.warning,
      offline: payload.clusterSummary?.offline ?? DEFAULT_CLUSTER_SUMMARY.offline,
    },
    connectionSummary: {
      averageLatencyMs:
        payload.connectionSummary?.averageLatencyMs ?? DEFAULT_CONNECTION_SUMMARY.averageLatencyMs,
      packetLossRatePercent:
        payload.connectionSummary?.packetLossRatePercent ??
        DEFAULT_CONNECTION_SUMMARY.packetLossRatePercent,
      bandwidthUsageGbps:
        payload.connectionSummary?.bandwidthUsageGbps ??
        DEFAULT_CONNECTION_SUMMARY.bandwidthUsageGbps,
    },
    alertsSummary: {
      critical: payload.alertsSummary?.critical ?? DEFAULT_ALERTS_SUMMARY.critical,
      warning: payload.alertsSummary?.warning ?? DEFAULT_ALERTS_SUMMARY.warning,
      acknowledged: payload.alertsSummary?.acknowledged ?? DEFAULT_ALERTS_SUMMARY.acknowledged,
    },
    capabilities: {
      alerts: payload.capabilities?.alerts ?? DEFAULT_CAPABILITIES.alerts,
      trends: payload.capabilities?.trends ?? DEFAULT_CAPABILITIES.trends,
      diagnostics: payload.capabilities?.diagnostics ?? DEFAULT_CAPABILITIES.diagnostics,
      notifications: payload.capabilities?.notifications ?? DEFAULT_CAPABILITIES.notifications,
    },
    alerts: payload.alerts ?? DEFAULT_ALERTS,
    diagnostics: payload.diagnostics ?? DEFAULT_DIAGNOSTICS,
    overview: payload.overview ?? DEFAULT_OVERVIEW,
    quickLinks: payload.quickLinks ?? DEFAULT_QUICK_LINKS,
    probes: payload.probes ?? DEFAULT_PROBES,
    services: payload.services ?? DEFAULT_SERVICES,
    recentEvents: payload.recentEvents ?? DEFAULT_EVENTS,
    trendSummary: {
      ...DEFAULT_TREND_SUMMARY,
      ...(payload.trendSummary || {}),
      metrics: payload.trendSummary?.metrics ?? DEFAULT_TREND_SUMMARY.metrics,
    },
    availabilityReport: {
      ...DEFAULT_AVAILABILITY_REPORT,
      ...(payload.availabilityReport || {}),
      services: payload.availabilityReport?.services ?? DEFAULT_AVAILABILITY_REPORT.services,
    },
    capacityReport: {
      ...DEFAULT_CAPACITY_REPORT,
      ...(payload.capacityReport || {}),
      items: payload.capacityReport?.items ?? DEFAULT_CAPACITY_REPORT.items,
    },
    settings: {
      monitor: {
        source: payload.settings?.monitor?.source ?? DEFAULT_SETTINGS.monitor.source,
        refresh: {
          intervalSeconds:
            payload.settings?.monitor?.refresh?.intervalSeconds ??
            DEFAULT_SETTINGS.monitor.refresh.intervalSeconds,
          staleAfterSeconds:
            payload.settings?.monitor?.refresh?.staleAfterSeconds ??
            DEFAULT_SETTINGS.monitor.refresh.staleAfterSeconds,
        },
        thresholds: {
          memoryWarningPercent:
            payload.settings?.monitor?.thresholds?.memoryWarningPercent ??
            DEFAULT_SETTINGS.monitor.thresholds.memoryWarningPercent,
          databaseLatencyWarningMs:
            payload.settings?.monitor?.thresholds?.databaseLatencyWarningMs ??
            DEFAULT_SETTINGS.monitor.thresholds.databaseLatencyWarningMs,
          serviceLatencyWarningMs:
            payload.settings?.monitor?.thresholds?.serviceLatencyWarningMs ??
            DEFAULT_SETTINGS.monitor.thresholds.serviceLatencyWarningMs,
          serviceLatencyOfflineMs:
            payload.settings?.monitor?.thresholds?.serviceLatencyOfflineMs ??
            DEFAULT_SETTINGS.monitor.thresholds.serviceLatencyOfflineMs,
        },
        capabilities: {
          alerts:
            payload.settings?.monitor?.capabilities?.alerts ??
            DEFAULT_SETTINGS.monitor.capabilities.alerts,
          trends:
            payload.settings?.monitor?.capabilities?.trends ??
            DEFAULT_SETTINGS.monitor.capabilities.trends,
          diagnostics:
            payload.settings?.monitor?.capabilities?.diagnostics ??
            DEFAULT_SETTINGS.monitor.capabilities.diagnostics,
          notifications:
            payload.settings?.monitor?.capabilities?.notifications ??
            DEFAULT_SETTINGS.monitor.capabilities.notifications,
        },
        probes: {
          timeoutMs:
            payload.settings?.monitor?.probes?.timeoutMs ?? DEFAULT_SETTINGS.monitor.probes.timeoutMs,
          upstreamPath:
            payload.settings?.monitor?.probes?.upstreamPath ??
            DEFAULT_SETTINGS.monitor.probes.upstreamPath,
          filePath:
            payload.settings?.monitor?.probes?.filePath ?? DEFAULT_SETTINGS.monitor.probes.filePath,
        },
      },
      notifications: {
        enabled:
          payload.settings?.notifications?.enabled ?? DEFAULT_SETTINGS.notifications.enabled,
        channels:
          payload.settings?.notifications?.channels ?? DEFAULT_SETTINGS.notifications.channels,
        dedupeStrategy:
          payload.settings?.notifications?.dedupeStrategy ??
          DEFAULT_SETTINGS.notifications.dedupeStrategy,
      },
      datasources: payload.settings?.datasources ?? DEFAULT_SETTINGS.datasources,
      userAccess: {
        ...DEFAULT_SETTINGS.userAccess,
        ...(payload.settings?.userAccess || {}),
        visibleGroupIds:
          payload.settings?.userAccess?.visibleGroupIds ?? DEFAULT_SETTINGS.userAccess.visibleGroupIds,
      },
    },
    config: {
      refresh: {
        intervalSeconds:
          payload.config?.refresh?.intervalSeconds ?? DEFAULT_CONFIG.refresh.intervalSeconds,
        staleAfterSeconds:
          payload.config?.refresh?.staleAfterSeconds ?? DEFAULT_CONFIG.refresh.staleAfterSeconds,
      },
      thresholds: {
        memoryWarningPercent:
          payload.config?.thresholds?.memoryWarningPercent ??
          DEFAULT_CONFIG.thresholds.memoryWarningPercent,
        databaseLatencyWarningMs:
          payload.config?.thresholds?.databaseLatencyWarningMs ??
          DEFAULT_CONFIG.thresholds.databaseLatencyWarningMs,
        serviceLatencyWarningMs:
          payload.config?.thresholds?.serviceLatencyWarningMs ??
          DEFAULT_CONFIG.thresholds.serviceLatencyWarningMs,
        serviceLatencyOfflineMs:
          payload.config?.thresholds?.serviceLatencyOfflineMs ??
          DEFAULT_CONFIG.thresholds.serviceLatencyOfflineMs,
      },
      probes: {
        timeoutMs: payload.config?.probes?.timeoutMs ?? DEFAULT_CONFIG.probes.timeoutMs,
        upstreamPath: payload.config?.probes?.upstreamPath ?? DEFAULT_CONFIG.probes.upstreamPath,
        filePath: payload.config?.probes?.filePath ?? DEFAULT_CONFIG.probes.filePath,
      },
    },
    servers: payload.servers ?? [],
    connections: payload.connections ?? [],
    logs: payload.logs ?? [],
  };
}

export async function getMonitorDashboard(options?: Record<string, any>) {
  const response = await request<MonitorDashboardEnvelope>('/api/monitor/dashboard', {
    method: 'GET',
    ...(options || {}),
  });

  if (!response?.data) {
    throw new Error('监控数据为空');
  }

  return normalizeDashboardResponse(response.data);
}
