#!/bin/bash

# 基于真实数据的完整 API 测试脚本
# 测试所有功能点

BASE_URL="http://localhost:7001"
TOKEN=""

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
  fi
}

echo "==========================================="
echo "  基于真实数据的 API 完整测试"
echo "==========================================="

#==========================================
# 1. 认证测试
#==========================================
echo -e "\n${BLUE}========== 1. 认证测试 ==========${NC}"

echo -e "\n${YELLOW}[1.1] 超级管理员登录 (fadmin)${NC}"
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"fadmin","password":"123456"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.userInfo.userid')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "Token: ${TOKEN:0:20}..."
  echo "User ID: $USER_ID"
  test_result 0
else
  echo "登录失败"
  test_result 1
  exit 1
fi

echo -e "\n${YELLOW}[1.2] 获取用户信息${NC}"
USER_INFO=$(curl -s "${BASE_URL}/api/user/info?token=${TOKEN}")
ROLE=$(echo "$USER_INFO" | jq -r '.data.role')
echo "角色: $ROLE (0=超管)"
[ "$ROLE" = "0" ] && test_result 0 || test_result 1

#==========================================
# 2. 群组管理测试
#==========================================
echo -e "\n${BLUE}========== 2. 群组管理测试 ==========${NC}"

echo -e "\n${YELLOW}[2.1] 获取群组列表${NC}"
GROUPS=$(curl -s "${BASE_URL}/api/group/list?pageSize=100" \
  -H "Authorization: Bearer ${TOKEN}")
