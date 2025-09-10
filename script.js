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
        const savedState = localStorage.getItem('wechat_auth_state');
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

// 输入验证设置
function setupInputValidation() {
    // 字数限制验证
    minWordsInput.addEventListener('input', validateWordCount);
    maxWordsInput.addEventListener('input', validateWordCount);
    
    // 主题输入验证
    topicInput.addEventListener('input', validateTopic);
}

function validateWordCount() {
    const minWords = parseInt(minWordsInput.value) || 0;
    const maxWords = parseInt(maxWordsInput.value) || 0;
    
    if (minWords > maxWords && maxWords > 0) {
        maxWordsInput.setCustomValidity('最大字数不能小于最小字数');
    } else {
        maxWordsInput.setCustomValidity('');
    }
}

function validateTopic() {
    const topic = topicInput.value.trim();
    if (topic.length < 2) {
        topicInput.setCustomValidity('主题至少需要2个字符');
    } else {
        topicInput.setCustomValidity('');
    }
}

// 生成文章处理函数
async function handleGenerate() {
    // 检查用户登录状态和使用次数
    if (!checkUserPermission()) {
        return;
    }
    
    const topic = topicInput.value.trim();
    const reference = referenceInput.value.trim();
    const minWords = parseInt(minWordsInput.value) || 800;
    const maxWords = parseInt(maxWordsInput.value) || 1500;
    
    if (!topic) {
        alert('请输入文章主题');
        return;
    }
    
    // 显示加载动画
    showLoading();
    
    try {
        // 构建提示词
        const prompt = buildPrompt(topic, reference, minWords, maxWords);
        
        // 调用DeepSeek API
        await generateArticle(prompt);
        
        // 更新用户使用次数
        updateUserUsage();
        
    } catch (error) {
        console.error('生成文章失败:', error);
        hideLoading();
        alert('生成失败，请重试');
    }
}

// 构建提示词
function buildPrompt(topic, reference, minWords, maxWords) {
    let prompt = `请根据以下要求写一篇公众号文章：

主题：${topic}

${reference ? `参考内容：${reference}` : ''}

写作要求：
${WRITING_STYLE_PROMPT.replace('##MIN_WORDS##', minWords).replace('##MAX_WORDS##', maxWords)}

字数要求：${minWords}-${maxWords}字

请直接开始写作，不要有多余的说明。`;

    return prompt;
}

// 调用DeepSeek API生成文章
async function generateArticle(prompt) {
    const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
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
            temperature: 0.7,
            max_tokens: 4000
        })
    });

    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    
    // 隐藏加载动画，显示结果容器
    hideLoading();
    showResult();
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    if (data === '[DONE]') {
                        return;
                    }
                    
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        
                        if (delta) {
                            content += delta;
                            resultContent.textContent = content;
                            
                            // 自动滚动到底部
                            resultContent.scrollTop = resultContent.scrollHeight;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

// 显示加载动画
function showLoading() {
    generateBtn.disabled = true;
    loadingAnimation.classList.remove('hidden');
    resultContainer.classList.add('hidden');
}

// 隐藏加载动画
function hideLoading() {
    generateBtn.disabled = false;
    loadingAnimation.classList.add('hidden');
}

// 显示结果
function showResult() {
    resultContainer.classList.remove('hidden');
}

// 复制文章内容
function handleCopy() {
    const content = resultContent.textContent;
    
    if (!content) {
        alert('没有内容可复制');
        return;
    }
    
    navigator.clipboard.writeText(content).then(() => {
        // 显示复制成功提示
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '已复制';
        copyBtn.style.background = '#28a745';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '';
        }, 2000);
    }).catch(() => {
        alert('复制失败，请手动选择文本复制');
    });
}

// 重新生成文章
function handleRegenerate() {
    if (resultContent.textContent) {
        if (confirm('确定要重新生成文章吗？当前内容将被覆盖。')) {
            resultContent.textContent = '';
            handleGenerate();
        }
    } else {
        handleGenerate();
    }
}

// 用户系统相关函数
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
    loadUserFromStorage();
    
    // 更新UI显示
    updateUserUI();
}

