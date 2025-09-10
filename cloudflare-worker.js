// Cloudflare Workers 脚本 - 处理微信授权 (v2 - 修复版)
// 修复了 access_token 混用导致的 "api unauthorized" 问题
// 增加了普通 access_token 的缓存机制

// --- 配置 ---
// 在 Cloudflare Worker 的环境变量中配置以下三项
// APPID: 你的微信公众号AppID
// APPSECRET: 你的微信公众号AppSecret
// ALLOWED_ORIGINS: 允许的前端来源，例如 'https://jeff010726.github.io'

// 微信API地址
const WECHAT_API = {
    // [网页授权] 通过code换取access_token
    oauth2AccessToken: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    // [网页授权] 拉取用户信息(需scope为 snsapi_userinfo)
    userInfo: 'https://api.weixin.qq.com/sns/userinfo',
    // [普通接口] 获取普通access_token
    accessToken: 'https://api.weixin.qq.com/cgi-bin/token',
    // [普通接口] 获取用户基本信息（含关注状态）
    subscriberInfo: 'https://api.weixin.qq.com/cgi-bin/user/info',
};

// --- 主处理逻辑 ---
export default {
    async fetch(request, env, ctx) {
        // 跨域预检请求
        if (request.method === 'OPTIONS') {
            return handleOptions(request, env);
        }

        const url = new URL(request.url);
        // 只处理 /wechat/auth 路径
        if (url.pathname !== '/wechat/auth') {
            return new Response(JSON.stringify({ success: false, message: 'Invalid path' }), { status: 404, headers: corsHeaders(env) });
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers: corsHeaders(env) });
        }

        try {
            const { code } = await request.json();
            if (!code) {
                return new Response(JSON.stringify({ success: false, message: 'Missing `code` parameter' }), { status: 400, headers: corsHeaders(env) });
            }

            // --- 核心授权流程 ---

            // 1. 用 code 换取网页授权 access_token 和 openid
            const oauth2TokenData = await getOauth2AccessToken(code, env);
            if (!oauth2TokenData.success) {
                return new Response(JSON.stringify(oauth2TokenData), { status: 500, headers: corsHeaders(env) });
            }
            const { access_token: oauth2_token, openid, scope } = oauth2TokenData.data;

            // 2. 获取用户信息
            // 如果 scope 是 snsapi_userinfo，则可以获取详细信息；否则只能获取 openid
            let userInfo = { openid, scope };
            if (scope === 'snsapi_userinfo') {
                const userInfoResult = await getUserInfo(oauth2_token, openid, env);
                if (!userInfoResult.success) {
                    return new Response(JSON.stringify(userInfoResult), { status: 500, headers: corsHeaders(env) });
                }
                userInfo = { ...userInfo, ...userInfoResult.data };
            }

            // 3. 检查用户是否关注 (需要用普通 access_token)
            const subscriptionResult = await checkSubscription(openid, env);
            if (!subscriptionResult.success) {
                return new Response(JSON.stringify(subscriptionResult), { status: 500, headers: corsHeaders(env) });
            }
            const { subscribe, subscribe_time } = subscriptionResult.data;
            
            // 合并最终用户信息
            const finalUserInfo = { ...userInfo, subscribe, subscribe_time };

            // 4. 判断是否需要强制关注
            if (subscribe !== 1) {
                return new Response(JSON.stringify({
                    success: false,
                    needSubscribe: true,
                    message: '请先关注我们的微信服务号后再登录',
                    qrCodeUrl: 'qrcode_for_gh_ede2796af721_258.jpg' // 你的公众号二维码图片
                }), { status: 200, headers: corsHeaders(env) });
            }

            // 5. 登录成功
            return new Response(JSON.stringify({
                success: true,
                userInfo: finalUserInfo
            }), { status: 200, headers: corsHeaders(env) });

        } catch (error) {
            console.error('Auth process error:', error);
            return new Response(JSON.stringify({ success: false, message: `Server error: ${error.message}` }), { status: 500, headers: corsHeaders(env) });
        }
    },
};

// --- 辅助函数 ---

/**
 * [网页授权] 1. 用 code 换取网页授权 access_token
 */
async function getOauth2AccessToken(code, env) {
    const url = `${WECHAT_API.oauth2AccessToken}?appid=${env.APPID}&secret=${env.APPSECRET}&code=${code}&grant_type=authorization_code`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errcode) {
        return { success: false, message: `获取网页授权token失败: ${data.errmsg}`, details: data };
    }
    return { success: true, data };
}

/**
 * [网页授权] 2. 用网页授权 access_token 拉取用户信息
 */
async function getUserInfo(oauth2AccessToken, openid, env) {
    const url = `${WECHAT_API.userInfo}?access_token=${oauth2AccessToken}&openid=${openid}&lang=zh_CN`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errcode) {
        return { success: false, message: `获取用户信息失败: ${data.errmsg}`, details: data };
    }
    // 移除敏感或不必要的字段
    const { privilege, ...rest } = data;
    return { success: true, data: rest };
}

/**
 * [普通接口] 3. 检查用户是否关注
 */
async function checkSubscription(openid, env) {
    // 3.1 获取普通 access_token (带缓存)
    const globalTokenResult = await getGlobalAccessToken(env);
    if (!globalTokenResult.success) {
        return globalTokenResult;
    }
    const global_token = globalTokenResult.data.access_token;

    // 3.2 用普通 token 查询用户信息
    const url = `${WECHAT_API.subscriberInfo}?access_token=${global_token}&openid=${openid}&lang=zh_CN`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errcode) {
        return { success: false, message: `检查关注状态失败: ${data.errmsg}`, details: data };
    }
    return { success: true, data };
}

/**
 * [普通接口] 获取并缓存普通 access_token
 */
async function getGlobalAccessToken(env) {
    const cache = caches.default;
    const cacheKey = `https://wechat.com/global_access_token`;
    let response = await cache.match(cacheKey);

    if (response) {
        const cachedData = await response.json();
        // 检查缓存是否在有效期内 (微信默认7200秒，我们提前5分钟刷新)
        if (cachedData.expires_at > Date.now()) {
            return { success: true, data: cachedData };
        }
    }

    // 缓存不存在或已过期，重新获取
    const url = `${WECHAT_API.accessToken}?grant_type=client_credential&appid=${env.APPID}&secret=${env.APPSECRET}`;
    const tokenResponse = await fetch(url);
    const tokenData = await tokenResponse.json();

    if (tokenData.errcode) {
        return { success: false, message: `获取普通token失败: ${tokenData.errmsg}`, details: tokenData };
    }

    // 缓存新的 token
    const expiresIn = tokenData.expires_in || 7200;
    const cacheData = {
        access_token: tokenData.access_token,
        // 提前5分钟过期，防止临界问题
        expires_at: Date.now() + (expiresIn - 300) * 1000,
    };
    
    const cacheResponse = new Response(JSON.stringify(cacheData), {
        headers: { 'Content-Type': 'application/json' },
    });
    // 缓存时间与token有效期一致
    await cache.put(cacheKey, cacheResponse.clone());

    return { success: true, data: cacheData };
}


// --- CORS 处理 ---
function corsHeaders(env) {
    return {
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

function handleOptions(request, env) {
    if (
        request.headers.get('Origin') !== null &&
        request.headers.get('Access-Control-Request-Method') !== null &&
        request.headers.get('Access-Control-Request-Headers') !== null
    ) {
        // Handle CORS preflight requests.
        return new Response(null, {
            headers: corsHeaders(env),
        });
    } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
            headers: {
                Allow: 'POST, OPTIONS',
            },
        });
    }
}