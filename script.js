// 全局变量
const API_KEY = 'sk-bfb1a4a3455940aa97488e61bf6ee924';
const API_BASE_URL = 'https://api.deepseek.com';
const CLOUDFLARE_API_KEY = 'dNaHg1q97C5Dj1Wp03coClDnv9_am9FVNjuy4X_9';
const WECHAT_APPID = 'wx2e1f9ccab9e27176';
const WECHAT_SECRET = '2b0086643a47fe0de574efbfc27c0718';

// 用户管理相关变量
let currentUser = null;
let userUsageCount = 0;
let maxUsageCount = 10;

// 管理员账号信息
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'Blackrail200107.'
};

// DOM 元素
const generateBtn = document.getElementById('generateBtn');
const loadingAnimation = document.getElementById('loadingAnimation');
const resultContainer = document.getElementById('resultContainer');
const resultContent = document.getElementById('resultContent');
const copyBtn = document.getElementById('copyBtn');
const regenerateBtn = document.getElementById('regenerateBtn');

// 输入元素
const topicInput = document.getElementById('topic');
const referenceInput = document.getElementById('reference');
const minWordsInput = document.getElementById('minWords');
const maxWordsInput = document.getElementById('maxWords');

// 内置写作风格提示词模板
const WRITING_STYLE_PROMPT = `可以考虑以下几点：
• 标题要敢拍桌子，但正文一定要有货。
• 行文像闲聊，不要一板一眼。
• 保持一点点中年人的"丧"感和幽默感，亲近但不油腻。语气自然。
• 内容层次分明，每一节展开要自然，有事实
• 行文以连贯自然的叙事为主，关键的信息用列表（如1.2.3、bullet points等），多用顺滑的长段落推进思路。
• 节奏控制得当，既有硬核干货，又有情绪渲染，但情绪不过界，点到为止。
• 适当穿插冷知识、行业内幕、历史故事，让读者在阅读过程中不断产生"原来如此"的满足感。
• 最后总结要克制收束，避免高举高打，用真实而冷静的话收尾。
特别注意：
• 逻辑严谨，事实准确，专业而通俗，兼具行业内行和普通读者的双重可读性。
• 关键的信息用 list，不用 Emoji
• 字数充实，根据主题深度，适当延伸到##MIN_WORDS##-##MAX_WORDS##字，不求快，只求沉稳有力。`;

// 事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 生成按钮点击事件
    generateBtn.addEventListener('click', handleGenerate);
    
    // 复制按钮点击事件
    copyBtn.addEventListener('click', handleCopy);
    
    // 重新生成按钮点击事件
    regenerateBtn.addEventListener('click', handleRegenerate);
    
    // 输入验证
    setupInputValidation();
    
    // 初始化用户系统
    initializeUserSystem();
    
    // 初始化导航栏
    initializeNavigation();
    
    // 检查URL参数中的微信授权回调
    checkWechatAuthCallback();
    
    // 监听来自授权窗口的消息
    window.addEventListener('message', handleAuthMessage);
});

// 检查微信授权回调
function checkWechatAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
        const savedState = localStorage.getItem('wechat_state');
        if (state === savedState) {
            // 处理授权成功
            handleWechatAuthCode(code);
            
            // 清理URL参数
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }
}

// 处理来自授权窗口的消息
function handleAuthMessage(event) {
    if (event.data.type === 'wechat_auth_success') {
        handleWechatAuthCode(event.data.code);
    }
}

// 处理微信授权码
async function handleWechatAuthCode(code) {
    try {
        showNotification('正在获取用户信息...', 'info');
        
        // 由于CORS限制，这里需要通过后端代理或使用JSONP
        // 暂时使用模拟数据，实际部署时需要后端支持
        const userInfo = await simulateWechatUserInfo(code);
        
        handleWechatLoginSuccess(userInfo);
        
        // 关闭登录弹窗
        const loginModal = document.getElementById('loginModal');
        hideModal(loginModal);
        
    } catch (error) {
        console.error('获取用户信息失败:', error);
        showNotification('登录失败，请重试', 'error');
    }
}

// 模拟微信用户信息获取（实际应通过后端实现）
async function simulateWechatUserInfo(code) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 返回模拟用户信息
    return {
        openid: 'wx_' + code.substring(0, 8) + '_' + Date.now(),
        nickname: '微信用户' + Math.floor(Math.random() * 1000),
        headimgurl: '',
        level: '普通用户'
    };
}

