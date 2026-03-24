---
name: monitor-console-page-testing
description: Project-specific page QA workflow for the monitor-console app. Use when you need to verify the formal `web-audio` pages, run the stable preview, execute the real Chrome route suite, and perform per-page browser checks with agent-browser.
---

# monitor-console 页面测试 Skill

这个 skill 专门用于当前项目 `/data/yunwei-manager/monitor-console` 的页面测试。

它的目标不是泛泛“看一下页面”，而是固定一套**可复用、可追溯、可落报告**的页面验收流程。

## 适用场景

当你需要做以下任一工作时，使用这个 skill：

- 验证 `web-audio` 当前正式页面是否都能打开
- 做真实浏览器页面验收
- 启动稳定预览入口供人工验收
- 重新生成页面测试报告
- 用 `agent-browser` 对正式页面逐页访问验证

## 当前正式页面范围

说明：

- `/user/login`` 是前置登录页，属于验收入口，但不计入“21 个已登录正式页面”。
- “21 个正式页面”指登录后可访问的正式运维页面。

### 前置登录页

- `/user/login`

### 21 个正式运维页面

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

旧业务路径 `/welcome` `/group` `/list` `/audio` `/file` 不是正式页面；当前应验为 404。

## 测试基线

### 1. 稳定预览入口

优先使用稳定预览，而不是不稳定的开发态：

```bash
cd /data/yunwei-manager/monitor-console/web-audio
npm run build
env MANUAL_API_ORIGIN=http://127.0.0.1:7001 MANUAL_PREVIEW_HOST=0.0.0.0 MANUAL_PREVIEW_PORT=8012 node tests/e2e/manual-preview-server.mjs
```

### 2. 路由与功能主验收

主验收入口：

```bash
cd /data/yunwei-manager/monitor-console/web-audio
npm run test:e2e:pages
```

这会做：

- 生产构建
- 启动临时预览
- 真实登录
- 正式页面路由校验
- `/monitor` 关键功能交互校验
- 输出报告到：
  - `web-audio/tests/e2e/artifacts/chrome-pages-smoke-report.json`

### 3. skill 级浏览器逐页验证

当前 root 环境下，浏览器需要加 `--no-sandbox`：

```bash
agent-browser --session monitorqa --args "--no-sandbox" open http://127.0.0.1:8012/user/login
```

登录流程：

```bash
agent-browser --session monitorqa snapshot
agent-browser --session monitorqa fill '#username' 'admin'
agent-browser --session monitorqa fill '#password' '123456'
agent-browser --session monitorqa click @e2
agent-browser --session monitorqa wait 3000
agent-browser --session monitorqa get url
agent-browser --session monitorqa get title
```

逐页访问时，至少记录：

- path
- finalPath
- title
- expected text 是否命中

输出报告建议写到：

- `web-audio/tests/e2e/artifacts/agent-browser-pages-report.json`

每页至少记录：

- `path`
- `finalPath`
- `title`
- `titleMatches`
- `containsExpectedText`

## 推荐验收顺序

1. 后端是否可用

```bash
curl http://127.0.0.1:7001/api/monitor/healthz
```

2. 前端稳定预览是否可用

```bash
curl http://127.0.0.1:8012/user/login
curl http://127.0.0.1:8012/
```

3. 跑主页面验收脚本

```bash
cd /data/yunwei-manager/monitor-console/web-audio
npm run test:e2e:pages
```

4. 用 `agent-browser` 逐页再验一次正式页面

5. 如涉及接口能力更新，再补接口级 QA：

```bash
python3 - <<'PY'
import json, urllib.request
login_req = urllib.request.Request(
    'http://127.0.0.1:7001/api/auth/login',
    data=json.dumps({'account':'admin','password':'123456'}).encode(),
    headers={'Content-Type':'application/json'},
    method='POST',
)
with urllib.request.urlopen(login_req, timeout=20) as resp:
    login_data = json.load(resp)
token = login_data['data']['token']
req = urllib.request.Request(
    'http://127.0.0.1:7001/api/monitor/dashboard',
    headers={'Authorization': f'Bearer {token}'},
    method='GET',
)
with urllib.request.urlopen(req, timeout=20) as resp:
    payload = json.load(resp)
print(json.dumps(payload, ensure_ascii=False)[:2000])
PY
```

## 验收标准

页面测试完成，至少要同时满足：

1. `npm run test:e2e:pages` 通过
2. `chrome-pages-smoke-report.json` 中无失败路由
3. `agent-browser` 对 21 个正式运维页面访问成功
4. 如有新增接口字段，接口级 QA 能看到真实返回
5. 结果写回项目知识：
   - `AGENTS.md`
   - `清单.md`
   - 记忆文件

## 常见问题

### Playwright MCP 在 root 下因为 sandbox 失败

优先改走：

- 仓库自带 `npm run test:e2e:pages`
- `agent-browser --args "--no-sandbox"`

### 页面刚打开内容为空

SPA 页面经常要等一小段时间：

```bash
agent-browser --session monitorqa wait 3000
agent-browser --session monitorqa snapshot -i -C
```

### 旧页面路径如何判定

以下不是正式页面：

- `/welcome`
- `/group`
- `/list`
- `/audio`
- `/file`

它们当前应为 404，而不是回跳 `/monitor`。

## 参考资料

- `references/formal-pages.md`
- `templates/verify-formal-pages.sh`