// 初始化弹窗事件
function initializeModals() {
    // 关闭弹窗事件
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
        
        if (e.target.classList.contains('close-btn')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                hideModal(modal);
            }
        }
    });
    
    // 管理员登录表单提交
    const adminForm = document.getElementById('adminLoginForm');
    if (adminForm) {
        adminForm.addEventListener('submit', handleAdminLogin);
    }
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
                        直接跳转授权
                    </button>
                </div>
            `;
        }, 1000);
        
    } catch (error) {
        console.error('生成二维码失败:', error);
        qrCode.innerHTML = `
            <div class="qr-error">
                <p>二维码生成失败</p>
                <button onclick="generateWechatAuthQR()">重试</button>
            </div>
        `;
    }
}

// 生成随机状态码
function generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           Date.now().toString(36);
}

// 直接跳转微信授权
function openWechatAuth(url) {
    window.open(url, '_blank', 'width=400,height=600');
}

// 处理微信授权码
async function handleWechatAuthCode(code) {
    try {
        // 第一步：通过code获取access_token
        const tokenResponse = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`);
        const tokenData = await tokenResponse.json();
        
        if (tokenData.errcode) {
            throw new Error(tokenData.errmsg);
        }
        
        // 第二步：通过access_token获取用户信息
        const userResponse = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`);
        const userData = await userResponse.json();
        
        if (userData.errcode) {
            throw new Error(userData.errmsg);
        }
        
        // 登录成功，设置用户信息
        const userInfo = {
            openid: userData.openid,
            nickname: userData.nickname,
            headimgurl: userData.headimgurl,
            level: determineUserLevel(userData),
            loginTime: Date.now()
        };
        
        setCurrentUser(userInfo);
        
        // 隐藏登录弹窗
        const loginModal = document.getElementById('loginModal');
        hideModal(loginModal);
        
        alert(`登录成功！欢迎 ${userInfo.nickname}`);
        
    } catch (error) {
        console.error('微信登录失败:', error);
        alert('登录失败：' + error.message);
    }
}

// 确定用户等级
function determineUserLevel(userData) {
    // 这里可以根据实际业务逻辑来确定用户等级
    // 暂时默认为普通用户
    return '普通用户';
}

// 管理员登录处理
function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        const adminInfo = {
            username: username,
            level: 'Admin',
            loginTime: Date.now()
        };
        
        setCurrentUser(adminInfo);
        
        // 隐藏管理员登录弹窗
        const adminModal = document.getElementById('adminModal');
        hideModal(adminModal);
        
        alert('管理员登录成功！');
    } else {
        alert('用户名或密码错误');
    }
}

// 设置当前用户
function setCurrentUser(userInfo) {
    currentUser = userInfo;
    
    // 设置使用次数限制
    const limits = {
        '普通用户': 10,
        'VIP': 50,
        'SVIP': 200,
        'Admin': 999999
    };
    
    maxUsageCount = limits[userInfo.level] || 10;
    
    // 从本地存储获取今日使用次数
    const today = new Date().toDateString();
    const usageKey = `usage_${userInfo.openid || userInfo.username}_${today}`;
    userUsageCount = parseInt(localStorage.getItem(usageKey)) || 0;
    
    // 保存用户信息到本地存储
    localStorage.setItem('currentUser', JSON.stringify(userInfo));
    
    // 更新UI
    updateUserUI();
}

// 从本地存储加载用户信息
function loadUserFromStorage() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const userInfo = JSON.parse(savedUser);
            // 检查登录是否过期（24小时）
            if (Date.now() - userInfo.loginTime < 24 * 60 * 60 * 1000) {
                setCurrentUser(userInfo);
            } else {
                // 登录过期，清除用户信息
                localStorage.removeItem('currentUser');
            }
        } catch (error) {
            console.error('加载用户信息失败:', error);
            localStorage.removeItem('currentUser');
        }
    }
}

// 更新用户UI显示
function updateUserUI() {
    const loginSection = document.getElementById('loginSection');
    const userSection = document.getElementById('userSection');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userLevel = document.getElementById('userLevel');
    const usageCount = document.getElementById('usageCount');
    
    if (currentUser) {
        // 显示用户信息
        if (loginSection) loginSection.classList.add('hidden');
        if (userSection) userSection.classList.remove('hidden');
        
        if (userAvatar && currentUser.headimgurl) {
            userAvatar.src = currentUser.headimgurl;
        }
        
        if (userName) {
            userName.textContent = currentUser.nickname || currentUser.username;
        }
        
        if (userLevel) {
            userLevel.textContent = currentUser.level;
        }
        
        if (usageCount) {
            usageCount.textContent = `${userUsageCount}/${maxUsageCount}`;
        }
    } else {
        // 显示登录按钮
        if (loginSection) loginSection.classList.remove('hidden');
        if (userSection) userSection.classList.add('hidden');
    }
}

// 检查用户权限
function checkUserPermission() {
    if (!currentUser) {
        alert('请先登录');
        return false;
    }
    
    if (userUsageCount >= maxUsageCount) {
        alert(`今日使用次数已达上限（${maxUsageCount}次）`);
        return false;
    }
    
    return true;
}

// 更新用户使用次数
function updateUserUsage() {
    if (currentUser) {
        userUsageCount++;
        
        // 保存到本地存储
        const today = new Date().toDateString();
        const usageKey = `usage_${currentUser.openid || currentUser.username}_${today}`;
        localStorage.setItem(usageKey, userUsageCount.toString());
        
        // 更新UI
        updateUserUI();
    }
}

// 退出登录
function logout() {
    currentUser = null;
    userUsageCount = 0;
    maxUsageCount = 10;
    
    // 清除本地存储
    localStorage.removeItem('currentUser');
    
    // 更新UI
    updateUserUI();
    
    alert('已退出登录');
}

// 导航栏相关函数
function initializeNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        // 点击导航链接时关闭移动端菜单
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}