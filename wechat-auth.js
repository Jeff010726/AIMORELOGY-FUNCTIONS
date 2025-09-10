// 微信授权登录模块
class WechatAuth {
    constructor(appId, workerUrl) {
        this.appId = appId;
        this.workerUrl = workerUrl; // Cloudflare Workers API URL
        this.authUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize';
    }

    // 生成登录二维码URL - 通过Cloudflare Workers
    async generateAuthUrl(redirectUri, scope = 'snsapi_userinfo') {
        try {
            const response = await fetch(`${this.workerUrl}/wechat/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`);
            const data = await response.json();
            
            if (data.success) {
                // 保存state到localStorage
                localStorage.setItem('wechat_auth_state', data.state);
                return data.authUrl;
            } else {
                throw new Error(data.message || '生成授权链接失败');
            }
        } catch (error) {
            console.error('生成授权链接失败:', error);
            throw error;
        }
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
        if (state === savedState) {
            // 验证成功后清除state，防止重放攻击
            localStorage.removeItem('wechat_auth_state');
            return true;
        }
        return false;
    }

    // 管理员登录
    async adminLogin(username, password) {
        try {
            const response = await fetch(`${this.workerUrl}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('管理员登录失败:', error);
            throw error;
        }
    }

    // 完整的登录流程 - 通过Cloudflare Workers
    async handleAuthCallback(code, state) {
        try {
            // 1. 验证state
            if (!this.validateState(state)) {
                throw new Error('状态验证失败，可能存在安全风险');
            }

            // 2. 通过Cloudflare Workers处理授权
            const response = await fetch(`${this.workerUrl}/wechat/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('微信登录处理失败:', error);
            return {
                success: false,
                message: error.message || '登录失败，请重试'
            };
        }
    }
}

// The WechatAuth class is now globally available.
// Instantiation should be done in the script that uses it.
// Example:
// const wechatAuth = new WechatAuth('YOUR_APP_ID', 'YOUR_WORKER_URL');