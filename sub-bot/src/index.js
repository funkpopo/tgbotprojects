import { LiveNotifyBot } from './bot.js';

// 从环境变量或配置文件读取配置
const config = {
  token: process.env.TELEGRAM_BOT_TOKEN,
  checkInterval: parseInt(process.env.CHECK_INTERVAL) || 60,
  dataFile: process.env.DATA_FILE || './data/subscriptions.json',
};

// 检查必要配置
if (!config.token) {
  console.error('错误: 请设置 TELEGRAM_BOT_TOKEN 环境变量');
  console.error('');
  console.error('使用方法:');
  console.error('  1. 从 @BotFather 获取 Bot Token');
  console.error('  2. 设置环境变量: export TELEGRAM_BOT_TOKEN=your_token');
  console.error('  3. 运行: npm start');
  process.exit(1);
}

// 创建并启动 Bot
const bot = new LiveNotifyBot(config.token, {
  checkInterval: config.checkInterval,
  dataFile: config.dataFile,
});

bot.start().catch((err) => {
  console.error('Bot 启动失败:', err.message);
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n收到退出信号，正在关闭...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n收到终止信号，正在关闭...');
  bot.stop();
  process.exit(0);
});
