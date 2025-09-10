// Cloudflare Workers 脚本 - 处理微信授权
// 部署到 Cloudflare Workers 后，将此脚本的 URL 用作后端 API

// 微信配置 - 在 Cloudflare Workers 环境变量中设置
const WECHAT_APPID = 'wx2e1f9ccab9e27176';
const WECHAT_SECRET = '2b0086643a47fe0de574efbfc27c0718';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Blackrail200107.';

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 处理 OPTIONS 请求
function handleOptions() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// 生成随机 state
function generateState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
}

// 获取微信 access_token
async function getWechatAccessToken(code) {
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.errcode) {
      throw new Error(`微信API错误: ${data.errmsg}`);
    }
    
    return data;
  } catch (error) {
    console.error('获取access_token失败:', error);
    throw error;
  }
}

// 获取用户信息
async function getWechatUserInfo(accessToken, openid) {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.errcode) {
      throw new Error(`获取用户信息失败: ${data.errmsg}`);
    }
    
    return data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

// 获取服务号 access_token
async function getServiceAccessToken() {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.errcode) {
      throw new Error(`获取服务号token失败: ${data.errmsg}`);
    }
    
    return data.access_token;
  } catch (error) {
    console.error('获取服务号token失败:', error);
    throw error;
  }
}

// 检查用户关注状态
async function checkUserSubscription(openid, serviceToken) {
  const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${serviceToken}&openid=${openid}&lang=zh_CN`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // 如果是48001错误，说明用户未关注
    if (data.errcode === 48001) {
      return { subscribe: 0, message: '用户未关注公众号' };
    }
    
    if (data.errcode) {
      throw new Error(`检查关注状态失败: ${data.errmsg}`);
    }
    
    return data;
  } catch (error) {
    console.error('检查关注状态失败:', error);
    throw error;
  }
}

// 处理微信授权回调
async function handleWechatAuth(request) {
  try {
    const { code, state } = await request.json();
    
    if (!code || !state) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要参数'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 获取 access_token
    const tokenData = await getWechatAccessToken(code);
    
    // 获取用户基本信息
    const userInfo = await getWechatUserInfo(tokenData.access_token, tokenData.openid);
    
    // 获取服务号 access_token
    const serviceToken = await getServiceAccessToken();
    
    // 检查用户关注状态
    const subscriptionInfo = await checkUserSubscription(tokenData.openid, serviceToken);
    
    // 判断是否已关注
    if (subscriptionInfo.subscribe !== 1) {
      return new Response(JSON.stringify({
        success: false,
        message: '请先关注我们的微信服务号后再登录',
        needSubscribe: true,
        qrCodeUrl: 'qrcode_for_gh_ede2796af721_258.jpg'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 确定用户等级
    let userLevel = '普通用户';
    if (subscriptionInfo.subscribe_time) {
      const subscribeDate = new Date(subscriptionInfo.subscribe_time * 1000);
      const now = new Date();
      const daysSinceSubscribe = (now - subscribeDate) / (1000 * 60 * 60 * 24);
      
      if (daysSinceSubscribe > 365) {
        userLevel = 'SVIP';
      } else if (daysSinceSubscribe > 30) {
        userLevel = 'VIP';
      }
    }

    // 根据等级设置使用次数限制
    const maxUsage = {
      '普通用户': 10,
      'VIP': 50,
      'SVIP': 200,
      'Admin': 999999
    }[userLevel] || 10;

    // 登录成功，返回用户信息
    const finalUserInfo = {
      openid: tokenData.openid,
      nickname: userInfo.nickname,
      headimgurl: userInfo.headimgurl,
      sex: userInfo.sex,
      city: userInfo.city,
      province: userInfo.province,
      country: userInfo.country,
      subscribe: subscriptionInfo.subscribe,
      subscribe_time: subscriptionInfo.subscribe_time,
      unionid: userInfo.unionid,
      level: userLevel,
      maxUsage: maxUsage,
      usageCount: 0, // 这里应该从数据库获取实际使用次数
      loginTime: Date.now()
    };

    return new Response(JSON.stringify({
      success: true,
      userInfo: finalUserInfo
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('微信授权处理失败:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || '登录失败，请重试'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 处理管理员登录
async function handleAdminLogin(request) {
  try {
    const { username, password } = await request.json();
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return new Response(JSON.stringify({
        success: true,
        userInfo: {
          openid: 'admin_' + Date.now(),
          nickname: '管理员',
          headimgurl: '',
          level: 'Admin',
          maxUsage: 999999,
          usageCount: 0,
          loginTime: Date.now()
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '用户名或密码错误'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: '登录失败'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 生成微信授权URL
async function generateAuthUrl(request) {
  try {
    const url = new URL(request.url);
    const redirectUri = url.searchParams.get('redirect_uri');
    const scope = url.searchParams.get('scope') || 'snsapi_userinfo';
    
    if (!redirectUri) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少回调地址'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const state = generateState();
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;

    return new Response(JSON.stringify({
      success: true,
      authUrl: authUrl,
      state: state
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: '生成授权链接失败'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // 路由处理
    switch (path) {
      case '/wechat/auth':
        if (request.method === 'POST') {
          return handleWechatAuth(request);
        }
        break;
        
      case '/admin/login':
        if (request.method === 'POST') {
          return handleAdminLogin(request);
        }
        break;
        
      case '/wechat/auth-url':
        if (request.method === 'GET') {
          return generateAuthUrl(request);
        }
        break;
        
      default:
        return new Response(JSON.stringify({
          success: false,
          message: '接口不存在'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
      success: false,
      message: '方法不允许'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  },
};