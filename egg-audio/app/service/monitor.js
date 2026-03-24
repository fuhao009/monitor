'use strict';

const axios = require('axios');
const os = require('os');
const dayjs = require('dayjs');
const Service = require('egg').Service;
const packageInfo = require('../../package.json');

const SERVER_POSITIONS = {
  'egg-api': { x: 360, y: 84 },
  auth: { x: 172, y: 178 },
  audio: { x: 548, y: 178 },
  group: { x: 220, y: 332 },
  file: { x: 500, y: 332 },
  mysql: { x: 360, y: 432 },
};

const CPU_HISTORY_OFFSETS = [ -8, -4, -1, 3, 0 ];
const DEFAULT_REFRESH = {
  intervalSeconds: 5,
  staleAfterSeconds: 15,
};
const DEFAULT_THRESHOLDS = {
  memoryWarningPercent: 82,
  databaseLatencyWarningMs: 250,
  serviceLatencyWarningMs: 180,
  serviceLatencyOfflineMs: 1200,
};
const DEFAULT_CAPABILITIES = {
  alerts: true,
  trends: false,
  diagnostics: true,
  notifications: true,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
}

function toIsoTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function combineStatus(...statuses) {
  if (statuses.includes('offline')) {
    return 'offline';
  }
  if (statuses.includes('warning')) {
    return 'warning';
  }
  return 'online';
}

function getLogLevel(status) {
  if (status === 'offline') {
    return 'error';
  }
  if (status === 'warning') {
    return 'warning';
  }
  return 'info';
}

function buildCpuHistory(cpuPercent) {
  return CPU_HISTORY_OFFSETS.map((offset, index) => {
    return clamp(round(cpuPercent + offset + index, 1), 1, 99);
  });
}

function buildMetricSeries(currentValue, offsets, min = 0, max = 100, digits = 1) {
  return offsets.map((offset, index) => {
    return clamp(round(currentValue + offset + index, digits), min, max);
  });
}

function safeHostFromUrl(baseUrl, fallback = 'unconfigured') {
  if (!baseUrl) {
    return fallback;
  }

  try {
    return new URL(baseUrl).host;
  } catch (error) {
    return baseUrl;
  }
}

class MonitorService extends Service {
  get alertIncidentStore() {
    if (!this.app.monitorAlertIncidentStore) {
      this.app.monitorAlertIncidentStore = new Map();
    }

    return this.app.monitorAlertIncidentStore;
  }

  get monitorConfig() {
    const config = this.app.config.monitor || {};

    return {
      page: {
        title: config.page?.title || '运维控制台',
        subtitle: config.page?.subtitle || '系统运行监控中心',
        realtimeLabel: config.page?.realtimeLabel || '实时监控中',
      },
      refresh: {
        intervalSeconds: Math.max(toNumber(config.refresh?.intervalSeconds, DEFAULT_REFRESH.intervalSeconds), 3),
        staleAfterSeconds: Math.max(
          toNumber(config.refresh?.staleAfterSeconds, DEFAULT_REFRESH.staleAfterSeconds),
          6,
        ),
      },
      thresholds: {
        memoryWarningPercent: Math.max(
          toNumber(config.thresholds?.memoryWarningPercent, DEFAULT_THRESHOLDS.memoryWarningPercent),
          1,
        ),
        databaseLatencyWarningMs: Math.max(
          toNumber(
            config.thresholds?.databaseLatencyWarningMs,
            DEFAULT_THRESHOLDS.databaseLatencyWarningMs,
          ),
          50,
        ),
        serviceLatencyWarningMs: Math.max(
          toNumber(
            config.thresholds?.serviceLatencyWarningMs,
            DEFAULT_THRESHOLDS.serviceLatencyWarningMs,
          ),
          50,
        ),
        serviceLatencyOfflineMs: Math.max(
          toNumber(
            config.thresholds?.serviceLatencyOfflineMs,
            DEFAULT_THRESHOLDS.serviceLatencyOfflineMs,
          ),
          100,
        ),
      },
      capabilities: {
        alerts: config.capabilities?.alerts ?? DEFAULT_CAPABILITIES.alerts,
        trends: config.capabilities?.trends ?? DEFAULT_CAPABILITIES.trends,
        diagnostics: config.capabilities?.diagnostics ?? DEFAULT_CAPABILITIES.diagnostics,
        notifications: config.capabilities?.notifications ?? DEFAULT_CAPABILITIES.notifications,
      },
      probes: {
        timeoutMs: Math.max(toNumber(config.probes?.timeoutMs, 4000), 500),
        upstream: {
          path: config.probes?.upstream?.path || '/',
        },
        file: {
          path: config.probes?.file?.path || '/',
        },
      },
    };
  }

  getRuntimeSnapshot() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const cpuCount = Math.max(os.cpus()?.length || 1, 1);
    const loadAverage = toNumber(os.loadavg()?.[0], 0.05);
    const generatedAt = new Date().toISOString();

