import TelegramBot from 'node-telegram-bot-api';
import { getRoomInfo } from './douyu.js';
import { getBilibiliRoomInfo } from './bilibili.js';
import { Storage } from './storage.js';

/**
 * 直播开播通知 Bot
 * 支持斗鱼和B站
 */
export class LiveNotifyBot {
  constructor(token, options = {}) {
    this.bot = new TelegramBot(token, {
      polling: {
        interval: 2000,
        autoStart: false,
        params: {
          timeout: 30,
        },
      },
    });
    this.token = token;
    this.storage = new Storage(options.dataFile || './data/subscriptions.json');
    this.checkInterval = (options.checkInterval || 60) * 1000;
    this.checkTimer = null;

    this.setupErrorHandling();
    this.setupCommands();
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    this.bot.on('polling_error', (error) => {
      const code = error.code || 'UNKNOWN';
      const msg = error.message || '';
      console.error(`polling_error [${code}]: ${msg}`);

      // 409 Conflict 说明有另一个实例在 polling，停止当前实例
      if (msg.includes('409') || msg.includes('Conflict')) {
        console.error('检测到另一个 Bot 实例正在运行，当前实例将在 10 秒后重试...');
      }
    });

    this.bot.on('error', (error) => {
      console.error('bot error:', error.message);
    });
  }

