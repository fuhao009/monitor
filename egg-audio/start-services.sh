#!/bin/bash
set -e

echo "=== 启动 MySQL ==="
docker run -d \
  --name egg-audio-mysql \
  --restart unless-stopped \
  -p 3110:3306 \
  -e MYSQL_ROOT_PASSWORD=dz123456 \
  -e MYSQL_DATABASE=dz_db_mysql \
  -e MYSQL_ROOT_HOST=% \
  -e TZ=Asia/Shanghai \
  -v /data/recordguard/egg-audio/mysql:/var/lib/mysql \
  mysql:5.7 \
  --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci 2>/dev/null || echo "MySQL 容器已存在"

echo "等待 MySQL 初始化..."
sleep 10

echo "=== 启动 Egg-Audio ==="
docker run -d \
  --name egg-audio-server \
  --restart unless-stopped \
  --network host \
  -e DB_HOST=127.0.0.1 \
  -e DB_PORT=3110 \
  -e DB_USER=root \
  -e DB_PASSWORD=dz123456 \
  -e DB_NAME=dz_db_mysql \
  -e ACCOUNT=gsgl \
  -e PASSWORD=Hhy8649116 \
  -e BASE_URL=https://api.smart-ptt.com \
  -e FILE_BASE_URL=http://110.41.22.18 \
  -e NODE_ENV=production \
  -e EGG_SERVER_ENV=prod \
  -v /data/recordguard/egg-audio/logs:/app/logs \
  egg-audio:latest 2>/dev/null || echo "Egg-Audio 容器已存在"

echo ""
echo "=== 服务状态 ==="
docker ps | grep -E "egg-audio-mysql|egg-audio-server"