// 设置输入验证
function setupInputValidation() {
    // 字数限制验证
    minWordsInput.addEventListener('input', validateWordCount);
    maxWordsInput.addEventListener('input', validateWordCount);
}

// 验证字数设置
function validateWordCount() {
    const minWords = parseInt(minWordsInput.value) || 0;
    const maxWords = parseInt(maxWordsInput.value) || 0;
    
    if (minWords > maxWords && maxWords > 0) {
        maxWordsInput.value = minWords;
    }
}

// 处理生成请求
async function handleGenerate() {
    // 检查使用次数限制
    if (!checkUsageLimit()) {
        return;
    }
    
    // 获取输入值
    const topic = topicInput.value.trim();
    const reference = referenceInput.value.trim();
    const minWords = parseInt(minWordsInput.value) || 800;
    const maxWords = parseInt(maxWordsInput.value) || 1500;
    
    // 验证输入
    if (!topic) {
        showNotification('请输入文章主题或内容', 'warning');
        topicInput.focus();
        return;
    }
    
    // 构建提示词
    const prompt = buildPrompt(topic, reference, minWords, maxWords);
    
    // 显示加载状态
    showLoading();
    
    // 增加使用次数
    incrementUsageCount();
    
    try {
        // 调用 DeepSeek API
        await generateArticle(prompt);
    } catch (error) {
        console.error('生成文章时出错:', error);
        hideLoading();
        alert('生成失败，请检查网络连接或稍后重试');
    }
}

// 构建完整提示词
function buildPrompt(topic, reference, minWords, maxWords) {
    let prompt = `请根据以下要求创作一篇公众号文章：

主题/内容：${topic}`;
    
    if (reference) {
        prompt += `\n\n参考文章：${reference}`;
    }
    
    // 替换字数占位符
    const stylePrompt = WRITING_STYLE_PROMPT
        .replace('##MIN_WORDS##', minWords)
        .replace('##MAX_WORDS##', maxWords);
    
    prompt += `\n\n写作要求：\n${stylePrompt}`;
    
    return prompt;
}

// 显示加载状态
function showLoading() {
    generateBtn.disabled = true;
    generateBtn.querySelector('.btn-text').textContent = '生成中...';
    loadingAnimation.classList.remove('hidden');
    resultContainer.classList.add('hidden');
}

// 隐藏加载状态
function hideLoading() {
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-text').textContent = '生成爆文';
    loadingAnimation.classList.add('hidden');
}

// 生成文章（流式请求）
async function generateArticle(prompt) {
    try {
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                stream: true,
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 处理流式响应
        await handleStreamResponse(response);
        
    } catch (error) {
        console.error('API调用失败:', error);
        throw error;
    }
}

// 处理流式响应
async function handleStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    // 隐藏加载动画，显示结果容器
    hideLoading();
    resultContainer.classList.remove('hidden');
    resultContent.textContent = '';
    
    let buffer = '';
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // 保留不完整的行
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            // 实时显示生成的内容
                            resultContent.textContent += content;
                            // 自动滚动到底部
                            resultContent.scrollTop = resultContent.scrollHeight;
                        }
                    } catch (e) {
                        // 忽略解析错误，继续处理下一行
                        console.warn('解析SSE数据失败:', e);
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

// 处理复制功能
async function handleCopy() {
    const content = resultContent.textContent;
    if (!content) {
        alert('没有可复制的内容');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(content);
        
        // 显示复制成功反馈
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '已复制';
        copyBtn.style.background = '#28a745';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '';
        }, 2000);
        
    } catch (error) {
        console.error('复制失败:', error);
        
        // 降级方案：选择文本
        const range = document.createRange();
        range.selectNodeContents(resultContent);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        alert('请手动复制选中的文本');
    }
}

// 处理重新生成
function handleRegenerate() {
    if (confirm('确定要重新生成文章吗？')) {
        handleGenerate();
    }
}

// 工具函数：防抖
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 添加输入框字符计数（可选功能）
function addCharacterCount() {
    const inputs = [topicInput, referenceInput];
    
    inputs.forEach(input => {
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.style.cssText = `
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.5);
            text-align: right;
            margin-top: 4px;
        `;
        
        const updateCounter = () => {
            const length = input.value.length;
            counter.textContent = `${length} 字符`;
        };
        
        input.addEventListener('input', updateCounter);
        input.parentNode.appendChild(counter);
        updateCounter();
    });
}

// 初始化字符计数（可选）
// addCharacterCount();

