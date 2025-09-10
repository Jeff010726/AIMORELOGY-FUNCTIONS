// Cloudflare Workers 脚本 - 微信扫码登录 (v2 - 完整版)
// 功能: 生成二维码 -> 接收扫码/关注事件 -> 前端轮询状态 -> 登录成功
// 依赖: Cloudflare KV, 环境变量 (APPID, APPSECRET, ALLOWED_ORIGINS, WECHAT_TOKEN)

// --- 微信API地址 ---
const WECHAT_API = {
    accessToken: 'https://api.weixin.qq.com/cgi-bin/token',
    createQrCode: 'https://api.weixin.qq.com/cgi-bin/qrcode/create',
    showQrCode: 'https://mp.weixin.qq.com/cgi-bin/showqrcode',
    userInfo: 'https://api.weixin.qq.com/cgi-bin/user/info',
};

// --- 主处理逻辑 ---
export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return handleOptions(request, env);
        }

        let response;
        const url = new URL(request.url);

        try {
            if (!env.WECHAT_LOGIN_KV || !env.APPID || !env.APPSECRET || !env.WECHAT_TOKEN) {
                 throw new Error("关键配置缺失: 请检查Worker的KV绑定和环境变量 (APPID, APPSECRET, WECHAT_TOKEN)。");
            }

            if (url.pathname === '/wechat/event' && request.method === 'GET') {
                response = await handleWechatValidation(request, env);
            } else if (url.pathname === '/wechat/event' && request.method === 'POST') {
                response = await handleWechatEvent(request, env, ctx);
            } else if (url.pathname === '/wechat/qr-login/start' && request.method === 'GET') {
                response = await handleQrLoginStart(request, env);
            } else if (url.pathname === '/wechat/qr-login/status' && request.method === 'GET') {
                response = await handleQrLoginStatus(request, env);
            } else {
                response = new Response(JSON.stringify({ success: false, message: 'Not Found' }), { status: 404 });
            }
        } catch (error) {
            console.error('Unhandled error:', error);
            response = new Response(JSON.stringify({ success: false, message: error.message || 'Internal Server Error' }), { status: 500 });
        }
        
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: withCorsHeaders(response.headers, request, env),
        });
    },
};

// --- 业务逻辑处理器 ---

async function handleWechatValidation(request, env) {
    const { searchParams } = new URL(request.url);
    const signature = searchParams.get('signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');
    const echostr = searchParams.get('echostr');
    const token = env.WECHAT_TOKEN;

    const arr = [token, timestamp, nonce].sort();
    const str = arr.join('');

    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === signature) {
        return new Response(echostr);
    } else {
        return new Response('Signature validation failed.', { status: 401 });
    }
}

async function handleWechatEvent(request, env, ctx) {
    const xmlText = await request.text();
    ctx.waitUntil(processEvent(xmlText, env));
    return new Response('success');
}

async function handleQrLoginStart(request, env) {
    const globalTokenResult = await getGlobalAccessToken(env);
    if (!globalTokenResult.success) return new Response(JSON.stringify(globalTokenResult), { status: 500 });
    
    const sceneId = crypto.randomUUID();
    const expireSeconds = 300;

    const createQrUrl = `${WECHAT_API.createQrCode}?access_token=${globalTokenResult.data.access_token}`;
    const qrResponse = await fetch(createQrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            expire_seconds: expireSeconds,
            action_name: 'QR_STR_SCENE',
            action_info: { scene: { scene_str: sceneId } },
        }),
    });
    const qrData = await qrResponse.json();

    if (!qrData.ticket) return new Response(JSON.stringify({ success: false, message: '创建二维码失败', details: qrData }), { status: 500 });

    await env.WECHAT_LOGIN_KV.put(sceneId, JSON.stringify({ status: 'PENDING' }), { expirationTtl: expireSeconds });
    
    const qrCodeImageUrl = `${WECHAT_API.showQrCode}?ticket=${encodeURIComponent(qrData.ticket)}`;
    return new Response(JSON.stringify({ success: true, qrCodeUrl: qrCodeImageUrl, sceneId: sceneId }), { status: 200 });
}

