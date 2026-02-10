/**
 * Bilibili 直播 API 模块
 * 用于获取直播间状态信息
 */

/**
 * 获取直播间信息
 * @param {string|number} roomId 房间号
 * @returns {Promise<Object>} 直播间信息
 */
export async function getBilibiliRoomInfo(roomId) {
  try {
    const response = await fetch(
      `https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://live.bilibili.com/',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(data.message || '获取房间信息失败');
    }

    // 获取主播信息
    const anchorInfo = await getAnchorInfo(data.data.uid);

    return parseRoomInfo(data.data, anchorInfo);
  } catch (error) {
    console.error(`获取B站房间 ${roomId} 信息失败:`, error.message);
    return null;
  }
}

/**
 * 获取主播信息
 * @param {number} uid 用户ID
 * @returns {Promise<Object>} 主播信息
 */
async function getAnchorInfo(uid) {
  try {
    const response = await fetch(
      `https://api.live.bilibili.com/live_user/v1/Master/info?uid=${uid}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://live.bilibili.com/',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 0) return null;

    return data.data.info;
  } catch {
    return null;
  }
}

/**
 * 解析直播间信息
 * @param {Object} data API返回的原始数据
 * @param {Object} anchorInfo 主播信息
 * @returns {Object} 格式化后的直播间信息
 */
function parseRoomInfo(data, anchorInfo) {
  // live_status: 0=未开播, 1=直播中, 2=轮播中
  const isLive = data.live_status === 1;

  return {
    roomId: data.room_id,
    shortId: data.short_id,
    roomName: data.title,
    nickname: anchorInfo?.uname || `UID:${data.uid}`,
    avatar: anchorInfo?.face || '',
    isLive: isLive,
    liveStatus: data.live_status,
    online: data.online || 0,
    categoryName: data.area_name || '',
    parentAreaName: data.parent_area_name || '',
    roomUrl: `https://live.bilibili.com/${data.room_id}`,
    cover: data.user_cover || data.keyframe || '',
    uid: data.uid,
  };
}
