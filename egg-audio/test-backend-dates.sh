#!/bin/bash

# 测试后端 egg-audio API 不同日期的数据量
# 用法: ./test-backend-dates.sh [后端地址]
# 示例: ./test-backend-dates.sh http://localhost:7001

BASE_URL="${1:-http://localhost:7001}"
GROUP_ID="${2:-343050}"

echo "测试后端 API: $BASE_URL"
echo "群组 ID: $GROUP_ID"
echo "=========================================="

for DATE in 2025-12-01 2025-12-02 2025-12-03 2025-12-04 2025-12-05 2025-12-06 2025-12-07; do
    RESPONSE=$(curl -s "${BASE_URL}/api/audio/list?group_id=${GROUP_ID}&start_time=${DATE}%2000:00:00&end_time=${DATE}%2023:59:59&current=1&pageSize=100")

    echo "$RESPONSE" > /tmp/resp.json
    TOTAL=$(python3 -c "import json; d=json.load(open('/tmp/resp.json')); print(d.get('total', 'N/A'))" 2>/dev/null)
    DATA_COUNT=$(python3 -c "import json; d=json.load(open('/tmp/resp.json')); print(len(d.get('data', [])))" 2>/dev/null)
    SUCCESS=$(python3 -c "import json; d=json.load(open('/tmp/resp.json')); print(d.get('success', 'N/A'))" 2>/dev/null)

    echo "日期: $DATE | total: $TOTAL | 返回数量: $DATA_COUNT | success: $SUCCESS"
done

rm -f /tmp/resp.json
echo "=========================================="
echo "测试完成"
