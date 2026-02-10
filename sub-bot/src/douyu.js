/**
 * 斗鱼 API 模块
 * 用于获取直播间状态信息
 */

/**
 * 获取直播间信息
 * @param {string|number} roomId 房间号
 * @returns {Promise<Object>} 直播间信息
 */
export async function getRoomInfo(roomId) {
  try {
    const response = await fetch(
      `https://www.douyu.com/betard/${roomId}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return parseRoomInfo(data);
  } catch (error) {
    console.error(`获取房间 ${roomId} 信息失败:`, error.message);
    return null;
  }
}

/**
 * 解析直播间信息
 * @param {Object} data API返回的原始数据
 * @returns {Object} 格式化后的直播间信息
 */
function parseRoomInfo(data) {
  if (!data || !data.room) {
    return null;
  }

  const room = data.room;
  return {
    roomId: room.room_id,
    roomName: room.room_name,
    nickname: room.nickname,
    avatar: room.avatar,
    isLive: room.show_status === 1 && room.videoLoop !== 1,
    showStatus: room.show_status,
    videoLoop: room.videoLoop,
    online: room.online || 0,
    categoryName: room.cate_name || '',
    roomUrl: `https://www.douyu.com/${room.room_id}`,
    roomThumb: room.room_thumb,
  };
}