GROUP_TOTAL=$(echo "${GROUPS}" | jq -r '.total // 0')
GROUP_COUNT=$(echo "${GROUPS}" | jq '.data | length')
echo "群组总数: $GROUP_TOTAL (当前页: $GROUP_COUNT)"
[ "$GROUP_TOTAL" -gt 0 ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[2.2] 验证新字段存在${NC}"
HAS_PARENT_ID=$(echo "${GROUPS}" | jq '.data[0] | has("parent_id")')
HAS_TERMINAL=$(echo "${GROUPS}" | jq '.data[0] | has("terminal_accounts")')
HAS_TYPE=$(echo "${GROUPS}" | jq '.data[0] | has("association_type")')
echo "parent_id: $HAS_PARENT_ID"
echo "terminal_accounts: $HAS_TERMINAL"
echo "association_type: $HAS_TYPE"
[[ "$HAS_PARENT_ID" == "true" && "$HAS_TERMINAL" == "true" && "$HAS_TYPE" == "true" ]] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[2.3] 获取树形结构${NC}"
TREE=$(curl -s "${BASE_URL}/api/group/tree" \
  -H "Authorization: Bearer ${TOKEN}")
HAS_CHILDREN=$(echo "$TREE" | jq '.data[0] | has("children")')
echo "树形结构: $HAS_CHILDREN"
[ "$HAS_CHILDREN" = "true" ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[2.4] 创建父群组 (类型1:群组ID)${NC}"
CREATE_PARENT=$(curl -s -X POST "${BASE_URL}/api/group/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "related_group_name": "自动测试父群组",
    "related_group_id": "test_parent_001",
    "association_type": 1,
    "parent_id": null
  }')
PARENT_ID=$(echo "$CREATE_PARENT" | jq -r '.data.id')
echo "创建的父群组 ID: $PARENT_ID"
[ -n "$PARENT_ID" ] && [ "$PARENT_ID" != "null" ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[2.5] 创建子群组 (类型2:终端账号, parent_id=$PARENT_ID)${NC}"
CREATE_CHILD=$(curl -s -X POST "${BASE_URL}/api/group/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"related_group_name\": \"自动测试子群组\",
    \"association_type\": 2,
    \"terminal_accounts\": [\"AUTO001\", \"AUTO002\", \"AUTO003\"],
    \"parent_id\": ${PARENT_ID}
  }")
CHILD_ID=$(echo "$CREATE_CHILD" | jq -r '.data.id')
CHILD_PARENT=$(echo "$CREATE_CHILD" | jq -r '.data.parent_id')
CHILD_TERMINALS=$(echo "$CREATE_CHILD" | jq -r '.data.terminal_accounts')
echo "创建的子群组 ID: $CHILD_ID"
echo "父群组 ID: $CHILD_PARENT"
echo "终端账号: $CHILD_TERMINALS"
[[ "$CHILD_PARENT" == "$PARENT_ID" && "$CHILD_TERMINALS" != "null" ]] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[2.6] 获取子群组列表 (parent_id=$PARENT_ID)${NC}"
DESCENDANTS=$(curl -s "${BASE_URL}/api/group/${PARENT_ID}/descendants" \
  -H "Authorization: Bearer ${TOKEN}")
DESC_COUNT=$(echo "$DESCENDANTS" | jq '.data | length')
echo "子群组数量: $DESC_COUNT"
[ "$DESC_COUNT" -ge 1 ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[2.7] 更新群组信息${NC}"
UPDATE_GROUP=$(curl -s -X PUT "${BASE_URL}/api/group/${PARENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "related_group_name": "自动测试父群组(已更新)"
  }')
UPDATE_SUCCESS=$(echo "$UPDATE_GROUP" | jq -r '.success')
echo "更新结果: $UPDATE_SUCCESS"
[ "$UPDATE_SUCCESS" = "true" ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[2.8] 搜索群组 (关键词: 自动测试)${NC}"
SEARCH=$(curl -s -G "${BASE_URL}/api/group/search" \
  --data-urlencode "keyword=自动测试" \
  -H "Authorization: Bearer ${TOKEN}")
SEARCH_COUNT=$(echo "$SEARCH" | jq '.data | length')
echo "搜索结果: $SEARCH_COUNT 个"
[ "$SEARCH_COUNT" -ge 2 ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[2.9] 获取可见群组 (超管应该看到全部)${NC}"
VISIBLE=$(curl -s "${BASE_URL}/api/group/visible" \
  -H "Authorization: Bearer ${TOKEN}")
VISIBLE_TOTAL=$(echo "${VISIBLE}" | jq -r '.total // 0')
VISIBLE_COUNT=$(echo "${VISIBLE}" | jq '.data | length')
echo "可见群组数: $VISIBLE_TOTAL (返回: $VISIBLE_COUNT)"
[ "$VISIBLE_TOTAL" -gt 10 ] && test_result 0 || test_result 1

#==========================================
# 3. 用户管理测试
#==========================================
echo -e "\n${BLUE}========== 3. 用户管理测试 ==========${NC}"

echo -e "\n${YELLOW}[3.1] 创建用户 (带备注和群组)${NC}"
CREATE_USER=$(curl -s -X POST "${BASE_URL}/api/user/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"account\": \"autotest_$(date +%s)\",
    \"password\": \"Test@123\",
    \"username\": \"自动测试用户\",
    \"role\": 1,
    \"group_list\": [${PARENT_ID}, ${CHILD_ID}],
    \"remark\": \"这是一个自动化测试创建的用户\"
  }")
NEW_USER_ID=$(echo "$CREATE_USER" | jq -r '.data.id')
NEW_USER_REMARK=$(echo "$CREATE_USER" | jq -r '.data.remark')
echo "新用户 ID: $NEW_USER_ID"
echo "备注: $NEW_USER_REMARK"
[[ -n "$NEW_USER_ID" && "$NEW_USER_REMARK" != "null" ]] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[3.2] 查询用户列表 (按角色=1过滤)${NC}"
USER_LIST=$(curl -s "${BASE_URL}/api/user/list?role=1&pageSize=5" \
  -H "Authorization: Bearer ${TOKEN}")
ROLE1_COUNT=$(echo "$USER_LIST" | jq '.data | length')
HAS_REMARK_FIELD=$(echo "$USER_LIST" | jq '.data[0] | has("remark")')
echo "普通用户数: $ROLE1_COUNT"
echo "包含remark字段: $HAS_REMARK_FIELD"
[[ "$ROLE1_COUNT" -gt 0 && "$HAS_REMARK_FIELD" == "true" ]] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[3.3] 查询用户列表 (按角色=0过滤)${NC}"
ADMIN_LIST=$(curl -s "${BASE_URL}/api/user/list?role=0&pageSize=10" \
  -H "Authorization: Bearer ${TOKEN}")
ADMIN_COUNT=$(echo "$ADMIN_LIST" | jq '.data | length')
echo "管理员用户数: $ADMIN_COUNT"
[ "$ADMIN_COUNT" -ge 4 ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[3.4] 更新用户备注${NC}"
UPDATE_USER=$(curl -s -X PUT "${BASE_URL}/api/user/${NEW_USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "remark": "备注已通过API更新 - 测试成功"
  }')
UPDATED_REMARK=$(echo "$UPDATE_USER" | jq -r '.data.remark')
echo "更新后的备注: $UPDATED_REMARK"
[[ "$UPDATED_REMARK" == *"测试成功"* ]] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[3.5] 下载Excel导入模板${NC}"
curl -s "${BASE_URL}/api/user/template" \
  -o "/tmp/real_test_template.xlsx"
TEMPLATE_SIZE=$(stat -c%s "/tmp/real_test_template.xlsx" 2>/dev/null || stat -f%z "/tmp/real_test_template.xlsx" 2>/dev/null)
echo "模板文件大小: $TEMPLATE_SIZE bytes"
[ "$TEMPLATE_SIZE" -gt 1000 ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[3.6] 导出用户列表${NC}"
curl -s "${BASE_URL}/api/user/export?role=1" \
  -o "/tmp/real_test_export.xlsx"
EXPORT_SIZE=$(stat -c%s "/tmp/real_test_export.xlsx" 2>/dev/null || stat -f%z "/tmp/real_test_export.xlsx" 2>/dev/null)
echo "导出文件大小: $EXPORT_SIZE bytes"
[ "$EXPORT_SIZE" -gt 1000 ] && test_result 0 || test_result 1

#==========================================
# 4. 权限控制测试
#==========================================
echo -e "\n${BLUE}========== 4. 权限控制测试 ==========${NC}"

echo -e "\n${YELLOW}[4.1] 创建普通用户账号${NC}"
CREATE_NORMAL=$(curl -s -X POST "${BASE_URL}/api/user/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"account\": \"normal_$(date +%s)\",
    \"password\": \"Test@123\",
    \"username\": \"普通测试用户\",
    \"role\": 1,
    \"group_list\": [13],
    \"remark\": \"用于权限测试的普通用户\"
  }")
NORMAL_USER_ID=$(echo "$CREATE_NORMAL" | jq -r '.data.id')
NORMAL_ACCOUNT=$(echo "$CREATE_NORMAL" | jq -r '.data.account')
echo "普通用户ID: $NORMAL_USER_ID"
echo "账号: $NORMAL_ACCOUNT"
[ -n "$NORMAL_USER_ID" ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[4.2] 普通用户登录${NC}"
NORMAL_LOGIN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"${NORMAL_ACCOUNT}\",\"password\":\"Test@123\"}")
NORMAL_TOKEN=$(echo "$NORMAL_LOGIN" | jq -r '.data.token')
echo "普通用户Token: ${NORMAL_TOKEN:0:20}..."
[ -n "$NORMAL_TOKEN" ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[4.3] 普通用户获取可见群组 (应只看到群组13及其子群组)${NC}"
NORMAL_VISIBLE=$(curl -s "${BASE_URL}/api/group/visible" \
  -H "Authorization: Bearer ${NORMAL_TOKEN}")
NORMAL_VISIBLE_COUNT=$(echo "$NORMAL_VISIBLE" | jq '.data | length')
echo "普通用户可见群组数: $NORMAL_VISIBLE_COUNT"
# 普通用户只能看到自己所属群组
[ "$NORMAL_VISIBLE_COUNT" -lt "$VISIBLE_COUNT" ] && test_result 0 || test_result 1

#==========================================
# 5. 边界情况测试
#==========================================
echo -e "\n${BLUE}========== 5. 边界情况测试 ==========${NC}"

echo -e "\n${YELLOW}[5.1] 搜索不存在的群组${NC}"
NO_RESULT=$(curl -s -G "${BASE_URL}/api/group/search" \
  --data-urlencode "keyword=不存在的群组XXYYZZ" \
  -H "Authorization: Bearer ${TOKEN}")
NO_COUNT=$(echo "$NO_RESULT" | jq '.data | length')
echo "搜索结果: $NO_COUNT"
[ "$NO_COUNT" -eq 0 ] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[5.2] 创建群组缺少必填字段${NC}"
MISSING_FIELD=$(curl -s -X POST "${BASE_URL}/api/group/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "association_type": 1
  }')
ERROR_MSG=$(echo "$MISSING_FIELD" | jq -r '.message')
echo "错误信息: $ERROR_MSG"
[[ "$ERROR_MSG" == *"Validation Failed"* ]] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[5.3] 类型2群组必须提供终端账号${NC}"
NO_TERMINALS=$(curl -s -X POST "${BASE_URL}/api/group/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "related_group_name": "测试类型2验证",
    "association_type": 2
  }')
ERROR_MSG2=$(echo "$NO_TERMINALS" | jq -r '.message')
echo "错误信息: $ERROR_MSG2"
[[ "$ERROR_MSG2" == *"Validation Failed"* ]] && test_result 0 || test_result 1

#==========================================
# 6. 数据一致性测试
#==========================================
echo -e "\n${BLUE}========== 6. 数据一致性测试 ==========${NC}"

echo -e "\n${YELLOW}[6.1] 验证终端账号JSON格式${NC}"
GROUP_17=$(curl -s "${BASE_URL}/api/group/list" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data[] | select(.id == 17)')
TERMINALS_17=$(echo "$GROUP_17" | jq -r '.terminal_accounts')
echo "群组17的终端账号: $TERMINALS_17"
# 应该是JSON数组格式
[[ "$TERMINALS_17" == *"终端001"* ]] && test_result 0 || test_result 1

echo -e "\n${YELLOW}[6.2] 验证群组13关联关系${NC}"
GROUP_13=$(curl -s "${BASE_URL}/api/group/list" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data[] | select(.id == 13)')
TYPE_13=$(echo "$GROUP_13" | jq -r '.association_type')
RELATED_13=$(echo "$GROUP_13" | jq -r '.related_group_id')
echo "群组13类型: $TYPE_13"
echo "关联群组ID: $RELATED_13"
[[ "$TYPE_13" == "1" && "$RELATED_13" == "343050" ]] && test_result 0 || test_result 1

#==========================================
# 7. 清理测试数据
#==========================================
echo -e "\n${BLUE}========== 7. 清理测试数据 ==========${NC}"

echo -e "\n${YELLOW}[7.1] 删除测试用户${NC}"
DELETE_USER1=$(curl -s -X DELETE "${BASE_URL}/api/user/${NEW_USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
DELETE_USER2=$(curl -s -X DELETE "${BASE_URL}/api/user/${NORMAL_USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
echo "删除用户 $NEW_USER_ID: $(echo $DELETE_USER1 | jq -r '.success')"
echo "删除用户 $NORMAL_USER_ID: $(echo $DELETE_USER2 | jq -r '.success')"
test_result 0

echo -e "\n${YELLOW}[7.2] 删除测试群组${NC}"
DELETE_CHILD=$(curl -s -X DELETE "${BASE_URL}/api/group/${CHILD_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
DELETE_PARENT=$(curl -s -X DELETE "${BASE_URL}/api/group/${PARENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
echo "删除子群组 $CHILD_ID: $(echo $DELETE_CHILD | jq -r '.success')"
echo "删除父群组 $PARENT_ID: $(echo $DELETE_PARENT | jq -r '.success')"
test_result 0

#==========================================
# 测试总结
#==========================================
echo -e "\n${BLUE}==========================================${NC}"
echo -e "${BLUE}  测试完成${NC}"
echo -e "${BLUE}==========================================${NC}"
TOTAL=$((PASSED + FAILED))
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo -e "总计: $TOTAL"
echo -e "通过率: $(awk "BEGIN {printf \"%.1f%%\", ($PASSED/$TOTAL)*100}")"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 所有测试通过!${NC}"
  exit 0
else
  echo -e "\n${RED}⚠️  有 $FAILED 个测试失败${NC}"
  exit 1
fi
