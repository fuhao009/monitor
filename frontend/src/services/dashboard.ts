import { getJson } from './http';
import type {
  AlertsSummary,
  ConnectionItem,
  DashboardCapabilities,
  DashboardRefresh,
  DashboardResponse,
  LogItem,
  ServerItem,
} from '../types/dashboard';

type DashboardResponseWire = Omit<DashboardResponse, 'refresh' | 'alertsSummary' | 'capabilities'>
  & Partial<Pick<DashboardResponse, 'refresh' | 'alertsSummary' | 'capabilities'>>;

const DEFAULT_REFRESH: DashboardRefresh = {
  intervalSeconds: 3,
  staleAfterSeconds: 9,
  lastSuccessAt: '',
};

const DEFAULT_CAPABILITIES: DashboardCapabilities = {
  alerts: true,
  trends: false,
  diagnostics: false,
};

function summarizeAlerts(servers: ServerItem[], connections: ConnectionItem[], logs: LogItem[]): AlertsSummary {
  const summary: AlertsSummary = {
    critical: 0,
    warning: 0,
    acknowledged: 0,
  };

  for (const server of servers) {
    if (server.status === 'offline') {
      summary.critical += 1;
    } else if (server.status === 'warning') {
      summary.warning += 1;
    }
  }

  for (const connection of connections) {
    if (connection.status === 'offline') {
      summary.warning += 1;
    }
  }

  for (const entry of logs) {
    if (entry.message.includes('恢复') || entry.message.includes('已确认')) {
      summary.acknowledged += 1;
    }
  }

  return summary;
}

function normalizeDashboardResponse(payload: DashboardResponseWire): DashboardResponse {
  const refresh: DashboardRefresh = {
    intervalSeconds: payload.refresh?.intervalSeconds ?? DEFAULT_REFRESH.intervalSeconds,
    staleAfterSeconds: payload.refresh?.staleAfterSeconds ?? DEFAULT_REFRESH.staleAfterSeconds,
    lastSuccessAt: payload.refresh?.lastSuccessAt ?? payload.generatedAt ?? DEFAULT_REFRESH.lastSuccessAt,
  };

  return {
    ...payload,
    refresh,
    alertsSummary: payload.alertsSummary ?? summarizeAlerts(payload.servers, payload.connections, payload.logs),
    capabilities: {
      alerts: payload.capabilities?.alerts ?? DEFAULT_CAPABILITIES.alerts,
      trends: payload.capabilities?.trends ?? DEFAULT_CAPABILITIES.trends,
      diagnostics: payload.capabilities?.diagnostics ?? DEFAULT_CAPABILITIES.diagnostics,
    },
  };
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  const payload = await getJson<DashboardResponseWire>('/api/dashboard');
  return normalizeDashboardResponse(payload);
}
