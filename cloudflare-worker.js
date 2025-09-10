// Cloudflare Workers 脚本 - 处理微信授权 (v3 - 密钥硬编码版)
// 警告：密钥硬编码存在严重安全风险，仅供临时调试使用。
// 强烈建议在生产环境中使用 Cloudflare 的环境变量来管理密钥。

// --- 配置 (硬编码) ---
const APP_CONFIG = {
    APPID: 'wx2e1f9ccab9e27176',
    APPSECRET: '2b0086643a47fe0de574efbfc27c0718',
    ALLOWED_ORIGINS: 'https://jeff010726.github.io'
};

// 微信API地址
const WECHAT_API = {
    oauth2AccessToken: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    userInfo: 'https://api.weixin.qq.com/sns/userinfo',
    accessToken: 'https://api.weixin.qq.com/cgi-bin/token',
    subscriberInfo: 'https://api.weixin.qq.com/cgi-bin/user/info',
};

// --- 主处理逻辑 ---
export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        const url = new URL(request.url);
        if (url.pathname !== '/wechat/auth') {
            return new Response(JSON.stringify({ success: false, message: 'Invalid path' }), { status: 404, headers: corsHeaders() });
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
        }

        try {
            const { code } = await request.json();
            if (!code) {
                return new Response(JSON.stringify({ success: false, message: 'Missing `code` parameter' }), { status: 400, headers: corsHeaders() });
            }

            const oauth2TokenData = await getOauth2AccessToken(code);
            if (!oauth2TokenData.success) {
                return new Response(JSON.stringify(oauth2TokenData), { status: 500, headers: corsHeaders() });
            }
            const { access_token: oauth2_token, openid, scope } = oauth2TokenData.data;

            let userInfo = { openid, scope };
            if (scope === 'snsapi_userinfo') {
                const userInfoResult = await getUserInfo(oauth2_token, openid);
                if (!userInfoResult.success) {
                    return new Response(JSON.stringify(userInfoResult), { status: 500, headers: corsHeaders() });
                }
                userInfo = { ...userInfo, ...userInfoResult.data };
            }

            const subscriptionResult = await checkSubscription(openid, env); // `env` is needed here for cache
            if (!subscriptionResult.success) {
                return new Response(JSON.stringify(subscriptionResult), { status: 500, headers: corsHeaders() });
            }
            const { subscribe, subscribe_time } = subscriptionResult.data;
            
            const finalUserInfo = { ...userInfo, subscribe, subscribe_time };

            if (subscribe !== 1) {
                return new Response(JSON.stringify({
                    success: false,
                    needSubscribe: true,
                    message: '请先关注我们的微信服务号后再登录',
                    qrCodeUrl: 'qrcode_for_gh_ede2796af721_258.jpg'
                }), { status: 200, headers: corsHeaders() });
            }

            return new Response(JSON.stringify({
                success: true,
                userInfo: finalUserInfo
            }), { status: 200, headers: corsHeaders() });

        } catch (error) {
            console.error('Auth process error:', error);
            return new Response(JSON.stringify({ success: false, message: `Server error: ${error.message}` }), { status: 500, headers: corsHeaders() });
        }
    },
};

// --- 辅助函数 ---

async function getOauth2AccessToken(code) {
    const url = `${WECHAT_API.oauth2AccessToken}?appid=${APP_CONFIG.APPID}&secret=${APP_CONFIG.APPSECRET}&code=${code}&grant_type=authorization_code`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errcode) {
        return { success: false, message: `获取网页授权token失败: ${data.errmsg}`, details: data };
    }
    return { success: true, data };
}

async function getUserInfo(oauth2AccessToken, openid) {
    const url = `${WECHAT_API.userInfo}?access_token=${oauth2AccessToken}&openid=${openid}&lang=zh_CN`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errcode) {
        return { success: false, message: `获取用户信息失败: ${data.errmsg}`, details: data };
    }
    const { privilege, ...rest } = data;
    return { success: true, data: rest };
}

async function checkSubscription(openid, env) {
    const globalTokenResult = await getGlobalAccessToken(env);
    if (!globalTokenResult.success) {
        return globalTokenResult;
    }
    const global_token = globalTokenResult.data.access_token;

    const url = `${WECHAT_API.subscriberInfo}?access_token=${global_token}&openid=${openid}&lang=zh_CN`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errcode) {
        return { success: false, message: `检查关注状态失败: ${data.errmsg}`, details: data };
    }
    return { success: true, data };
}

async function getGlobalAccessToken(env) {
    const cache = caches.default;
    const cacheKey = `https://wechat.com/global_access_token`;
    let response = await cache.match(cacheKey);

    if (response) {
        const cachedData = await response.json();
        if (cachedData.expires_at > Date.now()) {
            return { success: true, data: cachedData };
        }
    }

    const url = `${WECHAT_API.accessToken}?grant_type=client_credential&appid=${APP_CONFIG.APPID}&secret=${APP_CONFIG.APPSECRET}`;
    const tokenResponse = await fetch(url);
    const tokenData = await tokenResponse.json();

    if (tokenData.errcode) {
        return { success: false, message: `获取普通token失败: ${tokenData.errmsg}`, details: tokenData };
    }

    const expiresIn = tokenData.expires_in || 7200;
    const cacheData = {
        access_token: tokenData.access_token,
        expires_at: Date.now() + (expiresIn - 300) * 1000,
    };
    
    const cacheResponse = new Response(JSON.stringify(cacheData), {
        headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(cacheKey, cacheResponse.clone());

    return { success: true, data: cacheData };
}

// --- CORS 处理 ---
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': APP_CONFIG.ALLOWED_ORIGINS,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

function handleOptions(request) {
    if (
        request.headers.get('Origin') !== null &&
        request.headers.get('Access-Control-Request-Method') !== null &&
        request.headers.get('Access-Control-Request-Headers') !== null
    ) {
        return new Response(null, { headers: corsHeaders() });
    } else {
        return new Response(null, { headers: { Allow: 'POST, OPTIONS' } });
    }
}