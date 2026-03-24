# monitor-console 项目指南

## Scope

- 作用域：`monitor-console/` 下全部文件。
- 这是一个独立项目目录，不属于 `ant-design/` 或 `x/` 子仓库。

## MAINTENANCE RULE

- 以后在 `monitor-console/` 内完成**任何有状态变化的任务**（实现、集成、运行修复、验收、第三方工具测试），都要先把新的项目事实同步写入 `AGENTS.md`，再结束本轮工作。
- 这里只记录**已落地、已验证**的事实；不要把猜测、计划、临时想法写进来。
- 如果新任务改变了主线架构、运行方式、验收路径、兼容层、调试工具链或边界约束，必须更新本文件对应章节。

## OVERVIEW

当前这个目录里同时存在两套监控相关代码：

1. **已接入宿主系统的正式集成态**
   - 前端宿主：`web-audio/`（Umi Max + ProLayout）
   - 后端宿主：`egg-audio/`（Egg.js + MySQL）
   - 数据库：MySQL，默认本地映射端口 `3110`
   - 当前正式前端入口：多页面运维平台（根入口仍落到 `/monitor`）
   - 当前正式前端路由包括：`/monitor`、`/hosts`、`/hosts/:id`、`/services`、`/services/:id`、`/databases`、`/storage`、`/topology`、`/alerts`、`/alerts/history`、`/events`、`/logs/live`、`/logs/search`、`/diagnostics`、`/metrics`、`/reports/availability`、`/reports/capacity`、`/settings/monitor`、`/settings/notifications`、`/settings/datasources`、`/settings/users`
   - 根路由：`/` 仍跳转到 `/monitor`
   - 旧业务路由：`/welcome`、`/group`、`/list`、`/audio`、`/file` 已从前端路由中删除，当前访问会进入 404
   - 监控接口：`/api/monitor/healthz`、`/api/monitor/dashboard`

2. **独立原型态（仅作参考，不是当前验收主线）**
   - 前端原型：`frontend/`（React + TypeScript + Vite）
   - 后端原型：`backend/`（Go + net/http）

**后续如果用户说“继续做监控集成/改监控页/改监控接口”，默认优先改 `web-audio/` + `egg-audio/`，不要回到独立 `frontend/` + `backend/` 原型上做。**

## CURRENT ARCHITECTURE

### 正式集成态

```text
monitor-console/
├── AGENTS.md
├── ARCHITECTURE-DESIGN.md
├── .tools/
│   └── lightpanda-browser/         # Lightpanda 官方仓库本地克隆 + nightly 二进制缓存
├── web-audio/                      # 前端宿主（当前监控页实际入口）
│   ├── config/routes.ts
│   ├── src/locales/zh-CN/menu.ts
│   ├── src/pages/Monitor/
│   ├── src/services/monitor/
│   └── tests/e2e/chrome-pages-smoke.mjs
├── egg-audio/                      # 后端宿主（当前监控接口实际入口）
│   ├── app/router.js
│   ├── app/controller/monitor.js
│   ├── app/service/monitor.js
│   ├── app/middleware/sessionHandler.js
│   ├── config/plugin.js
│   ├── plugins/                    # 本地 Egg 插件兼容适配层
│   ├── run-migration.js
│   ├── docker-compose.yml
│   └── mysql/                      # 本地 MySQL 数据目录
├── frontend/                       # 旧独立前端原型（参考）
└── backend/                        # 旧独立后端原型（参考）
```

### 集成原则

- 前端监控页必须作为 `web-audio` 的**新增业务路由**接入，不能新建第二套 app shell。
- 后端监控能力必须作为 `egg-audio` 的**新增 router/controller/service 模块**接入，不能再起一套 Go/Node 独立服务替代宿主。
- 监控数据默认来自 `egg-audio` 现有 MySQL 表、宿主运行态、宿主会话状态和环境信号；不要给监控功能单独加第二套数据库结构，除非用户明确要求。

## WHERE TO LOOK

