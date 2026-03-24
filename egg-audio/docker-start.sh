#!/bin/bash

# Egg Audio Docker 管理脚本
# 用法: ./docker-start.sh [build|start|stop|restart|logs|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 函数：构建镜像
build_image() {
    echo -e "${YELLOW}🔨 构建 Docker 镜像...${NC}"
    docker-compose build --no-cache
    echo -e "${GREEN}✅ 镜像构建完成${NC}"
}

# 函数：启动服务
start_service() {
    echo -e "${YELLOW}🚀 启动服务...${NC}"

    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  未找到 .env 文件，从 .env.example 创建...${NC}"
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${GREEN}✅ 已创建 .env 文件，请根据需要修改配置${NC}"
        else
            echo -e "${RED}❌ 未找到 .env.example 文件${NC}"
            exit 1
        fi
    fi

    # 创建日志目录
    mkdir -p logs

    # 启动服务
    docker-compose up -d

    echo -e "${GREEN}✅ 服务启动完成${NC}"
    echo ""
    echo "查看服务状态: ./docker-start.sh status"
    echo "查看日志: ./docker-start.sh logs"
}

# 函数：停止服务
stop_service() {
    echo -e "${YELLOW}🛑 停止服务...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ 服务已停止${NC}"
}

# 函数：重启服务
restart_service() {
    echo -e "${YELLOW}🔄 重启服务...${NC}"
    docker-compose restart
    echo -e "${GREEN}✅ 服务已重启${NC}"
}

# 函数：查看日志
view_logs() {
    echo -e "${YELLOW}📋 查看服务日志...${NC}"
    docker-compose logs -f --tail=100
}

# 函数：查看状态
view_status() {
    echo -e "${YELLOW}📊 服务状态:${NC}"
    echo ""
    docker-compose ps
    echo ""

    # 检查健康状态
    health=$(docker inspect --format='{{.State.Health.Status}}' egg-audio-server 2>/dev/null || echo "unknown")
    if [ "$health" = "healthy" ]; then
        echo -e "${GREEN}✅ 服务健康状态: healthy${NC}"
    elif [ "$health" = "unhealthy" ]; then
        echo -e "${RED}❌ 服务健康状态: unhealthy${NC}"
    else
        echo -e "${YELLOW}⚠️  服务健康状态: $health${NC}"
    fi

    echo ""
    echo "API 地址: http://localhost:7001"
    echo "测试接口: curl http://localhost:7001/api/audio/list?current=1&pageSize=10&group_id=920&start_time=2024-11-01%2000:00:00&end_time=2024-11-10%2023:59:59"
}

# 函数：完整部署
full_deploy() {
    echo -e "${YELLOW}🚀 执行完整部署流程...${NC}"
    echo ""

    build_image
    echo ""

    start_service
    echo ""

    sleep 5
    view_status
}

# 主逻辑
case "${1:-start}" in
    build)
        build_image
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    logs)
        view_logs
        ;;
    status)
        view_status
        ;;
    deploy)
        full_deploy
        ;;
    *)
        echo "用法: $0 {build|start|stop|restart|logs|status|deploy}"
        echo ""
        echo "命令说明:"
        echo "  build   - 构建 Docker 镜像"
        echo "  start   - 启动服务"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  logs    - 查看实时日志"
        echo "  status  - 查看服务状态"
        echo "  deploy  - 完整部署（构建 + 启动 + 状态检查）"
        exit 1
        ;;
esac
