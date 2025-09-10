document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const WECHAT_APPID = 'wx2e1f9ccab9e27176';
    const WORKER_URL = 'https://ecommerce-api.jeff010726bd.workers.dev';

    // --- DOM Elements ---
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginSection = document.getElementById('loginSection');
    const userSection = document.getElementById('userSection');
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    const userLevelEl = document.getElementById('userLevel');
    const userUsageEl = document.getElementById('userUsage');

    // --- Initialization ---
    const wechatAuth = new WechatAuth(WECHAT_APPID, WORKER_URL);
    let userInfo = null;

    // --- Functions ---
    function updateUI() {
        if (userInfo) {
            // Logged in
            loginSection.classList.add('hidden');
            userSection.classList.remove('hidden');
            userNameEl.textContent = userInfo.nickname || '微信用户';
            userAvatarEl.src = userInfo.headimgurl || '';
            userLevelEl.textContent = userInfo.level || '普通用户';
            userUsageEl.textContent = `剩余: ${userInfo.maxUsage - userInfo.usageCount}/${userInfo.maxUsage}`;
        } else {
            // Logged out
            loginSection.classList.remove('hidden');
            userSection.classList.add('hidden');
        }
    }

    function checkLoginStatus() {
        const storedData = localStorage.getItem('wechat_auth_result');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                if (data.success && data.userInfo) {
                    // Check if login is expired (e.g., > 24 hours)
                    const loginTime = data.userInfo.loginTime || 0;
                    if (Date.now() - loginTime > 24 * 60 * 60 * 1000) {
                        localStorage.removeItem('wechat_auth_result');
                        userInfo = null;
                    } else {
                        userInfo = data.userInfo;
                    }
                }
            } catch (e) {
                localStorage.removeItem('wechat_auth_result');
                userInfo = null;
            }
        }
        updateUI();
    }

    async function handleLogin() {
        try {
            // The redirect URI for GitHub Pages
            const redirectUri = 'https://jeff010726.github.io/AIMORELOGY-FUNCTIONS/wechat-callback.html';
            const authUrl = await wechatAuth.generateAuthUrl(redirectUri, 'snsapi_userinfo');
            // Redirect the entire page to the WeChat authorization URL
            window.location.href = authUrl;
        } catch (error) {
            console.error('无法启动微信登录:', error);
            alert('无法启动微信登录，请稍后重试。');
        }
    }

    function handleLogout() {
        localStorage.removeItem('wechat_auth_result');
        userInfo = null;
        updateUI();
        // Reload the page to ensure a clean state
        window.location.reload();
    }

    // --- Event Listeners ---
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Listen for login success message from callback (for popup flow, though we use redirect)
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'wechat_login_success') {
            userInfo = event.data.userInfo;
            // The callback page already saves to localStorage, so we just need to update the UI
            checkLoginStatus();
        }
    }, false);


    // --- Initial Load ---
    checkLoginStatus();
});