const { strict: assert } = require('node:assert');
const { app } = require('egg-mock/bootstrap');

describe('test/app/service/monitor.test.js', () => {
  let originalMonitorConfig;

  before(() => {
    originalMonitorConfig = JSON.parse(JSON.stringify(app.config.monitor || {}));
  });

  afterEach(() => {
    app.config.monitor = JSON.parse(JSON.stringify(originalMonitorConfig || {}));
  });

  it('should build configurable dashboard payload with alerts diagnostics and probes', async () => {
    app.config.monitor = {
      page: {
        title: '生产运维台',
        subtitle: '真实链路监控中心',
        realtimeLabel: '轮询运行中',
      },
      refresh: {
        intervalSeconds: 8,
        staleAfterSeconds: 24,
      },
      thresholds: {
        memoryWarningPercent: 70,
        databaseLatencyWarningMs: 200,
        serviceLatencyWarningMs: 150,
        serviceLatencyOfflineMs: 500,
      },
      capabilities: {
        alerts: true,
        trends: false,
        diagnostics: true,
        notifications: true,
      },
      probes: {
        timeoutMs: 2500,
        upstream: { path: '/healthz' },
        file: { path: '/status' },
      },
    };

    const ctx = app.mockContext();
    const service = ctx.service.monitor;
    const generatedAt = '2026-03-24T08:00:00.000Z';

    service.getRuntimeSnapshot = () => ({
      generatedAt,
      env: 'production',
      packageName: 'egg-audio',
      packageVersion: '1.0.0',
      hostname: 'ops-host',
      port: 7001,
      pid: 1234,
      nodeVersion: 'v22.0.0',
      cpuCount: 8,
      loadAverage: 2.1,
      cpuPercent: 45,
      totalMemoryGb: 16,
      freeMemoryGb: 2.5,
      rssGb: 12.2,
      heapUsedGb: 3.1,
      heapTotalGb: 4.8,
      memoryPercent: 76,
      uptimeSeconds: 86400,
      uptimeDays: 1,
    });
    service.getDatabaseSnapshot = async () => ({
      reachable: true,
      latencyMs: 260,
      latestUpdateAt: '2026-03-24T07:59:00.000Z',
      visibleGroupIds: [],
      counts: {
        totalUsers: 12,
        activeUsers: 10,
        disabledUsers: 2,
        adminUsers: 1,
        linkedAccountUsers: 0,
        totalGroups: 6,
        activeGroups: 4,
        inactiveGroups: 2,
        totalTokens: 8,
        activeTokens: 0,
        inactiveTokens: 8,
      },
    });
    service.getUpstreamSessionState = () => ({
      configured: true,
      baseUrl: 'http://upstream.example.test',
      upstreamHost: 'upstream.example.test',
      hasSession: false,
      expired: false,
      guardedPathPrefix: '/api/monitor/',
    });
    service.getUpstreamProbeState = async () => ({
      name: 'upstream',
      configured: true,
      targetHost: 'upstream.example.test',
      targetPath: '/healthz',
      reachable: true,
      healthy: true,
      latencyMs: 220,
      statusCode: 200,
      errorMessage: null,
    });
    service.getFileProbeState = async () => ({
      name: 'file',
      configured: true,
      targetHost: 'file.example.test',
      targetPath: '/status',
      reachable: false,
      healthy: false,
      latencyMs: 480,
      statusCode: null,
      errorMessage: 'connect ECONNREFUSED',
    });

    const payload = await service.getDashboardPayload({ username: 'admin', role: 0 });

    assert.equal(payload.page.title, '生产运维台');
    assert.equal(payload.refresh.intervalSeconds, 8);
    assert.equal(payload.refresh.staleAfterSeconds, 24);
    assert.equal(payload.capabilities.diagnostics, true);
    assert.equal(payload.capabilities.notifications, true);
    assert.equal(payload.config.probes.upstreamPath, '/healthz');
    assert.equal(payload.config.probes.filePath, '/status');
    assert.equal(payload.config.thresholds.serviceLatencyWarningMs, 150);
    assert.ok(payload.runtime);
    assert.equal(payload.runtime.hostname, 'ops-host');
    assert.ok(payload.database);
    assert.equal(payload.database.counts.totalUsers, 12);
    assert.equal(payload.operator.username, 'admin');
    assert.ok(payload.overview.length >= 4);
    assert.ok(payload.quickLinks.length >= 4);
    assert.ok(payload.probes.length >= 3);
    assert.ok(payload.services.length >= 3);
    assert.ok(payload.recentEvents.length >= 1);
    assert.ok(payload.trendSummary.metrics.length >= 3);
    assert.ok(payload.availabilityReport.services.length >= 1);
    assert.ok(payload.capacityReport.items.length >= 1);
    assert.equal(payload.settings.monitor.refresh.intervalSeconds, 8);
    assert.equal(payload.settings.notifications.enabled, true);
    assert.ok(payload.alerts.length >= 4);
    assert.ok(payload.alerts.some(alert => alert.id === 'database-latency-high'));
    assert.ok(payload.alerts.some(alert => alert.id === 'host-memory-high'));
    assert.ok(payload.alerts.some(alert => alert.id === 'file-service-unreachable'));
    assert.ok(payload.alerts.some(alert => alert.id === 'auth-no-active-token'));
    assert.ok(payload.diagnostics.some(item => item.id === 'diag-database'));
    assert.ok(payload.diagnostics.some(item => item.id === 'diag-file-service'));
    assert.equal(payload.alertsSummary.critical, 1);
    assert.ok(payload.alertsSummary.warning >= 3);
    assert.equal(payload.logs[0].source, 'monitor');
    assert.equal(payload.servers.find(server => server.id === 'file').status, 'offline');
    assert.equal(payload.connections.find(connection => connection.id === 'conn-file-auth').status, 'offline');
  });

  it('should keep alert incident timestamps stable across unchanged polls', async () => {
    app.config.monitor = JSON.parse(JSON.stringify(originalMonitorConfig || {}));
    app.monitorAlertIncidentStore = new Map();

    const ctx = app.mockContext();
    const service = ctx.service.monitor;
    let generatedAt = '2026-03-24T10:00:00.000Z';

    service.getRuntimeSnapshot = () => ({
      generatedAt,
      env: 'production',
      packageName: 'egg-audio',
      packageVersion: '1.0.0',
      hostname: 'ops-host',
      port: 7001,
      pid: 1111,
      nodeVersion: 'v22.0.0',
      cpuCount: 8,
      loadAverage: 1.2,
      cpuPercent: 30,
      totalMemoryGb: 16,
      freeMemoryGb: 8,
      rssGb: 4,
      heapUsedGb: 1,
      heapTotalGb: 2,
      memoryPercent: 25,
      uptimeSeconds: 3600,
      uptimeDays: 0.1,
    });
    service.getDatabaseSnapshot = async () => ({
      reachable: true,
      latencyMs: 50,
      latestUpdateAt: generatedAt,
      visibleGroupIds: [1],
      counts: {
        totalUsers: 10,
        activeUsers: 8,
        disabledUsers: 2,
        adminUsers: 1,
        linkedAccountUsers: 1,
        totalGroups: 5,
        activeGroups: 5,
        inactiveGroups: 0,
        totalTokens: 8,
        activeTokens: 8,
        inactiveTokens: 0,
      },
    });
    service.getUpstreamSessionState = () => ({
      configured: true,
      baseUrl: 'http://upstream.example.test',
      upstreamHost: 'upstream.example.test',
      hasSession: false,
      expired: false,
      guardedPathPrefix: '/api/monitor/',
    });
    service.getUpstreamProbeState = async () => ({
      name: 'upstream',
      configured: true,
      targetHost: 'upstream.example.test',
      targetPath: '/',
      reachable: true,
      healthy: true,
      latencyMs: 220,
      statusCode: 200,
      errorMessage: null,
    });
    service.getFileProbeState = async () => ({
      name: 'file',
      configured: true,
      targetHost: 'file.example.test',
      targetPath: '/',
      reachable: true,
      healthy: true,
      latencyMs: 20,
      statusCode: 200,
      errorMessage: null,
    });

    const firstPayload = await service.getDashboardPayload({ username: 'admin', role: 0 });
    generatedAt = '2026-03-24T10:00:05.000Z';
    const secondPayload = await service.getDashboardPayload({ username: 'admin', role: 0 });
    const firstAlert = firstPayload.alerts.find(alert => alert.id === 'upstream-session-warning');
    const secondAlert = secondPayload.alerts.find(alert => alert.id === 'upstream-session-warning');

    assert.ok(firstAlert);
    assert.ok(secondAlert);
    assert.equal(firstAlert.lastChangeAt, secondAlert.lastChangeAt);
    assert.equal(firstAlert.observedAt, secondAlert.observedAt);
  });

  it('should include health payload probe details', async () => {
    app.config.monitor = JSON.parse(JSON.stringify(originalMonitorConfig || {}));

    const ctx = app.mockContext();
    const service = ctx.service.monitor;

    service.getRuntimeSnapshot = () => ({
      generatedAt: '2026-03-24T09:00:00.000Z',
      env: 'production',
      packageName: 'egg-audio',
      packageVersion: '1.0.0',
      hostname: 'ops-host',
      port: 7001,
      pid: 5678,
      nodeVersion: 'v22.0.0',
      uptimeSeconds: 3600,
    });
    service.getDatabaseSnapshot = async () => ({
      reachable: false,
      latencyMs: 999,
      latestUpdateAt: null,
      counts: {
        totalUsers: 0,
        totalGroups: 0,
        totalTokens: 0,
      },
    });
    service.getUpstreamSessionState = () => ({
      configured: false,
      baseUrl: '',
      upstreamHost: 'unconfigured',
      hasSession: false,
      expired: false,
      guardedPathPrefix: '/api/monitor/',
    });
    service.getUpstreamProbeState = async () => ({
      name: 'upstream',
      configured: false,
      targetHost: 'unconfigured',
      targetPath: '/',
      reachable: false,
      healthy: false,
      latencyMs: null,
      statusCode: null,
      errorMessage: 'base url not configured',
    });
    service.getFileProbeState = async () => ({
      name: 'file',
      configured: true,
      targetHost: 'file.example.test',
      targetPath: '/',
      reachable: true,
      healthy: true,
      latencyMs: 32,
      statusCode: 200,
      errorMessage: null,
    });

    const payload = await service.getHealthPayload();

    assert.equal(payload.status, 'warning');
    assert.equal(payload.sessionBootstrapBypassed, true);
    assert.equal(payload.database.reachable, false);
    assert.equal(payload.probes.upstream.configured, false);
    assert.equal(payload.probes.file.statusCode, 200);
  });

  it('should downgrade health status when external probes are unhealthy', async () => {
    app.config.monitor = JSON.parse(JSON.stringify(originalMonitorConfig || {}));

    const ctx = app.mockContext();
    const service = ctx.service.monitor;

    service.getRuntimeSnapshot = () => ({
      generatedAt: '2026-03-24T11:00:00.000Z',
      env: 'production',
      packageName: 'egg-audio',
      packageVersion: '1.0.0',
      hostname: 'ops-host',
      port: 7001,
      pid: 5678,
      nodeVersion: 'v22.0.0',
      uptimeSeconds: 3600,
    });
    service.getDatabaseSnapshot = async () => ({
      reachable: true,
      latencyMs: 30,
      latestUpdateAt: '2026-03-24T10:59:00.000Z',
      counts: {
        totalUsers: 1,
        totalGroups: 1,
        totalTokens: 1,
      },
    });
    service.getUpstreamSessionState = () => ({
      configured: true,
      baseUrl: 'http://upstream.example.test',
      upstreamHost: 'upstream.example.test',
      hasSession: true,
      expired: false,
      guardedPathPrefix: '/api/monitor/',
    });
    service.getUpstreamProbeState = async () => ({
      name: 'upstream',
      configured: true,
      targetHost: 'upstream.example.test',
      targetPath: '/',
      reachable: false,
      healthy: false,
      latencyMs: 900,
      statusCode: null,
      errorMessage: 'connect ETIMEDOUT',
    });
    service.getFileProbeState = async () => ({
      name: 'file',
      configured: true,
      targetHost: 'file.example.test',
      targetPath: '/',
      reachable: true,
      healthy: true,
      latencyMs: 25,
      statusCode: 200,
      errorMessage: null,
    });

    const payload = await service.getHealthPayload();

    assert.equal(payload.status, 'warning');
    assert.equal(payload.database.reachable, true);
    assert.equal(payload.probes.upstream.reachable, false);
  });
});
