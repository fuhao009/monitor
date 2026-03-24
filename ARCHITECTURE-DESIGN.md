# monitor-console 前后端增量设计方案

## 1. 设计目标

基于当前已可运行的单页监控台，继续做 **增量式前后端演进**，而不是推倒重来。

本轮设计默认目标：

- 保持当前单页 dashboard 形态
- 保持前端轮询 + 后端 `net/http` 的简单架构
- 为后续告警、趋势、诊断建议、处理反馈等能力预留扩展位
- 让接口契约、前端状态边界、后端服务边界先稳定下来，再逐步加功能

本轮默认不做：

- 登录与权限系统
- 数据库持久化改造
- WebSocket / SSE 实时推送
- 多页面路由化重构
- 微服务拆分

## 2. 当前基线

### 前端基线

当前前端结构是：

- `frontend/src/main.tsx`：React 启动入口
- `frontend/src/App.tsx`：仅渲染 dashboard 页面
- `frontend/src/pages/dashboard/index.tsx`：页面编排层，负责数据消费、模式切换、筛选、选中态、错误与加载态
- `frontend/src/hooks/useDashboardPolling.ts`：唯一异步拉取入口，每 3 秒轮询一次 `/api/dashboard`
- `frontend/src/services/dashboard.ts`：dashboard API 封装
- `frontend/src/types/dashboard.ts`：前端契约类型中心
- `frontend/src/pages/dashboard/components/*`：大多为展示组件

这意味着前端已经天然形成了一个清晰边界：

- **容器层**：`pages/dashboard/index.tsx`
- **数据层**：`hooks + services + types`
- **展示层**：`components/*`

### 后端基线

当前后端结构是：

- `backend/cmd/server/main.go`：启动 HTTP 服务
- `backend/internal/http/router.go`：路由注册，当前只有 `GET /api/healthz` 与 `GET /api/dashboard`
- `backend/internal/http/dashboard_handler.go`：HTTP handler，直接调用 service 并返回 JSON
- `backend/internal/dashboard/model.go`：dashboard 返回模型
- `backend/internal/dashboard/seed.go`：种子数据
- `backend/internal/dashboard/service.go`：快照生成、动态指标扰动、日志追加、聚合计算

这意味着后端当前也有一个简单但稳定的分层：

- **传输层**：`internal/http`
- **领域层**：`internal/dashboard`
- **数据源**：当前由 `seed.go` 提供内存种子数据

## 3. 目标架构原则

后续演进遵循以下原则：

1. **先稳契约，再扩功能**：所有新增能力先落到 `contracts/` 与前后端类型定义。
2. **容器继续集中，组件继续纯展示**：避免把业务状态散落到多个组件。
3. **后端保持薄 handler、厚 service**：HTTP 层只做参数解析、调用与响应格式化。
4. **先模块内分层，再考虑新增模块**：在没有真实持久化和复杂权限前，不引入过重抽象。
5. **优先面向“监控场景”设计**：告警、趋势、诊断、处置比通用后台能力更优先。

## 4. 前端设计

### 4.1 前端目标分层

建议保持现有目录主干，并在 dashboard 下做“按能力扩展”：

```text
frontend/src/
├── pages/dashboard/
│   ├── index.tsx                # 页面容器，继续负责组合与全局页面状态
│   ├── components/              # 纯展示组件
│   ├── panels/                  # 新增：较重的业务面板组合
│   └── view-models/             # 新增：派生数据转换逻辑
├── hooks/
│   ├── useDashboardPolling.ts
│   ├── useDashboardFilters.ts   # 新增：筛选/排序/联动
│   └── useDashboardSelection.ts # 新增：选中态与 drill-down
├── services/
│   ├── http.ts
│   ├── dashboard.ts
│   └── alerts.ts                # 后续按模块增加
└── types/
    ├── dashboard.ts
    └── alert.ts                 # 后续按模块拆分
```

这里的关键不是马上把文件拆很多，而是明确后续职责：

- `index.tsx` 继续做页面编排，不直接承载越来越多的数据清洗逻辑
- 复杂派生逻辑下沉到 `view-models/`
- 页面交互状态下沉到 `hooks/`
- API 契约按业务域拆分到 `types/` 与 `services/`

### 4.2 页面能力分区

当前页面已经具备 5 个稳定区域，建议后续继续沿这些区域扩展：

1. **顶部 Header**
   - 当前承载标题、子标题、实时时钟
   - 后续可增加：环境标签、最后更新时间、刷新状态、全局告警数

2. **左侧集群区**
   - 当前承载服务器列表与汇总
   - 后续可增加：按集群/机房/标签分组、关键字搜索、状态快捷筛选

