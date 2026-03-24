#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8012}"
SESSION_NAME="${AGENT_BROWSER_SESSION_NAME:-monitorqa}"
export BASE_URL SESSION_NAME

agent-browser --session "$SESSION_NAME" --args "--no-sandbox" open "$BASE_URL/user/login"
agent-browser --session "$SESSION_NAME" fill '#username' 'admin'
agent-browser --session "$SESSION_NAME" fill '#password' '123456'
agent-browser --session "$SESSION_NAME" find role button click --name "Login"
agent-browser --session "$SESSION_NAME" wait 3000

python3 - <<'PY'
import json, os, subprocess

base_url = os.environ.get('BASE_URL', 'http://127.0.0.1:8012')
session = os.environ.get('SESSION_NAME', 'monitorqa')
routes = [
    ('/monitor', 'Monitor - 沪杭甬运维控制台', '运维控制台'),
    ('/hosts', 'Hosts - 沪杭甬运维控制台', '查看所有节点的健康状态'),
    ('/hosts/egg-api', 'Host Detail - 沪杭甬运维控制台', '查看单台主机的实时资源'),
    ('/services', 'Services - 沪杭甬运维控制台', '查看服务健康'),
    ('/services/audio', 'Service Detail - 沪杭甬运维控制台', '查看单个服务的状态'),
    ('/databases', 'Databases - 沪杭甬运维控制台', '查看数据库连接'),
    ('/storage', 'Storage - 沪杭甬运维控制台', '查看文件服务探针'),
    ('/topology', 'Topology - 沪杭甬运维控制台', '查看节点关系'),
    ('/alerts', 'Alerts - 沪杭甬运维控制台', '集中查看当前活动告警'),
    ('/alerts/history', 'Alert History - 沪杭甬运维控制台', '查看最近告警事件'),
    ('/events', 'Events - 沪杭甬运维控制台', '查看最近系统事件'),
    ('/logs/live', 'Live Logs - 沪杭甬运维控制台', '查看当前监控快照生成的最近日志流'),
    ('/logs/search', 'Search Logs - 沪杭甬运维控制台', '按关键字过滤当前监控日志'),
    ('/diagnostics', 'Diagnostics - 沪杭甬运维控制台', '查看当前风险来源'),
    ('/metrics', 'Metrics - 沪杭甬运维控制台', '查看关键指标的趋势摘要'),
    ('/reports/availability', 'Availability Report - 沪杭甬运维控制台', '查看各服务当前可用率评估'),
    ('/reports/capacity', 'Capacity Report - 沪杭甬运维控制台', '查看容量使用率'),
    ('/settings/monitor', 'Monitor Settings - 沪杭甬运维控制台', '查看当前轮询'),
    ('/settings/notifications', 'Notification Settings - 沪杭甬运维控制台', '查看当前通知通道'),
    ('/settings/datasources', 'Datasource Settings - 沪杭甬运维控制台', '查看当前探针目标'),
    ('/settings/users', 'Users & Access - 沪杭甬运维控制台', '查看当前操作者权限范围'),
]

results = []
for path, expected_title, expected_text in routes:
    subprocess.run(['agent-browser', '--session', session, 'open', base_url + path], check=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    final_url = subprocess.run(['agent-browser', '--session', session, 'get', 'url'], check=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True).stdout.strip()
    title = subprocess.run(['agent-browser', '--session', session, 'get', 'title'], check=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True).stdout.strip()
    body_text = subprocess.run(['agent-browser', '--session', session, 'get', 'text', 'body'], check=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True).stdout
    results.append({
        'path': path,
        'finalPath': final_url.replace(base_url, ''),
        'title': title,
        'titleMatches': title == expected_title,
        'containsExpectedText': expected_text in body_text,
    })

print(json.dumps(results, ensure_ascii=False, indent=2))
PY