// ==================== 用户管理系统 ====================

// 初始化用户系统
function initializeUserSystem() {
    const loginBtn = document.getElementById('loginBtn');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // 登录按钮事件
    if (loginBtn) {
        loginBtn.addEventListener('click', showWechatLogin);
        
        // 双击显示管理员按钮
        loginBtn.addEventListener('dblclick', () => {
            if (adminBtn) {
                adminBtn.classList.remove('hidden');
            }
        });
    }
    
    // 管理员按钮事件
    if (adminBtn) {
        adminBtn.addEventListener('click', showAdminLogin);
    }
    
    // 退出登录事件
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // 初始化弹窗事件
    initializeModals();
    
    // 检查本地存储的用户信息
    checkStoredUser();
}

// 初始化导航栏功能
function initializeNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // 移动端菜单切换
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // 点击页面其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
    
    // 导航链接点击处理
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // 移除所有活动状态
            navLinks.forEach(l => l.classList.remove('active'));
            // 添加当前活动状态
            link.classList.add('active');
            
            // 关闭移动端菜单
            if (navToggle && navMenu) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
            
            // 如果是外部链接，检查页面是否存在
            if (link.getAttribute('href').includes('.html')) {
                e.preventDefault();
                showComingSoon();
            }
        });
    });
}

// 初始化弹窗功能
function initializeModals() {
    const loginModal = document.getElementById('loginModal');
    const adminModal = document.getElementById('adminModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const adminOverlay = document.getElementById('adminOverlay');
    const modalClose = document.getElementById('modalClose');
    const adminClose = document.getElementById('adminClose');
    const adminForm = document.getElementById('adminForm');
    
    // 关闭弹窗事件
    [modalClose, modalOverlay].forEach(element => {
        if (element) {
            element.addEventListener('click', () => hideModal(loginModal));
        }
    });
    
    [adminClose, adminOverlay].forEach(element => {
        if (element) {
            element.addEventListener('click', () => hideModal(adminModal));
        }
    });
    
    // 管理员表单提交
    if (adminForm) {
        adminForm.addEventListener('submit', handleAdminLogin);
    }
    
    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal(loginModal);
            hideModal(adminModal);
        }
    });
}

// 显示微信登录弹窗
function showWechatLogin() {
    const loginModal = document.getElementById('loginModal');
    showModal(loginModal);
    generateWechatAuthQR();
}

// 显示管理员登录弹窗
function showAdminLogin() {
    const adminModal = document.getElementById('adminModal');
    showModal(adminModal);
}

