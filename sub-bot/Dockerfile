# 使用 Node.js 官方镜像作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production || npm install --only=production

# 复制源代码
COPY src/ ./src/

# 创建数据目录
RUN mkdir -p /app/data

# 设置数据目录为卷，便于持久化
VOLUME ["/app/data"]

# 设置环境变量默认值
ENV NODE_ENV=production
ENV DATA_FILE=/app/data/subscriptions.json
ENV CHECK_INTERVAL=180

# 启动应用
CMD ["node", "src/index.js"]
