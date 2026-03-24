#!/usr/bin/env node

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webAudioRoot = path.resolve(__dirname, '..', '..');
const distDir = path.join(webAudioRoot, 'dist');

const baseUrlFromEnv = process.env.E2E_BASE_URL ? stripTrailingSlash(process.env.E2E_BASE_URL) : '';
const apiOrigin = stripTrailingSlash(process.env.E2E_API_ORIGIN || 'http://127.0.0.1:7001');
const username = process.env.E2E_USERNAME || 'admin';
const password = process.env.E2E_PASSWORD || '123456';
const previewPortHint = Number.parseInt(process.env.E2E_PREVIEW_PORT || '8012', 10);
const chromeExecutablePath = process.env.E2E_CHROME_EXECUTABLE || '/opt/google/chrome/chrome';
const headless = !['0', 'false', 'no'].includes(
  String(process.env.E2E_HEADLESS || 'true').toLowerCase(),
);
const artifactDir = path.resolve(
  process.env.E2E_ARTIFACT_DIR || path.join(webAudioRoot, 'tests', 'e2e', 'artifacts'),
);
const reportPath = path.join(artifactDir, 'chrome-pages-smoke-report.json');

const routeSpecs = [
  {
    name: 'monitor',
    path: '/monitor',
    expectedPath: '/monitor',
    titleIncludes: '运维控制台',
    textIncludes: '系统运行监控中心',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: ['p__Monitor__index'],
    requiredSelectors: ['[data-testid="monitor-alert-list"]', '[data-testid="monitor-diagnostic-list"]'],
  },
  {
    name: 'root-redirect',
    path: '/',
    expectedPath: '/monitor',
    textIncludes: '系统运行监控中心',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: ['p__Monitor__index'],
  },
  {
    name: 'hosts',
    path: '/hosts',
    expectedPath: '/hosts',
    textIncludes: '查看所有节点的健康状态',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-hosts-table"]'],
  },
  {
    name: 'host-detail',
    path: '/hosts/egg-api',
    expectedPath: '/hosts/egg-api',
    textIncludes: '查看单台主机的实时资源',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-resource-detail"]'],
  },
  {
    name: 'services',
    path: '/services',
    expectedPath: '/services',
    textIncludes: '查看服务健康',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-services-table"]'],
  },
  {
    name: 'service-detail',
    path: '/services/audio',
    expectedPath: '/services/audio',
    textIncludes: '查看单个服务的状态',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-service-detail"]'],
  },
  {
    name: 'databases',
    path: '/databases',
    expectedPath: '/databases',
    textIncludes: '查看数据库连接',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-database-summary"]'],
  },
  {
    name: 'storage',
    path: '/storage',
    expectedPath: '/storage',
    textIncludes: '查看文件服务探针',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-capacity-report"]'],
  },
  {
    name: 'topology',
    path: '/topology',
    expectedPath: '/topology',
    textIncludes: '查看节点关系',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-topology-page"]'],
  },
  {
    name: 'alerts',
    path: '/alerts',
    expectedPath: '/alerts',
    textIncludes: '集中查看当前活动告警',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-alert-summary-page"]'],
  },
  {
    name: 'alert-history',
    path: '/alerts/history',
    expectedPath: '/alerts/history',
    textIncludes: '查看最近告警事件',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-events-list"]'],
  },
  {
    name: 'events',
    path: '/events',
    expectedPath: '/events',
    textIncludes: '查看最近系统事件',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-events-list"]'],
  },
  {
    name: 'logs-live',
    path: '/logs/live',
    expectedPath: '/logs/live',
    textIncludes: '查看当前监控快照生成的最近日志流',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-logs-list"]'],
  },
  {
    name: 'logs-search',
    path: '/logs/search',
    expectedPath: '/logs/search',
    textIncludes: '按关键字过滤当前监控日志',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-log-search-input"]'],
  },
  {
    name: 'diagnostics',
    path: '/diagnostics',
    expectedPath: '/diagnostics',
    textIncludes: '查看当前风险来源',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-diagnostics-summary"]'],
  },
  {
    name: 'metrics',
    path: '/metrics',
    expectedPath: '/metrics',
    textIncludes: '查看关键指标的趋势摘要',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-trend-summary"]'],
  },
  {
    name: 'availability-report',
    path: '/reports/availability',
    expectedPath: '/reports/availability',
    textIncludes: '查看各服务当前可用率评估',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-availability-report"]'],
  },
  {
    name: 'capacity-report',
    path: '/reports/capacity',
    expectedPath: '/reports/capacity',
    textIncludes: '查看容量使用率',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-capacity-report"]'],
  },
  {
    name: 'settings-monitor',
    path: '/settings/monitor',
    expectedPath: '/settings/monitor',
    textIncludes: '查看当前轮询',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-settings-monitor"]'],
  },
  {
    name: 'settings-notifications',
    path: '/settings/notifications',
    expectedPath: '/settings/notifications',
    textIncludes: '查看当前通知通道',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-settings-notifications"]'],
  },
  {
    name: 'settings-datasources',
    path: '/settings/datasources',
    expectedPath: '/settings/datasources',
    textIncludes: '查看当前探针目标',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-probe-table"]'],
  },
  {
    name: 'settings-users',
    path: '/settings/users',
    expectedPath: '/settings/users',
    textIncludes: '查看当前操作者权限范围',
    requiredApis: ['/api/monitor/dashboard'],
    chunkHints: [],
    requiredSelectors: ['[data-testid="monitor-settings-users"]'],
  },
  {
    name: 'welcome-removed',
    path: '/welcome',
    expectedPath: '/welcome',
    textIncludes: '404',
    requiredApis: [],
    chunkHints: [],
  },
  {
    name: 'group-removed',
    path: '/group',
    expectedPath: '/group',
    textIncludes: '404',
    requiredApis: [],
    chunkHints: [],
  },
  {
    name: 'list-removed',
    path: '/list',
    expectedPath: '/list',
    textIncludes: '404',
    requiredApis: [],
    chunkHints: [],
  },
  {
    name: 'audio-removed',
    path: '/audio',
    expectedPath: '/audio',
    textIncludes: '404',
    requiredApis: [],
    chunkHints: [],
  },
  {
    name: 'file-removed',
    path: '/file',
    expectedPath: '/file',
    textIncludes: '404',
    requiredApis: [],
    chunkHints: [],
  },
  {
    name: 'not-found',
    path: '/__monitor_unknown_route__',
    expectedPath: '/__monitor_unknown_route__',
    textIncludes: '404',
    requiredApis: [],
    chunkHints: [],
  },
];

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ensureReachable(url, expectedStatus, label) {
  const response = await fetch(url);
  if (response.status !== expectedStatus) {
    throw new Error(`${label} returned ${response.status}, expected ${expectedStatus}`);
  }
}