3. **中部工作区**
   - 当前支持 topology / list 双模式
   - 后续建议扩展为三态：`topology | list | trends`
   - `trends` 用于承载趋势图、容量变化、时延曲线

4. **底部详情区**
   - 当前展示单台服务器详情
   - 后续可扩展为 Tab 容器：`指标`、`磁盘`、`网络`、`告警`、`诊断建议`

5. **右侧日志区**
   - 当前展示实时日志
   - 后续可增加：日志级别过滤、来源过滤、复制、展开查看、关联服务器定位

### 4.3 状态管理策略

当前 `index.tsx` 中直接维护：

- `selectedId`
- `mode`
- `filter`
- `clock`

设计上建议拆为三类状态：

- **服务端状态**：`data / loading / error / stale`
- **页面交互状态**：`selectedId / mode / filter / sort / expandedPanels`
- **派生展示状态**：`visibleServers / visibleConnections / selectedServer / alertCounts`

建议新增 `stale` 概念：

- 最近一次轮询失败时，不清空上一次成功数据
- 页面维持旧数据展示，并在顶部显示“数据已过期”提示
- 这样比直接进入错误页更贴近监控台场景

### 4.4 前端 API 层设计

当前只有 `fetchDashboard()`，后续按能力拆成明确接口：

- `fetchDashboardOverview()`：首页主快照
- `fetchServerDetail(serverId)`：按服务器拉详情
- `fetchAlerts(query)`：告警列表
- `fetchLogs(query)`：日志查询
- `fetchTrendSeries(target, range)`：趋势数据

初期可以仍由一个 `/api/dashboard` 返回大对象，但设计上要为拆分预留余地。

换句话说：

- **UI 可以先不拆接口**
- **契约与 service 命名先按未来能力边界设计**

### 4.5 前端交互与异常态设计

需要统一处理以下状态：

- 首次加载：全屏 `Spin`
- 刷新中：局部轻提示，不阻断页面
- 刷新失败但有旧数据：显示 `stale` 提示条
- 空数据：使用 `Empty` 组件，而不是空白区域
- 局部异常：面板级 `Alert`，而不是全页崩掉

这部分是后续前端设计最值得优先补强的地方，因为它直接影响监控台的可用性。

## 5. 后端设计

### 5.1 后端目标分层

建议保持当前包结构，同时按能力增加并列领域模块：

```text
backend/internal/
├── http/
│   ├── router.go
│   ├── dashboard_handler.go
│   ├── alert_handler.go         # 新增
│   ├── log_handler.go           # 新增
│   └── trend_handler.go         # 新增
├── dashboard/
│   ├── model.go
│   ├── service.go
│   └── seed.go
├── alert/                       # 新增模块
├── logquery/                    # 新增模块
└── trend/                       # 新增模块
```

这里的核心约束是：

- `internal/http` 只负责编排 HTTP
- 各业务域自己拥有 `model + service`
- 在真实数据源进入前，不急着引入 repository 抽象

### 5.2 先引入 API DTO，再扩接口

Oracle 校验后，这里有一个需要提前落实的约束：

- 当前 `dashboard_handler.go` 直接把 `service.Snapshot()` 的结果编码成 JSON
- 这在当前阶段足够简单，但一旦接口增长，**内部领域模型会直接变成外部 API 契约**

因此后续新增能力前，建议先明确 DTO 层：

- `internal/dashboard/model.go`：保留领域内部模型
- `internal/http`：定义响应 DTO 或转换函数
- handler 负责把 service 返回值转换为稳定的 API 输出结构

这样做的价值是：

- `seed.go` 与领域内部结构可以调整
- 前端契约不会因为后端内部重构而被动漂移
- 后续做字段兼容、可选字段、灰度开关会更容易

### 5.3 API 演进路线

建议把接口分成两层：

#### 第一层：保留现有 dashboard 聚合接口

- `GET /api/dashboard`

作用：继续服务首页首屏，降低前端首屏拼装成本。

#### 第二层：新增能力化子接口

- `GET /api/servers/{id}`：单机详情
- `GET /api/alerts`：告警列表与筛选
- `GET /api/logs`：日志检索
- `GET /api/trends`：时序趋势

这样做的好处：

- 首屏仍然简单
- 新能力不会持续把 `/api/dashboard` 做成无限膨胀的大对象
- 前后端都能围绕业务模块演进

### 5.4 服务层职责

当前 `dashboard.Service.Snapshot(now)` 已经在做 4 件事：

- 读取种子数据
- 生成动态指标
- 重新汇总 summary
- 追加实时日志

后续建议把职责显式化：

- `SnapshotBuilder`：构建首页快照
- `MetricSimulator`：当前阶段仍可保留模拟器职责
- `SummaryCalculator`：汇总指标计算
- `LogFeedService`：日志流/日志列表

