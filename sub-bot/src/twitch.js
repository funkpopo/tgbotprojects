/**
 * Twitch 直播模块
 * 使用 Twitch 网页端 GQL 接口获取频道直播状态
 * 无需 API 凭证
 */

const GQL_URL = 'https://gql.twitch.tv/gql';
// Twitch 网页端公开 Client-ID
const CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

/**
 * 获取 Twitch 频道直播信息
 * @param {string} channelName 频道名称 (login name)
 * @returns {Promise<Object|null>} 频道信息
 */
export async function getTwitchChannelInfo(channelName) {
  try {
    const query = `query {
      user(login: "${channelName}") {
        login
        displayName
        description
        stream {
          title
          viewersCount
          game {
            name
          }
        }
      }
    }`;

    const response = await fetch(GQL_URL, {
      method: 'POST',
      headers: {
        'Client-Id': CLIENT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const user = data?.data?.user;
    if (!user) return null;

    const stream = user.stream;

    return {
      channelName: user.login,
      nickname: user.displayName,
      roomName: stream ? stream.title : user.description || '未开播',
      isLive: stream !== null,
      online: stream ? stream.viewersCount : 0,
      categoryName: stream?.game?.name || '',
      roomUrl: `https://www.twitch.tv/${user.login}`,
    };
  } catch (error) {
    console.error(`获取 Twitch 频道 ${channelName} 信息失败:`, error.message);
    return null;
  }
}
