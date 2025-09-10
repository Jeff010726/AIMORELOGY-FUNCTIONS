// Cloudflare Workers 脚本 - 处理微信授权 (v5 - 生产环境安全版)
// 使用环境变量管理密钥，并提供更安全的CORS策略。

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
        // 预检请求优先处理
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        let response;
        const url = new URL(request.url);

        try {
            if (url.pathname === '/wechat/auth-url' && request.method === 'GET') {
                response = await handleAuthUrlRequest(request, env);
            } else if (url.pathname === '/wechat/auth' && request.method === 'POST') {
                response = await handleAuthRequest(request, env);
            } else {
                response = new Response(JSON.stringify({ success: false, message: 'Not Found' }), { status: 404 });
            }
        } catch (error) {
            console.error('Unhandled error:', error);
            response = new Response(JSON.stringify({ success: false, message: `Internal Server Error: ${error.message}` }), { status: 500 });
        }
        
        // 为所有响应附加CORS头
        const newHeaders = new Headers(response.headers);
        const cors = corsHeaders(request, env);
        Object.keys(cors).forEach(key => {
            newHeaders.set(key, cors[key]);
        });

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
        });
    },
};

// --- 业务逻辑处理器 ---

async function handleAuthUrlRequest(request, env) {
    const url = new URL(request.url);
    const redirectUri = url.searchParams.get('redirect_uri');
    const scope = url.searchParams.get('scope') || 'snsapi_userinfo';
    
    if (!redirectUri) {
        return new Response(JSON.stringify({ success: false, message: 'Missing redirect_uri' }), { status: 400 });
    }

    const state = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${env.APPID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;

    return new Response(JSON.stringify({ success: true, authUrl, state }), { status: 200 });
}

async function handleAuthRequest(request, env) {
    try {
        const { code } = await request.json();
        if (!code) {
            return new Response(JSON.stringify({ success: false, message: 'Missing `code` parameter' }), { status: 400 });
        }

        const oauth2TokenData = await getOauth2AccessToken(code, env);
        if (!oauth2TokenData.success) {
            return new Response(JSON.stringify(oauth2TokenData), { status: 500 });
        }
        const { access_token: oauth2_token, openid, scope } = oauth2TokenData.data;

        let userInfo = { openid, scope };
        if (scope === 'snsapi_userinfo') {
            const userInfoResult = await getUserInfo(oauth2_token, openid);
            if (!userInfoResult.success) {
                return new Response(JSON.stringify(userInfoResult), { status: 500 });
            }
            userInfo = { ...userInfo, ...userInfoResult.data };
        }

        const subscriptionResult = await checkSubscription(openid, env);
        if (!subscriptionResult.success) {
            return new Response(JSON.stringify(subscriptionResult), { status: 500 });
        }
        const { subscribe, subscribe_time } = subscriptionResult.data;
        
        const finalUserInfo = { ...userInfo, subscribe, subscribe_time };

        if (subscribe !== 1) {
            return new Response(JSON.stringify({
                success: false,
                needSubscribe: true,
                message: '请先关注我们的微信服务号后再登录',
                qrCodeUrl: 'qrcode_for_gh_ede2796af721_258.jpg'
            }), { status: 200 });
        }

        return new Response(JSON.stringify({
            success: true,
            userInfo: finalUserInfo
        }), { status: 200 });

    } catch (error) {
        console.error('Auth process error:', error);
        return new Response(JSON.stringify({ success: false, message: `Server error: ${error.message}` }), { status: 500 });
    }
}

// --- 辅助函数 ---

async function getOauth2AccessToken(code, env) {
    const url = `${WECHAT_API.oauth2AccessToken}?appid=${env.APPID}&secret=${env.APPSECRET}&code=${code}&grant_type=authorization_code`;
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

    const url = `${WECHAT_API.accessToken}?grant_type=client_credential&appid=${env.APPID}&secret=${env.APPSECRET}`;
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
function corsHeaders(request, env) {
    // 环境变量中读取允许的源，提供默认值
    const allowedOrigin = env.ALLOWED_ORIGINS || 'https://jeff010726.github.io';

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
        'Access-Control-Allow-Credentials': 'true' // 如果需要，可以允许凭证
    };
}

function handleOptions(request) {
    if (
        request.headers.get('Origin') !== null &&
        request.headers.get('Access-Control-Request-Method') !== null &&
        request.headers.get('Access-Control-Request-Headers') !== null
    ) {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(request),
        });
    } else {
        return new Response(null, {
            headers: {
                Allow: 'POST, GET, OPTIONS',
            },
        });
    }
}