    return {
      generatedAt,
      env: process.env.NODE_ENV || 'development',
      packageName: packageInfo.name,
      packageVersion: packageInfo.version,
      hostname: os.hostname(),
      port: this.app.config.cluster?.listen?.port || process.env.PORT || 7001,
      pid: process.pid,
      nodeVersion: process.version,
      cpuCount,
      loadAverage: round(loadAverage, 2),
      cpuPercent: clamp(round((loadAverage / cpuCount) * 100, 1), 1, 99),
      totalMemoryGb: round(totalMemory / 1024 / 1024 / 1024, 2),
      freeMemoryGb: round(os.freemem() / 1024 / 1024 / 1024, 2),
      rssGb: round(memoryUsage.rss / 1024 / 1024 / 1024, 2),
      heapUsedGb: round(memoryUsage.heapUsed / 1024 / 1024 / 1024, 2),
      heapTotalGb: round(memoryUsage.heapTotal / 1024 / 1024 / 1024, 2),
      memoryPercent: clamp(round((memoryUsage.rss / totalMemory) * 100, 1), 1, 99),
      uptimeSeconds: Math.round(process.uptime()),
      uptimeDays: round(process.uptime() / 86400, 1),
    };
  }

  getUpstreamSessionState() {
    const baseUrl = process.env.BASE_URL || '';

    return {
      configured: Boolean(baseUrl),
      baseUrl,
      upstreamHost: safeHostFromUrl(baseUrl),
      hasSession: Boolean(this.app.sessionId),
      expired: Boolean(this.app.sessionExpired),
      guardedPathPrefix: '/api/monitor/',
    };
  }

  async probeHttpEndpoint({ name, baseUrl, path, timeoutMs, headers }) {
    const targetHost = safeHostFromUrl(baseUrl);
    const probeResult = {
      name,
      configured: Boolean(baseUrl),
      targetHost,
      targetPath: path,
      reachable: false,
      healthy: false,
      latencyMs: null,
      statusCode: null,
      errorMessage: null,
    };

    if (!probeResult.configured) {
      probeResult.errorMessage = 'base url not configured';
      return probeResult;
    }

    const startedAt = Date.now();

    try {
      const response = await axios.request({
        baseURL: baseUrl,
        url: path,
        method: 'GET',
        timeout: timeoutMs,
        validateStatus: () => true,
        headers,
      });

      probeResult.statusCode = response.status;
      probeResult.latencyMs = Date.now() - startedAt;
      probeResult.reachable = true;
      probeResult.healthy = response.status < 500;
      return probeResult;
    } catch (error) {
      probeResult.latencyMs = Date.now() - startedAt;
      probeResult.errorMessage = error.message;
      return probeResult;
    }
  }

  async getUpstreamProbeState(upstreamSession) {
    const monitorConfig = this.monitorConfig;
    const headers = {};

    if (this.app.sessionId) {
      headers.Cookie = `JSESSIONID=${this.app.sessionId}`;
    }

    return this.probeHttpEndpoint({
      name: 'upstream',
      baseUrl: upstreamSession.baseUrl,
      path: monitorConfig.probes.upstream.path,
      timeoutMs: monitorConfig.probes.timeoutMs,
      headers,
    });
  }

  async getFileProbeState() {
    return this.probeHttpEndpoint({
      name: 'file',
      baseUrl: process.env.FILE_BASE_URL || '',
      path: this.monitorConfig.probes.file.path,
      timeoutMs: this.monitorConfig.probes.timeoutMs,
      headers: {},
    });
  }

  async getVisibleGroupIds(user) {
    if (!user) {
      return [];
    }

    try {
      return this.ctx.service.group.getVisibleGroupIds(user);
    } catch (error) {
      this.app.logger.warn(`[monitor] 使用群组服务计算可见群组失败: ${error.message}`);

      if (Number(user.role) === 0) {
        const groups = await this.app.knex('group_info')
          .where({ status: 1 })
          .select('id');
        return groups.map(item => toNumber(item.id)).filter(Boolean);
      }

      return String(user.group_list || '')
        .split(',')
        .filter(Boolean)
        .map(id => toNumber(id))
        .filter(Boolean);
    }
  }

  async getDatabaseSnapshot(user) {
    const startedAt = Date.now();
    const emptyCounts = {
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
    };

    try {
      await this.app.knex.raw('SELECT 1 AS ok');

      const [
        totalUsersRow,
        activeUsersRow,
        disabledUsersRow,
        adminUsersRow,
        linkedAccountUsersRow,
        totalGroupsRow,
        activeGroupsRow,
        inactiveGroupsRow,
        totalTokensRow,
        activeTokensRow,
        inactiveTokensRow,
        latestUserUpdateRow,
        latestGroupUpdateRow,
        latestTokenUpdateRow,
        visibleGroupIds,
      ] = await Promise.all([
        this.app.knex('users').count({ total: 'id' }).first(),
        this.app.knex('users').where({ status: 1 }).count({ total: 'id' }).first(),
        this.app.knex('users').where({ status: 0 }).count({ total: 'id' }).first(),
        this.app.knex('users').where({ role: 0, status: 1 }).count({ total: 'id' }).first(),
        this.app.knex('users')
          .where({ status: 1 })
          .whereNotNull('linked_account')
          .whereNot('linked_account', '')
          .count({ total: 'id' })
          .first(),
        this.app.knex('group_info').count({ total: 'id' }).first(),
        this.app.knex('group_info').where({ status: 1 }).count({ total: 'id' }).first(),
        this.app.knex('group_info').whereNot('status', 1).count({ total: 'id' }).first(),
        this.app.knex('user_tokens').count({ total: 'id' }).first(),
        this.app.knex('user_tokens').where({ status: 1 }).count({ total: 'id' }).first(),
        this.app.knex('user_tokens').whereNot('status', 1).count({ total: 'id' }).first(),
        this.app.knex('users').max({ value: 'update_time' }).first(),
        this.app.knex('group_info').max({ value: 'update_time' }).first(),
        this.app.knex('user_tokens').max({ value: 'update_time' }).first(),
        this.getVisibleGroupIds(user),
      ]);

      const latestUpdateAt = [
        toIsoTime(latestUserUpdateRow?.value),
        toIsoTime(latestGroupUpdateRow?.value),
        toIsoTime(latestTokenUpdateRow?.value),
      ].filter(Boolean).sort().pop() || null;

      return {
        reachable: true,
        latencyMs: Date.now() - startedAt,
        latestUpdateAt,
        visibleGroupIds,
        counts: {
          totalUsers: toNumber(totalUsersRow?.total),
          activeUsers: toNumber(activeUsersRow?.total),
          disabledUsers: toNumber(disabledUsersRow?.total),
          adminUsers: toNumber(adminUsersRow?.total),
          linkedAccountUsers: toNumber(linkedAccountUsersRow?.total),
          totalGroups: toNumber(totalGroupsRow?.total),
          activeGroups: toNumber(activeGroupsRow?.total),
          inactiveGroups: toNumber(inactiveGroupsRow?.total),
          totalTokens: toNumber(totalTokensRow?.total),
          activeTokens: toNumber(activeTokensRow?.total),
          inactiveTokens: toNumber(inactiveTokensRow?.total),
        },
      };
    } catch (error) {
      this.app.logger.warn(`[monitor] 数据库快照采集失败: ${error.message}`);

      return {
        reachable: false,
        latencyMs: Date.now() - startedAt,
        latestUpdateAt: null,
        visibleGroupIds: [],
        errorMessage: error.message,
        counts: emptyCounts,
      };
    }
  }

  getProbeStatus(probeResult) {
    const { thresholds } = this.monitorConfig;

    if (!probeResult.configured) {
      return 'offline';
    }

    if (!probeResult.reachable || !probeResult.healthy) {
      return 'offline';
    }

    if (probeResult.latencyMs !== null && probeResult.latencyMs >= thresholds.serviceLatencyOfflineMs) {
      return 'offline';
    }

    if (probeResult.latencyMs !== null && probeResult.latencyMs >= thresholds.serviceLatencyWarningMs) {
      return 'warning';
    }

    return 'online';
  }

  buildServerDetail(options) {
    const {
      cpuPercent,
      memoryPercent,
      memoryTotalGb,
      latencyMs,
      ingressMbps,
      egressMbps,
      connectionCount,
      tcpRetransmitPercent,
      diskNames,
    } = options;
    const safeMemoryTotalGb = Math.max(memoryTotalGb, 0.5);

    return {
      cpuHistory: buildCpuHistory(cpuPercent),
      memoryUsedGb: round((safeMemoryTotalGb * memoryPercent) / 100, 2),
      memoryTotalGb: round(safeMemoryTotalGb, 2),
      diskIoMbps: round((ingressMbps + egressMbps) / 2, 1),
      disks: diskNames.map((name, index) => ({
        name,
        usagePercent: clamp(round(memoryPercent - 6 + index * 8, 1), 8, 96),
      })),
      network: {
        latencyMs: round(latencyMs, 0),
        ingressMbps: round(ingressMbps, 1),
        egressMbps: round(egressMbps, 1),
        connectionCount,
        tcpRetransmitPercent: round(tcpRetransmitPercent, 2),
      },
    };
  }

  createServer(options) {
    const {
      id,
      name,
      ip,
      type,
      status,
      uptimeDays,
      cpuPercent,
      memoryPercent,
      memoryTotalGb,
      latencyMs,
      ingressMbps,
      egressMbps,
      connectionCount,
      tcpRetransmitPercent,
      diskNames,
    } = options;

    return {
      id,
      name,
      ip,
      type,
      status,
      uptimeDays: round(uptimeDays, 1),
      cpuPercent: round(cpuPercent, 1),
      memoryPercent: round(memoryPercent, 1),
      position: SERVER_POSITIONS[id],
      detail: this.buildServerDetail({
        cpuPercent,
        memoryPercent,
        memoryTotalGb,
        latencyMs,
        ingressMbps,
        egressMbps,
        connectionCount,
        tcpRetransmitPercent,
        diskNames,
      }),
    };
  }

  buildServers({ runtime, database, upstreamSession, upstreamProbe, fileProbe }) {
    const { thresholds } = this.monitorConfig;
    const counts = database.counts;
    const visibleGroupCount = database.visibleGroupIds.length;
    const mysqlStatus = database.reachable
      ? (database.latencyMs >= thresholds.databaseLatencyWarningMs ? 'warning' : 'online')
      : 'offline';
    const upstreamProbeStatus = this.getProbeStatus(upstreamProbe);
    const fileProbeStatus = this.getProbeStatus(fileProbe);
    const eggStatus = combineStatus(
      runtime.memoryPercent >= thresholds.memoryWarningPercent ? 'warning' : 'online',
      mysqlStatus === 'offline' ? 'warning' : 'online',
    );
    const authStatus = combineStatus(
      mysqlStatus,
      counts.activeTokens > 0 ? 'online' : 'warning',
    );
    const groupStatus = combineStatus(
      mysqlStatus,
      counts.activeGroups > 0 && visibleGroupCount > 0 ? 'online' : 'warning',
    );

    let audioStatus = upstreamProbeStatus;
    if (upstreamSession.configured && (!upstreamSession.hasSession || upstreamSession.expired)) {
      audioStatus = combineStatus(audioStatus, 'warning');
    }

    const fileStatus = combineStatus(
      fileProbeStatus,
      counts.linkedAccountUsers > 0 ? 'online' : 'warning',
    );

    const appIp = `${runtime.hostname}:${runtime.port}`;
    const dbIp = `${process.env.DB_HOST || 'mysql'}:${process.env.DB_PORT || '3306'}`;
    const upstreamHost = upstreamProbe.targetHost || upstreamSession.upstreamHost;
    const fileHost = fileProbe.targetHost || safeHostFromUrl(process.env.FILE_BASE_URL || '', appIp);

    return [
      this.createServer({
        id: 'egg-api',
        name: 'Egg API',
        ip: appIp,
        type: 'app',
        status: eggStatus,
        uptimeDays: runtime.uptimeDays,
        cpuPercent: runtime.cpuPercent,
        memoryPercent: runtime.memoryPercent,
        memoryTotalGb: Math.max(1, runtime.totalMemoryGb),
        latencyMs: Math.max(3, database.latencyMs),
        ingressMbps: clamp(round(database.counts.activeUsers * 2.4 + database.counts.totalTokens * 0.8, 1), 1, 999),
        egressMbps: clamp(round(database.counts.activeTokens * 1.8 + database.counts.totalGroups * 0.9, 1), 1, 999),
        connectionCount: 3,
        tcpRetransmitPercent: eggStatus === 'warning' ? 0.15 : 0.03,
        diskNames: [ 'runtime', 'logs' ],
      }),
      this.createServer({
        id: 'auth',
        name: 'Auth',
        ip: appIp,
        type: 'lb',
        status: authStatus,
        uptimeDays: runtime.uptimeDays,
        cpuPercent: clamp(round(runtime.cpuPercent * 0.92, 1), 1, 99),
        memoryPercent: clamp(round(runtime.memoryPercent * 0.85, 1), 1, 99),
        memoryTotalGb: Math.max(0.8, runtime.totalMemoryGb),
        latencyMs: Math.max(5, database.latencyMs),
        ingressMbps: clamp(round(counts.activeTokens * 3.2 + counts.activeUsers * 1.1, 1), 1, 999),
        egressMbps: clamp(round(counts.activeUsers * 2.2 + counts.adminUsers * 1.5, 1), 1, 999),
        connectionCount: 2,
        tcpRetransmitPercent: authStatus === 'warning' ? 0.18 : 0.05,
        diskNames: [ 'tokens', 'sessions' ],
      }),
      this.createServer({
        id: 'audio',
        name: 'Upstream',
        ip: upstreamHost,
        type: 'app',
        status: audioStatus,
        uptimeDays: runtime.uptimeDays,
        cpuPercent: clamp(round(runtime.cpuPercent * 0.65, 1), 1, 95),
        memoryPercent: clamp(round(runtime.memoryPercent * 0.45, 1), 1, 95),
        memoryTotalGb: Math.max(0.6, runtime.totalMemoryGb * 0.4),
        latencyMs: upstreamProbe.latencyMs || thresholds.serviceLatencyOfflineMs,
        ingressMbps: clamp(round(upstreamProbe.reachable ? 28 : 4, 1), 1, 999),
        egressMbps: clamp(round(upstreamSession.hasSession ? 31 : 6, 1), 1, 999),
        connectionCount: 1,
        tcpRetransmitPercent: audioStatus === 'online' ? 0.06 : 0.32,
        diskNames: [ 'upstream', 'session' ],
      }),
      this.createServer({
        id: 'group',
        name: 'Group',
        ip: dbIp,
        type: 'app',
        status: groupStatus,
        uptimeDays: runtime.uptimeDays,
        cpuPercent: clamp(round(runtime.cpuPercent * 0.8, 1), 1, 96),
        memoryPercent: clamp(round(runtime.memoryPercent * 0.72, 1), 1, 96),
        memoryTotalGb: Math.max(0.8, runtime.totalMemoryGb),
        latencyMs: Math.max(8, database.latencyMs),
        ingressMbps: clamp(round(counts.activeGroups * 5 + visibleGroupCount * 1.4, 1), 1, 999),
        egressMbps: clamp(round(visibleGroupCount * 4 + counts.totalGroups * 0.6, 1), 1, 999),
        connectionCount: 2,
        tcpRetransmitPercent: groupStatus === 'warning' ? 0.14 : 0.04,
        diskNames: [ 'groups', 'hierarchy' ],
      }),
      this.createServer({
        id: 'file',
        name: 'File',
        ip: fileHost,
        type: 'storage',
        status: fileStatus,
        uptimeDays: runtime.uptimeDays,
        cpuPercent: clamp(round(runtime.cpuPercent * 0.5, 1), 1, 92),
        memoryPercent: clamp(round(runtime.memoryPercent * 0.55, 1), 1, 92),
        memoryTotalGb: Math.max(0.6, runtime.totalMemoryGb * 0.6),
        latencyMs: fileProbe.latencyMs || thresholds.serviceLatencyOfflineMs,
        ingressMbps: clamp(round(counts.linkedAccountUsers * 3 + (fileProbe.reachable ? 8 : 1), 1), 1, 999),
        egressMbps: clamp(round(counts.activeTokens * 0.8 + (fileProbe.reachable ? 14 : 3), 1), 1, 999),
        connectionCount: 1,
        tcpRetransmitPercent: fileStatus === 'warning' ? 0.22 : fileStatus === 'offline' ? 0.4 : 0.05,
        diskNames: [ 'downloads', 'imports' ],
      }),
      this.createServer({
        id: 'mysql',
        name: 'MySQL',
        ip: dbIp,
        type: 'db',
        status: mysqlStatus,
        uptimeDays: runtime.uptimeDays,
        cpuPercent: clamp(round(runtime.cpuPercent * 0.7 + counts.totalUsers * 0.3, 1), 1, 98),
        memoryPercent: clamp(round(runtime.memoryPercent * 0.75 + counts.totalGroups * 0.25, 1), 1, 98),
        memoryTotalGb: Math.max(2, runtime.totalMemoryGb),
        latencyMs: Math.max(5, database.latencyMs),
        ingressMbps: clamp(round(30 + counts.totalUsers * 1.2 + counts.totalGroups * 2, 1), 1, 999),
        egressMbps: clamp(round(26 + counts.totalTokens * 0.6, 1), 1, 999),
        connectionCount: 3,
        tcpRetransmitPercent: mysqlStatus === 'online' ? 0.03 : 0.4,
        diskNames: [ 'users', 'group_info' ],
      }),
    ];
  }

  buildConnections(servers, database, upstreamProbe, fileProbe) {
    const serverMap = servers.reduce((map, server) => {
      map[server.id] = server;
      return map;
    }, {});
    const counts = database.counts;

    return [
      {
        id: 'conn-api-auth',
        from: 'egg-api',
        to: 'auth',
        status: combineStatus(serverMap['egg-api'].status, serverMap.auth.status),
        latencyMs: round(Math.max(5, database.latencyMs * 0.6), 0),
        bandwidthMbps: round(12 + counts.activeUsers * 4.2, 1),
      },
      {
        id: 'conn-auth-mysql',
        from: 'auth',
        to: 'mysql',
        status: combineStatus(serverMap.auth.status, serverMap.mysql.status),
        latencyMs: round(Math.max(8, database.latencyMs), 0),
        bandwidthMbps: round(22 + counts.activeTokens * 3.1, 1),
      },
      {
        id: 'conn-group-mysql',
        from: 'group',
        to: 'mysql',
        status: combineStatus(serverMap.group.status, serverMap.mysql.status),
        latencyMs: round(Math.max(10, database.latencyMs * 1.08), 0),
        bandwidthMbps: round(14 + counts.activeGroups * 6.5, 1),
      },
      {
        id: 'conn-audio-api',
        from: 'audio',
        to: 'egg-api',
        status: combineStatus(serverMap.audio.status, serverMap['egg-api'].status),
        latencyMs: round(upstreamProbe.latencyMs || this.monitorConfig.thresholds.serviceLatencyOfflineMs, 0),
        bandwidthMbps: round(upstreamProbe.reachable ? 38 : 4, 1),
      },
      {
        id: 'conn-file-auth',
        from: 'file',
        to: 'auth',
        status: combineStatus(serverMap.file.status, serverMap.auth.status),
        latencyMs: round(fileProbe.latencyMs || this.monitorConfig.thresholds.serviceLatencyOfflineMs, 0),
        bandwidthMbps: round(fileProbe.reachable ? 12 + counts.linkedAccountUsers * 5 : 3, 1),
      },
      {
        id: 'conn-api-mysql',
        from: 'egg-api',
        to: 'mysql',
        status: combineStatus(serverMap['egg-api'].status, serverMap.mysql.status),
        latencyMs: round(Math.max(9, database.latencyMs), 0),
        bandwidthMbps: round(18 + counts.totalUsers * 2.8 + counts.totalGroups * 2.4, 1),
      },
    ];
  }

  createAlert(options) {
    const now = options.observedAt || new Date().toISOString();

    return {
      id: options.id,
      dedupeKey: options.dedupeKey || options.id,
      severity: options.severity,
      state: options.state || 'open',
      scope: options.scope || 'platform',
      source: options.source,
      title: options.title,
      summary: options.summary,
      triggerRule: options.triggerRule,
      recoveryRule: options.recoveryRule,
      observedAt: now,
      lastChangeAt: now,
    };
  }

  stabilizeAlerts(alerts) {
    const store = this.alertIncidentStore;
    const nextStore = new Map();
    const stabilizedAlerts = alerts.map((alert) => {
      const fingerprint = JSON.stringify({
        severity: alert.severity,
        state: alert.state,
        summary: alert.summary,
        triggerRule: alert.triggerRule,
        recoveryRule: alert.recoveryRule,
      });
      const previous = store.get(alert.dedupeKey);

      if (previous && previous.fingerprint === fingerprint) {
        const stableAlert = {
          ...alert,
          observedAt: previous.observedAt,
          lastChangeAt: previous.lastChangeAt,
        };

        nextStore.set(alert.dedupeKey, {
          fingerprint,
          observedAt: previous.observedAt,
          lastChangeAt: previous.lastChangeAt,
        });
        return stableAlert;
      }

      nextStore.set(alert.dedupeKey, {
        fingerprint,
        observedAt: alert.observedAt,
        lastChangeAt: alert.lastChangeAt,
      });
      return alert;
    });

    this.app.monitorAlertIncidentStore = nextStore;
    return stabilizedAlerts;
  }

  buildAlerts({ runtime, database, upstreamSession, upstreamProbe, fileProbe, user }) {
    const alerts = [];
    const { thresholds } = this.monitorConfig;
    const observedAt = runtime.generatedAt;

    if (!database.reachable) {
      alerts.push(this.createAlert({
        id: 'database-unreachable',
        severity: 'critical',
        source: 'mysql',
        title: '数据库不可达',
        summary: `MySQL 采集失败：${database.errorMessage || '连接异常'}。`,
        triggerRule: '数据库探测失败即触发严重告警',
        recoveryRule: '数据库探测恢复成功后自动恢复',
        observedAt,
      }));
    } else if (database.latencyMs >= thresholds.databaseLatencyWarningMs) {
      alerts.push(this.createAlert({
        id: 'database-latency-high',
        severity: 'warning',
        source: 'mysql',
        title: '数据库延迟偏高',
        summary: `当前数据库响应 ${database.latencyMs} ms，已超过 ${thresholds.databaseLatencyWarningMs} ms 阈值。`,
        triggerRule: `数据库延迟 >= ${thresholds.databaseLatencyWarningMs} ms`,
        recoveryRule: `数据库延迟 < ${thresholds.databaseLatencyWarningMs} ms`,
        observedAt,
      }));
    }

    if (runtime.memoryPercent >= thresholds.memoryWarningPercent) {
      alerts.push(this.createAlert({
        id: 'host-memory-high',
        severity: 'warning',
        source: 'egg-api',
        title: '宿主内存占用偏高',
        summary: `当前 RSS 占用 ${runtime.memoryPercent}%（${runtime.rssGb} GB），请关注宿主容量压力。`,
        triggerRule: `宿主内存 >= ${thresholds.memoryWarningPercent}%`,
        recoveryRule: `宿主内存 < ${thresholds.memoryWarningPercent}%`,
        observedAt,
      }));
    }

    if (!upstreamSession.configured) {
      alerts.push(this.createAlert({
        id: 'upstream-unconfigured',
        severity: 'critical',
        source: 'upstream',
        title: '上游服务未配置',
        summary: '未检测到 BASE_URL，上游服务健康探测无法执行。',
        triggerRule: '上游 base url 为空',
        recoveryRule: '完成 BASE_URL 配置并可正常探测',
        observedAt,
      }));
    } else if (!upstreamProbe.reachable || !upstreamProbe.healthy) {
      alerts.push(this.createAlert({
        id: 'upstream-unreachable',
        severity: 'critical',
        source: 'upstream',
        title: '上游服务不可达',
        summary: `目标 ${upstreamProbe.targetHost}${upstreamProbe.targetPath} 探测失败：${upstreamProbe.errorMessage || `HTTP ${upstreamProbe.statusCode}`}`,
        triggerRule: '上游探测失败或返回 5xx',
        recoveryRule: '上游探测恢复成功且返回非 5xx',
        observedAt,
      }));
    } else if (upstreamProbe.latencyMs >= thresholds.serviceLatencyWarningMs || !upstreamSession.hasSession || upstreamSession.expired) {
      alerts.push(this.createAlert({
        id: 'upstream-session-warning',
        severity: 'warning',
        source: 'upstream',
        title: '上游会话或响应异常',
        summary: `探测延迟 ${upstreamProbe.latencyMs} ms，会话${upstreamSession.hasSession ? '已建立' : '未建立'}，${upstreamSession.expired ? '已标记过期' : '未标记过期'}。`,
        triggerRule: `上游延迟 >= ${thresholds.serviceLatencyWarningMs} ms，或会话未建立/过期`,
        recoveryRule: '上游响应恢复且会话处于有效状态',
        observedAt,
      }));
    }

    if (!fileProbe.configured) {
      alerts.push(this.createAlert({
        id: 'file-service-unconfigured',
        severity: 'warning',
        source: 'file',
        title: '文件服务未配置',
        summary: '未检测到 FILE_BASE_URL，文件服务仅能展示关联账号统计。',
        triggerRule: '文件服务地址为空',
        recoveryRule: '完成 FILE_BASE_URL 配置并可正常探测',
        observedAt,
      }));
    } else if (!fileProbe.reachable || !fileProbe.healthy) {
      alerts.push(this.createAlert({
        id: 'file-service-unreachable',
        severity: 'critical',
        source: 'file',
        title: '文件服务不可达',
        summary: `目标 ${fileProbe.targetHost}${fileProbe.targetPath} 探测失败：${fileProbe.errorMessage || `HTTP ${fileProbe.statusCode}`}`,
        triggerRule: '文件服务探测失败或返回 5xx',
        recoveryRule: '文件服务探测恢复成功且返回非 5xx',
        observedAt,
      }));
    } else if (fileProbe.latencyMs >= thresholds.serviceLatencyWarningMs) {
      alerts.push(this.createAlert({
        id: 'file-service-latency-high',
        severity: 'warning',
        source: 'file',
        title: '文件服务延迟偏高',
        summary: `当前文件服务响应 ${fileProbe.latencyMs} ms，已超过 ${thresholds.serviceLatencyWarningMs} ms 阈值。`,
        triggerRule: `文件服务延迟 >= ${thresholds.serviceLatencyWarningMs} ms`,
        recoveryRule: `文件服务延迟 < ${thresholds.serviceLatencyWarningMs} ms`,
        observedAt,
      }));
    }

    if (database.counts.activeTokens === 0) {
      alerts.push(this.createAlert({
        id: 'auth-no-active-token',
        severity: 'warning',
        source: 'auth',
        title: '无活跃登录令牌',
        summary: '当前 user_tokens 中无 status=1 的令牌记录，受保护路由可能无法正常访问。',
        triggerRule: '活跃令牌数 = 0',
        recoveryRule: '活跃令牌数 > 0',
        observedAt,
      }));
    }

    if (database.visibleGroupIds.length === 0 && user) {
      alerts.push(this.createAlert({
        id: 'visibility-scope-empty',
        severity: 'warning',
        source: 'group',
        title: '当前账号无可见群组',
        summary: `${user.username} 当前可见群组为 0，资源树和对象定位将缺少站点范围。`,
        triggerRule: '当前用户可见群组数 = 0',
        recoveryRule: '当前用户至少可见 1 个群组',
        observedAt,
      }));
    }

    return alerts;
  }

  buildDiagnostics({ alerts, runtime, database, upstreamProbe, fileProbe }) {
    const diagnostics = [];
    const observedAt = runtime.generatedAt;
    const pushDiagnostic = (id, severity, title, summary, steps, relatedSources) => {
      diagnostics.push({
        id,
        severity,
        title,
        summary,
        steps,
        relatedSources,
        observedAt,
      });
    };

    if (alerts.some(alert => alert.id === 'host-memory-high')) {
      pushDiagnostic(
        'diag-memory-high',
        'warning',
        '优先排查宿主内存压力',
        `当前宿主 RSS ${runtime.rssGb} GB，空闲内存 ${runtime.freeMemoryGb} GB。`,
        [
          '检查 Node 进程与日志文件增长情况。',
          '确认是否存在长时间未回收的大对象或批量任务。',
          '必要时在低峰期执行服务重启并观察趋势。',
        ],
        [ 'egg-api' ],
      );
    }

    if (alerts.some(alert => alert.id.startsWith('database-'))) {
      pushDiagnostic(
        'diag-database',
        alerts.some(alert => alert.severity === 'critical' && alert.source === 'mysql') ? 'critical' : 'warning',
        '优先确认数据库连接与负载',
        `数据库最近采集延迟 ${database.latencyMs} ms，最近更新时间 ${database.latestUpdateAt || '暂无'}`,
        [
          '在数据库主机执行连接与慢查询检查。',
          '确认 users/group_info/user_tokens 三张表是否存在锁等待。',
          '若为网络问题，检查数据库宿主和应用宿主之间链路。',
        ],
        [ 'mysql' ],
      );
    }

    if (alerts.some(alert => alert.source === 'upstream')) {
      pushDiagnostic(
        'diag-upstream',
        alerts.some(alert => alert.severity === 'critical' && alert.source === 'upstream') ? 'critical' : 'warning',
        '检查上游平台登录态与接口可达性',
        `探测目标 ${upstreamProbe.targetHost}${upstreamProbe.targetPath}，最近耗时 ${upstreamProbe.latencyMs || 'N/A'} ms。`,
        [
          '确认 BASE_URL 配置与网络策略。',
          '检查上游服务登录态是否已失效。',
          '若持续 5xx，请与上游平台运维共同排查。',
        ],
        [ 'upstream' ],
      );
    }

    if (alerts.some(alert => alert.source === 'file')) {
      pushDiagnostic(
        'diag-file-service',
        alerts.some(alert => alert.severity === 'critical' && alert.source === 'file') ? 'critical' : 'warning',
        '检查文件服务地址、认证与链路',
        `探测目标 ${fileProbe.targetHost}${fileProbe.targetPath}，最近耗时 ${fileProbe.latencyMs || 'N/A'} ms。`,
        [
          '确认 FILE_BASE_URL 指向正确网关。',
          '检查文件服务认证令牌或会话是否失效。',
          '若目标可达但持续高延迟，检查网关或反向代理日志。',
        ],
        [ 'file' ],
      );
    }

    if (!diagnostics.length) {
      pushDiagnostic(
        'diag-healthy',
        'info',
        '当前暂无明显风险',
        '关键探测项均在正常阈值内，可继续观察趋势和轮询结果。',
        [
          '保持当前轮询配置。',
          '如需更严格策略，可下调阈值并观察误报情况。',
        ],
        [ 'platform' ],
      );
    }

    return diagnostics;
  }

  buildAlertsSummary(alerts) {
    return {
      critical: alerts.filter(alert => alert.severity === 'critical' && alert.state === 'open').length,
      warning: alerts.filter(alert => alert.severity === 'warning' && alert.state === 'open').length,
      acknowledged: alerts.filter(alert => alert.state === 'acknowledged').length,
    };
  }

  buildConfigSnapshot() {
    const monitorConfig = this.monitorConfig;

    return {
      refresh: {
        intervalSeconds: monitorConfig.refresh.intervalSeconds,
        staleAfterSeconds: monitorConfig.refresh.staleAfterSeconds,
      },
      thresholds: monitorConfig.thresholds,
      probes: {
        timeoutMs: monitorConfig.probes.timeoutMs,
        upstreamPath: monitorConfig.probes.upstream.path,
        filePath: monitorConfig.probes.file.path,
      },
    };
  }

  buildOperatorSummary(user, database) {
    const safeUser = user || {};

    return {
      username: safeUser.username || safeUser.name || 'unknown',
      role: toNumber(safeUser.role, -1),
      isAdmin: Number(safeUser.role) === 0,
      visibleGroupCount: database.visibleGroupIds.length,
      visibleGroupIds: database.visibleGroupIds,
      activeTokenCount: database.counts.activeTokens,
      linkedAccountUsers: database.counts.linkedAccountUsers,
    };
  }

  buildOverview({ runtime, database, alerts, servers, probes, operator }) {
    const onlineServerCount = servers.filter(server => server.status === 'online').length;
    const warningServerCount = servers.filter(server => server.status === 'warning').length;
    const alertCount = alerts.filter(alert => alert.state === 'open').length;
    const onlineProbeCount = probes.filter(probe => probe.status === 'online').length;
    const totalResourceCount =
      database.counts.totalUsers + database.counts.totalGroups + database.counts.totalTokens;

    return [
      {
        id: 'platform-health',
        title: '平台健康',
        value: `${onlineServerCount}/${servers.length}`,
        description: warningServerCount
          ? `在线 ${onlineServerCount}，告警 ${warningServerCount}`
          : `全部 ${servers.length} 个核心节点已纳入巡检`,
        status: servers.some(server => server.status === 'offline')
          ? 'offline'
          : warningServerCount
          ? 'warning'
          : 'online',
        path: '/hosts',
      },
      {
        id: 'active-alerts',
        title: '活动告警',
        value: `${alertCount}`,
        description: `严重 ${alerts.filter(alert => alert.severity === 'critical').length} / 警告 ${alerts.filter(alert => alert.severity === 'warning').length}`,
        status: alerts.some(alert => alert.severity === 'critical')
          ? 'offline'
          : alertCount
          ? 'warning'
          : 'online',
        path: '/alerts',
      },
      {
        id: 'database-assets',
        title: '数据库对象',
        value: `${totalResourceCount}`,
        description: `用户 ${database.counts.totalUsers} / 群组 ${database.counts.totalGroups} / 令牌 ${database.counts.totalTokens}`,
        status: !database.reachable
          ? 'offline'
          : database.latencyMs >= this.monitorConfig.thresholds.databaseLatencyWarningMs
          ? 'warning'
          : 'online',
        path: '/databases',
      },
      {
        id: 'visibility-scope',
        title: '可见范围',
        value: `${operator.visibleGroupCount}`,
        description: `${operator.username} 当前可见群组数`,
        status: operator.visibleGroupCount > 0 ? 'online' : 'warning',
        path: '/settings/users',
      },
      {
        id: 'probe-health',
        title: '探针健康',
        value: `${onlineProbeCount}/${probes.length}`,
        description: 'Upstream / File / Database 当前探测结果',
        status: probes.some(probe => probe.status === 'offline')
          ? 'offline'
          : probes.some(probe => probe.status === 'warning')
          ? 'warning'
          : 'online',
        path: '/settings/datasources',
      },
      {
        id: 'runtime-pressure',
        title: '运行压力',
        value: `${runtime.cpuPercent}%`,
        description: `CPU ${runtime.cpuPercent}% / 内存 ${runtime.memoryPercent}% / 运行 ${runtime.uptimeDays} 天`,
        status: runtime.memoryPercent >= this.monitorConfig.thresholds.memoryWarningPercent
          ? 'warning'
          : 'online',
        path: '/metrics',
      },
    ];
  }

  buildQuickLinks({ alerts, diagnostics, database, probes }) {
    return [
      {
        id: 'quick-hosts',
        title: '主机监控',
        path: '/hosts',
        description: '查看所有节点健康、资源与状态。',
        badge: `${database.counts.totalGroups} 组范围`,
        status: 'online',
      },
      {
        id: 'quick-services',
        title: '服务监控',
        path: '/services',
        description: '查看服务清单、状态和依赖入口。',
        badge: `${probes.length} 个探测目标`,
        status: probes.some(probe => probe.status !== 'online') ? 'warning' : 'online',
      },
      {
        id: 'quick-alerts',
        title: '告警中心',
        path: '/alerts',
        description: '定位活动告警、历史记录和恢复状态。',
        badge: `${alerts.length} 条`,
        status: alerts.some(alert => alert.severity === 'critical') ? 'offline' : 'warning',
      },
      {
        id: 'quick-events',
        title: '事件中心',
        path: '/events',
        description: '查看最近事件、状态变更与系统记录。',
        badge: '最近变更',
        status: 'info',
      },
      {
        id: 'quick-metrics',
        title: '指标趋势',
        path: '/metrics',
        description: '查看关键指标、容量趋势和网络质量。',
        badge: `${diagnostics.length} 条建议`,
        status: diagnostics.some(item => item.severity === 'critical') ? 'warning' : 'online',
      },
      {
        id: 'quick-settings',
        title: '监控配置',
        path: '/settings/monitor',
        description: '查看当前阈值、轮询周期和探针设置。',
        badge: `${this.monitorConfig.refresh.intervalSeconds}s`,
        status: 'info',
      },
    ];
  }

  buildProbeSummaries({ database, upstreamProbe, fileProbe }) {
    const databaseStatus = !database.reachable
      ? 'offline'
      : database.latencyMs >= this.monitorConfig.thresholds.databaseLatencyWarningMs
      ? 'warning'
      : 'online';

    return [
      {
        id: 'probe-database',
        title: 'MySQL',
        target: `${process.env.DB_HOST || 'mysql'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME || 'unknown'}`,
        configured: true,
        status: databaseStatus,
        latencyMs: database.latencyMs,
        statusCode: database.reachable ? 200 : null,
        description: database.reachable
          ? `最近更新时间 ${database.latestUpdateAt || '暂无'}`
          : '数据库连接异常',
        errorMessage: database.reachable ? null : database.errorMessage || 'database unreachable',
      },
      {
        id: 'probe-upstream',
        title: 'Upstream',
        target: `${upstreamProbe.targetHost}${upstreamProbe.targetPath}`,
        configured: upstreamProbe.configured,
        status: this.getProbeStatus(upstreamProbe),
        latencyMs: upstreamProbe.latencyMs,
        statusCode: upstreamProbe.statusCode,
        description: upstreamProbe.reachable ? '上游健康探测结果' : '上游探测失败',
        errorMessage: upstreamProbe.errorMessage,
      },
      {
        id: 'probe-file',
        title: 'File',
        target: `${fileProbe.targetHost}${fileProbe.targetPath}`,
        configured: fileProbe.configured,
        status: this.getProbeStatus(fileProbe),
        latencyMs: fileProbe.latencyMs,
        statusCode: fileProbe.statusCode,
        description: fileProbe.reachable ? '文件服务探测结果' : '文件服务探测失败',
        errorMessage: fileProbe.errorMessage,
      },
    ];
  }

  buildServiceCatalog({ servers, alerts, diagnostics }) {
    const sourceMap = {
      'egg-api': 'egg-api',
      auth: 'auth',
      audio: 'upstream',
      group: 'group',
      file: 'file',
      mysql: 'mysql',
    };

    return servers.map((server) => {
      const sourceKey = sourceMap[server.id] || server.id;
      const relatedAlerts = alerts.filter(alert => alert.source === sourceKey);
      const relatedDiagnostics = diagnostics.filter(item => item.relatedSources.includes(sourceKey));

      return {
        id: server.id,
        name: server.name,
        category:
          server.type === 'db'
            ? 'database'
            : server.type === 'storage'
            ? 'storage'
            : server.type === 'lb'
            ? 'access'
            : 'application',
        status: server.status,
        target: server.ip,
        latencyMs: server.detail.network.latencyMs,
        alertsCount: relatedAlerts.length,
        diagnosticsCount: relatedDiagnostics.length,
        summary: `${server.name} 当前 ${server.status}，CPU ${server.cpuPercent}% / 内存 ${server.memoryPercent}%。`,
        relatedServerIds: [server.id],
      };
    });
  }

  buildRecentEvents({ alerts, logs }) {
    const alertEvents = alerts.map((alert) => ({
      id: `event-${alert.id}`,
      time: alert.lastChangeAt,
      level: alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info',
      category: 'alert',
      source: alert.source,
      title: alert.title,
      summary: alert.summary,
    }));

    const logEvents = logs.map((log) => ({
      id: `event-log-${log.id}`,
      time: log.time,
      level: log.level,
      category: 'log',
      source: log.source,
      title: `${log.source} ${log.level}`,
      summary: log.message,
    }));

    return alertEvents
      .concat(logEvents)
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 12);
  }

  buildTrendSummary({ runtime, database, connectionSummary, servers, generatedAt }) {
    const mysqlServer = servers.find(server => server.id === 'mysql');

    return {
      updatedAt: generatedAt,
      metrics: [
        {
          id: 'trend-runtime-cpu',
          title: '平台 CPU',
          unit: '%',
          currentValue: runtime.cpuPercent,
          points: buildCpuHistory(runtime.cpuPercent),
          threshold: this.monitorConfig.thresholds.memoryWarningPercent,
        },
        {
          id: 'trend-runtime-memory',
          title: '平台内存',
          unit: '%',
          currentValue: runtime.memoryPercent,
          points: buildMetricSeries(runtime.memoryPercent, [ -6, -2, 0, 3, 1 ], 0, 100, 1),
          threshold: this.monitorConfig.thresholds.memoryWarningPercent,
        },
        {
          id: 'trend-db-latency',
          title: '数据库延迟',
          unit: 'ms',
          currentValue: database.latencyMs,
          points: buildMetricSeries(
            database.latencyMs,
            [ -45, -18, 0, 12, -7 ],
            0,
            Math.max(this.monitorConfig.thresholds.serviceLatencyOfflineMs, database.latencyMs + 80),
            0,
          ),
          threshold: this.monitorConfig.thresholds.databaseLatencyWarningMs,
        },
        {
          id: 'trend-bandwidth',
          title: '带宽使用',
          unit: 'Gbps',
          currentValue: connectionSummary.bandwidthUsageGbps,
          points: buildMetricSeries(connectionSummary.bandwidthUsageGbps, [ -0.4, -0.1, 0, 0.2, -0.05 ], 0, Math.max(4, connectionSummary.bandwidthUsageGbps + 1), 2),
        },
        {
          id: 'trend-mysql-memory',
          title: 'MySQL 内存',
          unit: '%',
          currentValue: mysqlServer?.memoryPercent || 0,
          points: mysqlServer
            ? buildMetricSeries(mysqlServer.memoryPercent, [ -5, -2, 0, 3, 1 ], 0, 100, 1)
            : buildMetricSeries(0, [ 0, 0, 0, 0, 0 ]),
        },
      ],
    };
  }

  buildAvailabilityReport({ servers, alerts }) {
    const services = servers.map((server) => {
      const availabilityPercent =
        server.status === 'online' ? 99.95 : server.status === 'warning' ? 98.5 : 94.0;

      return {
        id: server.id,
        name: server.name,
        status: server.status,
        availabilityPercent,
        latencyMs: server.detail.network.latencyMs,
        alertsCount: alerts.filter(alert => {
          if (server.id === 'audio') {
            return alert.source === 'upstream';
          }
          if (server.id === 'mysql') {
            return alert.source === 'mysql';
          }
          return alert.source === server.id;
        }).length,
      };
    });

    return {
      overallPercent: round(
        services.reduce((sum, service) => sum + service.availabilityPercent, 0) /
          Math.max(services.length, 1),
        2,
      ),
      degradedCount: services.filter(service => service.status !== 'online').length,
      services,
    };
  }

  buildCapacityReport({ servers }) {
    const items = servers.map((server) => {
      const diskPressure = Math.max(...server.detail.disks.map(disk => disk.usagePercent), server.memoryPercent);
      const usagePercent = round(Math.max(server.memoryPercent, diskPressure), 1);
      const thresholdPercent = 80;
      const riskLevel = usagePercent >= 90 ? 'offline' : usagePercent >= thresholdPercent ? 'warning' : 'online';

      return {
        id: server.id,
        name: server.name,
        usagePercent,
        currentLabel: `${usagePercent}%`,
        thresholdPercent,
        riskLevel,
        forecastLabel:
          riskLevel === 'offline'
            ? '需立即扩容'
            : riskLevel === 'warning'
            ? '建议本周处理'
            : '容量平稳',
      };
    });

    return {
      atRiskCount: items.filter(item => item.riskLevel !== 'online').length,
      highestUsagePercent: items.reduce((max, item) => Math.max(max, item.usagePercent), 0),
      items,
    };
  }

  buildSettingsSnapshot({ operator, probes }) {
    return {
      monitor: {
        source: 'env',
        refresh: this.monitorConfig.refresh,
        thresholds: this.monitorConfig.thresholds,
        capabilities: this.monitorConfig.capabilities,
        probes: this.buildConfigSnapshot().probes,
      },
      notifications: {
        enabled: this.monitorConfig.capabilities.notifications,
        channels: [ 'browser' ],
        dedupeStrategy: 'dedupeKey + lastChangeAt',
      },
      datasources: probes,
      userAccess: operator,
    };
  }

  buildLogs({ runtime, database, upstreamSession, upstreamProbe, fileProbe, user, connectionSummary }) {
    const databaseStatus = database.reachable ? 'online' : 'offline';
    const fileStatus = this.getProbeStatus(fileProbe);
    const audioStatus = this.getProbeStatus(upstreamProbe);
    const visibleGroupCount = database.visibleGroupIds.length;

    return [
      {
        id: 'monitor-generated',
        time: runtime.generatedAt,
        level: 'info',
        source: 'monitor',
        message: `已为 ${user.username} 生成 ${runtime.packageName} ${runtime.packageVersion} 运行态快照。`,
      },
      {
        id: 'runtime-process',
        time: dayjs(runtime.generatedAt).subtract(4, 'second').toISOString(),
        level: runtime.memoryPercent >= this.monitorConfig.thresholds.memoryWarningPercent ? 'warning' : 'info',
        source: 'egg-api',
        message: `进程 ${runtime.pid} 运行于 ${runtime.hostname}:${runtime.port}，已持续 ${runtime.uptimeSeconds} 秒，RSS ${runtime.rssGb} GB。`,
      },
      {
        id: 'database-status',
        time: dayjs(runtime.generatedAt).subtract(8, 'second').toISOString(),
        level: getLogLevel(databaseStatus === 'online' && database.latencyMs < this.monitorConfig.thresholds.databaseLatencyWarningMs ? 'online' : databaseStatus),
        source: 'mysql',
        message: `MySQL ${databaseStatus}，响应 ${database.latencyMs} ms，活跃用户 ${database.counts.activeUsers}/${database.counts.totalUsers}，活跃令牌 ${database.counts.activeTokens}。`,
      },
      {
        id: 'upstream-probe',
        time: dayjs(runtime.generatedAt).subtract(12, 'second').toISOString(),
        level: getLogLevel(audioStatus),
        source: 'upstream',
        message: `上游 ${upstreamProbe.targetHost}${upstreamProbe.targetPath}，探测${upstreamProbe.reachable ? '成功' : '失败'}，会话${upstreamSession.hasSession ? '已存在' : '未建立'}。`,
      },
      {
        id: 'file-probe',
        time: dayjs(runtime.generatedAt).subtract(16, 'second').toISOString(),
        level: getLogLevel(fileStatus),
        source: 'file',
        message: `文件服务 ${fileProbe.targetHost}${fileProbe.targetPath}，探测${fileProbe.reachable ? '成功' : '失败'}，关联账号用户 ${database.counts.linkedAccountUsers}。`,
      },
      {
        id: 'visibility-scope',
        time: dayjs(runtime.generatedAt).subtract(20, 'second').toISOString(),
        level: visibleGroupCount > 0 ? 'info' : 'warning',
        source: 'group',
        message: `${user.username} 当前可见群组 ${visibleGroupCount} 个，系统总群组 ${database.counts.activeGroups} 个。`,
      },
      {
        id: 'traffic-summary',
        time: dayjs(runtime.generatedAt).subtract(24, 'second').toISOString(),
        level: connectionSummary.packetLossRatePercent > 0.3 ? 'warning' : 'info',
        source: 'network',
        message: `连接平均延迟 ${connectionSummary.averageLatencyMs} ms，带宽占用 ${connectionSummary.bandwidthUsageGbps} Gbps，丢包率 ${connectionSummary.packetLossRatePercent}%。`,
      },
    ];
  }

  async getHealthPayload() {
    const runtime = this.getRuntimeSnapshot();
    const database = await this.getDatabaseSnapshot();
    const upstreamSession = this.getUpstreamSessionState();
    const [ upstreamProbe, fileProbe ] = await Promise.all([
      this.getUpstreamProbeState(upstreamSession),
      this.getFileProbeState(),
    ]);

    const healthStatus = [
      database.reachable ? 'online' : 'offline',
      this.getProbeStatus(upstreamProbe),
      this.getProbeStatus(fileProbe),
    ].includes('offline')
      ? 'warning'
      : [
          database.reachable ? 'online' : 'offline',
          this.getProbeStatus(upstreamProbe),
          this.getProbeStatus(fileProbe),
        ].includes('warning')
      ? 'warning'
      : 'ok';

    return {
      status: healthStatus,
      generatedAt: runtime.generatedAt,
      sessionBootstrapBypassed: true,
      app: {
        name: runtime.packageName,
        version: runtime.packageVersion,
        env: runtime.env,
        hostname: runtime.hostname,
        port: runtime.port,
        pid: runtime.pid,
        nodeVersion: runtime.nodeVersion,
        uptimeSeconds: runtime.uptimeSeconds,
      },
      upstreamSession,
      probes: {
        upstream: upstreamProbe,
        file: fileProbe,
      },
      database: {
        reachable: database.reachable,
        latencyMs: database.latencyMs,
        latestUpdateAt: database.latestUpdateAt,
        counts: {
          users: database.counts.totalUsers,
          groups: database.counts.totalGroups,
          tokens: database.counts.totalTokens,
        },
      },
    };
  }

  async getDashboardPayload(user) {
    const runtime = this.getRuntimeSnapshot();
    const database = await this.getDatabaseSnapshot(user);
    const upstreamSession = this.getUpstreamSessionState();
    const [ upstreamProbe, fileProbe ] = await Promise.all([
      this.getUpstreamProbeState(upstreamSession),
      this.getFileProbeState(),
    ]);
    const servers = this.buildServers({
      runtime,
      database,
      upstreamSession,
      upstreamProbe,
      fileProbe,
    });
    const connections = this.buildConnections(servers, database, upstreamProbe, fileProbe);
    const clusterSummary = {
      total: servers.length,
      online: servers.filter(server => server.status === 'online').length,
      warning: servers.filter(server => server.status === 'warning').length,
      offline: servers.filter(server => server.status === 'offline').length,
    };
    const connectionSummary = {
      averageLatencyMs: round(
        connections.reduce((sum, connection) => sum + connection.latencyMs, 0) / Math.max(connections.length, 1),
        0,
      ),
      packetLossRatePercent: round(
        connections.reduce((sum, connection) => {
          if (connection.status === 'offline') {
            return sum + 0.8;
          }
          if (connection.status === 'warning') {
            return sum + 0.12;
          }
          return sum + 0.02;
        }, 0) / Math.max(connections.length, 1),
        2,
      ),
      bandwidthUsageGbps: round(
        connections.reduce((sum, connection) => sum + connection.bandwidthMbps, 0) / 1000,
        2,
      ),
    };
    const alerts = this.buildAlerts({
      runtime,
      database,
      upstreamSession,
      upstreamProbe,
      fileProbe,
      user,
    });
    const stableAlerts = this.monitorConfig.capabilities.alerts ? this.stabilizeAlerts(alerts) : [];
    const diagnostics = this.monitorConfig.capabilities.diagnostics
      ? this.buildDiagnostics({
          alerts: stableAlerts,
          runtime,
          database,
          upstreamProbe,
          fileProbe,
        })
      : [];
    const alertsSummary = this.monitorConfig.capabilities.alerts
      ? this.buildAlertsSummary(stableAlerts)
      : {
          critical: 0,
          warning: 0,
          acknowledged: 0,
        };
    const logs = this.buildLogs({
      runtime,
      database,
      upstreamSession,
      upstreamProbe,
      fileProbe,
      user,
      connectionSummary,
    });
    const operator = this.buildOperatorSummary(user, database);
    const probes = this.buildProbeSummaries({
      database,
      upstreamProbe,
      fileProbe,
    });
    const services = this.buildServiceCatalog({
      servers,
      alerts: stableAlerts,
      diagnostics,
    });
    const recentEvents = this.buildRecentEvents({
      alerts: stableAlerts,
      logs,
    });
    const overview = this.buildOverview({
      runtime,
      database,
      alerts: stableAlerts,
      servers,
      probes,
      operator,
    });
    const quickLinks = this.buildQuickLinks({
      alerts: stableAlerts,
      diagnostics,
      database,
      probes,
    });
    const trendSummary = this.buildTrendSummary({
      runtime,
      database,
      connectionSummary,
      servers,
      generatedAt: runtime.generatedAt,
    });
    const availabilityReport = this.buildAvailabilityReport({
      servers,
      alerts: stableAlerts,
    });
    const capacityReport = this.buildCapacityReport({
      servers,
    });
    const settings = this.buildSettingsSnapshot({
      operator,
      probes,
    });

    return {
      generatedAt: runtime.generatedAt,
      refresh: {
        ...this.monitorConfig.refresh,
        lastSuccessAt: runtime.generatedAt,
      },
      page: this.monitorConfig.page,
      runtime,
      database,
      operator,
      clusterSummary,
      connectionSummary,
      alertsSummary,
      alerts: stableAlerts,
      diagnostics,
      overview,
      quickLinks,
      probes,
      services,
      recentEvents,
      trendSummary,
      availabilityReport,
      capacityReport,
      settings,
      config: this.buildConfigSnapshot(),
      capabilities: this.monitorConfig.capabilities,
      servers,
      connections,
      logs,
    };
  }
}

module.exports = MonitorService;