  /**
   * 设置 Bot 命令
   */
  setupCommands() {
    // /start 命令
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId,
        `直播开播通知 Bot\n\n` +
        `支持平台：斗鱼、B站\n\n` +
        `斗鱼命令\n` +
        `/dy <房间号> - 订阅斗鱼主播\n` +
        `/dyun <房间号> - 取消斗鱼订阅\n\n` +
        `B站命令\n` +
        `/bl <房间号> - 订阅B站主播\n` +
        `/blun <房间号> - 取消B站订阅\n\n` +
        `通用命令\n` +
        `/list - 查看订阅列表\n` +
        `/help - 显示帮助`,
        { parse_mode: 'Markdown' }
      );
    });

    // /help 命令
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId,
        `使用帮助\n\n` +
        `*斗鱼直播*\n` +
        `/dy <房间号> - 订阅斗鱼主播\n` +
        `/dyun <房间号> - 取消斗鱼订阅\n` +
        `/dycheck <房间号> - 查看斗鱼直播状态\n\n` +
        `*B站直播*\n` +
        `/bl <房间号> - 订阅B站主播\n` +
        `/blun <房间号> - 取消B站订阅\n` +
        `/blcheck <房间号> - 查看B站直播状态\n\n` +
        `*通用命令*\n` +
        `/list - 查看所有订阅\n\n` +
        `*示例*\n` +
        `/dy 9999 - 订阅斗鱼房间9999\n` +
        `/bl 21452505 - 订阅B站房间21452505`,
        { parse_mode: 'Markdown' }
      );
    });

    this.setupDouyuCommands();
    this.setupBilibiliCommands();
    this.setupListCommand();
  }

  /**
   * 设置斗鱼相关命令
   */
  setupDouyuCommands() {
    // /dy 订阅斗鱼
    this.bot.onText(/\/dy(?:@\w+)?\s+(\d+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const roomId = match[1];

      const roomInfo = await getRoomInfo(roomId);
      if (!roomInfo) {
        this.bot.sendMessage(chatId, `❌ 斗鱼房间 ${roomId} 不存在或获取信息失败`);
        return;
      }

      const added = this.storage.addSubscription(String(chatId), 'douyu', roomId);
      if (added) {
        this.bot.sendMessage(chatId,
          `斗鱼订阅成功！\n\n` +
          `主播：${roomInfo.nickname}\n` +
          `房间：${roomInfo.roomName}\n` +
          `状态：${roomInfo.isLive ? '直播中' : '未开播'}\n` +
          `链接：${roomInfo.roomUrl}\n\n` +
          `/list 查看订阅列表 | /dyun ${roomId} 取消订阅`
        );
      } else {
        this.bot.sendMessage(chatId, `你已经订阅了斗鱼房间 ${roomId}\n\n/list 查看订阅列表`);
      }
    });

    // /dyun 取消斗鱼订阅
    this.bot.onText(/\/dyun(?:@\w+)?\s+(\d+)/, (msg, match) => {
      const chatId = msg.chat.id;
      const roomId = match[1];

      const removed = this.storage.removeSubscription(String(chatId), 'douyu', roomId);
      if (removed) {
        this.bot.sendMessage(chatId, `已取消斗鱼房间 ${roomId} 的订阅\n\n/dy <房间号> 重新订阅 | /list 查看订阅列表`);
      } else {
        this.bot.sendMessage(chatId, `你没有订阅斗鱼房间 ${roomId}\n\n/dy ${roomId} 订阅该房间`);
      }
    });

    // /dycheck 查看斗鱼直播状态
    this.bot.onText(/\/dycheck(?:@\w+)?\s+(\d+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const roomId = match[1];

      const roomInfo = await getRoomInfo(roomId);
      if (!roomInfo) {
        this.bot.sendMessage(chatId, `斗鱼房间 ${roomId} 不存在或获取信息失败`);
        return;
      }

      const status = roomInfo.isLive ? '直播中' : '未开播';
      let message = `斗鱼直播间状态\n\n` +
        `主播：${roomInfo.nickname}\n` +
        `房间：${roomInfo.roomName}\n` +
        `状态：${status}\n` +
        `分类：${roomInfo.categoryName}\n`;

      if (roomInfo.isLive) {
        message += `人气：${this.formatNumber(roomInfo.online)}\n`;
      }

      message += `链接：${roomInfo.roomUrl}`;
      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  }

  /**
   * 设置B站相关命令
   */
  setupBilibiliCommands() {
    // /bl 订阅B站
    this.bot.onText(/\/bl(?:@\w+)?\s+(\d+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const roomId = match[1];

      const roomInfo = await getBilibiliRoomInfo(roomId);
      if (!roomInfo) {
        this.bot.sendMessage(chatId, `❌ B站房间 ${roomId} 不存在或获取信息失败`);
        return;
      }

      const added = this.storage.addSubscription(String(chatId), 'bilibili', roomId);
      if (added) {
        this.bot.sendMessage(chatId,
          `B站订阅成功！\n\n` +
          `主播：${roomInfo.nickname}\n` +
          `房间：${roomInfo.roomName}\n` +
          `状态：${roomInfo.isLive ? '直播中' : '未开播'}\n` +
          `链接：${roomInfo.roomUrl}\n\n` +
          `/list 查看订阅列表 | /blun ${roomId} 取消订阅`
        );
      } else {
        this.bot.sendMessage(chatId, `你已经订阅了B站房间 ${roomId}\n\n/list 查看订阅列表`);
      }
    });

    // /blun 取消B站订阅
    this.bot.onText(/\/blun(?:@\w+)?\s+(\d+)/, (msg, match) => {
      const chatId = msg.chat.id;
      const roomId = match[1];

      const removed = this.storage.removeSubscription(String(chatId), 'bilibili', roomId);
      if (removed) {
        this.bot.sendMessage(chatId, `已取消B站房间 ${roomId} 的订阅\n\n/bl <房间号> 重新订阅 | /list 查看订阅列表`);
      } else {
        this.bot.sendMessage(chatId, `你没有订阅B站房间 ${roomId}\n\n/bl ${roomId} 订阅该房间`);
      }
    });

    // /blcheck 查看B站直播状态
    this.bot.onText(/\/blcheck(?:@\w+)?\s+(\d+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const roomId = match[1];

      const roomInfo = await getBilibiliRoomInfo(roomId);
      if (!roomInfo) {
        this.bot.sendMessage(chatId, `B站房间 ${roomId} 不存在或获取信息失败`);
        return;
      }

      const status = roomInfo.isLive ? '直播中' : '未开播';
      let message = `B站直播间状态\n\n` +
        `主播：${roomInfo.nickname}\n` +
        `房间：${roomInfo.roomName}\n` +
        `状态：${status}\n` +
        `分类：${roomInfo.parentAreaName} - ${roomInfo.categoryName}\n`;

      if (roomInfo.isLive) {
        message += `人气：${this.formatNumber(roomInfo.online)}\n`;
      }

      message += `链接：${roomInfo.roomUrl}`;
      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  }

  /**
   * 设置列表命令
   */
  setupListCommand() {
    this.bot.onText(/\/list/, async (msg) => {
      const chatId = msg.chat.id;
      const subs = this.storage.getAllSubscriptions(String(chatId));

      const hasDouyu = subs.douyu.length > 0;
      const hasBilibili = subs.bilibili.length > 0;

      if (!hasDouyu && !hasBilibili) {
        this.bot.sendMessage(chatId, '你还没有订阅任何主播');
        return;
      }

      let message = '订阅列表\n';

      if (hasDouyu) {
        message += '\n斗鱼\n';
        for (const roomId of subs.douyu) {
          const roomInfo = await getRoomInfo(roomId);
          if (roomInfo) {
            const status = roomInfo.isLive ? '直播中' : '未开播';
            message += `${status} [${roomInfo.nickname}](${roomInfo.roomUrl}) (${roomId})\n`;
          } else {
            message += `房间 ${roomId} (获取信息失败)\n`;
          }
        }
      }

      if (hasBilibili) {
        message += '\nB站\n';
        for (const roomId of subs.bilibili) {
          const roomInfo = await getBilibiliRoomInfo(roomId);
          if (roomInfo) {
            const status = roomInfo.isLive ? '直播中' : '未开播';
            message += `${status} [${roomInfo.nickname}](${roomInfo.roomUrl}) (${roomId})\n`;
          } else {
            message += `房间 ${roomId} (获取信息失败)\n`;
          }
        }
      }

      this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    });
  }

  /**
   * 格式化数字（人气值）
   * @param {number} num 数字
   * @returns {string} 格式化后的字符串
   */
  formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return String(num);
  }

  /**
   * 启动开播检测
   */
  startLiveCheck() {
    console.log(`开始开播检测，间隔 ${this.checkInterval / 1000} 秒`);
    this.checkAllPlatforms();
    this.checkTimer = setInterval(() => {
      this.checkAllPlatforms();
    }, this.checkInterval);
  }

  /**
   * 停止开播检测
   */
  stopLiveCheck() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      console.log('已停止开播检测');
    }
  }

  /**
   * 检查所有平台的开播状态
   */
  async checkAllPlatforms() {
    await this.checkPlatformLiveStatus('douyu', getRoomInfo);
    await this.checkPlatformLiveStatus('bilibili', getBilibiliRoomInfo);
  }

  /**
   * 检查指定平台的开播状态
   * @param {string} platform 平台名称
   * @param {Function} getRoomInfoFn 获取房间信息的函数
   */
  async checkPlatformLiveStatus(platform, getRoomInfoFn) {
    const roomIds = this.storage.getAllRoomIds(platform);
    if (roomIds.length === 0) return;

    console.log(`检查 ${platform} ${roomIds.length} 个房间的开播状态...`);

    for (const roomId of roomIds) {
      try {
        const roomInfo = await getRoomInfoFn(roomId);
        if (!roomInfo) continue;

        const previousStatus = this.storage.getLiveStatus(platform, roomId);
        const currentStatus = roomInfo.isLive;

        // 状态发生变化：从未开播变为开播
        if (previousStatus === false && currentStatus === true) {
          await this.sendLiveNotification(platform, roomId, roomInfo);
        }

        // 更新状态
        this.storage.setLiveStatus(platform, roomId, currentStatus);
      } catch (error) {
        console.error(`检查 ${platform} 房间 ${roomId} 状态失败:`, error.message);
      }
    }
  }

  /**
   * 发送开播通知
   * @param {string} platform 平台名称
   * @param {string} roomId 房间号
   * @param {Object} roomInfo 房间信息
   */
  async sendLiveNotification(platform, roomId, roomInfo) {
    const subscribers = this.storage.getSubscribers(platform, roomId);
    if (subscribers.length === 0) return;

    const platformName = platform === 'douyu' ? '斗鱼' : 'B站';
    console.log(`发送开播通知: ${platformName} ${roomInfo.nickname} (${roomId}) -> ${subscribers.length} 个订阅者`);

    const message =
      `*开播通知*\n\n` +
      `平台：${platformName}\n` +
      `主播：${roomInfo.nickname}\n` +
      `房间：${roomInfo.roomName}\n` +
      `分类：${roomInfo.categoryName}\n` +
      `人气：${this.formatNumber(roomInfo.online)}\n\n` +
      `[点击进入直播间](${roomInfo.roomUrl})`;

    for (const chatId of subscribers) {
      try {
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        });
      } catch (error) {
        console.error(`发送通知到 ${chatId} 失败:`, error.message);
      }
    }
  }

  /**
   * 启动 Bot
   */
  async start() {
    // 启动前先清除 webhook 和 pending updates，避免与旧实例冲突
    try {
      const url = `https://api.telegram.org/bot${this.token}/deleteWebhook?drop_pending_updates=true`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.ok) {
        console.log('已清除旧的 webhook 和 pending updates');
      }
    } catch (e) {
      console.error('清除 webhook 失败:', e.message);
    }

    // 启动 polling
    this.bot.startPolling();
    console.log('直播开播通知 Bot 已启动');
    this.startLiveCheck();
  }

  /**
   * 停止 Bot
   */
  stop() {
    this.stopLiveCheck();
    this.bot.stopPolling();
    console.log('Bot 已停止');
  }
}