| 任务 | 位置 | 说明 |
|---|---|---|
| 监控页路由接入 | `web-audio/config/routes.ts` | 当前已扩展为多页面运维路由树；根入口 `/` 跳转到 `/monitor`；旧业务页 `/welcome`、`/group`、`/list`、`/audio`、`/file` 已删除并落到 404 |
| 前端请求配置 | `web-audio/src/app.tsx` | 当前正式前端请求已改为同源 `/api/*`，不再硬编码 `127.0.0.1:7001` |
| 开发代理配置 | `web-audio/config/proxy.ts` | 默认代理到 `http://127.0.0.1:7001`，可通过 `API_PROXY_TARGET` 覆盖 |
| 菜单文案 | `web-audio/src/locales/zh-CN/menu.ts` | `menu.dashboard.monitor = 监控页` |
| 监控页主组件 | `web-audio/src/pages/Monitor/index.tsx` | 当前宿主内真实监控页面 |
| 监控页轮询 | `web-audio/src/pages/Monitor/useMonitorDashboardPolling.ts` | 本地轮询、stale 状态、刷新态 |
| 前端监控请求层 | `web-audio/src/services/monitor/dashboard.ts` | 走宿主 `request`，请求 `/api/monitor/dashboard`，解包 `{ success, data }` |
| 前端监控类型 | `web-audio/src/services/monitor/types.ts` | 集成态 dashboard 类型定义 |
| Chrome 页面 smoke | `web-audio/tests/e2e/chrome-pages-smoke.mjs` | 构建 `dist`、启动临时预览、真实登录并验证核心业务页，输出 JSON 报告和截图 |
| agent-browser 页面验收 | `web-audio/tests/e2e/artifacts/agent-browser-pages-report.json` | 基于 `agent-browser` skill 驱动浏览器逐页访问正式 URL，记录路径、标题和文案命中结果 |
| 手动验收预览服务 | `web-audio/tests/e2e/manual-preview-server.mjs` | 启动 `dist` 预览并把 `/api/*` 代理到当前 `egg-audio`，用于人工验收 |
| 页面测试 skill | `skills/monitor-console-page-testing/SKILL.md` | 当前项目专用页面 QA skill（仓库内版本），固化稳定预览、真实 Chrome 主验收和 `agent-browser` 逐页验证流程 |
| 需求点 URL 清单 | `清单.md` | 当前需求点、对应 URL、当前状态与测试覆盖矩阵 |
| 页面原型清单 | `原型图清单.md` | 目标平台页面原型、URL 与分期建议 |
| 页面任务队列 | `页面任务队列.md` | 以“每页一个 task、串行完成”为原则的执行队列 |
| Egg 路由入口 | `egg-audio/app/router.js` | 注册 `/api/monitor/healthz`、`/api/monitor/dashboard` |
| Egg 监控控制器 | `egg-audio/app/controller/monitor.js` | 统一返回 `{ success, data }` |
| Egg 监控服务 | `egg-audio/app/service/monitor.js` | 基于 MySQL、runtime、session、env 聚合监控快照 |
| session 特例 | `egg-audio/app/middleware/sessionHandler.js` | `/api/monitor/*` 会跳过上游 PTT session bootstrap |
| Egg 插件兼容层 | `egg-audio/config/plugin.js`、`egg-audio/plugins/*` | 适配当前本地 Egg/Artus 启动链 |
| 迁移脚本保护 | `egg-audio/run-migration.js` | 仅在命令行直接执行时才跑迁移 |
| 本地数据库运行 | `egg-audio/docker-compose.yml`、`egg-audio/mysql/` | MySQL 5.7，本地端口 `3110` |
| Lightpanda 工具参考 | `.tools/lightpanda-browser/README.md`、`.tools/lightpanda-browser/lightpanda` | 第三方真实浏览器测试工具的本地克隆与 nightly 二进制 |
| 独立原型参考 | `frontend/src/pages/dashboard/*`、`backend/internal/dashboard/*` | 仅作 UI / 数据契约 / 演示逻辑参考 |

## INTEGRATED BEHAVIOR

- `web-audio` 中的监控页运行在 `/monitor`，并复用宿主 Umi 的登录态、权限、菜单、`PageContainer` 和 `request`。
- `web-audio` 当前已从单页 monitor 扩展为多页面运维平台；各新页面继续复用同一套宿主登录态、权限、菜单、`PageContainer` 和 `request`。
- 登录成功后，前端默认会进入 `/monitor`，不再默认进入 `/welcome`。
- 旧业务页 `Welcome` / `GroupList` / `TableList` / `AudioTableList` / `FileManagement` / `Admin` 已从 `web-audio/src/pages` 删除，不再保留兼容代码。
- `web-audio/src/services/monitor/dashboard.ts` 会对 dashboard 响应做归一化，确保 `refresh`、`alertsSummary`、`capabilities` 缺失时前端不崩。
- `egg-audio` 提供：
  - `GET /api/monitor/healthz`：无需 token，用于验活
  - `GET /api/monitor/dashboard`：需要 `auth`，返回 `{ success: true, data: DashboardPayload }`
- `egg-audio/app/service/monitor.js` 当前把宿主模块映射成监控节点：`Egg API`、`Auth`、`Audio`、`Group`、`File`、`MySQL`。
- 监控快照来自：
  - `users`
  - `group_info`
  - `user_tokens`
  - 当前 Node 进程运行态
  - 当前数据库可达性
  - 当前上游 PTT session 状态
  - 当前登录用户可见群组范围

## COMMANDS

### 正式集成态：本地运行

- 启动本地 MySQL：
  - `docker run -d --name egg-audio-mysql-local -p 3110:3306 -v "/data/yunwei-manager/monitor-console/egg-audio/mysql:/var/lib/mysql" -e MYSQL_ROOT_PASSWORD=dz123456 -e MYSQL_DATABASE=dz_db_mysql -e MYSQL_ROOT_HOST=% -e TZ=Asia/Shanghai mysql:5.7 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci`
- 启动 `egg-audio`（推荐本地可用方式）：
  - `cd egg-audio && env DB_HOST=127.0.0.1 DB_PORT=3110 DB_USER=root DB_PASSWORD=dz123456 DB_NAME=dz_db_mysql node node_modules/egg-bin/dist/bin/cli.js dev --port=7001 --declarations=false`
- 启动 `web-audio`：
  - `cd web-audio && npm run start:dev -- --port 8001`
  - 注意：Umi 可能自动避让冲突端口；本次实测实际监听为 `8002`

### 正式集成态：验证

- 前端构建：`cd web-audio && npm run build`
- 前端类型检查：`cd web-audio && npm run tsc`
  - 当前 `web-audio` 前端类型检查已可通过
- 后端测试：`cd egg-audio && env DB_HOST=127.0.0.1 DB_PORT=3110 DB_USER=root DB_PASSWORD=dz123456 DB_NAME=dz_db_mysql node node_modules/egg-bin/dist/bin/cli.js test`
- 后端监控接口验活：
  - `curl http://127.0.0.1:7001/api/monitor/healthz`
  - `curl -H "Authorization: Bearer <token>" http://127.0.0.1:7001/api/monitor/dashboard`

### Chrome + Playwright 真实页面验收

