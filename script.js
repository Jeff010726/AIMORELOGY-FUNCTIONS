document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const CLIENT_VERSION = "v5-diagnostic";
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

    // Modal elements
    const loginModal = document.getElementById('loginModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const qrCodeContainer = document.getElementById('qrCode');
    const loginStatusEl = document.getElementById('loginStatus');

    // --- State ---
    let userInfo = null;
    let pollingInterval = null;

    // --- Functions ---
    function updateUI() {
        if (userInfo) {
            loginSection.classList.add('hidden');
            userSection.classList.remove('hidden');
            userNameEl.textContent = userInfo.nickname || '微信用户';
            userAvatarEl.src = userInfo.headimgurl || '';
            userLevelEl.textContent = userInfo.level || '普通用户';
            userUsageEl.textContent = `剩余: ${userInfo.maxUsage - userInfo.usageCount}/${userInfo.maxUsage}`;
        } else {
            loginSection.classList.remove('hidden');
            userSection.classList.add('hidden');
        }
    }

    function checkLoginStatus() {
        const storedData = localStorage.getItem('wechat_user_info');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                if (data.loginTime && (Date.now() - data.loginTime < 24 * 60 * 60 * 1000)) {
                    userInfo = data;
                } else {
                    localStorage.removeItem('wechat_user_info');
                }
            } catch (e) {
                localStorage.removeItem('wechat_user_info');
            }
        }
        updateUI();
    }

    function showModal() {
        loginModal.classList.remove('hidden');
    }

    function hideModal() {
        loginModal.classList.add('hidden');
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    async function startQrLogin() {
        showModal();
        qrCodeContainer.innerHTML = '<div class="loading-spinner"></div><p>正在生成二维码...</p>';
        loginStatusEl.innerHTML = '<div class="status-waiting"><i class="fas fa-mobile-alt"></i><p>等待扫码...</p></div>';

        try {
            const response = await fetch(`${WORKER_URL}/wechat/qr-login/start`);
            const data = await response.json();

            // --- DIAGNOSTIC LOG ---
            console.log('Data received from /wechat/qr-login/start:', JSON.stringify(data, null, 2));
            // --- END DIAGNOSTIC LOG ---

            if (response.ok && data.success) {
                qrCodeContainer.innerHTML = `<img src="${data.qrCodeUrl}" alt="微信登录二维码" style="width: 100%; height: 100%;">`;
                startPolling(data.sceneId); 
            } else {
                qrCodeContainer.innerHTML = `<p style="color: red;">二维码生成失败: ${data.message || '未知错误'}</p>`;
            }
        } catch (error) {
            console.error('获取二维码失败:', error);
            qrCodeContainer.innerHTML = `<p style="color: red;">无法连接到登录服务，请稍后重试。</p>`;
        }
    }

    function startPolling(sceneId) {
        if (pollingInterval) clearInterval(pollingInterval);

        const startTime = Date.now();
        const timeout = 300 * 1000; // 5 minutes

        pollingInterval = setInterval(async () => {
            if (Date.now() - startTime > timeout) {
                clearInterval(pollingInterval);
                loginStatusEl.innerHTML = '<p style="color: red;">二维码已过期，请关闭后重试。</p>';
                return;
            }

            try {
                const response = await fetch(`${WORKER_URL}/wechat/qr-login/status?sceneId=${sceneId}`);
                if (!response.ok) return;

                const data = await response.json();
                if (!data.success) return;

                switch (data.status) {
                    case 'SUCCESS':
                        clearInterval(pollingInterval);
                        loginStatusEl.innerHTML = '<p style="color: #00ff88;">登录成功！正在刷新...</p>';
                        
                        const fullUserInfo = {
                            ...data.userInfo,
                            level: determineUserLevel(data.userInfo),
                            usageCount: 0,
                            maxUsage: getMaxUsageByLevel(determineUserLevel(data.userInfo)),
                            loginTime: Date.now()
                        };
                        localStorage.setItem('wechat_user_info', JSON.stringify(fullUserInfo));
                        
                        setTimeout(() => {
                            hideModal();
                            window.location.reload();
                        }, 1500);
                        break;
                    case 'SCANNED':
                        loginStatusEl.innerHTML = '<div class="status-waiting"><i class="fas fa-check-circle" style="color: #00ff88;"></i><p>扫码成功，等待服务器处理...</p></div>';
                        break;
                    case 'EXPIRED':
                        clearInterval(pollingInterval);
                        loginStatusEl.innerHTML = '<p style="color: red;">二维码已过期，请关闭后重试。</p>';
                        break;
                    case 'ERROR':
                        clearInterval(pollingInterval);
                        loginStatusEl.innerHTML = `<p style="color: red;">登录失败: ${data.message || '未知后台错误'}</p>`;
                        break;
                    case 'PENDING':
                    default:
                        // Keep waiting
                        break;
                }
            } catch (error) {
                // Silently ignore network errors and retry
            }
        }, 2500); // Poll every 2.5 seconds
    }

    function determineUserLevel(userInfo) {
        if (userInfo.is_admin) return 'Admin';
        if (userInfo.subscribe_time) {
            const days = (Date.now() / 1000 - userInfo.subscribe_time) / 86400;
            if (days > 365) return 'SVIP';
            if (days > 30) return 'VIP';
        }
        return '普通用户';
    }

    function getMaxUsageByLevel(level) {
        const limits = { '普通用户': 10, 'VIP': 50, 'SVIP': 200, 'Admin': 999999 };
        return limits[level] || 10;
    }

    function handleLogout() {
        localStorage.removeItem('wechat_user_info');
        userInfo = null;
        updateUI();
        window.location.reload();
    }

    // --- Event Listeners ---
    loginBtn.addEventListener('click', startQrLogin);
    logoutBtn.addEventListener('click', handleLogout);
    modalOverlay.addEventListener('click', hideModal);
    modalClose.addEventListener('click', hideModal);

    // --- Version Diagnostics ---
    async function displayVersion() {
        const clientVersionEl = document.getElementById('client-version');
        const workerVersionEl = document.getElementById('worker-version');
        
        if (clientVersionEl) clientVersionEl.textContent = CLIENT_VERSION;
        if (!workerVersionEl) return;

        try {
            const response = await fetch(`${WORKER_URL}/version`);
            if (response.ok) {
                const data = await response.json();
                workerVersionEl.textContent = data.version || 'unknown';
            } else {
                workerVersionEl.textContent = `Error ${response.status}`;
            }
        } catch (e) {
            workerVersionEl.textContent = 'Unreachable';
        }
    }

    // --- Initial Load ---
    checkLoginStatus();
    displayVersion();
});