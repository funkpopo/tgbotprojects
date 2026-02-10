import fs from 'fs';
import path from 'path';

/**
 * 订阅数据存储模块
 * 支持多平台订阅 (douyu, bilibili)
 */
export class Storage {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      // { chatId: { douyu: [roomId1, ...], bilibili: [roomId1, ...] } }
      subscriptions: {},
      // { "platform:roomId": boolean } 记录上次的开播状态
      liveStatus: {},
    };
    this.load();
  }

  /**
   * 加载数据
   */
  load() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(content);
        this.migrateOldData();
      }
    } catch (error) {
      console.error('加载数据失败:', error.message);
    }
  }

  /**
   * 迁移旧数据格式
   */
  migrateOldData() {
    // 确保 liveStatus 字段存在
    if (!this.data.liveStatus) {
      this.data.liveStatus = {};
    }
    // 确保 subscriptions 字段存在
    if (!this.data.subscriptions) {
      this.data.subscriptions = {};
    }
    // 迁移旧的订阅数据格式
    for (const [chatId, value] of Object.entries(this.data.subscriptions)) {
      if (Array.isArray(value)) {
        this.data.subscriptions[chatId] = { douyu: value, bilibili: [], twitch: [] };
      }
      // 为已有用户补充 twitch 字段
      if (value && !Array.isArray(value) && !value.twitch) {
        value.twitch = [];
      }
    }
  }

  /**
   * 保存数据
   */
  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('保存数据失败:', error.message);
    }
  }

  /**
   * 添加订阅
   * @param {string} chatId 聊天ID
   * @param {string} platform 平台 (douyu/bilibili)
   * @param {string} roomId 房间号
   * @returns {boolean} 是否添加成功
   */
  addSubscription(chatId, platform, roomId) {
    if (!this.data.subscriptions[chatId]) {
      this.data.subscriptions[chatId] = { douyu: [], bilibili: [], twitch: [] };
    }

    const roomIdStr = String(roomId);
    if (this.data.subscriptions[chatId][platform].includes(roomIdStr)) {
      return false;
    }

    this.data.subscriptions[chatId][platform].push(roomIdStr);
    this.save();
    return true;
  }

  /**
   * 移除订阅
   * @param {string} chatId 聊天ID
   * @param {string} platform 平台 (douyu/bilibili)
   * @param {string} roomId 房间号
   * @returns {boolean} 是否移除成功
   */
  removeSubscription(chatId, platform, roomId) {
    if (!this.data.subscriptions[chatId]?.[platform]) {
      return false;
    }

    const roomIdStr = String(roomId);
    const index = this.data.subscriptions[chatId][platform].indexOf(roomIdStr);
    if (index === -1) {
      return false;
    }

    this.data.subscriptions[chatId][platform].splice(index, 1);
    this.save();
    return true;
  }

  /**
   * 获取用户的订阅列表
   * @param {string} chatId 聊天ID
   * @param {string} platform 平台 (douyu/bilibili)
   * @returns {string[]} 房间号列表
   */
  getSubscriptions(chatId, platform) {
    return this.data.subscriptions[chatId]?.[platform] || [];
  }

  /**
   * 获取用户所有平台的订阅
   * @param {string} chatId 聊天ID
   * @returns {Object} { douyu: [], bilibili: [] }
   */
  getAllSubscriptions(chatId) {
    return this.data.subscriptions[chatId] || { douyu: [], bilibili: [], twitch: [] };
  }

  /**
   * 获取所有订阅的房间号
   * @param {string} platform 平台 (douyu/bilibili)
   * @returns {string[]} 去重后的房间号列表
   */
  getAllRoomIds(platform) {
    const roomIds = new Set();
    for (const subs of Object.values(this.data.subscriptions)) {
      if (subs[platform]) {
        subs[platform].forEach(roomId => roomIds.add(roomId));
      }
    }
    return Array.from(roomIds);
  }

  /**
   * 获取订阅了某个房间的所有聊天ID
   * @param {string} platform 平台 (douyu/bilibili)
   * @param {string} roomId 房间号
   * @returns {string[]} 聊天ID列表
   */
  getSubscribers(platform, roomId) {
    const subscribers = [];
    const roomIdStr = String(roomId);
    for (const [chatId, subs] of Object.entries(this.data.subscriptions)) {
      if (subs[platform]?.includes(roomIdStr)) {
        subscribers.push(chatId);
      }
    }
    return subscribers;
  }

  /**
   * 获取房间的上次开播状态
   * @param {string} platform 平台 (douyu/bilibili)
   * @param {string} roomId 房间号
   * @returns {boolean|undefined}
   */
  getLiveStatus(platform, roomId) {
    return this.data.liveStatus[`${platform}:${roomId}`];
  }

  /**
   * 设置房间的开播状态
   * @param {string} platform 平台 (douyu/bilibili)
   * @param {string} roomId 房间号
   * @param {boolean} isLive 是否开播
   */
  setLiveStatus(platform, roomId, isLive) {
    this.data.liveStatus[`${platform}:${roomId}`] = isLive;
    this.save();
  }
}