- 当前项目的**主验收浏览器组合**是：`Google Chrome + playwright-core`
- 实测可用的 Chrome 可执行文件：`/opt/google/chrome/chrome`
- 在 root 环境下运行 Playwright 时，需要通过浏览器参数关闭 sandbox：
  - `--no-sandbox`
  - `--disable-dev-shm-usage`
- 当前仓库内已经落地可直接运行的页面 smoke 命令：
  - `cd web-audio && npm run test:e2e:pages`
- 这条命令当前实际执行的步骤是：
  1. `npm run build`
  2. 启一个临时 `dist` 预览服务，默认端口 `8012`
  3. 使用真实登录页 `/user/login`
  4. 用 Playwright 在真实 `Google Chrome` 中填充账号密码并点击 `Login`
  5. 再验证 `/monitor`、`/`、旧业务路径 404、未知路径 404，以及 monitor 页面真实交互
  6. 输出 `web-audio/tests/e2e/artifacts/chrome-pages-smoke-report.json` 和同目录截图
- 默认登录账号使用：
  - `admin / 123456`
- 常用覆盖参数：
  - `E2E_BASE_URL`
  - `E2E_API_ORIGIN`
  - `E2E_USERNAME`
  - `E2E_PASSWORD`
  - `E2E_PREVIEW_PORT`
  - `E2E_CHROME_EXECUTABLE`
  - `E2E_HEADLESS`

### 手动验收稳定预览入口

- 当前仓库已新增可直接启动的手动预览脚本：
  - `cd web-audio && env MANUAL_API_ORIGIN=http://127.0.0.1:7001 MANUAL_PREVIEW_HOST=0.0.0.0 MANUAL_PREVIEW_PORT=8012 node tests/e2e/manual-preview-server.mjs`
- 这条脚本会：
  1. 读取 `web-audio/dist`
  2. 在 `8012` 启一个稳定预览服务
  3. 把 `/api/*` 反向代理到 `egg-audio:7001`
- 当前人工验收可直接访问：
  - `http://192.168.66.193:8012/user/login`
  - `http://192.168.66.193:8012/monitor`
  - 备选地址：
    - `http://192.168.66.178:8012/user/login`
    - `http://10.0.16.194:8012/user/login`

### Lightpanda 真实浏览器测试

- Lightpanda 官方仓库本地克隆位置：`.tools/lightpanda-browser/`
- 当前环境可执行的 Lightpanda 二进制使用方式：
  - `cp .tools/lightpanda-browser/lightpanda /tmp/lightpanda && chmod a+x /tmp/lightpanda`
- 启动 Lightpanda CDP 服务：
  - `env LIGHTPANDA_DISABLE_TELEMETRY=true /tmp/lightpanda serve --host 127.0.0.1 --port 9333`
- 为了避开 Umi 开发态 HMR 干扰，已验证更稳定的测试方式是：
  1. `cd web-audio && npm run build`
  2. 使用一个**临时本地预览服务**托管 `web-audio/dist`
  3. 让预览服务把 `/api/*` 代理到 `egg-audio:7001`
  4. 使用 Puppeteer 通过 CDP 连接 `ws://127.0.0.1:9333/` 驱动 Lightpanda

### 独立原型态（仅参考）

- 前端安装依赖：`cd frontend && npm install`
- 前端开发：`cd frontend && npm run dev`
- 前端构建：`cd frontend && npm run build`
- 后端启动：`cd backend && go run ./cmd/server`
- 后端测试：`cd backend && go test ./...`
- 后端构建：`cd backend && go build ./...`

## VERIFIED STATUS

以下内容已实际执行并通过：

- `cd egg-audio && env DB_HOST=127.0.0.1 DB_PORT=3110 DB_USER=root DB_PASSWORD=dz123456 DB_NAME=dz_db_mysql node node_modules/egg-bin/dist/bin/cli.js test test/app/service/monitor.test.js`
  - 已验证新的监控后端 contract/service 用例通过，覆盖：
    - dashboard 返回可配置 `refresh`、`thresholds`、`probe paths`
    - dashboard 返回结构化 `alerts[]`、`diagnostics[]`、`config`
    - healthz 返回 `probes.upstream`、`probes.file`
- `cd web-audio && npm run build`
  - 当前新的监控前端改动已可正常产出生产构建
- `curl http://127.0.0.1:7001/api/monitor/healthz`
- `curl http://127.0.0.1:8012/user/login`
- `curl http://127.0.0.1:8012/`
- `curl http://192.168.66.193:7001/api/monitor/healthz`
- `curl http://192.168.66.193:8012/user/login`
- `curl http://192.168.66.193:8012/`
  - 当前后端 `7001` 与手动验收预览入口 `8012` 已在本机和 `192.168.66.193` 对外地址上验证可达
- `cd web-audio && npm run test:e2e:pages`
  - 当前 Chrome + playwright-core smoke 已扩展为**9 条当前正式路由级校验**，并在本仓库通过：
    - `/user/login`
    - `/monitor`
    - `/`
    - `/welcome`
    - `/group`
    - `/list`
    - `/audio`
    - `/file`
    - `/_monitor_unknown_route_` 风格的未知路径 404
  - 当前报告文件：
    - `web-audio/tests/e2e/artifacts/chrome-pages-smoke-report.json`
  - 当前报告汇总：
    - `totalRoutes = 9`
    - `failedRoutes = []`
  - 其中 `/welcome`、`/group`、`/list`、`/audio`、`/file` 当前均已验证为 404，而不是兼容跳转到 `/monitor`
  - `/monitor` 本轮额外校验了页面内真实选择器：
    - `[data-testid="monitor-alert-list"]`
    - `[data-testid="monitor-diagnostic-list"]`