async function ensureArtifactDir() {
  await fsPromises.mkdir(artifactDir, { recursive: true });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

async function resolveStaticFile(rootDir, pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const candidatePath = path.resolve(rootDir, `.${decodedPath}`);

  if (!candidatePath.startsWith(rootDir)) {
    return null;
  }

  const candidateStat = await fsPromises.stat(candidatePath).catch(() => null);
  if (candidateStat?.isFile()) {
    return candidatePath;
  }

  if (candidateStat?.isDirectory()) {
    const indexFile = path.join(candidatePath, 'index.html');
    const indexStat = await fsPromises.stat(indexFile).catch(() => null);
    if (indexStat?.isFile()) {
      return indexFile;
    }
  }

  const fallbackFile = path.join(rootDir, 'index.html');
  const fallbackStat = await fsPromises.stat(fallbackFile).catch(() => null);
  return fallbackStat?.isFile() ? fallbackFile : null;
}

async function startPreviewServer(rootDir, port) {
  if (!fs.existsSync(path.join(rootDir, 'index.html'))) {
    throw new Error(
      `Build output not found at ${rootDir}. Run "npm run build" before starting the page test.`,
    );
  }

  const proxyApiRequest = async (request, response) => {
    const upstreamUrl = new URL(request.url || '/', apiOrigin);
    const headers = new Headers();

    Object.entries(request.headers).forEach(([key, value]) => {
      if (typeof value === 'undefined') {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(key, item));
        return;
      }

      headers.set(key, value);
    });

    headers.delete('host');

    const init = {
      method: request.method,
      headers,
    };

    if (request.method && !['GET', 'HEAD'].includes(request.method.toUpperCase())) {
      init.body = request;
      init.duplex = 'half';
    }

    const upstreamResponse = await fetch(upstreamUrl, init);

    response.statusCode = upstreamResponse.status;
    upstreamResponse.headers.forEach((value, key) => {
      response.setHeader(key, value);
    });

    if (!upstreamResponse.body) {
      response.end();
      return;
    }

    const upstreamStream = upstreamResponse.body;
    const reader = upstreamStream.getReader();

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          response.end();
          return;
        }
        response.write(Buffer.from(value));
      }
    };

    await pump();
  };

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');

    if (requestUrl.pathname.startsWith('/api/')) {
      try {
        await proxyApiRequest(request, response);
      } catch (error) {
        response.statusCode = 502;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(
          JSON.stringify({
            success: false,
            message: `Preview API proxy failed: ${error.message}`,
          }),
        );
      }
      return;
    }

    const filePath = await resolveStaticFile(rootDir, requestUrl.pathname);

    if (!filePath) {
      response.statusCode = 404;
      response.end('Not Found');
      return;
    }

    response.setHeader('Content-Type', getContentType(filePath));
    fs.createReadStream(filePath).pipe(response);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });

  return server;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findFreePort(startPort) {
  let port = startPort;

  while (port < startPort + 50) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.once('error', () => resolve(false));
      server.listen({ host: '127.0.0.1', port }, () => {
        server.close(() => resolve(true));
      });
    });

    if (available) {
      return port;
    }

    port += 1;
  }

  throw new Error(`Unable to find a free port starting at ${startPort}`);
}

