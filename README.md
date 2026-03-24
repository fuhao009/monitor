# monitor-console

基础设施监控运维平台仓库。

当前正式主线是集成到宿主系统中的多页面运维平台：

- 前端宿主：`web-audio/`（Umi Max + ProLayout）
- 后端宿主：`egg-audio/`（Egg.js + MySQL）

仓库中仍保留：

- `frontend/`：旧独立前端原型（仅参考）
- `backend/`：旧独立后端原型（仅参考）

## 当前正式页面

- `/monitor`
- `/hosts`
- `/hosts/:id`
- `/services`
- `/services/:id`
- `/databases`
- `/storage`
- `/topology`
- `/alerts`
- `/alerts/history`
- `/events`
- `/logs/live`
- `/logs/search`
- `/diagnostics`
- `/metrics`
- `/reports/availability`
- `/reports/capacity`
- `/settings/monitor`
- `/settings/notifications`
- `/settings/datasources`
- `/settings/users`

根入口 `/` 会跳转到 `/monitor`。

## 运行（正式集成态）

### 1. 启动本地 MySQL

```bash
docker run -d --name egg-audio-mysql-local -p 3110:3306 -v "/data/yunwei-manager/monitor-console/egg-audio/mysql:/var/lib/mysql" -e MYSQL_ROOT_PASSWORD=dz123456 -e MYSQL_DATABASE=dz_db_mysql -e MYSQL_ROOT_HOST=% -e TZ=Asia/Shanghai mysql:5.7 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

### 2. 启动后端

```bash
cd egg-audio
env DB_HOST=127.0.0.1 DB_PORT=3110 DB_USER=root DB_PASSWORD=dz123456 DB_NAME=dz_db_mysql node node_modules/egg-bin/dist/bin/cli.js dev --port=7001 --declarations=false
```

### 3. 启动前端开发态

```bash
cd web-audio
npm run start:dev -- --port 8001
```

说明：当前更稳定的人工验收入口不是开发态，而是 `dist` 预览。

## 稳定人工验收入口

```bash
cd web-audio
npm run build
env MANUAL_API_ORIGIN=http://127.0.0.1:7001 MANUAL_PREVIEW_HOST=0.0.0.0 MANUAL_PREVIEW_PORT=8012 node tests/e2e/manual-preview-server.mjs
```

常用地址：

- `http://127.0.0.1:8012/user/login`
- `http://127.0.0.1:8012/monitor`

## 验证

### 后端

```bash
cd egg-audio
env DB_HOST=127.0.0.1 DB_PORT=3110 DB_USER=root DB_PASSWORD=dz123456 DB_NAME=dz_db_mysql node node_modules/egg-bin/dist/bin/cli.js test test/app/service/monitor.test.js
```

### 前端类型检查

```bash
cd web-audio
npm run tsc
```

### 前端构建

```bash
cd web-audio
npm run build
```

### 真实 Chrome 页面验收

```bash
cd web-audio
npm run test:e2e:pages
```

### 项目专用页面测试 skill

仓库内已包含项目专用页面测试 skill：

- `skills/monitor-console-page-testing/SKILL.md`

它用于固化：

- 稳定预览启动
- 主页面 smoke / route 验收
- `agent-browser` 逐页访问正式页面

## 关键文档

- `AGENTS.md`：项目真实运行/验收事实
- `清单.md`：需求点、URL、测试状态清单
- `原型图清单.md`：页面原型清单
- `页面任务队列.md`：串行页面任务队列