- `cd web-audio && npm run test:e2e:pages`
  - 当前 Chrome + playwright-core smoke 已扩展为**29 条正式路由级校验**，并在本仓库通过：
    - `/user/login`
    - `/monitor`
    - `/hosts`
    - `/hosts/egg-api`
    - `/services`
    - `/services/audio`
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
    - `/`
    - `/welcome`（404）
    - `/group`（404）
    - `/list`（404）
    - `/audio`（404）
    - `/file`（404）
    - 未知路径 404
  - 当前报告汇总：
    - `totalRoutes = 29`
    - `failedRoutes = []`
    - `totalFunctionalChecks = 8`
    - `failedFunctionalChecks = []`
- `agent-browser --session monitorqa ...`
  - 已使用 `agent-browser` skill 对当前 **21 个正式页面 URL** 做逐页浏览器访问验证：
    - `/monitor`
    - `/hosts`
    - `/hosts/egg-api`
    - `/services`
    - `/services/audio`
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
  - 当前报告文件：
    - `web-audio/tests/e2e/artifacts/agent-browser-pages-report.json`
- `python3` 调用接口验收：
  - `GET /api/user/info` 返回 `{"success": true, "username": "超级管理员", "role": 0}`
  - `POST /api/auth/logout` 返回 `{"success": true, "message": "登出成功"}`
- `cd web-audio && npm run test:e2e:pages`
  - 当前真实 `Google Chrome + playwright-core` 验收已进一步覆盖**8 条 monitor 页面功能交互**，并在本仓库通过：
    - 告警中心与诊断建议面板可见
    - 桌面通知入口可见
    - 切换到列表视图
    - 切换到趋势视图
    - 切回网络拓扑
    - 切换到“仅显示数据库”筛选
    - 点击 `MySQL` 节点并更新详情区
    - 切回“全部显示”筛选
  - 当前报告汇总额外包含：
    - `totalFunctionalChecks = 8`
    - `failedFunctionalChecks = []`

- `cd web-audio && npm run build`
- `cd egg-audio && env DB_HOST=127.0.0.1 DB_PORT=3110 DB_USER=root DB_PASSWORD=dz123456 DB_NAME=dz_db_mysql node node_modules/egg-bin/dist/bin/cli.js test`
- `curl http://127.0.0.1:7001/api/monitor/healthz`
- `curl -H "Authorization: Bearer <admin-token>" http://127.0.0.1:7001/api/monitor/dashboard`
- 真实浏览器协议打开 `http://127.0.0.1:8002/monitor`，页面可见：
  - `Egg Audio`
  - `录音平台运行监控中心`
  - `Egg API`
  - `MySQL`
  - `实时日志`
- Chrome + Playwright 已做过**真实登录 + 真实路由验收**：
  - 登录页 `/user/login`：已实际填表并点击 `Login`
  - 登录后确认浏览器 `localStorage` 存在 token
  - 以下页面在真实 Chrome 中完成过**路由级通过**：
    - `/welcome`
    - `/group`
    - `/list`
    - `/audio`
    - `/file`
    - `/monitor`
  - 其中 `/file` 在这轮验收里只确认到“路由可打开 + `/api/v1/file-info` 有请求命中”，不代表文件列表/详情链路功能通过；后续 2026-03-24 的详细功能验收已确认当前 `admin` 数据态下这里会返回 `500`
  - 其中 `/monitor` 已确认页面正文包含：
    - `录音平台运行监控中心`
    - `Egg Audio`
  - 接口命中证据：
    - `/api/group/list`
    - `/api/user/list`
    - `/api/audio/list`
    - `/api/v1/file-info`
    - `/api/monitor/dashboard`
  - 已生成监控页截图：`/tmp/playwright-monitor-page.png`
- `cd web-audio && npm run test:e2e:pages` 已在当前仓库通过：
  - 运行入口：`Google Chrome + playwright-core`
  - 前端入口：脚本自启 `dist` 预览，实际本次端口 `8012`
  - 后端入口：`http://127.0.0.1:7001`
  - 真实登录通过后，以下页面 smoke 全部通过：
    - `/welcome`
    - `/group`
    - `/list`
    - `/audio`
    - `/file`
    - `/monitor`
  - 本次报告文件：
    - `web-audio/tests/e2e/artifacts/chrome-pages-smoke-report.json`
  - 本次截图文件：
    - `web-audio/tests/e2e/artifacts/login-success.png`
    - `web-audio/tests/e2e/artifacts/welcome.png`
    - `web-audio/tests/e2e/artifacts/group.png`
    - `web-audio/tests/e2e/artifacts/list.png`
    - `web-audio/tests/e2e/artifacts/audio.png`
    - `web-audio/tests/e2e/artifacts/file.png`
    - `web-audio/tests/e2e/artifacts/monitor.png`
  - 额外观察到的非阻塞现象：
    - `/file` 路由在报告里记录到一个 `AxiosError: Request failed with status code 500` 的 pageerror，但 `/api/v1/file-info` 主接口仍已命中且页面 smoke 判定通过