async function handleQrLoginStatus(request, env) {
    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get('sceneId');
    if (!sceneId) return new Response(JSON.stringify({ success: false, message: 'Missing sceneId' }), { status: 400 });

    const statusJson = await env.WECHAT_LOGIN_KV.get(sceneId);
    if (!statusJson) return new Response(JSON.stringify({ success: true, status: 'EXPIRED' }), { status: 200 });

    const statusData = JSON.parse(statusJson);
    if (statusData.status === 'SUCCESS') {
        await env.WECHAT_LOGIN_KV.delete(sceneId);
        return new Response(JSON.stringify({ success: true, status: 'SUCCESS', userInfo: statusData.userInfo }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, status: statusData.status }), { status: 200 });
}

// --- 后台任务与辅助函数 ---

async function processEvent(xmlText, env) {
    const eventData = parseXml(xmlText);
    if (eventData.MsgType !== 'event' || (eventData.Event !== 'subscribe' && eventData.Event !== 'SCAN')) return;

    let sceneId = eventData.EventKey;
    if (eventData.Event === 'subscribe') sceneId = sceneId.substring(8); // "qrscene_".length

    const openId = eventData.FromUserName;
    if (!sceneId || !openId) return;

    const statusJson = await env.WECHAT_LOGIN_KV.get(sceneId);
    if (!statusJson) return;

    const statusData = JSON.parse(statusJson);
    if (statusData.status !== 'PENDING') return;
    
    statusData.status = 'SCANNED';
    statusData.openId = openId;
    await env.WECHAT_LOGIN_KV.put(sceneId, JSON.stringify(statusData));

    const globalTokenResult = await getGlobalAccessToken(env);
    if (!globalTokenResult.success) return;

    const userInfoResult = await getUserInfo(openId, globalTokenResult.data.access_token);
    if (!userInfoResult.success) return;

    statusData.status = 'SUCCESS';
    statusData.userInfo = userInfoResult.data;
    await env.WECHAT_LOGIN_KV.put(sceneId, JSON.stringify(statusData));
}

async function getUserInfo(openid, accessToken) {
    const url = `${WECHAT_API.userInfo}?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errcode) return { success: false, details: data };
    return { success: true, data };
}

async function getGlobalAccessToken(env) {
    const cacheKey = 'global_access_token';
    const cached = await env.WECHAT_LOGIN_KV.get(cacheKey, { type: 'json' });
    if (cached && cached.expires_at > Date.now()) return { success: true, data: cached };

    const url = `${WECHAT_API.accessToken}?grant_type=client_credential&appid=${env.APPID}&secret=${env.APPSECRET}`;
    const tokenResponse = await fetch(url);
    const tokenData = await tokenResponse.json();
    if (tokenData.errcode) return { success: false, message: `获取普通token失败: ${tokenData.errmsg}`, details: tokenData };

    const expiresIn = tokenData.expires_in || 7200;
    const cacheData = { access_token: tokenData.access_token, expires_at: Date.now() + (expiresIn - 300) * 1000 };
    await env.WECHAT_LOGIN_KV.put(cacheKey, JSON.stringify(cacheData), { expirationTtl: expiresIn - 300 });
    return { success: true, data: cacheData };
}

function parseXml(xmlString) {
    const result = {};
    const regex = /<(\w+?)><!\[CDATA\[(.*?)]]><\/\1>/g;
    let match;
    while ((match = regex.exec(xmlString)) !== null) result[match[1]] = match[2];
    return result;
}

// --- CORS & 工具函数 ---

function corsHeaders(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGINS || 'https://jeff010726.github.io';
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
    };
}

function withCorsHeaders(headers, request, env) {
    const newHeaders = new Headers(headers);
    const cors = corsHeaders(request, env);
    for (const [key, value] of Object.entries(cors)) newHeaders.set(key, value);
    return newHeaders;
}

function handleOptions(request, env) {
    if (request.headers.get('Origin') !== null && request.headers.get('Access-Control-Request-Method') !== null && request.headers.get('Access-Control-Request-Headers') !== null) {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    } else {
        return new Response(null, { headers: { Allow: 'POST, GET, OPTIONS' } });
    }
}