async function waitFor(check, description, timeoutMs = 15000, intervalMs = 250) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await check();
    if (result) {
      return result;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${description}`);
}

function getRequestsSince(events, startIndex) {
  return events.slice(startIndex);
}

function getMatches(items, patterns) {
  const hits = [];

  for (const pattern of patterns) {
    const matchedItem = items.find((item) => item.includes(pattern));
    if (matchedItem) {
      hits.push({ pattern, value: matchedItem });
    }
  }

  return hits;
}

async function safeTitle(page) {
  try {
    return await page.title();
  } catch (error) {
    return `title-unavailable: ${error.message}`;
  }
}

async function safeBodyText(page) {
  try {
    const text = await page.locator('body').textContent({ timeout: 2000 });
    return normalizeText(text);
  } catch (error) {
    return '';
  }
}

async function saveScreenshot(page, name) {
  const targetPath = path.join(artifactDir, `${name}.png`);
  await page.screenshot({
    path: targetPath,
    fullPage: true,
  });
  return targetPath;
}

function buildSignalSummary(spec, title, bodyText, requestUrls) {
  const titleOk = spec.titleIncludes ? title.includes(spec.titleIncludes) : false;
  const textOk = spec.textIncludes ? bodyText.includes(spec.textIncludes) : false;
  const chunkMatches = getMatches(requestUrls, spec.chunkHints || []);
  const chunkOk = chunkMatches.length > 0;

  const checks = [];
  if (spec.titleIncludes) {
    checks.push(titleOk);
  }
  if (spec.textIncludes) {
    checks.push(textOk);
  }
  if ((spec.chunkHints || []).length > 0) {
    checks.push(chunkOk);
  }

  return {
    titleOk,
    textOk,
    chunkOk,
    chunkMatches,
    signalOk: checks.length === 0 ? true : checks.every(Boolean),
  };
}

async function selectorsExist(page, selectors = []) {
  if (!selectors.length) {
    return true;
  }

  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    if (count === 0) {
      return false;
    }
  }

  return true;
}

async function chooseFilterOption(page, label) {
  await page.locator('[data-testid="monitor-filter-select"]').click();
  const option = page
    .locator('.ant-select-dropdown .ant-select-item-option')
    .filter({ hasText: label })
    .first();
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click();
}

async function runFunctionalCheck({
  report,
  page,
  pageErrors,
  requestFailures,
  name,
  check,
}) {
  const pageErrorStart = pageErrors.length;
  const failureStart = requestFailures.length;
  const result = {
    name,
    passed: false,
    screenshotPath: '',
    details: null,
    requestFailures: [],
    pageErrors: [],
    error: null,
  };

  try {
    result.details = (await check()) || null;
    result.requestFailures = requestFailures.slice(failureStart);
    result.pageErrors = pageErrors.slice(pageErrorStart);

    if (result.requestFailures.length > 0 || result.pageErrors.length > 0) {
      throw new Error('Browser action triggered request failures or page errors');
    }

    result.passed = true;
  } catch (error) {
    result.requestFailures = requestFailures.slice(failureStart);
    result.pageErrors = pageErrors.slice(pageErrorStart);
    result.error = error instanceof Error ? error.message : String(error);
  }

  result.screenshotPath = await saveScreenshot(page, `functional-${name}`);
  report.functionalChecks.push(result);
}

function maskToken(token) {
  if (!token) {
    return '';
  }

  if (token.length <= 12) {
    return token;
  }

  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

if (!fs.existsSync(chromeExecutablePath)) {
  throw new Error(
    `Chrome executable not found at ${chromeExecutablePath}. ` +
      'Set E2E_CHROME_EXECUTABLE to a valid Chrome binary before running this test.',
  );
}

const previewPort = baseUrlFromEnv ? null : await findFreePort(previewPortHint);
const baseUrl = baseUrlFromEnv || `http://127.0.0.1:${previewPort}`;
const report = {
  generatedAt: new Date().toISOString(),
  browser: {
    name: 'Google Chrome',
    executablePath: chromeExecutablePath,
    headless,
    launchArgs: ['--no-sandbox', '--disable-dev-shm-usage'],
  },
  app: {
    baseUrl,
    apiOrigin,
    frontendMode: baseUrlFromEnv ? 'external-base-url' : 'dist-preview',
    previewPort,
  },
  credentials: {
    username,
  },
  login: null,
  routes: [],
  functionalChecks: [],
  summary: null,
};

let browser;
let previewServer;

try {
  await ensureArtifactDir();
  await ensureReachable(`${apiOrigin}/api/monitor/healthz`, 200, 'Backend health check');

  if (!baseUrlFromEnv) {
    previewServer = await startPreviewServer(distDir, previewPort);
  }

  await ensureReachable(`${baseUrl}/user/login`, 200, 'Frontend login page');

  browser = await chromium.launch({
    executablePath: chromeExecutablePath,
    headless,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  const requests = [];
  const responses = [];
  const requestFailures = [];
  const pageErrors = [];

  page.on('request', (request) => {
    requests.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      timestamp: Date.now(),
    });
  });

  page.on('response', (response) => {
    responses.push({
      status: response.status(),
      url: response.url(),
      timestamp: Date.now(),
    });
  });

  page.on('requestfailed', (request) => {
    requestFailures.push({
      errorText: request.failure()?.errorText || 'unknown-error',
      url: request.url(),
      timestamp: Date.now(),
    });
  });

  page.on('pageerror', (error) => {
    pageErrors.push({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    });
  });

  const loginRequestStart = requests.length;
  const loginErrorStart = pageErrors.length;

  await page.goto(`${baseUrl}/user/login`, { waitUntil: 'domcontentloaded' });
  const usernameField = page
    .locator('input[name="username"], input[placeholder*="Username"], input[placeholder*="用户名"]')
    .first();
  const passwordField = page
    .locator(
      'input[type="password"], input[name="password"], input[placeholder*="Password"], input[placeholder*="密码"]',
    )
    .first();
  const loginButton = page
    .locator('button:has-text("Login"), button:has-text("登录"), button.ant-btn-primary')
    .last();

  await usernameField.waitFor({
    state: 'visible',
    timeout: 15000,
  });

  report.routes.push({
    name: 'login',
    path: '/user/login',
    passed: new URL(page.url()).pathname === '/user/login' && (await usernameField.count()) > 0,
    finalUrl: page.url(),
    title: await safeTitle(page),
    bodySnippet: (await safeBodyText(page)).slice(0, 220),
    matchedApis: [],
    matchedChunks: [],
    requestCount: requests.length - loginRequestStart,
    responseCount: responses.length,
    requestFailures: [],
    pageErrors: [],
    screenshotPath: await saveScreenshot(page, 'login-page'),
    checks: {
      pathOk: new URL(page.url()).pathname === '/user/login',
      apiOk: true,
      titleOk: true,
      textOk: true,
      chunkOk: true,
      selectorsOk: true,
    },
  });

  await usernameField.fill(username);
  await passwordField.fill(password);
  await loginButton.waitFor({
    state: 'visible',
    timeout: 15000,
  });

  await Promise.all([
    loginButton.click(),
    waitFor(
      async () => {
        const pathname = new URL(page.url()).pathname;
        return pathname === '/' || pathname === '/monitor';
      },
      'post-login redirect',
      15000,
      200,
    ),
  ]);

  await waitFor(
    async () => new URL(page.url()).pathname === '/monitor',
    'monitor route after login',
    15000,
    200,
  );
  await page.waitForLoadState('networkidle').catch(() => {});
  await sleep(800);

  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  if (!token) {
    throw new Error('Login succeeded visually but token was not persisted to localStorage');
  }

  const loginTitle = await safeTitle(page);
  const loginBodyText = await safeBodyText(page);
  const loginRequests = getRequestsSince(requests, loginRequestStart).map((entry) => entry.url);
  const loginApis = getMatches(loginRequests, ['/api/auth/login', '/api/user/info']);
  const loginErrors = pageErrors.slice(loginErrorStart);
  const loginScreenshotPath = await saveScreenshot(page, 'login-success');

  report.login = {
    authMode: 'real-browser-form-login',
    token: maskToken(token),
    finalUrl: page.url(),
    title: loginTitle,
    bodySnippet: loginBodyText.slice(0, 220),
    matchedApis: loginApis,
    screenshotPath: loginScreenshotPath,
    pageErrors: loginErrors,
  };

  for (const spec of routeSpecs) {
    const requestStart = requests.length;
    const responseStart = responses.length;
    const failureStart = requestFailures.length;
    const pageErrorStart = pageErrors.length;

    await page.goto(`${baseUrl}${spec.path}`, { waitUntil: 'domcontentloaded' });
    await waitFor(
      async () => new URL(page.url()).pathname === spec.path,
      `${spec.path} route`,
      15000,
      200,
    );

    if (spec.requiredApis.length > 0) {
      await waitFor(
        async () => {
          const requestUrls = getRequestsSince(requests, requestStart).map((entry) => entry.url);
          return spec.requiredApis.every((pattern) =>
            requestUrls.some((url) => url.includes(pattern)),
          );
        },
        `${spec.path} API evidence`,
        20000,
        250,
      );
    } else {
      await sleep(800);
    }

    await page.waitForLoadState('networkidle').catch(() => {});
    await sleep(500);

    const routeRequests = getRequestsSince(requests, requestStart);
    const routeResponses = responses.slice(responseStart);
    const routeFailures = requestFailures.slice(failureStart);
    const routeErrors = pageErrors.slice(pageErrorStart);
    const routeRequestUrls = routeRequests.map((entry) => entry.url);
    const routeTitle = await safeTitle(page);
    const routeBodyText = await safeBodyText(page);
    const matchedApis = getMatches(routeRequestUrls, spec.requiredApis);
    const signalSummary = buildSignalSummary(spec, routeTitle, routeBodyText, routeRequestUrls);
    const finalUrl = page.url();
    const finalPath = new URL(finalUrl).pathname;
    const expectedPath = spec.expectedPath || spec.path;
    const apiOk = spec.requiredApis.length === 0 || matchedApis.length === spec.requiredApis.length;
    const selectorsOk = await selectorsExist(page, spec.requiredSelectors || []);
    const screenshotPath = await saveScreenshot(page, spec.name);
    const passed = finalPath === expectedPath && apiOk && signalSummary.signalOk && selectorsOk;

    report.routes.push({
      name: spec.name,
      path: spec.path,
      passed,
      finalUrl,
      title: routeTitle,
      bodySnippet: routeBodyText.slice(0, 220),
      matchedApis,
      matchedChunks: signalSummary.chunkMatches,
      requestCount: routeRequests.length,
      responseCount: routeResponses.length,
      requestFailures: routeFailures,
      pageErrors: routeErrors,
      screenshotPath,
      checks: {
        pathOk: finalPath === expectedPath,
        apiOk,
        titleOk: signalSummary.titleOk,
        textOk: signalSummary.textOk,
        chunkOk: signalSummary.chunkOk,
        selectorsOk,
      },
    });
  }

  await page.goto(`${baseUrl}/monitor`, { waitUntil: 'domcontentloaded' });
  await waitFor(
    async () => new URL(page.url()).pathname === '/monitor',
    'monitor route before functional checks',
    15000,
    200,
  );
  await waitFor(
    async () => (await page.locator('[data-testid="monitor-alert-list"]').count()) > 0,
    'monitor alert list visible',
    15000,
    200,
  );

  await runFunctionalCheck({
    report,
    page,
    pageErrors,
    requestFailures,
    name: 'monitor-alert-panel-visible',
    check: async () => {
      await page.locator('[data-testid="monitor-alert-list"]').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('[data-testid="monitor-diagnostic-list"]').waitFor({ state: 'visible', timeout: 10000 });
      return {
        alertsVisible: true,
        diagnosticsVisible: true,
      };
    },
  });

  await runFunctionalCheck({
    report,
    page,
    pageErrors,
    requestFailures,
    name: 'monitor-notification-entry-visible',
    check: async () => {
      const count = await page.locator('[data-testid="monitor-enable-notifications"]').count();
      if (count === 0) {
        throw new Error('Notification entry button not found');
      }
      return { buttonCount: count };
    },
  });

  await runFunctionalCheck({
    report,
    page,
    pageErrors,
    requestFailures,
    name: 'monitor-switch-list-view',
    check: async () => {
      await page.getByText('列表视图', { exact: true }).click();
      await page.getByText('源服务器', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      return { mode: 'list' };
    },
  });

  await runFunctionalCheck({
    report,
    page,
    pageErrors,
    requestFailures,
    name: 'monitor-switch-trend-view',
    check: async () => {
      await page.getByText(/趋势/, { exact: false }).first().click();
      await page.locator('[data-testid="monitor-trend-summary"]').waitFor({ state: 'visible', timeout: 10000 });
      return { mode: 'trends' };
    },
  });

  await runFunctionalCheck({
    report,
    page,
    pageErrors,
    requestFailures,
    name: 'monitor-switch-topology-view',
    check: async () => {
      await page.getByText('网络拓扑', { exact: true }).click();
      await page.locator('[data-testid="monitor-cluster-panel"]').waitFor({ state: 'visible', timeout: 10000 });
      return { mode: 'topology' };
    },
  });

  await runFunctionalCheck({
    report,
    page,
    pageErrors,
    requestFailures,
    name: 'monitor-filter-database',
    check: async () => {
      await chooseFilterOption(page, '仅显示数据库');
      await waitFor(
        async () => {
          const mysqlCount = await page.locator('[data-testid="monitor-server-mysql"]').count();
          const apiCount = await page.locator('[data-testid="monitor-server-egg-api"]').count();
          return mysqlCount === 1 && apiCount === 0;
        },
        'database filter result',
        10000,
        200,
      );
      return { filter: 'database' };
    },
  });

  await runFunctionalCheck({
    report,
    page,
    pageErrors,
    requestFailures,
    name: 'monitor-select-mysql-server',
    check: async () => {
      await page.locator('[data-testid="monitor-server-mysql"]').click();
      await waitFor(
        async () => {
          const text = await page.locator('[data-testid="monitor-server-detail-title"]').textContent();
          return normalizeText(text) === 'MySQL';
        },
        'mysql detail title',
        10000,
        200,
      );
      return { selectedServer: 'MySQL' };
    },
  });

  await runFunctionalCheck({
    report,
    page,
    pageErrors,
    requestFailures,
    name: 'monitor-filter-reset-all',
    check: async () => {
      await chooseFilterOption(page, '全部显示');
      await waitFor(
        async () => (await page.locator('[data-testid="monitor-server-egg-api"]').count()) > 0,
        'all filter reset',
        10000,
        200,
      );
      return { filter: 'all' };
    },
  });

  await context.close();
} finally {
  if (browser) {
    await browser.close();
  }

  if (previewServer) {
    await new Promise((resolve, reject) => {
      previewServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

const failedRoutes = report.routes.filter((route) => !route.passed);
const failedFunctionalChecks = report.functionalChecks.filter((check) => !check.passed);
report.summary = {
  passed: failedRoutes.length === 0 && failedFunctionalChecks.length === 0,
  totalRoutes: report.routes.length,
  failedRoutes: failedRoutes.map((route) => route.path),
  totalFunctionalChecks: report.functionalChecks.length,
  failedFunctionalChecks: failedFunctionalChecks.map((check) => check.name),
};

await fsPromises.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(report.summary, null, 2));
console.log(`Detailed report written to ${reportPath}`);

if (!report.summary.passed) {
  process.exitCode = 1;
}
