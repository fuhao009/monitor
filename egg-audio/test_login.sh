#!/bin/bash

# 设置服务器基本URL
BASE_URL="http://localhost:7001"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # 恢复颜色

echo -e "${YELLOW}开始测试登录接口${NC}"

# 测试登录接口
echo -e "\n${YELLOW}1. 测试正常登录${NC}"
LOGIN_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "account": "test_account",
    "password": "test_password",
    "type": "account"
  }')

echo "$LOGIN_RESPONSE" | json_pp

# 从响应中提取 token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}登录成功! 获取到 Token: $TOKEN${NC}"
  
  # 测试获取用户信息
  echo -e "\n${YELLOW}2. 使用 Token 获取用户信息${NC}"
  USER_INFO_RESPONSE=$(curl -s -X GET \
    "${BASE_URL}/api/auth/user-info" \
    -H "Authorization: $TOKEN")
  
  echo "$USER_INFO_RESPONSE" | json_pp
  
  # 测试登出接口
  echo -e "\n${YELLOW}3. 测试登出接口${NC}"
  LOGOUT_RESPONSE=$(curl -s -X POST \
    "${BASE_URL}/api/auth/logout" \
    -H "Authorization: $TOKEN")
  
  echo "$LOGOUT_RESPONSE" | json_pp
else
  echo -e "${RED}登录失败，未能获取到 Token${NC}"
fi

# 测试错误情况
echo -e "\n${YELLOW}4. 测试账号密码错误${NC}"
curl -s -X POST \
  "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "account": "wrong_account",
    "password": "wrong_password",
    "type": "account"
  }' | json_pp

echo -e "\n${YELLOW}5. 测试缺少参数${NC}"
curl -s -X POST \
  "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "account": "test_account"
  }' | json_pp

echo -e "\n${YELLOW}测试完成${NC}"