初期不一定要拆成独立文件，但编码职责上要朝这个方向靠拢，避免 `service.go` 继续无限增长。

### 5.5 请求参数与错误模型

当前 handler 基本没有参数解析，也没有错误模型。

后续新增接口时统一约定：

- 列表类接口支持 `page`、`pageSize`、`status`、`keyword`、`range`
- 明确返回错误结构：

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "range is invalid"
  }
}
```

这样前端可以稳定处理提示，而不是靠字符串判断。

### 5.6 数据源演进策略

当前数据源来自 `seed.go`，这对设计阶段是合理的。

后续建议按三步演进：

1. **阶段一：继续使用 seed + 模拟计算**
   - 目标是把 UI 和 API 边界稳定下来

2. **阶段二：只有在真实数据源接入前夕，再引入 repository 接口，但仍可由内存实现**
   - 例如：`ServerRepository`、`AlertRepository`

3. **阶段三：再接真实采集源/持久化层**
   - 避免现在为了未来不确定数据源做过度设计

## 6. 契约设计建议

建议保留当前 `contracts/dashboard.example.json`，并继续把 `contracts/` 当作跨端协作层。

后续新增示例：

- `contracts/alerts.example.json`
- `contracts/server-detail.example.json`
- `contracts/trends.example.json`

### 6.1 dashboard 契约建议新增字段

在不破坏当前结构的前提下，可以逐步增加：

- `alertsSummary`
  - `critical`
  - `warning`
  - `acknowledged`
- `refresh`
  - `intervalSeconds`
  - `staleAfterSeconds`
  - `lastSuccessAt`
- `capabilities`
  - `alerts`
  - `trends`
  - `diagnostics`

这样前端可以根据后端能力开关做渐进展示。

## 7. 分阶段落地计划

### Phase 0：冻结设计与契约

- 明确首页仍为单页
- 明确首批能力：告警摘要、趋势入口、详情增强、日志筛选
- 确定新增 JSON 示例文件

### Phase 1：后端先补契约与测试

- 为新增接口写 handler/service 测试
- 为 dashboard 新增字段写契约测试
- 保持 `GET /api/dashboard` 兼容

### Phase 2：后端实现能力边界

- 新增 `alert`、`trend`、`logquery` 域服务
- 增加路由与 handler
- 在不引入数据库的前提下，继续用内存/seed 数据支撑

### Phase 3：前端更新数据层

- 扩展 `types/`
- 扩展 `services/`
- 优化 `useDashboardPolling()`，加入 `stale` 与刷新状态

### Phase 4：前端页面增强

- 增加趋势模式
- 增强详情区 Tab
- 增加日志筛选与告警摘要

### Phase 5：联调与验收

- 验证 dashboard 首屏
- 验证接口错误态
- 验证轮询失败后的降级展示
- 验证筛选、切换、详情联动

## 8. 测试与验收策略

### 后端

优先补齐：

- handler 层状态码与 JSON 结构测试
- service 层 summary、trend、alert 计算测试
- 契约级快照测试

### 前端

优先补齐：

- `useDashboardPolling()` 的轮询、失败、stale 状态测试
- dashboard 容器页的模式切换、筛选、选中联动测试
- 新增面板组件的展示测试

### 核心验收标准

1. 首屏接口仍然稳定返回
2. 前端在轮询失败时不丢失最后一次成功数据
3. 告警、趋势、日志能力均可按模块增量接入
4. 新增接口不会反向污染现有 `dashboard` handler

## 9. 当前最值得优先做的第一批功能

如果现在就进入实现，建议按这个顺序做：

1. **dashboard 刷新状态增强**
   - 加 `stale`、`lastSuccessAt`、顶部状态提示

2. **告警摘要能力**
   - 先在 `/api/dashboard` 增加 `alertsSummary`
   - 前端顶部或中部总览先消费摘要，不急着先做完整告警页

3. **详情区增强**
   - 在 `ServerDetailPanel` 扩展为 Tab 化结构

4. **趋势模式入口**
   - 先做占位 view，再补真实趋势数据接口

这样能以最小结构变动，明显提升产品完成度。

## 10. 结论

这套系统最合适的演进方式不是“先上复杂基础设施”，而是：

- 保持当前单页 + 轮询 + 聚合接口的简单主干
- 前端把容器层、派生层、展示层边界继续拉清
- 后端把 handler 与 domain 的职责继续拆清
- 用契约文件驱动前后端协同
- 先把告警、趋势、详情、日志筛选这四类监控核心能力做出来

这会比提前引入路由重构、实时推送、数据库抽象更适合当前仓库阶段。
