#!/bin/bash

# PTT Audio API 测试脚本
# 使用方法: ./test-ptt-audio.sh <账号> <密码>

BASE_URL="https://api.smart-ptt.com"

# 检查参数
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "使用方法: $0 <账号> <密码>"
    echo "示例: $0 admin password123"
    exit 1
fi

ACCOUNT="$1"
PASSWORD="$2"

echo "=========================================="
echo "步骤 1: 获取 random 和 sessionId"
echo "=========================================="

# 获取 random 和 sessionId，保存 cookie
RANDOM_RESPONSE=$(curl -s -c cookies.txt -b cookies.txt \
    "${BASE_URL}/ptt/random")

echo "响应: $RANDOM_RESPONSE"

# 解析 random 值
RANDOM_VALUE=$(echo "$RANDOM_RESPONSE" | grep -oP '"random"\s*:\s*"\K[^"]+')
SESSION_ID=$(echo "$RANDOM_RESPONSE" | grep -oP '"sessionId"\s*:\s*"\K[^"]+')

if [ -z "$RANDOM_VALUE" ]; then
    echo "错误: 无法获取 random 值"
    exit 1
fi

echo "Random: $RANDOM_VALUE"
echo "SessionId: $SESSION_ID"

echo ""
echo "=========================================="
echo "步骤 2: 加密密码并登录"
echo "=========================================="

# 计算密码的 SHA1
SHA1_PASSWORD=$(echo -n "$PASSWORD" | sha1sum | cut -d' ' -f1)
echo "SHA1 密码: $SHA1_PASSWORD"

# 计算 HMAC-SHA1
ENCRYPTED_PASSWORD=$(echo -n "$SHA1_PASSWORD" | openssl dgst -sha1 -hmac "$RANDOM_VALUE" | cut -d' ' -f2)
echo "加密后密码: $ENCRYPTED_PASSWORD"

# 登录
LOGIN_RESPONSE=$(curl -s -c cookies.txt -b cookies.txt \
    "${BASE_URL}/ptt/organization?method=login&account=${ACCOUNT}&pwd=${ENCRYPTED_PASSWORD}&timeZoneOffset=-480")

echo "登录响应: $LOGIN_RESPONSE"

# 检查登录是否成功
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | grep -oP '"code"\s*:\s*\K[0-9]+')
if [ "$LOGIN_CODE" != "0" ]; then
    echo "警告: 登录可能失败，code=$LOGIN_CODE"
fi

echo ""
echo "=========================================="
echo "步骤 3: 查询音频数据并导出CSV"
echo "=========================================="

# 创建CSV文件
CSV_FILE="audio_export_$(date +%Y%m%d_%H%M%S).csv"
echo "user_name,id,time" > "$CSV_FILE"

# 用于去重的临时文件
TEMP_IDS="/tmp/audio_ids_$$"
> "$TEMP_IDS"

# 统计不去重的总数
RAW_COUNT=0

echo "开始遍历页面..."

for PAGE in $(seq 0 100); do
    echo -n "正在获取第 ${PAGE} 页..."

    AUDIO_RESPONSE=$(curl -s -c cookies.txt -b cookies.txt \
        "${BASE_URL}/ptt/audio?method=get&group_id=343050&start_time=2025-12-05%2000:00:00&end_time=2025-12-07%2000:59:59&limit=200&page=${PAGE}")

    # 检查是否有数据
    DATA_COUNT=$(echo "$AUDIO_RESPONSE" | python3 -c "
import sys,json
try:
    data = json.load(sys.stdin)
    audios = data.get('data', {}).get('audios', [])
    print(len(audios))
except:
    print(0)
" 2>/dev/null)

    if [ "$DATA_COUNT" = "0" ] || [ -z "$DATA_COUNT" ]; then
        echo " 无数据，停止遍历"
        break
    fi

    echo " 获取到 ${DATA_COUNT} 条数据"
    RAW_COUNT=$((RAW_COUNT + DATA_COUNT))

    # 提取 user_name 和 id，去重后追加到CSV
    echo "$AUDIO_RESPONSE" | python3 -c "
import sys,json
try:
    data = json.load(sys.stdin)
    audios = data.get('data', {}).get('audios', [])
    for audio in audios:
        user_name = audio.get('user_name', '')
        audio_id = audio.get('id', '')
        time = audio.get('time', '')
        print(f'{user_name},{audio_id},{time}')
except:
    pass
" 2>/dev/null | while read line; do
        ID=$(echo "$line" | cut -d',' -f2)
        if ! grep -q "^${ID}$" "$TEMP_IDS" 2>/dev/null; then
            echo "$ID" >> "$TEMP_IDS"
            echo "$line" >> "$CSV_FILE"
        fi
    done
done

# 统计结果
TOTAL_COUNT=$(wc -l < "$CSV_FILE")
TOTAL_COUNT=$((TOTAL_COUNT - 1))  # 减去表头

echo ""
echo "导出完成！"
echo "文件: $CSV_FILE"
echo "原始总数: $RAW_COUNT (不去重)"
echo "去重后数: $TOTAL_COUNT (已去重)"
echo "重复数量: $((RAW_COUNT - TOTAL_COUNT))"

# 显示前10条
echo ""
echo "前10条数据:"
head -11 "$CSV_FILE"

# 清理临时文件
rm -f "$TEMP_IDS"

# 清理 cookie 文件
rm -f cookies.txt

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