- 已使用真实 `Google Chrome + playwright-core` 对当前 `dist` 预览入口 `http://127.0.0.1:8011` 做过**20 条页面功能验收**：
  - 使用账号：
    - `admin / 123456`
  - 本次详细功能报告：
    - `web-audio/tests/e2e/artifacts/chrome-pages-functional-report.json`
  - 本次结果：
    - 20 条里 18 条通过
    - 失败 2 条，均位于 `/file`
  - 通过的功能项：
    - `/user/login` 真实登录
    - `/welcome` 欢迎卡片展示
    - `/welcome` 到 `/list`
    - `/welcome` 到 `/audio`
    - `/welcome` 到 `/file`
    - `/group` 列表加载
    - `/group` 新建群组弹窗打开/关闭
    - `/group` 导入弹窗打开/关闭
    - `/group` 编辑弹窗打开/关闭
    - `/list` 列表加载
    - `/list` 新建用户弹窗打开/关闭
    - `/list` 导入用户弹窗打开/关闭
    - `/list` 编辑用户弹窗打开/关闭
    - `/audio` 查询
    - `/audio` 自动播放开关切换
    - `/monitor` 监控面板加载
    - `/monitor` dashboard 轮询
    - 顶部头像下拉触发器退出登录
  - 明确失败的功能项：
    - `/file` 列表加载：`/api/v1/file-info` 返回 `500`，响应 `{"success":false,"message":"关联账号为空"}`，页面显示 `No data`
    - `/file` 文件详情：由于列表没有产生可点击的 `详情` 入口，详情弹窗链路无法继续
- 当前前端已按“只保留运维台”收口，并完成真实浏览器验证：
  - 登录默认落点：`/monitor`
  - 当前唯一正式业务页：`/monitor`
  - 兼容跳转已验证：
    - `/`
    - `/welcome`
    - `/group`
    - `/list`
    - `/audio`
    - `/file`
    - 以上地址在真实 Chrome 登录态下都会跳到 `/monitor`
- `cd web-audio && npm run test:e2e:pages` 当前已更新为**运维台 smoke**：
  - 真实登录后只验证 `/monitor`
  - 当前报告汇总：
    - `totalRoutes = 1`
    - `failedRoutes = []`
  - 报告文件仍输出到：
    - `web-audio/tests/e2e/artifacts/chrome-pages-smoke-report.json`
- 当前 `8002` 对外登录失败的历史根因已定位并修复：
  - 原因：`web-audio/src/app.tsx` 曾把请求 `baseURL` 硬编码成 `http://127.0.0.1:7001`
  - 影响：从其他电脑访问 `http://192.168.66.193:8002` 时，浏览器会把 `/api/*` 错误地发往访问者自己电脑的 `127.0.0.1:7001`
  - 修复：前端请求已切回同源 `/api/*`，由 `8002` 开发服务代理到本机后端
- 当前 `192.168.66.193:8002` 已做过真实浏览器验证：
  - 登录页：`/user/login`
  - 登录成功后进入：`/monitor`
  - 旧地址 `/`、`/welcome`、`/group`、`/list`、`/audio`、`/file` 已确认都会跳到 `/monitor`
  - 登出后会回到 `/user/login?redirect=%2Fmonitor`
  - 这轮对外访问下观察到的 API 请求是：
    - `http://192.168.66.193:8002/api/auth/login`
    - `http://192.168.66.193:8002/api/monitor/dashboard`
    - `http://192.168.66.193:8002/api/auth/logout`
- Lightpanda 已实际安装并启动：
  - 官方 nightly 二进制可运行
  - `lightpanda serve --host 127.0.0.1 --port 9333` 可提供 CDP 服务
- Lightpanda 对 `web-audio` 页面做过**真实浏览器测试**（通过 CDP + Puppeteer 驱动）
  - 明确通过：`/user/login`、`/welcome`、`/file`、`/monitor`
  - 证据类型：路由标题、页面 chunk 加载、对应 API 命中
  - 其中 `/monitor` 已确认命中 `p__Monitor__index.*.async.js` 和 `/api/monitor/dashboard`
- Lightpanda 对以下页面给出**部分验证**，不能算完整通过：
  - `/group`
  - `/list`
  - `/audio`
  - 原因：路由和页面 chunk 已加载，但被动首屏阶段未观察到预期主 API 请求

## RECENT COMPLETED WORK

### 2026-03-23：监控模块正式集成到宿主系统

- 已将原独立监控原型接入 `web-audio` + `egg-audio`，不再以 `frontend/` + `backend/` 作为主线。
- 前端集成结果：
  - `web-audio/config/routes.ts` 新增 `/monitor`
  - `web-audio/src/pages/Monitor/` 为正式监控页实现
  - `web-audio/src/services/monitor/` 为正式监控请求/类型层
- 后端集成结果：
  - `egg-audio/app/router.js` 新增 `/api/monitor/healthz`、`/api/monitor/dashboard`
  - `egg-audio/app/controller/monitor.js` + `app/service/monitor.js` 已落地
  - 数据来自现有 MySQL 表、Node 运行态、宿主会话状态和环境信号

### 2026-03-23：宿主本地运行兼容修复

- `egg-audio/config/plugin.js` 改为走本地 `plugins/*` 兼容适配层，以兼容当前 Artus/Egg 启动链。
- `egg-audio/plugins/cors`、`plugins/knex`、`plugins/validate` 已补成本地轻量包装层；这些目录只做运行兼容，不承载业务逻辑。
- `egg-audio/run-migration.js` 已加 `require.main === module` 守卫，避免被加载器扫描时直接连库执行。
- 本地联调时，`egg-audio` 需要显式覆盖数据库到 `127.0.0.1:3110`，不要直接信任 `.env` 中的远端地址。

### 2026-03-23：运行与验收环境落地

- 已使用 `egg-audio/mysql/` 数据目录启动本地 MySQL 5.7，端口 `3110`。
- 已验证 `egg-audio` 通过旧版 `egg-bin/dist/bin/cli.js` 在 `7001` 正常启动。
- 已验证 `web-audio` 在开发态可正常启动，端口可能漂移到 `8002`。
- 已通过真实登录态验收 `/monitor` 页面与 `/api/monitor/*` 接口。

