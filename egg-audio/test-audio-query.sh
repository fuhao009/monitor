#!/bin/bash

# 音频查询脚本
BASE_URL="http://10.0.16.192:7001"

# 登录获取token
TOKEN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"account": "fadmin", "password": "123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

# 查询音频
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "${BASE_URL}/api/audio/list?group_id=343050&start_time=2025-12-06%2022:00:00&end_time=2025-12-07%2010:59:59&current=1&pageSize=1&sort_order=desc" \
  | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2, ensure_ascii=False))"
