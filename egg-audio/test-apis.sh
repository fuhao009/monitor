#!/bin/bash

# API 测试脚本
# 测试群组和用户管理的所有新增 API

BASE_URL="http://192.168.66.192:7001"
TOKEN=""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  API 测试开始"
echo "========================================="

# 1. 登录获取 token
echo -e "\n${YELLOW}[1] 测试登录获取 token${NC}"
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"fadmin","password":"123456"}')

echo "$LOGIN_RESPONSE" | jq .

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}登录失败,无法获取 token!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 登录成功,Token: ${TOKEN}${NC}"

#==========================================
# 音频录音 API 测试
#==========================================

echo -e "\n${YELLOW}=========================================${NC}"
echo -e "${YELLOW}  音频录音 API 测试${NC}"
echo -e "${YELLOW}=========================================${NC}"

# 音频列表查询（基础）
echo -e "\n${YELLOW}[A1] 测试获取音频列表（基础查询）${NC}"
curl -s -G "${BASE_URL}/api/audio/list" \
  --data-urlencode "group_id=343050" \
  --data-urlencode "start_time=2025-12-07 00:00:00" \
  --data-urlencode "end_time=2025-12-07 23:59:59" \
  --data-urlencode "current=1" \
  --data-urlencode "pageSize=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

# 音频列表查询（带用户过滤）
echo -e "\n${YELLOW}[A2] 测试获取音频列表（用户过滤：杭北21,杭北44）${NC}"
curl -s -G "${BASE_URL}/api/audio/list" \
  --data-urlencode "group_id=343050" \
  --data-urlencode "start_time=2025-12-07 00:00:00" \
  --data-urlencode "end_time=2025-12-07 23:59:59" \
  --data-urlencode "current=1" \
  --data-urlencode "pageSize=5" \
  --data-urlencode "user_account=杭北21,杭北44" \
  --data-urlencode "sort_order=desc" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

# 音频列表查询（升序排序）
echo -e "\n${YELLOW}[A3] 测试获取音频列表（升序排序）${NC}"
curl -s -G "${BASE_URL}/api/audio/list" \
  --data-urlencode "group_id=343050" \
  --data-urlencode "start_time=2025-12-07 00:00:00" \
  --data-urlencode "end_time=2025-12-07 23:59:59" \
  --data-urlencode "current=1" \
  --data-urlencode "pageSize=5" \
  --data-urlencode "sort_order=asc" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

#==========================================
# 群组相关 API 测试
#==========================================

echo -e "\n${YELLOW}=========================================${NC}"
echo -e "${YELLOW}  群组管理 API 测试${NC}"
echo -e "${YELLOW}=========================================${NC}"

# 2. 获取群组列表
echo -e "\n${YELLOW}[2] 测试获取群组列表${NC}"
curl -s "${BASE_URL}/api/group/list" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

# 3. 获取树形群组列表
echo -e "\n${YELLOW}[3] 测试获取树形群组列表${NC}"
curl -s "${BASE_URL}/api/group/tree" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

# 4. 创建层级群组(使用群组ID关联)
echo -e "\n${YELLOW}[4] 测试创建层级群组(关联类型1:群组ID)${NC}"
CREATE_GROUP1=$(curl -s -X POST "${BASE_URL}/api/group/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "related_group_name": "测试父群组A",
    "related_group_id": "36001",
    "association_type": 1,
    "parent_id": null
  }')

echo "$CREATE_GROUP1" | jq '.'
PARENT_GROUP_ID=$(echo "$CREATE_GROUP1" | jq -r '.data.data.id')
echo -e "${GREEN}✓ 创建父群组 ID: ${PARENT_GROUP_ID}${NC}"

# 5. 创建子群组(使用终端账号关联)
echo -e "\n${YELLOW}[5] 测试创建子群组(关联类型2:终端账号)${NC}"
CREATE_GROUP2=$(curl -s -X POST "${BASE_URL}/api/group/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"related_group_name\": \"测试子群组B\",
    \"association_type\": 2,
    \"terminal_accounts\": [\"终端001\", \"终端002\"],
    \"parent_id\": ${PARENT_GROUP_ID}
  }")

echo "$CREATE_GROUP2" | jq '.'
CHILD_GROUP_ID=$(echo "$CREATE_GROUP2" | jq -r '.data.data.id')
echo -e "${GREEN}✓ 创建子群组 ID: ${CHILD_GROUP_ID}${NC}"

# 6. 获取子群组列表
if [ -n "$PARENT_GROUP_ID" ] && [ "$PARENT_GROUP_ID" != "null" ]; then
  echo -e "\n${YELLOW}[6] 测试获取子群组列表${NC}"
  curl -s "${BASE_URL}/api/group/${PARENT_GROUP_ID}/descendants" \
    -H "Authorization: Bearer ${TOKEN}" | jq '.'
fi

