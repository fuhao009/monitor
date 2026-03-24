/* eslint valid-jsdoc: "off" */

'use strict';

const dotenv = require('dotenv');

dotenv.config();

function envNumber(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBoolean(name, fallback) {
  const value = process.env[name];

  if (typeof value === 'undefined') {
    return fallback;
  }

  return ![ '0', 'false', 'no', 'off' ].includes(String(value).toLowerCase());
}

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1709711533659_7177';

  // 关闭 CSRF
  config.security = {
    csrf: {
      enable: false,
    },
    // 配置白名单
    domainWhiteList: ['*'],
  };

  config.middleware = [ 'sessionHandler' ];

  // 配置跨域
  // config.cors = {
  //   // 使用函数动态判断
  //   origin: (ctx) => {
  //     const whiteList = ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8001', 'http://127.0.0.1:8001','http://192.168.0.109:8000', 'http://192.168.0.109:8001'];
  //     const origin = ctx.get('Origin');
  //     if (whiteList.includes(origin)) {
  //       return origin;
  //     }
  //     return false;
  //   },
  //   credentials: true, // 允许跨域请求携带cookies
  //   allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
  //   allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  //   exposeHeaders: ['Content-Disposition'],
  //   maxAge: 86400,
  // };

  config.cors = {
    origin: '*',
    credentials: true, // 允许跨域请求携带cookies
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposeHeaders: ['Content-Disposition'],
    maxAge: 86400,
  };

  // 设置为单进程模式
  config.cluster = {
    listen: {
      hostname: '0.0.0.0', // 监听所有网络接口
      // port: 7001, // 默认端口，也可由命令行参数指定
    },
  };

  // knex 配置
  config.knex = {
    // 单数据库
    client: {
      dialect: 'mysql',
      connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
      pool: { min: 0, max: 5 },
      acquireConnectionTimeout: 30000,
    },
    // 是否加载到 app 上，默认开启
    app: true,
    // 是否加载到 agent 上，默认关闭
    agent: false,
  };

  // 配置文件上传
  config.multipart = {
    mode: 'file',
    fileSize: '10mb', // 最大文件大小
    fileExtensions: ['.xlsx', '.xls'], // 允许的文件扩展名
  };

  const refreshIntervalSeconds = Math.max(envNumber('MONITOR_REFRESH_INTERVAL_SECONDS', 5), 3);
  const staleAfterSeconds = Math.max(
    envNumber('MONITOR_STALE_AFTER_SECONDS', refreshIntervalSeconds * 3),
    refreshIntervalSeconds + 3,
  );

  config.monitor = {
    page: {
      title: process.env.MONITOR_PAGE_TITLE || '运维控制台',
      subtitle: process.env.MONITOR_PAGE_SUBTITLE || '系统运行监控中心',
      realtimeLabel: process.env.MONITOR_REALTIME_LABEL || '实时监控中',
    },
    refresh: {
      intervalSeconds: refreshIntervalSeconds,
      staleAfterSeconds,
    },
    thresholds: {
      memoryWarningPercent: envNumber('MONITOR_MEMORY_WARNING_PERCENT', 82),
      databaseLatencyWarningMs: envNumber('MONITOR_DATABASE_LATENCY_WARNING_MS', 250),
      serviceLatencyWarningMs: envNumber('MONITOR_SERVICE_LATENCY_WARNING_MS', 180),
      serviceLatencyOfflineMs: envNumber('MONITOR_SERVICE_LATENCY_OFFLINE_MS', 1200),
    },
    capabilities: {
      alerts: envBoolean('MONITOR_ALERTS_ENABLED', true),
      trends: envBoolean('MONITOR_TRENDS_ENABLED', false),
      diagnostics: envBoolean('MONITOR_DIAGNOSTICS_ENABLED', true),
      notifications: envBoolean('MONITOR_NOTIFICATIONS_ENABLED', true),
    },
    probes: {
      timeoutMs: envNumber('MONITOR_PROBE_TIMEOUT_MS', 4000),
      upstream: {
        path: process.env.MONITOR_UPSTREAM_PROBE_PATH || '/',
      },
      file: {
        path: process.env.MONITOR_FILE_PROBE_PATH || '/',
      },
    },
  };

  return {
    ...config,
  };
};
