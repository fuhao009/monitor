# 多阶段构建 Dockerfile for Ant Design Pro

# ============================================
# Stage 1: 构建阶段
# ============================================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装依赖
# 使用 --frozen-lockfile 确保依赖版本一致
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建生产环境静态文件
# 使用 REACT_APP_ENV=prod 和 UMI_ENV=prod
ENV NODE_ENV=production
ENV REACT_APP_ENV=prod
ENV UMI_ENV=prod

RUN pnpm run build

# ============================================
# Stage 2: 运行阶段 (Nginx)
# ============================================
FROM nginx:1.25-alpine

# 安装 tzdata 用于时区设置
RUN apk add --no-cache tzdata

# 设置时区为上海
ENV TZ=Asia/Shanghai

# 从构建阶段复制编译好的静态文件
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