// 显示弹窗
function showModal(modal) {
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// 隐藏弹窗
function hideModal(modal) {
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// 生成微信授权二维码
function generateWechatAuthQR() {
    const qrCode = document.getElementById('qrCode');
    
    try {
        // 生成授权URL
        const state = generateRandomState();
        localStorage.setItem('wechat_auth_state', state);
        
        // 使用配置的授权回调域名（需要在微信公众平台后台配置）
        const redirectUri = encodeURIComponent('https://jeff010726.github.io/AIMORELOGY-FUNCTIONS/wechat-callback.html');
        const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
        
        // 显示加载状态
        qrCode.innerHTML = `
            <div class="qr-loading">
                <div class="loading-spinner"></div>
                <p>正在生成登录二维码...</p>
            </div>
        `;
        
        setTimeout(() => {
            // 生成二维码图片
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(authUrl)}`;
            
            qrCode.innerHTML = `
                <div class="qr-container">
                    <img src="${qrApiUrl}" alt="微信登录二维码" class="qr-image">
                    <p class="qr-instruction">请使用微信扫描二维码</p>
                    <p class="qr-note">扫码后需要关注服务号才能登录</p>
                    <button class="auth-direct-btn" onclick="openWechatAuth('${authUrl}')">
                        <i class="fas fa-external-link-alt"></i>
                        直接授权登录
                    </button>
                </div>
            `;
            
            // 开始轮询检查登录状态
            startWechatLoginPolling();
        }, 1000);
        
    } catch (error) {
        console.error('生成微信授权二维码失败:', error);
        qrCode.innerHTML = `
            <div style="text-align: center; color: #ff3366;">
                <p>生成二维码失败，请重试</p>
                <button onclick="generateWechatAuthQR()" style="margin-top: 10px; padding: 8px 16px; background: #00ff88; color: #0a0a0f; border: none; border-radius: 4px; cursor: pointer;">重新生成</button>
            </div>
        `;
    }
}

// 打开微信授权页面
function openWechatAuth(authUrl) {
    // 在新窗口中打开微信授权页面
    const authWindow = window.open(authUrl, 'wechat_auth', 'width=400,height=600,scrollbars=yes,resizable=yes');
    
    // 监听授权窗口关闭
    const checkClosed = setInterval(() => {
        if (authWindow.closed) {
            clearInterval(checkClosed);
            // 检查是否有授权结果
            setTimeout(() => {
                checkWechatAuthResult();
            }, 1000);
        }
    }, 1000);
}

// 打开微信授权页面
function openWechatAuth(authUrl) {
    try {
        // 在新窗口中打开微信授权页面
        const authWindow = window.open(authUrl, 'wechat_auth', 'width=400,height=600,scrollbars=yes,resizable=yes');
        
        if (!authWindow) {
            throw new Error('无法打开授权窗口，请检查浏览器弹窗设置');
        }
        
        // 监听授权窗口关闭
        const checkClosed = setInterval(() => {
            if (authWindow.closed) {
                clearInterval(checkClosed);
                // 检查是否有授权结果
                setTimeout(() => {
                    checkWechatAuthResult();
                }, 1000);
            }
        }, 1000);
        
    } catch (error) {
        console.error('打开微信授权页面失败:', error);
        showNotification('打开授权页面失败: ' + error.message, 'error');
    }
}

// 开始微信登录轮询
function startWechatLoginPolling() {
    const pollInterval = setInterval(() => {
        checkWechatAuthResult();
    }, 2000);
    
    // 存储轮询ID
    localStorage.setItem('wechat_poll_interval', pollInterval);
    
    // 5分钟后停止轮询
    setTimeout(() => {
        clearInterval(pollInterval);
        localStorage.removeItem('wechat_poll_interval');
        showQRCodeExpired();
    }, 300000);
}

// 检查微信授权结果
function checkWechatAuthResult() {
    const authResult = localStorage.getItem('wechat_auth_result');
    
    if (authResult) {
        try {
            const result = JSON.parse(authResult);
            
            if (result.success) {
                // 登录成功
                handleWechatLoginSuccess(result.userInfo);
            } else {
                // 登录失败
                showNotification(result.message || '登录失败，请重试', 'error');
            }
            
            // 清理授权结果
            localStorage.removeItem('wechat_auth_result');
            
            // 停止轮询
            const pollInterval = localStorage.getItem('wechat_poll_interval');
            if (pollInterval) {
                clearInterval(parseInt(pollInterval));
                localStorage.removeItem('wechat_poll_interval');
            }
            
            // 关闭登录弹窗
            const loginModal = document.getElementById('loginModal');
            hideModal(loginModal);
            
        } catch (error) {
            console.error('解析授权结果失败:', error);
        }
    }
}

    const qrCode = document.getElementById('qrCode');
    
    // 生成微信授权登录二维码
    const state = generateRandomState();
    localStorage.setItem('wechat_login_state', state);
    
    // 构建微信授权URL
    const redirectUri = encodeURIComponent(window.location.origin + '/wechat-callback.html');
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
    
    setTimeout(() => {
        qrCode.innerHTML = `
            <div class="qr-code-container">
                <div id="qrCodeImage"></div>
                <p class="qr-instruction">请使用微信扫描二维码</p>
                <p class="qr-note">扫码后需要关注服务号才能登录</p>
=======
    const qrCode = document.getElementById('qrCode');
    
    // 生成微信授权登录二维码
    const state = generateRandomState();
    localStorage.setItem('wechat_login_state', state);
    
    // 构建微信授权URL
    const redirectUri = encodeURIComponent(window.location.origin + '/wechat-callback.html');
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
    
    setTimeout(() => {
        qrCode.innerHTML = `
            <div class="qr-code-container">
                <div id="qrCodeImage"></div>
                <p class="qr-instruction">请使用微信扫描二维码</p>
                <p class="qr-note">扫码后需要关注服务号才能登录</p>
            </div>
        `;
        
        // 生成二维码图片
        generateQRCodeImage(authUrl);
        
        // 开始轮询检查登录状态
        startWechatLoginPolling();
    }, 500);
=======
// 生成微信登录二维码（旧版本，保持兼容性）
function generateQRCode() {
    // 重定向到新的授权函数
    generateWechatAuthQR();
=======
    const qrCode = document.getElementById('qrCode');
    
    // 生成微信授权登录二维码
    const state = generateRandomState();
    localStorage.setItem('wechat_login_state', state);
    
    // 构建微信授权URL
    const redirectUri = encodeURIComponent(window.location.origin + '/wechat-callback.html');
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
    
    setTimeout(() => {
        qrCode.innerHTML = `
            <div class="qr-code-container">
                <div id="qrCodeImage"></div>
                <p class="qr-instruction">请使用微信扫描二维码</p>
                <p class="qr-note">扫码后需要关注服务号才能登录</p>
            </div>
        `;
        
        // 生成二维码图片
        generateQRCodeImage(authUrl);
        
        // 开始轮询检查登录状态
        startWechatLoginPolling();
    }, 500);
}

// 生成二维码图片
function generateQRCodeImage(url) {
    const qrCodeImage = document.getElementById('qrCodeImage');
    
    // 使用第三方二维码生成服务
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
    
    qrCodeImage.innerHTML = `
        <img src="${qrApiUrl}" alt="微信登录二维码" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0.5rem; border: 2px solid #00ff88;">
    `;
}

// 开始微信登录轮询检测
function startWechatLoginPolling() {
    let pollCount = 0;
    const maxPolls = 120; // 10分钟超时
    
    const pollInterval = setInterval(async () => {
        pollCount++;
        
        try {
            // 调用微信服务号API检查登录状态
            const loginStatus = await checkWechatLoginStatus();
            
            if (loginStatus.success) {
                clearInterval(pollInterval);
                handleWechatLoginSuccess(loginStatus.userInfo);
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
        }
        
        if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            showQRCodeExpired();
        }
    }, 5000); // 每5秒检查一次
}

// 检查微信登录状态
async function checkWechatLoginStatus() {
    // 这里应该调用您的后端API来检查微信登录状态
    // 由于是纯前端实现，我们需要使用微信公众号的网页授权
    
    // 生成微信授权链接
    const redirectUri = encodeURIComponent(window.location.origin + '/wechat-callback.html');
    const state = generateRandomState();
    
    // 保存state到localStorage用于验证
    localStorage.setItem('wechat_state', state);
    
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
    
    // 由于是纯前端，我们需要引导用户手动授权
    // 这里返回一个模拟的检查结果，实际应该通过后端API实现
    return new Promise((resolve) => {
        // 检查是否有授权回调信息
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code && state === localStorage.getItem('wechat_state')) {
            // 有授权码，获取用户信息
            getWechatUserInfo(code).then(userInfo => {
                resolve({
                    success: true,
                    userInfo: userInfo
                });
            }).catch(() => {
                resolve({ success: false });
            });
        } else {
            resolve({ success: false });
        }
    });
}

// 获取微信用户信息
async function getWechatUserInfo(code) {
    try {
        // 第一步：通过code获取access_token
        const tokenResponse = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`);
        const tokenData = await tokenResponse.json();
        
        if (tokenData.errcode) {
            throw new Error('获取access_token失败: ' + tokenData.errmsg);
        }
        
        // 第二步：通过access_token获取用户信息
        const userResponse = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`);
        const userData = await userResponse.json();
        
        if (userData.errcode) {
            throw new Error('获取用户信息失败: ' + userData.errmsg);
        }
        
        return {
            openid: userData.openid,
            nickname: userData.nickname,
            headimgurl: userData.headimgurl,
            level: '普通用户'
        };
    } catch (error) {
        console.error('获取微信用户信息失败:', error);
        throw error;
    }
}

// 生成随机状态码
function generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 微信授权登录（直接跳转方式）
function redirectToWechatAuth() {
    const redirectUri = encodeURIComponent(window.location.origin);
    const state = generateRandomState();
    localStorage.setItem('wechat_state', state);
    
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
    
    // 在新窗口打开授权页面
    const authWindow = window.open(authUrl, 'wechat_auth', 'width=400,height=600');
    
    // 监听授权窗口关闭
    const checkClosed = setInterval(() => {
        if (authWindow.closed) {
            clearInterval(checkClosed);
            // 检查是否授权成功
            setTimeout(() => {
                checkWechatLoginStatus().then(result => {
                    if (result.success) {
                        handleWechatLoginSuccess(result.userInfo);
                    }
                });
            }, 1000);
        }
    }, 1000);
}

// 处理微信登录成功
function handleWechatLoginSuccess(userInfo) {
    currentUser = {
        ...userInfo,
        loginType: 'wechat',
        usageCount: getUserUsageCount(userInfo.openid),
        maxUsage: getMaxUsageByLevel(userInfo.level)
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateUserUI();
    hideModal(document.getElementById('loginModal'));
    showNotification('登录成功！', 'success');
}

// 处理管理员登录
function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        currentUser = {
            openid: 'admin',
            nickname: '管理员',
            headimgurl: '',
            level: 'Admin',
            loginType: 'admin',
            usageCount: 0,
            maxUsage: -1
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserUI();
        hideModal(document.getElementById('adminModal'));
        showNotification('管理员登录成功！', 'success');
    } else {
        showNotification('用户名或密码错误！', 'error');
    }
}

// 退出登录
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUserUI();
    showNotification('已退出登录', 'info');
}

// 检查本地存储的用户信息
function checkStoredUser() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            updateUserUI();
        } catch (e) {
            console.error('解析用户信息失败:', e);
            localStorage.removeItem('currentUser');
        }
    }
}

