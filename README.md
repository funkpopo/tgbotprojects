# 直播开播通知 Telegram Bot

一个用于接收斗鱼和B站直播开播通知的 Telegram Bot。

## 功能特性

- 支持斗鱼和B站两个平台
- 订阅主播，开播时自动推送通知
- 支持多用户订阅
- 查看订阅列表和直播状态
- 数据持久化存储

## 安装

```bash
cd douyu-live-bot
npm install
```

## 配置

1. 从 Telegram [@BotFather](https://t.me/BotFather) 创建一个新的 Bot 并获取 Token

2. 复制配置文件并填写 Token：
```bash
cp .env.example .env
```

3. 编辑 `.env` 文件：
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
CHECK_INTERVAL=60
DATA_FILE=./data/subscriptions.json
```

## 运行

```bash
# 设置环境变量方式运行
export TELEGRAM_BOT_TOKEN=your_token
npm start

# 或者使用 .env 文件（需要安装 dotenv）
npm install dotenv
node -r dotenv/config src/index.js
```

## Bot 命令

### 斗鱼直播

| 命令 | 说明 |
|------|------|
| `/dy <房间号>` | 订阅斗鱼主播 |
| `/dyun <房间号>` | 取消斗鱼订阅 |
| `/dycheck <房间号>` | 查看斗鱼直播状态 |

### B站直播

| 命令 | 说明 |
|------|------|
| `/bl <房间号>` | 订阅B站主播 |
| `/blun <房间号>` | 取消B站订阅 |
| `/blcheck <房间号>` | 查看B站直播状态 |

### 通用命令

| 命令 | 说明 |
|------|------|
| `/start` | 显示欢迎信息 |
| `/help` | 显示帮助信息 |
| `/list` | 查看所有订阅 |

## 使用示例

```
/dy 9999        # 订阅斗鱼房间 9999
/dyun 9999      # 取消斗鱼房间 9999 订阅
/dycheck 9999   # 查看斗鱼房间 9999 状态

/bl 21452505    # 订阅B站房间 21452505
/blun 21452505  # 取消B站房间 21452505 订阅
/blcheck 21452505  # 查看B站房间 21452505 状态

/list           # 查看所有订阅
```

## 项目结构

```
douyu-live-bot/
├── src/
│   ├── index.js    # 入口文件
│   ├── bot.js      # Telegram Bot 核心逻辑
│   ├── douyu.js    # 斗鱼 API 模块
│   ├── bilibili.js # B站 API 模块
│   └── storage.js  # 数据存储模块
├── data/           # 数据存储目录
├── package.json
├── .env.example
└── README.md
```

## 注意事项

- 检查间隔建议设置为 60 秒以上，避免请求过于频繁
- Bot 需要保持运行才能接收开播通知
- 建议使用 PM2 或 Docker 进行部署

## 部署建议

### 使用 PM2

```bash
npm install -g pm2
pm2 start src/index.js --name live-bot
pm2 save
```

### 使用 Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "src/index.js"]
```

### 运行容器
方式一：使用环境变量

docker run -d \
  --name live-bot \
  -e TELEGRAM_BOT_TOKEN=你的Token \
  -e CHECK_INTERVAL=60 \
  -v live-bot-data:/app/data \
  --restart unless-stopped \
  live-bot


方式二：使用 .env 文件

docker run -d \
  --name live-bot \
  --env-file .env \
  -v live-bot-data:/app/data \
  --restart unless-stopped \
  live-bot

## License

MIT
