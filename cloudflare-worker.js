// Cloudflare Workers 脚本 - 微信扫码登录 (v-final-refactor)
// 最终重构版：严格遵循成功案例的异步处理架构。
// 核心逻辑: 1. Webhook入口立即返回'success' -> 2. 后台任务处理所有逻辑。
const SCRIPT_VERSION = "v-final-refactor";

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

            if (url.pathname === '/version' && request.method === 'GET') {
                response = new Response(JSON.stringify({ success: true, version: SCRIPT_VERSION }), { status: 200 });
            } else if (url.pathname === '/wechat/event' && request.method === 'GET') {
                response = await handleWechatValidation(request, env);
            } else if (url.pathname === '/wechat/event' && request.method === 'POST') {
                // 这是核心修改：调用新的、绝对异步的事件处理器
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

// 【修正版】事件入口：按照微信文档要求，简单返回success
async function handleWechatEvent(request, env, ctx) {
    const xmlText = await request.text();
    const eventData = parseXml(xmlText);

    // 扫码登录事件：同步处理，但只返回success（按微信文档要求）
    if (eventData.MsgType === 'event' && (eventData.Event === 'SCAN' || eventData.Event === 'subscribe')) {
        // 异步处理登录逻辑，但立即返回success
        ctx.waitUntil(handleScanLoginSync(eventData, env));
        return new Response('success');
    }
    
    // 文本消息：返回XML回复
    if (eventData.MsgType === 'text') {
        const responseXml = createReplyXml(eventData.FromUserName, eventData.ToUserName, '您好，此账号主要用于扫码登录，如需帮助请联系客服。');
        return new Response(responseXml, { headers: { 'Content-Type': 'application/xml' } });
    }
    
    // 对于其他所有事件，返回success
    return new Response('success');
}

async function handleQrLoginStart(request, env) {
    let globalTokenResult = await getGlobalAccessToken(env);
    if (!globalTokenResult.success) {
        return new Response(JSON.stringify(globalTokenResult), { status: 500 });
    }

    const sceneId = crypto.randomUUID();
    const expireSeconds = 300;
    
    let qrData;
    const createQrCode = async (accessToken) => {
        const createQrUrl = `${WECHAT_API.createQrCode}?access_token=${accessToken}`;
        const response = await fetch(createQrUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                expire_seconds: expireSeconds,
                action_name: 'QR_STR_SCENE',
                action_info: { scene: { scene_str: sceneId } },
            }),
        });
        return response.json();
    };

    qrData = await createQrCode(globalTokenResult.data.access_token);

    const invalidTokenErrorCodes = [40001, 40014, 42001];
    if (qrData.errcode && invalidTokenErrorCodes.includes(qrData.errcode)) {
        console.log(`全局Token失效(errcode: ${qrData.errcode})，强制刷新并重试创建二维码...`);
        globalTokenResult = await getGlobalAccessToken(env, true);
        if (!globalTokenResult.success) {
            return new Response(JSON.stringify(globalTokenResult), { status: 500 });
        }
        qrData = await createQrCode(globalTokenResult.data.access_token);
    }

    if (!qrData.ticket) {
        return new Response(JSON.stringify({ success: false, message: '创建二维码失败', details: qrData }), { status: 500 });
    }

    // 关键修复：使用 ticket 作为键，而不是 sceneId
    await env.WECHAT_LOGIN_KV.put(qrData.ticket, JSON.stringify({ status: 'PENDING' }), { expirationTtl: expireSeconds });
    
    const qrCodeImageUrl = `${WECHAT_API.showQrCode}?ticket=${encodeURIComponent(qrData.ticket)}`;
    // 返回 ticket 而不是 sceneId，供前端轮询使用
    return new Response(JSON.stringify({ success: true, qrCodeUrl: qrCodeImageUrl, ticket: qrData.ticket }), { status: 200 });
}

