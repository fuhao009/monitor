#!/bin/bash

# 音频API测试脚本
# 使用方法: ./test-audio-api.sh

BASE_URL="http://10.0.16.192:7001"
ACCOUNT="fadmin"
PASSWORD="123456"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}  步骤 1: 登录认证${NC}"
echo -e "${YELLOW}=========================================${NC}"

# 登录获取token
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"account\": \"${ACCOUNT}\", \"password\": \"${PASSWORD}\"}")

echo "登录响应: $LOGIN_RESPONSE"

# 提取token
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ 登录失败，无法获取token${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 登录成功，Token: ${TOKEN}${NC}"

echo ""
echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}  步骤 2: 查询音频数据${NC}"
echo -e "${YELLOW}=========================================${NC}"

# 查询音频
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "${BASE_URL}/api/audio/list?group_id=343050&start_time=2025-12-06%2000:00:00&end_time=2025-12-06%2023:59:59&current=1&pageSize=10&sort_order=desc" \
  | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2, ensure_ascii=False))" 2>/dev/null

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  测试完成${NC}"
echo -e "${GREEN}=========================================${NC}"