### 2026-03-23：Lightpanda 真实浏览器测试落地

- 已安装 `https://github.com/lightpanda-io/browser.git` 对应的官方 nightly 二进制，并保留本地仓库克隆供参考。
- 已使用 Lightpanda CDP + Puppeteer 对 `web-audio` 全部主要页面做真实路由测试。
- 为了让 Lightpanda 更稳定执行当前 Umi 页面，测试 harness 中额外注入了：
  - observer 兼容补丁（补 `unobserve()` 等）
  - 浏览器级 `Authorization` 请求头
- 这属于**仅测试期兼容手段**，不是业务代码的一部分。

### 2026-03-23：Chrome + Playwright 页面验收落地

- 已使用真实 `Google Chrome` + `playwright-core` 对当前宿主应用做页面级验收。
- 这次测试不是 mock DOM，也不是仅接口级测试，而是：
  - 打开真实登录页
  - 填真实账号密码
  - 点击真实按钮登录
  - 再进入受保护业务路由验证页面内容与接口请求
- 当前 `web-audio` 在 Chrome 下通过的核心页面为：
  - `/welcome`
  - `/group`
  - `/list`
  - `/audio`
  - `/file`
  - `/monitor`
- 当前控制台仍存在两个**非阻塞**已知问题：
  - request interceptor 的调试日志输出
  - `en-US` 下部分菜单 key 的 React Intl missing-message 警告

### 2026-03-24：Chrome 页面 smoke 自动化落地

- `web-audio/tests/e2e/chrome-pages-smoke.mjs` 已落地，并作为 `web-audio/package.json` 中的 `npm run test:e2e:pages` 暴露。
- 这条脚本当前不再依赖 `Lightpanda`，而是只使用：
  - `Google Chrome`
  - `playwright-core`
- 当前脚本已验证会：
  - 先构建 `web-audio/dist`
  - 再起临时本地预览
  - 走真实登录页
  - 验证 `/welcome`、`/group`、`/list`、`/audio`、`/file`、`/monitor`
  - 生成结构化 JSON 报告和页面截图

### 2026-03-24：Chrome 页面功能验收明细落地

- 已对 `http://127.0.0.1:8011` 这条 `dist` 预览入口执行 20 条真实页面功能用例。
- 本次详细报告产物为：
  - `web-audio/tests/e2e/artifacts/chrome-pages-functional-report.json`
- 本次功能验收明确确认：
  - `/group` 的新建/导入/编辑弹窗链路可打开并关闭
  - `/list` 的新建/导入/编辑弹窗链路可打开并关闭
  - `/audio` 的查询和自动播放开关可用
  - `/monitor` 的 dashboard 加载和轮询都可用
  - 退出登录需要点击顶部头像区域的下拉触发器，而不是误点页面正文里其他“超级管理员”文本
- 本次功能验收同时暴露了当前本地数据态下的真实失败：
  - `admin / 123456` 打开 `/file` 时，`/api/v1/file-info` 会返回 `500`
  - 返回体为 `{"success":false,"message":"关联账号为空"}`
  - 因此页面显示 `No data`，文件 `详情` 入口不会出现，文件详情弹窗链路当前无法通过

### 2026-03-24：前端收口为运维控制台

- `web-audio/config/routes.ts` 已收口为以 `/monitor` 为唯一正式业务入口。
- 登录成功后默认跳转已从 `/welcome` 改为 `/monitor`。
- 以下旧业务路径当前只保留兼容跳转，不再作为正式功能页公开：
  - `/`
  - `/welcome`
  - `/group`
  - `/list`
  - `/audio`
  - `/file`
- `web-audio/config/config.ts`、`config/defaultSettings.ts`、`src/pages/User/Login/index.tsx` 的产品标题已从“沪杭甬对讲取证平台”统一改成“沪杭甬运维控制台”。
- `egg-audio/app/service/monitor.js` 返回的 dashboard 页面主文案已改为：
  - `title = 运维控制台`
  - `subtitle = 系统运行监控中心`
- 监控拓扑中原来的 `Audio` 节点显示名已改成 `Upstream`，避免继续以录音业务语义暴露当前控制台。
- `web-audio/tests/e2e/chrome-pages-smoke.mjs` 已同步收口为运维台 smoke：
  - 登录后只验 `/monitor`
  - 不再把 `/welcome`、`/group`、`/list`、`/audio`、`/file` 当成本轮正式验收目标
- 当前这套收口结果已实际验证：
  - `cd web-audio && npm run build`
  - `cd web-audio && npm run test:e2e:pages`
  - 真实 Chrome 登录态下访问 `/`、`/welcome`、`/group`、`/list`、`/audio`、`/file`，最终 URL 都会落到 `/monitor`

### 2026-03-24：修复 8002 对外访问时的登录失败

- `web-audio/src/app.tsx` 已移除写死的 `baseURL = http://127.0.0.1:7001`。
- 当前前端请求改为同源 `/api/*`，以支持其他机器通过 `192.168.66.193:8002` 访问时正确命中服务器侧代理。
- `web-audio/config/proxy.ts` 已改为：
  - 默认代理到 `http://127.0.0.1:7001`
  - 可通过 `API_PROXY_TARGET` 覆盖