async function handleQrLoginStatus(request, env) {
    const { searchParams } = new URL(request.url);
    const ticket = searchParams.get('ticket');
    if (!ticket) return new Response(JSON.stringify({ success: false, message: 'Missing ticket' }), { status: 400 });

    const statusJson = await env.WECHAT_LOGIN_KV.get(ticket);
    if (!statusJson) return new Response(JSON.stringify({ success: true, status: 'EXPIRED' }), { status: 200 });

    const statusData = JSON.parse(statusJson);
    if (statusData.status === 'SUCCESS') {
        await env.WECHAT_LOGIN_KV.delete(ticket);
    }

    return new Response(JSON.stringify({ success: true, ...statusData }), { status: 200 });
}

// --- 同步处理函数 ---

// 【修正版】同步处理扫码登录（使用 Ticket 作为键）
async function handleScanLoginSync(eventData, env) {
    try {
        // 关键修复：使用 Ticket 而不是 EventKey
        const ticket = eventData.Ticket;
        const openId = eventData.FromUserName;
        
        if (!ticket || !openId) {
            console.log('登录事件被忽略：缺少 Ticket 或 openId。');
            return { success: false, message: '登录信息不完整' };
        }

        // 使用 ticket 检查二维码是否有效
        const statusJson = await env.WECHAT_LOGIN_KV.get(ticket);
        if (!statusJson) {
            console.log(`登录事件被忽略：ticket ${ticket} 已过期或无效。`);
            return { success: false, message: '二维码已过期' };
        }

        const statusData = JSON.parse(statusJson);
        if (statusData.status !== 'PENDING') {
            console.log(`登录事件被忽略：ticket ${ticket} 已被处理 (状态: ${statusData.status})。`);
            return { success: false, message: '二维码已被使用' };
        }

        // 立即更新状态为SUCCESS
        statusData.status = 'SUCCESS';
        statusData.openId = openId;
        statusData.userInfo = {
            openid: openId,
            nickname: '微信用户',
            headimgurl: ''
        };
        
        // 使用 ticket 作为键更新状态
        await env.WECHAT_LOGIN_KV.put(ticket, JSON.stringify(statusData));
        
        return { success: true, message: '登录成功！' };

    } catch (error) {
        console.error('同步处理扫码登录失败:', error);
        return { success: false, message: '登录处理出错，请重试' };
    }
}

// XML 回复生成器
function createReplyXml(toUser, fromUser, content) {
    const time = Math.floor(Date.now() / 1000);
    return `<xml>
        <ToUserName><![CDATA[${toUser}]]></ToUserName>
        <FromUserName><![CDATA[${fromUser}]]></FromUserName>
        <CreateTime>${time}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[${content}]]></Content>
    </xml>`;
}

async function getGlobalAccessToken(env, forceRefresh = false) {
    const cacheKey = 'global_access_token';
    
    if (!forceRefresh) {
        const cached = await env.WECHAT_LOGIN_KV.get(cacheKey, { type: 'json' });
        if (cached && cached.expires_at > Date.now()) {
            return { success: true, data: cached };
        }
    }

    const url = `${WECHAT_API.accessToken}?grant_type=client_credential&appid=${env.APPID}&secret=${env.APPSECRET}`;
    const tokenResponse = await fetch(url);
    const tokenData = await tokenResponse.json();

    if (tokenData.errcode) {
        await env.WECHAT_LOGIN_KV.delete(cacheKey);
        return { success: false, message: `获取普通token失败: ${tokenData.errmsg}`, details: tokenData };
    }

    const expiresIn = tokenData.expires_in || 7200;
    const cacheData = { access_token: tokenData.access_token, expires_at: Date.now() + (expiresIn - 300) * 1000 };
    await env.WECHAT_LOGIN_KV.put(cacheKey, JSON.stringify(cacheData), { expirationTtl: expiresIn - 300 });
    
    return { success: true, data: cacheData };
}

function parseXml(xmlString) {
    const result = {};
    const regex = /<(\w+?)>(?:<!\[CDATA\[(.*?)]]>|(.*?))<\/\1>/g;
    let match;
    while ((match = regex.exec(xmlString)) !== null) {
        result[match[1]] = match[2] || match[3];
    }
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