# 7. 更新群组
if [ -n "$PARENT_GROUP_ID" ] && [ "$PARENT_GROUP_ID" != "null" ]; then
  echo -e "\n${YELLOW}[7] 测试更新群组${NC}"
  curl -s -X PUT "${BASE_URL}/api/group/${PARENT_GROUP_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "related_group_name": "测试父群组A(已更新)"
    }' | jq '.'
fi

# 8. 搜索群组
echo -e "\n${YELLOW}[8] 测试搜索群组${NC}"
curl -s -G "${BASE_URL}/api/group/search" \
  --data-urlencode "keyword=测试" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

# 9. 获取可见群组
echo -e "\n${YELLOW}[9] 测试获取可见群组${NC}"
curl -s "${BASE_URL}/api/group/visible" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

#==========================================
# 用户相关 API 测试
#==========================================

echo -e "\n${YELLOW}=========================================${NC}"
echo -e "${YELLOW}  用户管理 API 测试${NC}"
echo -e "${YELLOW}=========================================${NC}"

# 10. 创建用户(带备注)
echo -e "\n${YELLOW}[10] 测试创建用户(带备注)${NC}"
CREATE_USER=$(curl -s -X POST "${BASE_URL}/api/user/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"account\": \"testuser$(date +%s)\",
    \"password\": \"123456\",
    \"username\": \"测试用户\",
    \"role\": 1,
    \"group_list\": [${PARENT_GROUP_ID}],
    \"remark\": \"这是一个测试用户备注\"
  }")

echo "$CREATE_USER" | jq '.'
TEST_USER_ID=$(echo "$CREATE_USER" | jq -r '.data.id')
echo -e "${GREEN}✓ 创建用户 ID: ${TEST_USER_ID}${NC}"

# 11. 获取用户列表(带角色过滤)
echo -e "\n${YELLOW}[11] 测试获取用户列表(按角色过滤)${NC}"
curl -s "${BASE_URL}/api/user/list?current=1&pageSize=5&role=1" | jq '.'

# 12. 更新用户(更新备注)
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
  echo -e "\n${YELLOW}[12] 测试更新用户备注${NC}"
  curl -s -X PUT "${BASE_URL}/api/user/${TEST_USER_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "remark": "备注已更新"
    }' | jq '.'
fi

# 13. 下载导入模板
echo -e "\n${YELLOW}[13] 测试下载用户导入模板${NC}"
curl -s "${BASE_URL}/api/user/template" \
  -o "/tmp/user_template.xlsx"

if [ -f "/tmp/user_template.xlsx" ]; then
  FILE_SIZE=$(stat -c%s "/tmp/user_template.xlsx" 2>/dev/null || stat -f%z "/tmp/user_template.xlsx" 2>/dev/null)
  echo -e "${GREEN}✓ 模板下载成功,文件大小: ${FILE_SIZE} bytes${NC}"
else
  echo -e "${RED}✗ 模板下载失败${NC}"
fi

# 14. 导出用户
echo -e "\n${YELLOW}[14] 测试导出用户列表${NC}"
curl -s "${BASE_URL}/api/user/export" \
  -o "/tmp/users_export.xlsx"

if [ -f "/tmp/users_export.xlsx" ]; then
  FILE_SIZE=$(stat -c%s "/tmp/users_export.xlsx" 2>/dev/null || stat -f%z "/tmp/users_export.xlsx" 2>/dev/null)
  echo -e "${GREEN}✓ 导出成功,文件大小: ${FILE_SIZE} bytes${NC}"
else
  echo -e "${RED}✗ 导出失败${NC}"
fi

#==========================================
# 清理测试数据
#==========================================

echo -e "\n${YELLOW}=========================================${NC}"
echo -e "${YELLOW}  清理测试数据${NC}"
echo -e "${YELLOW}=========================================${NC}"

# 删除测试用户
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
  echo -e "\n${YELLOW}[15] 删除测试用户${NC}"
  curl -s -X DELETE "${BASE_URL}/api/user/${TEST_USER_ID}" \
    -H "Authorization: Bearer ${TOKEN}" | jq '.'
fi

# 删除测试群组
if [ -n "$CHILD_GROUP_ID" ] && [ "$CHILD_GROUP_ID" != "null" ]; then
  echo -e "\n${YELLOW}[16] 删除测试子群组${NC}"
  curl -s -X DELETE "${BASE_URL}/api/group/${CHILD_GROUP_ID}" \
    -H "Authorization: Bearer ${TOKEN}" | jq '.'
fi

if [ -n "$PARENT_GROUP_ID" ] && [ "$PARENT_GROUP_ID" != "null" ]; then
  echo -e "\n${YELLOW}[17] 删除测试父群组${NC}"
  curl -s -X DELETE "${BASE_URL}/api/group/${PARENT_GROUP_ID}" \
    -H "Authorization: Bearer ${TOKEN}" | jq '.'
fi

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}  所有 API 测试完成!${NC}"
echo -e "${GREEN}=========================================${NC}"