// 更新用户界面
function updateUserUI() {
    const loginSection = document.getElementById('loginSection');
    const userSection = document.getElementById('userSection');
    const userName = document.getElementById('userName');
    const userLevel = document.getElementById('userLevel');
    const userUsage = document.getElementById('userUsage');
    const userAvatar = document.getElementById('userAvatar');
    
    if (currentUser) {
        loginSection.classList.add('hidden');
        userSection.classList.remove('hidden');
        
        userName.textContent = currentUser.nickname;
        userLevel.textContent = currentUser.level;
        
        if (currentUser.maxUsage === -1) {
            userUsage.textContent = '无限制';
        } else {
            const remaining = currentUser.maxUsage - currentUser.usageCount;
            userUsage.textContent = `剩余: ${remaining}/${currentUser.maxUsage}`;
        }
        
        if (currentUser.headimgurl) {
            userAvatar.src = currentUser.headimgurl;
        }
    } else {
        loginSection.classList.remove('hidden');
        userSection.classList.add('hidden');
    }
}

// 获取用户使用次数
function getUserUsageCount(openid) {
    const today = new Date().toDateString();
    const usageKey = `usage_${openid}_${today}`;
    return parseInt(localStorage.getItem(usageKey) || '0');
}

// 根据等级获取最大使用次数
function getMaxUsageByLevel(level) {
    const limits = {
        '普通用户': 10,
        'VIP': 50,
        'SVIP': 200,
        'Admin': -1
    };
    return limits[level] || 10;
}

