// 微信授权登录模块
class WechatAuth {
    constructor(appId, appSecret) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.baseUrl = 'https://api.weixin.qq.com';
        this.authUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize';
    }

    // 生成登录二维码URL
    generateAuthUrl(redirectUri, scope = 'snsapi_userinfo') {
        const state = this.generateState();
        localStorage.setItem('wechat_auth_state', state);
        
        const params = new URLSearchParams({
            appid: this.appId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scope,
            state: state
        });

        return `${this.authUrl}?${params.toString()}#wechat_redirect`;
    }

    // 生成随机状态码
    generateState() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15) + 
               Date.now().toString(36);
    }

    // 验证状态码
    validateState(state) {
        const savedState = localStorage.getItem('wechat_auth_state');
        return state === savedState;
    }

    // 通过code获取access_token和openid
    async getAccessToken(code) {
        const params = new URLSearchParams({
            appid: this.appId,
            secret: this.appSecret,
            code: code,
            grant_type: 'authorization_code'
        });

        try {
            const response = await fetch(`${this.baseUrl}/sns/oauth2/access_token?${params.toString()}`);
            const data = await response.json();
            
            if (data.errcode) {
                throw new Error(`获取access_token失败: ${data.errmsg}`);
            }
            
            return data;
        } catch (error) {
            console.error('获取access_token错误:', error);
            throw error;
        }
    }

    // 获取用户基本信息
    async getUserInfo(accessToken, openid) {
        const params = new URLSearchParams({
            access_token: accessToken,
            openid: openid,
            lang: 'zh_CN'
        });

        try {
            const response = await fetch(`${this.baseUrl}/sns/userinfo?${params.toString()}`);
            const data = await response.json();
            
            if (data.errcode) {
                throw new Error(`获取用户信息失败: ${data.errmsg}`);
            }
            
            return data;
        } catch (error) {
            console.error('获取用户信息错误:', error);
            throw error;
        }
    }

    // 检查用户是否关注公众号（需要服务号access_token）
    async checkSubscription(openid, serviceAccessToken) {
        const params = new URLSearchParams({
            access_token: serviceAccessToken,
            openid: openid,
            lang: 'zh_CN'
        });

        try {
            const response = await fetch(`${this.baseUrl}/cgi-bin/user/info?${params.toString()}`);
            const data = await response.json();
            
            if (data.errcode) {
                // 如果是48001错误，说明用户未关注
                if (data.errcode === 48001) {
                    return { subscribe: 0, message: '用户未关注公众号' };
                }
                throw new Error(`检查关注状态失败: ${data.errmsg}`);
            }
            
            return data;
        } catch (error) {
            console.error('检查关注状态错误:', error);
            throw error;
        }
    }

    // 获取服务号access_token
    async getServiceAccessToken() {
        const params = new URLSearchParams({
            grant_type: 'client_credential',
            appid: this.appId,
            secret: this.appSecret
        });

        try {
            const response = await fetch(`${this.baseUrl}/cgi-bin/token?${params.toString()}`);
            const data = await response.json();
            
            if (data.errcode) {
                throw new Error(`获取服务号access_token失败: ${data.errmsg}`);
            }
            
            return data.access_token;
        } catch (error) {
            console.error('获取服务号access_token错误:', error);
            throw error;
        }
    }

    // 完整的登录流程
    async handleAuthCallback(code, state) {
        try {
            // 1. 验证state
            if (!this.validateState(state)) {
                throw new Error('状态验证失败，可能存在安全风险');
            }

            // 2. 获取access_token和openid
            const tokenData = await this.getAccessToken(code);
            
            // 3. 获取用户基本信息
            const userInfo = await this.getUserInfo(tokenData.access_token, tokenData.openid);
            
            // 4. 获取服务号access_token
            const serviceToken = await this.getServiceAccessToken();
            
            // 5. 检查用户是否关注公众号
            const subscriptionInfo = await this.checkSubscription(tokenData.openid, serviceToken);
            
            // 6. 判断是否已关注
            if (subscriptionInfo.subscribe !== 1) {
                return {
                    success: false,
                    message: '请先关注我们的微信服务号后再登录',
                    needSubscribe: true,
                    qrCodeUrl: 'qrcode_for_gh_ede2796af721_258.jpg'
                };
            }

            // 7. 登录成功，返回用户信息
            return {
                success: true,
                userInfo: {
                    openid: tokenData.openid,
                    nickname: userInfo.nickname,
                    headimgurl: userInfo.headimgurl,
                    sex: userInfo.sex,
                    city: userInfo.city,
                    province: userInfo.province,
                    country: userInfo.country,
                    subscribe: subscriptionInfo.subscribe,
                    subscribe_time: subscriptionInfo.subscribe_time
                }
            };

        } catch (error) {
            console.error('微信登录处理失败:', error);
            return {
                success: false,
                message: error.message || '登录失败，请重试'
            };
        }
    }
}

// 导出微信授权实例
const wechatAuth = new WechatAuth(WECHAT_APPID, WECHAT_SECRET);