- `web-audio/src/requestErrorConfig.ts` 已去掉请求拦截器里的调试 `console.error`，避免在用户浏览器控制台持续刷屏。
- `web-audio/tests/e2e/chrome-pages-smoke.mjs` 的本地 `dist` 预览服务已补上 `/api/*` 反向代理到 `E2E_API_ORIGIN`，因此在“前端请求走同源”的前提下，页面 smoke 仍可继续执行。
- 这轮修复后已实际验证：
  - `curl http://192.168.66.193:8002/api/monitor/healthz` 返回 `200`
  - 真实 Chrome 打开 `http://192.168.66.193:8002/user/login`
  - 使用 `admin / 123456` 登录成功
  - 登录后进入 `http://192.168.66.193:8002/monitor`
  - 监控页正文可见：
    - `运维控制台`
    - `系统运行监控中心`
  - 登出链路正常，`localStorage` token 会被清空

### 2026-03-24：监控页升级为可配置真实探测告警中心

- `egg-audio/config/config.default.js` 已新增 `config.monitor`，当前支持通过环境变量配置：
  - 页面标题/副标题/实时文案
  - 轮询周期与陈旧阈值
  - 内存、数据库延迟、外部服务延迟阈值
  - alerts / diagnostics / notifications capability 开关
  - upstream/file 探测 path 与探测 timeout
- `egg-audio/app/service/monitor.js` 当前不再只依赖原先的纯推导状态：
  - 保留 MySQL、Node runtime、session 状态等真实宿主数据
  - 新增对 `BASE_URL` 和 `FILE_BASE_URL` 的真实 HTTP 探测
  - dashboard 当前会返回：
    - `alerts[]`
    - `diagnostics[]`
    - `config`
    - 更完整的 `capabilities.notifications`
  - `healthz` 当前会返回：
    - `probes.upstream`
    - `probes.file`
  - 相同告警事件当前会稳定复用同一组 `dedupeKey + lastChangeAt`，避免浏览器桌面消息在每轮轮询都重复弹出
  - `healthz.status` 当前会综合数据库、upstream probe、file probe 的真实状态，不再只凭“已配置”误判为 `ok`
- `web-audio/src/pages/Monitor/index.tsx` 当前已落地：
  - 告警中心面板
  - 诊断建议面板
  - 当前监控策略展示
  - 浏览器桌面告警授权入口
  - 基于 `dedupeKey + lastChangeAt` 的桌面消息去重逻辑
- `web-audio/tests/e2e/chrome-pages-smoke.mjs` 当前已从“只验 `/monitor`”升级为“覆盖当前所有正式前端入口与兼容入口”：
  - 登录页 `/user/login`
  - 正式页 `/monitor`
  - 根入口 `/`
  - 已删除旧业务路径 `/welcome` `/group` `/list` `/audio` `/file` 的 404 行为
  - 未知路径 404
- 同一套 `web-audio/tests/e2e/chrome-pages-smoke.mjs` 当前还会覆盖 monitor 页面的关键真实交互：
  - 视图切换：`网络拓扑` / `列表视图` / `趋势占位`
  - 筛选切换：`全部显示` / `仅显示数据库`
  - 节点选择：点击 `MySQL` 并校验详情区标题变化
  - 页面功能入口：桌面通知按钮存在
- 当前仓库内新增的后端监控测试文件：
  - `egg-audio/test/app/service/monitor.test.js`

### 2026-03-24：删除旧业务页与兼容路由

- `web-audio/config/routes.ts` 已删除 `/welcome`、`/group`、`/list`、`/audio`、`/file` 这些旧业务路径；当前仅保留：
  - `/user/login`
  - `/monitor`
  - `/` → `/monitor`
  - `*` → `404`
- `web-audio/src/pages/` 已删除旧页面实现：
  - `Welcome.tsx`
  - `Admin.tsx`
  - `GroupList/`
  - `TableList/`
  - `AudioTableList/`
  - `FileManagement/`
- `web-audio/src/services/ant-design-pro/api.ts` 已收口，只保留当前仍被登录态和应用壳使用的 auth / currentUser 能力。
- `web-audio/src/pages/User/Login/index.tsx` 已移除旧的手机号验证码登录分支；当前登录页只保留账号密码登录。
- `cd web-audio && npm run tsc` 当前已在本仓库通过。

### 2026-03-24：手动验收入口已运行

- 当前已按“人工验收优先稳定入口”的方式启动：
  - 后端：`egg-audio` 监听 `7001`
  - 前端：`web-audio/tests/e2e/manual-preview-server.mjs` 监听 `8012`
- 当前可直接人工验收的地址：
  - `http://192.168.66.193:8012/user/login`
  - `http://192.168.66.193:8012/monitor`
- 当前这套手动预览入口不走不稳定的 Umi 开发态，而是走：
  - 已构建 `dist`
  - 稳定静态预览
  - `/api/*` 代理到 `egg-audio:7001`

### 2026-03-24：项目专用页面测试 skill 已落地

- 当前已新增项目专用页面 QA skill：
  - `skills/monitor-console-page-testing/SKILL.md`
- 当前本机已安装运行态副本：
  - `/root/.agents/skills/monitor-console-page-testing/SKILL.md`
- 当前 skill 附带：
  - 页面范围参考：`skills/monitor-console-page-testing/references/formal-pages.md`
  - 模板脚本：`skills/monitor-console-page-testing/templates/verify-formal-pages.sh`
- 当前 skill 已实际执行并通过：
  - `bash skills/monitor-console-page-testing/templates/verify-formal-pages.sh http://127.0.0.1:8012`
  - 结果：21 个正式页面 `titleMatches = true` 且 `containsExpectedText = true`

### 2026-03-24：页面原型与串行任务清单已落地

- 当前仓库已新增：
  - `原型图清单.md`
  - `页面任务队列.md`
