# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN npm install --legacy-peer-deps

# 复制项目文件
COPY . .

# 生成 TypeScript 类型定义（如果需要）
RUN npm run tsc 2>/dev/null || echo "No TypeScript compilation needed"

# ================================
# 生产阶段
FROM node:20-alpine

# 设置时区
ENV TZ=Asia/Shanghai

# 创建应用用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 从构建阶段复制 node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制项目文件（排除 node_modules）
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs app ./app
COPY --chown=nodejs:nodejs config ./config
COPY --chown=nodejs:nodejs typings ./typings
COPY --chown=nodejs:nodejs .env.example ./.env.example

# 创建日志目录
RUN mkdir -p logs run && \
    chown -R nodejs:nodejs logs run

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 7001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7001', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["npm", "start"]