// 检查使用次数限制
function checkUsageLimit() {
    if (!currentUser) {
        showNotification('请先登录', 'warning');
        showWechatLogin();
        return false;
    }
    
    if (currentUser.maxUsage === -1) {
        return true;
    }
    
    if (currentUser.usageCount >= currentUser.maxUsage) {
        showNotification('今日使用次数已用完，请明天再试或升级VIP', 'warning');
        return false;
    }
    
    return true;
}

// 增加使用次数
function incrementUsageCount() {
    if (currentUser && currentUser.maxUsage !== -1) {
        currentUser.usageCount++;
        
        const today = new Date().toDateString();
        const usageKey = `usage_${currentUser.openid}_${today}`;
        localStorage.setItem(usageKey, currentUser.usageCount.toString());
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        updateUserUI();
    }
}

// 显示即将上线页面
function showComingSoon() {
    showNotification('即将上线，请关注微信服务号获取最新消息！', 'info');
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        z-index: 3000;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 获取通知图标
function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// 获取通知颜色
function getNotificationColor(type) {
    const colors = {
        success: 'linear-gradient(135deg, #00ff88 0%, #00a8ff 100%)',
        error: 'linear-gradient(135deg, #ff3366 0%, #ff6b35 100%)',
        warning: 'linear-gradient(135deg, #ff6b35 0%, #ffd700 100%)',
        info: 'linear-gradient(135deg, #00a8ff 0%, #a855f7 100%)'
    };
    return colors[type] || colors.info;
}

// 显示二维码过期
function showQRCodeExpired() {
    const qrCode = document.getElementById('qrCode');
    qrCode.innerHTML = `
        <i class="fas fa-clock" style="color: #ff6b35;"></i>
        <p style="color: #ff6b35;">二维码已过期</p>
        <button onclick="generateQRCode()" style="margin-top: 10px; padding: 5px 10px; background: #00ff88; color: #0a0a0f; border: none; border-radius: 4px; cursor: pointer;">重新生成</button>
    `;
}