- `原型图清单.md` 用于描述目标运维平台的页面原型、URL 和分期建议。
- `页面任务队列.md` 用于约束后续开发按“每个页面一个 task，完成一个再做下一个”的方式推进。

### 2026-03-24：多页面运维平台骨架已落地

- `web-audio/config/routes.ts` 当前已新增正式运维页面路由：
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
- `egg-audio/app/service/monitor.js` 当前已扩展 `/api/monitor/dashboard`，新增多页面共享数据块：
  - `runtime`
  - `database`
  - `operator`
  - `overview`
  - `quickLinks`
  - `probes`
  - `services`
  - `recentEvents`
  - `trendSummary`
  - `availabilityReport`
  - `capacityReport`
  - `settings`
  - `trendSummary.metrics` 中的 `MySQL 内存` 序列当前已修正为真正基于 MySQL 内存百分比生成，不再错误复用 CPU history
- `web-audio/src/pages/Monitor/index.tsx` 当前已升级为真正首页总览：
  - 平台摘要卡
  - 快捷跳转区
  - 趋势摘要区
  - 最近事件区
- 当前多页面结果已完成真实验证：
  - `cd egg-audio && env DB_HOST=127.0.0.1 DB_PORT=3110 DB_USER=root DB_PASSWORD=dz123456 DB_NAME=dz_db_mysql node node_modules/egg-bin/dist/bin/cli.js test test/app/service/monitor.test.js`
  - `cd web-audio && npm run tsc`
  - `cd web-audio && npm run build`
  - `cd web-audio && npm run test:e2e:pages`

## LOCAL RUNTIME CAVEATS

- `egg-audio` 当前仓库默认 `npm run dev` 走的是 Artus 包装命令，**本地直接开发更稳妥的方式是调用旧版 `egg-bin/dist/bin/cli.js`**。
- `egg-audio/config/plugin.js` 当前使用的是本地 `plugins/*` 适配层，而不是直接指向 `egg-cors` / `egg-knex` / `egg-validate` 包路径；这是为了兼容当前本地启动链。
- `egg-audio/run-migration.js` 已加 `require.main === module` 保护，避免被加载器扫描时误触发数据库连接。
- `egg-audio/.env` 默认数据库主机仍可能指向远端地址；本地联调时应显式覆盖为 `127.0.0.1:3110`。
- `web-audio` 开发端口可能自动从 `8001` 漂移到别的空闲端口，验收前先看启动日志或 `ss -ltnp`。
- Playwright MCP 在当前 root 环境下会因为 Chrome sandbox 限制直接失败；若继续使用 Playwright，优先走本地 `playwright-core` 脚本 + `/opt/google/chrome/chrome --no-sandbox`。
- 当前这个环境里，开发态 `web-audio:8002` 在真实浏览器中会报：
  - `Cannot find module '/data/yunwei-manager/monitor-console/web-audio/src/.umi/umi.ts'`
  - `Module not found: Error: Can't resolve '/data/yunwei-manager/monitor-console/web-audio/src/.umi/umi.ts'`
- 因此当前更稳的页面验收入口不是 `8002`，而是 `npm run test:e2e:pages` 自己拉起的 `dist` 预览服务。
- 当前 `npm run test:e2e:pages` 的目标已经变成“登录 + 运维台”，不要再把它理解成旧的多业务页 smoke。
- 当前对外可访问的开发入口仍然是 `http://192.168.66.193:8002`；与此前不同的是，前端请求不再直连访问者本机的 `127.0.0.1:7001`。
- 当前使用 `admin / 123456` 做真实功能验收时，`/file` 会命中 `/api/v1/file-info` 的 `500`：
  - 响应体：`{"success":false,"message":"关联账号为空"}`
  - 页面现象：`No data`
  - 连带影响：文件 `详情` 入口不出现，文件详情弹窗链路无法验证通过
- Lightpanda 对当前 Umi 页面存在已知兼容限制：直接打开发态 `8002` 时，会在 `umi.js` 里触发 `TypeError: ge.unobserve is not a function`。
- Lightpanda 本身**没有图形渲染引擎**，不要把它当成截图型验收浏览器；它更适合做路由、chunk、网络请求、API 命中的轻量浏览器验证。
- Lightpanda 对文本提取能力较弱；对这类页面，优先使用“标题 + chunk 请求 + API 请求”作为测试证据，而不是依赖 `innerText`。

## ACCEPTANCE URLS

- 登录页：`http://192.168.66.193:8002/user/login`
- 监控页：`http://192.168.66.193:8002/monitor`
- 备选前端地址：
  - `http://192.168.66.178:8002/monitor`
  - `http://10.0.16.194:8002/monitor`

## BOUNDARIES

- 不要把监控功能重新做成第二套独立前端壳；必须继续挂在 `web-audio` 宿主里。
- 当前前端对外目标是“运维控制台”；除非用户明确要求，不要重新把 `/welcome`、`/group`、`/list`、`/audio`、`/file` 恢复成正式公开入口。
- 不要把监控后端重新做成第二套 Go/Node 独立服务；必须继续挂在 `egg-audio` 宿主里。
- 除非用户明确要求，不要为监控功能新增数据库 schema；优先复用现有 MySQL 表和宿主 service 数据。
- `/api/monitor/*` 的 `sessionHandler` 豁免是**精确例外**，不要把它扩大成通用免登录模式。
- `egg-audio/plugins/*` 是运行兼容层，不应塞业务逻辑。
- Lightpanda 测试期的 observer/request-header 补丁只属于**浏览器测试 harness**，不要把它们写回业务代码来“迁就浏览器”。
- `frontend/` + `backend/` 仍可作为原型和参考，但不是当前验收主线。
