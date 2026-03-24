#!/bin/bash

BASE_URL="https://api.smart-ptt.com"
ACCOUNT="gsgl"
PASSWORD="Hhy8649116"

echo "=========================================="
echo "步骤 1: 获取 random 和 sessionId"
echo "=========================================="

RANDOM_RESPONSE=$(curl -s -c cookies.txt -b cookies.txt "${BASE_URL}/ptt/random")
RANDOM_VALUE=$(echo "$RANDOM_RESPONSE" | grep -oP '"random"\s*:\s*"\K[^"]+')
SESSION_ID=$(echo "$RANDOM_RESPONSE" | grep -oP '"sessionId"\s*:\s*"\K[^"]+')

if [ -z "$RANDOM_VALUE" ]; then
    echo "错误: 无法获取 random 值"
    exit 1
fi
echo "Random: $RANDOM_VALUE"

echo ""
echo "=========================================="
echo "步骤 2: 登录"
echo "=========================================="

SHA1_PASSWORD=$(echo -n "$PASSWORD" | sha1sum | cut -d' ' -f1)
ENCRYPTED_PASSWORD=$(echo -n "$SHA1_PASSWORD" | openssl dgst -sha1 -hmac "$RANDOM_VALUE" | cut -d' ' -f2)

LOGIN_RESPONSE=$(curl -s -c cookies.txt -b cookies.txt \
    "${BASE_URL}/ptt/organization?method=login&account=${ACCOUNT}&pwd=${ENCRYPTED_PASSWORD}&timeZoneOffset=-480")

LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | grep -oP '"code"\s*:\s*\K[0-9]+')
echo "登录状态: code=$LOGIN_CODE"

echo ""
echo "=========================================="
echo "步骤 3: 测试不同日期的数据量 (group_id=343050)"
echo "=========================================="

# 测试多个不同日期
DATES=(
    "2025-12-01"
    "2025-12-02"
    "2025-12-03"
    "2025-12-04"
    "2025-12-05"
    "2025-12-06"
    "2025-12-07"
)

for DATE in "${DATES[@]}"; do
    START_TIME="${DATE}%2000:00:00"
    END_TIME="${DATE}%2023:59:59"
    
    RESPONSE=$(curl -s -c cookies.txt -b cookies.txt \
        "${BASE_URL}/ptt/audio?method=get&group_id=343050&start_time=${START_TIME}&end_time=${END_TIME}&limit=100&page=0")
    
    # 提取 pageSize (总页数) 和 audios 数组长度
    PAGE_SIZE=$(echo "$RESPONSE" | grep -oP '"pageSize"\s*:\s*\K[0-9]+')
    AUDIO_COUNT=$(echo "$RESPONSE" | grep -oP '"audios"\s*:\s*\[' | wc -l)
    CODE=$(echo "$RESPONSE" | grep -oP '"code"\s*:\s*\K[0-9]+')
    
    # 计算返回的音频数量
    ACTUAL_COUNT=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('audios',[])))" 2>/dev/null || echo "解析失败")
    
    echo "日期: $DATE | 返回数量: $ACTUAL_COUNT | 总页数: $PAGE_SIZE | code: $CODE"
done

rm -f cookies.txt
echo ""
echo "测试完成"
