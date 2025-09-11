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

        // --- DIAGNOSTIC LOG ---
        console.log(`[Polling Setup] startPolling called with sceneId: '${sceneId}' (Type: ${typeof sceneId})`);
        if (!sceneId) {
            console.error("[Polling Setup] CRITICAL: sceneId is empty or undefined. Polling will not start.");
            loginStatusEl.innerHTML = `<p style="color: red;">前端错误：无法获取场景ID，请刷新重试。</p>`;
            return;
        }
        // --- END DIAGNOSTIC LOG ---

        const startTime = Date.now();
        const timeout = 300 * 1000; // 5 minutes

        pollingInterval = setInterval(async () => {
            if (Date.now() - startTime > timeout) {
                clearInterval(pollingInterval);
                loginStatusEl.innerHTML = '<p style="color: red;">二维码已过期，请关闭后重试。</p>';
                return;
            }

            const statusUrl = `${WORKER_URL}/wechat/qr-login/status?sceneId=${sceneId}`;
            
            // --- DIAGNOSTIC LOG ---
            console.log(`[Polling] Checking URL: ${statusUrl}`);
            // --- END DIAGNOSTIC LOG ---

            try {
                const response = await fetch(statusUrl);
                if (!response.ok) {
                    console.error(`[Polling] Error: Fetch failed with status ${response.status} for URL: ${statusUrl}`);
                    // Stop polling on critical errors like 404
                    if(response.status === 404) {
                        clearInterval(pollingInterval);
                        loginStatusEl.innerHTML = `<p style="color: red;">前端错误：请求地址不存在，请联系管理员。</p>`;
                    }
                    return;
                }

                const data = await response.json();
                if (!data.success) {
                    console.warn(`[Polling] API returned success:false. Message: ${data.message}`);
                    return;
                }

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
                console.error('[Polling] CRITICAL: An unexpected error occurred during fetch:', error);
                clearInterval(pollingInterval); // Stop polling on unexpected errors
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

    // --- Live Log Viewer ---
    let logPollingInterval = null;

    function setupLogViewer() {
        // 1. Inject CSS
        const logStyles = `
            #log-toggle-btn { position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 50%; background-color: #6c757d; color: white; border: none; font-size: 24px; cursor: pointer; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
            #log-viewer-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 1001; display: flex; justify-content: center; align-items: center; }
            #log-viewer-container.hidden { display: none; }
            #log-viewer-content-wrapper { background-color: #282c34; color: #abb2bf; width: 80vw; max-width: 1200px; height: 80vh; padding: 20px; border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
            #log-viewer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 10px; }
            #log-viewer-header h3 { margin: 0; color: white; }
            #log-viewer-close { background: none; border: none; color: white; font-size: 28px; cursor: pointer; line-height: 1; }
            #log-content { flex-grow: 1; overflow-y: auto; white-space: pre-wrap; word-break: break-all; font-family: 'Courier New', Courier, monospace; font-size: 14px; }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = logStyles;
        document.head.appendChild(styleSheet);

        // 2. Inject HTML
        const logContainer = document.createElement('div');
        logContainer.id = 'log-viewer-container';
        logContainer.className = 'hidden';
        logContainer.innerHTML = `
            <div id="log-viewer-content-wrapper">
                <div id="log-viewer-header">
                    <h3>Backend Logs</h3>
                    <div>
                        <button id="clear-logs-btn" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; margin-right: 10px; border-radius: 4px; cursor: pointer;">🗑️ Clear</button>
                        <button id="log-viewer-close">&times;</button>
                    </div>
                </div>
                <pre id="log-content">Fetching logs...</pre>
            </div>
        `;
        document.body.appendChild(logContainer);

        const logToggleBtn = document.createElement('button');
        logToggleBtn.id = 'log-toggle-btn';
        logToggleBtn.innerHTML = '📜';
        document.body.appendChild(logToggleBtn);

        // 3. Add Event Listeners
        const logContentEl = document.getElementById('log-content');

        logToggleBtn.addEventListener('click', () => {
            logContainer.classList.remove('hidden');
            startLogPolling(logContentEl);
        });

        document.getElementById('log-viewer-close').addEventListener('click', () => {
            logContainer.classList.add('hidden');
            stopLogPolling();
        });

        document.getElementById('clear-logs-btn').addEventListener('click', async () => {
            try {
                const response = await fetch(`${WORKER_URL}/clear-logs`, { method: 'POST' });
                if (response.ok) {
                    logContentEl.textContent = 'Logs cleared successfully.';
                    // Refresh logs after a short delay
                    setTimeout(() => fetchLogs(logContentEl), 1000);
                } else {
                    logContentEl.textContent = `Error clearing logs: HTTP ${response.status}`;
                }
            } catch (e) {
                logContentEl.textContent = `Error clearing logs: ${e.message}`;
            }
        });
    }

    async function fetchLogs(logContentEl) {
        try {
            const response = await fetch(`${WORKER_URL}/logs`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.logs)) {
                    logContentEl.textContent = data.logs.join('\
');
                } else {
                    logContentEl.textContent = 'Failed to parse logs from response.';
                }
            } else {
                logContentEl.textContent = `Error fetching logs: HTTP ${response.status}`;
            }
        } catch (e) {
            logContentEl.textContent = `Error fetching logs: ${e.message}`;
        }
    }

    function startLogPolling(logContentEl) {
        if (logPollingInterval) clearInterval(logPollingInterval);
        fetchLogs(logContentEl); // Fetch immediately
        logPollingInterval = setInterval(() => fetchLogs(logContentEl), 3000); // Poll every 3 seconds
    }

    function stopLogPolling() {
        if (logPollingInterval) clearInterval(logPollingInterval);
        logPollingInterval = null;
    }

    // --- Initial Load ---
    checkLoginStatus();
    displayVersion();
    setupLogViewer();
});