// ===================================
//   AIMORELOGY - Modern JavaScript Framework
//   Performance Optimized & Feature Rich
//   Mobile/Tablet/Desktop Compatible
// ===================================

// === UTILITY FUNCTIONS ===
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Global scroll function for onclick handlers
window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const offsetTop = section.offsetTop - 80;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
};

// Debounce function for performance
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Throttle function for scroll events
const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
};

// === MODERN NAVIGATION ===
class ModernNavigation {
    constructor() {
        this.navbar = $('.navbar') || $('#navbar');
        this.hamburger = $('.nav-toggle') || $('#navToggle');
        this.navMenu = $('.nav-menu') || $('#navMenu');
        this.navLinks = $$('.nav-link');
        this.isMenuOpen = false;
        
        // Also support new structure
        this.navToggle = $('#navToggle');
        if (this.navToggle && !this.hamburger) {
            this.hamburger = this.navToggle;
        }
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.handleScroll();
    }
    
    setupEventListeners() {
        // Hamburger menu toggle - MUST prevent default
        if (this.hamburger) {
            this.hamburger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMobileMenu();
                return false;
            });
        }
        
        // Close menu when clicking nav links
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => this.closeMobileMenu());
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && this.navMenu && !this.navMenu.contains(e.target) && !this.hamburger.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
        
        // Smooth scroll for anchor links
        this.navLinks.forEach(link => {
            if (link.getAttribute('href') && link.getAttribute('href').startsWith('#')) {
                link.addEventListener('click', (e) => this.smoothScrollToSection(e));
            }
        });
        
        // Enhanced scroll behavior
        window.addEventListener('scroll', throttle(() => this.handleScroll(), 16));
    }
    
    toggleMobileMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        console.log('Toggle menu:', this.isMenuOpen);
        
        // Toggle hamburger button animation
        if (this.hamburger) {
            this.hamburger.classList.toggle('active');
        }
        
        // Get menu element
        const navMenuById = document.getElementById('navMenu');
        
        // Toggle menu visibility
        if (navMenuById) {
            if (this.isMenuOpen) {
                navMenuById.classList.add('active');
                navMenuById.style.display = 'flex';
                console.log('Menu opened');
            } else {
                navMenuById.classList.remove('active');
                setTimeout(() => {
                    if (!this.isMenuOpen) {
                        navMenuById.style.display = '';
                    }
                }, 300);
                console.log('Menu closed');
            }
        } else {
            console.error('Menu element not found!');
        }
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
    }
    
    closeMobileMenu() {
        this.isMenuOpen = false;
        this.hamburger?.classList.remove('active');
        this.navMenu?.classList.remove('active');
        
        // Also remove active from ID selector
        const navMenuById = document.getElementById('navMenu');
        if (navMenuById) {
            navMenuById.classList.remove('active');
        }
        
        document.body.style.overflow = '';
    }
    
    smoothScrollToSection(e) {
        e.preventDefault();
        const target = $(e.target.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }
    
    handleScroll() {
        const scrolled = window.scrollY > 50;
        this.navbar?.classList.toggle('scrolled', scrolled);
        
        // Update active nav link based on section
        this.updateActiveNavLink();
    }
    
    updateActiveNavLink() {
        const sections = $$('section[id]');
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            const navLink = $(`.nav-link[href="#${sectionId}"]`);
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                this.navLinks.forEach(link => link.classList.remove('active'));
                navLink?.classList.add('active');
            }
        });
    }
}

// === PARTICLE SYSTEM ===
class ParticleSystem {
    constructor(container) {
        this.container = container;
        this.particles = [];
        this.animationId = null;
        this.isVisible = false;
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        this.createParticles();
        this.setupIntersectionObserver();
    }
    
    createParticles() {
        const particleCount = window.innerWidth < 768 ? 30 : 50;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.createParticle();
            this.particles.push(particle);
            this.container.appendChild(particle.element);
        }
    }
    
    createParticle() {
        const element = document.createElement('div');
        element.className = 'particle';
        
        const size = Math.random() * 4 + 2;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 6 + 4;
        const delay = Math.random() * 3;
        
        element.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${x}%;
            top: ${y}%;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
        `;
        
        return {
            element,
            x,
            y,
            size,
            duration,
            delay
        };
    }
    
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.isVisible = entry.isIntersecting;
                if (this.isVisible) {
                    this.startAnimation();
                } else {
                    this.stopAnimation();
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(this.container);
    }
    
    startAnimation() {
        if (this.animationId) return;
        
        this.particles.forEach(particle => {
            particle.element.style.animationPlayState = 'running';
        });
    }
    
    stopAnimation() {
        this.particles.forEach(particle => {
            particle.element.style.animationPlayState = 'paused';
        });
    }
}

// === TERMINAL ANIMATION ===
class TerminalAnimation {
    constructor(terminal) {
        this.terminal = terminal;
        this.codeLines = terminal?.querySelectorAll('.code-line');
        this.isAnimated = false;
        
        this.init();
    }
    
    init() {
        if (!this.terminal) return;
        this.setupIntersectionObserver();
    }
    
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isAnimated) {
                    this.startTypewriter();
                    this.isAnimated = true;
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(this.terminal);
    }
    
    async startTypewriter() {
        for (let i = 0; i < this.codeLines.length; i++) {
            await this.animateLine(this.codeLines[i], i);
        }
    }
    
    animateLine(line, index) {
        return new Promise(resolve => {
            setTimeout(() => {
                line.style.opacity = '1';
                line.style.transform = 'translateX(0)';
                
                // Add cursor effect
                const cursor = document.createElement('span');
                cursor.textContent = '|';
                cursor.style.cssText = `
                    color: var(--primary-neon);
                    animation: blink 1s infinite;
                    margin-left: 2px;
                `;
                
                line.appendChild(cursor);
                
                // Remove cursor after 1 second
                setTimeout(() => {
                    cursor.remove();
                    resolve();
                }, 1000);
            }, index * 400 + 2000);
        });
    }
}

// === SCROLL ANIMATIONS ===
class ScrollAnimations {
    constructor() {
        this.animatedElements = [];
        this.init();
    }
    
    init() {
        this.setupIntersectionObserver();
        this.setupParallaxEffect();
    }
    
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);
        
        // Observe elements for animations
        const elementsToAnimate = [
            '.pipeline-step',
            '.advantage-card',
            '.partner-logo',
            '.contact-item',
            '.timeline-item',
            '.story-text',
            '.vision-text'
        ];
        
        elementsToAnimate.forEach(selector => {
            $$(selector).forEach(el => {
                el.classList.add('fade-in');
                observer.observe(el);
            });
        });
    }
    
    setupParallaxEffect() {
        const parallaxElements = $$('[data-parallax]');
        
        if (parallaxElements.length === 0) return;
        
        window.addEventListener('scroll', throttle(() => {
            const scrollTop = window.pageYOffset;
            
            parallaxElements.forEach(element => {
                const speed = parseFloat(element.dataset.parallax) || 0.5;
                const yPos = -(scrollTop * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
        }, 16));
    }
}

// === ADVANCED CONTACT FORM ===
class AdvancedContactForm {
    constructor(formSelector) {
        this.form = $(formSelector);
        this.fields = {};
        this.isSubmitting = false;
        
        this.init();
    }
    
    init() {
        if (!this.form) return;
        
        /* ==== Initialize EmailJS SDK ==== */
        if (window.emailjs && !emailjs.__initialized) {
            try {
                emailjs.init('0w8MRNqwsVkqPBbOy');
                emailjs.__initialized = true;
            } catch (e) {
                console.error('EmailJS init failed', e);
            }
        }
        
        this.setupFields();
        this.setupValidation();
        this.setupSubmission();
    }
    
    setupFields() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            this.fields[input.name] = {
                element: input,
                isValid: false,
                errorMessage: ''
            };
            
            // Real-time validation
            input.addEventListener('blur', () => this.validateField(input.name));
            input.addEventListener('input', debounce(() => this.validateField(input.name), 300));
        });
    }
    
    setupValidation() {
        this.validators = {
            name: (value) => {
                if (!value.trim()) return 'Name is required';
                if (value.trim().length < 2) return 'Name must be at least 2 characters';
                if (!/^[a-zA-Z\s\-']+$/.test(value)) return 'Name contains invalid characters';
                return null;
            },
            
            email: (value) => {
                if (!value.trim()) return 'Email is required';
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return 'Please enter a valid email address';
                return null;
            },
            
            message: (value) => {
                if (!value.trim()) return 'Message is required';
                if (value.trim().length < 10) return 'Message must be at least 10 characters';
                if (value.length > 1000) return 'Message cannot exceed 1000 characters';
                return null;
            },
            
            project: (value) => {
                // Optional field, always valid
                return null;
            }
        };
    }
    
    validateField(fieldName) {
        const field = this.fields[fieldName];
        if (!field || !this.validators[fieldName]) return;
        
        const value = field.element.value;
        const error = this.validators[fieldName](value);
        
        field.isValid = !error;
        field.errorMessage = error || '';
        
        this.showFieldValidation(fieldName, field.isValid, field.errorMessage);
        
        return field.isValid;
    }
    
    showFieldValidation(fieldName, isValid, message) {
        const field = this.fields[fieldName];
        const input = field.element;
        
        // Remove existing feedback
        const existingFeedback = input.parentNode.querySelector('.validation-feedback');
        if (existingFeedback) existingFeedback.remove();
        
        // Reset input styles
        input.style.borderColor = '';
        
        if (message) {
            const feedback = document.createElement('div');
            feedback.className = `validation-feedback ${isValid ? 'valid' : 'invalid'}`;
            feedback.innerHTML = `
                <i class="fas fa-${isValid ? 'check' : 'exclamation-triangle'}"></i>
                ${message}
            `;
            
            input.parentNode.appendChild(feedback);
            input.style.borderColor = isValid ? 'var(--primary-neon)' : '#ef4444';
        }
    }
    
    setupSubmission() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }
    
    async handleSubmit() {
        if (this.isSubmitting) return;
        
        // Validate all fields
        let isFormValid = true;
        Object.keys(this.fields).forEach(fieldName => {
            if (!this.validateField(fieldName)) {
                isFormValid = false;
            }
        });
        
        // Check for spam
        if (isFormValid && this.detectSpam()) {
            this.showError(['Your message appears to contain spam content. Please revise and try again.']);
            return;
        }
        
        if (!isFormValid) {
            const errors = Object.values(this.fields)
                .filter(field => !field.isValid && field.errorMessage)
                .map(field => field.errorMessage);
            this.showError(errors);
            return;
        }
        
        this.isSubmitting = true;
        this.showLoadingState();
        
        try {
            await this.submitForm();
            this.showSuccess();
            this.resetForm();
        } catch (error) {
            this.showError(['Failed to send message. Please try again or contact us directly.']);
        } finally {
            this.isSubmitting = false;
            this.hideLoadingState();
        }
    }
    
    detectSpam() {
        const formData = new FormData(this.form);
        const combinedText = Array.from(formData.values()).join(' ').toLowerCase();
        
        const spamPatterns = [
            /viagra|cialis|lottery|winner|congratulations/gi,
            /\$\$\$|\$\d+/g,
            /click here|visit now|act now/gi,
            /free money|get rich|make money fast/gi
        ];
        
        return spamPatterns.some(pattern => pattern.test(combinedText));
    }
    
    async submitForm() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        
        // Try EmailJS first, fallback to mailto
        if (window.emailjs && this.hasEmailJSConfig()) {
            return this.sendWithEmailJS(data);
        } else {
            return this.sendWithMailto(data);
        }
    }
    
    hasEmailJSConfig() {
        // Check if EmailJS is properly configured
        // You would need to replace these with your actual EmailJS credentials
        const serviceID = 'service_yv5k23f';
        const templateID = 'template_ipdubf5';
        const userID = '0w8MRNqwsVkqPBbOy';
        
        return true;
    }
    
    sendWithEmailJS(data) {
        return emailjs.send('service_yv5k23f', 'template_ipdubf5', {
            from_name: data.name,
            from_email: data.email,
            project_type: data.project || 'Not specified',
            message: data.message,
            to_email: 'info@aimorelogy.com'
        }, '0w8MRNqwsVkqPBbOy');
    }
    
    sendWithMailto(data) {
        const subject = `Contact from ${data.name} - ${data.project || 'General Inquiry'}`;
        const body = `Name: ${data.name}\nEmail: ${data.email}\nProject Type: ${data.project || 'Not specified'}\n\nMessage:\n${data.message}`;
        const mailtoLink = `mailto:info@aimorelogy.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        window.open(mailtoLink);
        return Promise.resolve();
    }
    
    showLoadingState() {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
        }
    }
    
    hideLoadingState() {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = 'Send Message';
            submitBtn.disabled = false;
        }
    }
    
    showError(errors) {
        createToast('error', Array.isArray(errors) ? errors.join('<br/>') : errors);
    }
    
    showSuccess() {
        createToast('success', 'Message sent successfully! We will contact you soon.');
    }
    
    removeMessages() {
        const messages = this.form.querySelectorAll('.form-errors, .form-success');
        messages.forEach(msg => msg.remove());
    }
    
    resetForm() {
        this.form.reset();
        
        // Clear validation feedback
        Object.values(this.fields).forEach(field => {
            field.isValid = false;
            field.errorMessage = '';
            field.element.style.borderColor = '';
        });
        
        const feedbacks = this.form.querySelectorAll('.validation-feedback');
        feedbacks.forEach(feedback => feedback.remove());
    }
}

// === PAGE TRANSITIONS ===
class PageTransitions {
    constructor() {
        this.transitionOverlay = $('.page-transition');
        this.isTransitioning = false;
        
        this.init();
    }
    
    init() {
        if (!this.transitionOverlay) return;
        
        this.hideTransition();
        this.setupLinkHandlers();
    }
    
    hideTransition() {
        setTimeout(() => {
            this.transitionOverlay.classList.add('hidden');
        }, 1000);
    }
    
    setupLinkHandlers() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href$=".html"]');
            if (!link || this.isTransitioning) return;
            
            const href = link.getAttribute('href');
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            
            if (href && href !== currentPage) {
                e.preventDefault();
                this.navigateToPage(href);
            }
        });
    }
    
    navigateToPage(href) {
        this.isTransitioning = true;
        this.transitionOverlay.classList.remove('hidden');
        
        setTimeout(() => {
            window.location.href = href;
        }, 500);
    }
}

// === MOUSE EFFECTS ===
class MouseEffects {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupParallaxMouse();
        this.setupHoverEffects();
    }
    
    setupParallaxMouse() {
        if (window.innerWidth < 768) return; // 移动设备跳过
        
        let isAnimating = false;
        
        document.addEventListener('mousemove', throttle((e) => {
            if (isAnimating) return;
            
            isAnimating = true;
            requestAnimationFrame(() => {
                const mouseX = e.clientX / window.innerWidth;
                const mouseY = e.clientY / window.innerHeight;
                
                // 只对终端添加轻微的视差效果
                const terminal = $('.code-terminal');
                if (terminal) {
                    const x = (mouseX - 0.5) * 3;
                    const y = (mouseY - 0.5) * 3;
                    terminal.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                }
                
                isAnimating = false;
            });
        }, 32)); // 降低频率到30fps
    }
    
    setupHoverEffects() {
        // 移除JavaScript中的hover效果，让CSS处理
        // 只保留性能优化相关的设置
        $$('.step-card, .advantage-card, .partner-logo, .contact-item, .btn').forEach(element => {
            element.addEventListener('mouseenter', function() {
                this.style.willChange = 'transform, box-shadow';
            });
            
            element.addEventListener('mouseleave', function() {
                this.style.willChange = 'auto';
            });
        });
        
        // 为按钮添加特殊的点击动画
        $$('.btn').forEach(btn => {
            btn.addEventListener('mousedown', function() {
                this.style.transform = 'scale(0.98) translateZ(0)';
            });
            
            btn.addEventListener('mouseup', function() {
                this.style.transform = '';
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        });
    }
}

// === PERFORMANCE MONITOR ===
class PerformanceMonitor {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupFPSMonitor();
        this.setupLazyLoading();
        this.setupImageOptimization();
    }
    
    setupFPSMonitor() {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            let frames = 0;
            let prevTime = performance.now();
            
            const measureFPS = () => {
                frames++;
                const currentTime = performance.now();
                
                if (currentTime >= prevTime + 1000) {
                    const fps = Math.round((frames * 1000) / (currentTime - prevTime));
                    console.log(`FPS: ${fps}`);
                    frames = 0;
                    prevTime = currentTime;
                }
                
                requestAnimationFrame(measureFPS);
            };
            
            requestAnimationFrame(measureFPS);
        }
    }
    
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });
            
            $$('img[data-src]').forEach(img => {
                img.classList.add('lazy');
                imageObserver.observe(img);
            });
        }
    }
    
    setupImageOptimization() {
        // Preload critical images
        const criticalImages = [
            // Add paths to critical images here
        ];
        
        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }
}

// === WECHAT LOGIN INTEGRATION ===
class WechatLoginIntegration {
    constructor(navMenuSelector, ctaSelector) {
        this.navMenu = $(navMenuSelector);
        this.ctaButton = $(ctaSelector);
        this.userInfo = null;
        this.init();
    }

    init() {
        this.checkLoginStatus();
        this.setupLoginButton();
        this.listenForCallback();
    }

    checkLoginStatus() {
        const storedData = localStorage.getItem('wechat_auth_result');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                if (data.success && data.userInfo) {
                    this.userInfo = data.userInfo;
                    console.log('Logged in user:', this.userInfo);
                }
            } catch (e) {
                localStorage.removeItem('wechat_auth_result');
            }
        }
    }

    setupLoginButton() {
        if (this.userInfo) {
            this.renderUserProfile();
        } else {
            this.renderLoginButton();
        }
    }

    renderLoginButton() {
        if (!this.navMenu || !this.ctaButton) return;

        const loginButton = document.createElement('a');
        loginButton.href = '#';
        loginButton.className = 'nav-link wechat-login-btn';
        loginButton.innerHTML = '<i class="fab fa-weixin"></i> 微信登录';
        loginButton.onclick = (e) => {
            e.preventDefault();
            this.startLogin();
        };

        this.ctaButton.insertAdjacentElement('beforebegin', loginButton);
    }

    renderUserProfile() {
        if (!this.navMenu || !this.ctaButton) return;
        
        // Hide login and CTA button
        const loginBtn = $('.wechat-login-btn');
        if(loginBtn) loginBtn.remove();
        this.ctaButton.style.display = 'none';

        const profileContainer = document.createElement('div');
        profileContainer.className = 'user-profile';
        
        profileContainer.innerHTML = `
            <img src="${this.userInfo.headimgurl}" alt="${this.userInfo.nickname}" class="avatar">
            <span class="nickname">${this.userInfo.nickname}</span>
            <div class="dropdown-menu">
                <a href="#" id="logoutBtn">退出登录</a>
            </div>
        `;

        this.navMenu.appendChild(profileContainer);

        $('#logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }

    async startLogin() {
        try {
            const redirectUri = `${window.location.origin}/AIMORELOGY-FUNCTIONS/wechat-callback.html`;
            const authUrl = await wechatAuth.generateAuthUrl(redirectUri, 'snsapi_userinfo');
            window.location.href = authUrl;
        } catch (error) {
            console.error('微信登录启动失败:', error);
            createToast('error', '无法启动微信登录，请稍后重试。');
        }
    }

    listenForCallback() {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'wechat_login_success') {
                this.userInfo = event.data.userInfo;
                localStorage.setItem('wechat_auth_result', JSON.stringify({ success: true, userInfo: this.userInfo }));
                this.setupLoginButton();
            }
        }, false);
    }

    logout() {
        localStorage.removeItem('wechat_auth_result');
        this.userInfo = null;
        
        // Clean up UI
        const profile = $('.user-profile');
        if(profile) profile.remove();
        this.ctaButton.style.display = '';

        this.renderLoginButton();
        createToast('success', '您已成功退出登录。');
    }
}


// === MAIN INITIALIZATION ===
class AIMorelogyApp {
    constructor() {
        this.components = {};
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }
    
    initializeComponents() {
        try {
            // Initialize core components
            this.components.navigation = new ModernNavigation();
            this.components.scrollAnimations = new ScrollAnimations();
            this.components.pageTransitions = new PageTransitions();
            this.components.mouseEffects = new MouseEffects();
            this.components.performanceMonitor = new PerformanceMonitor();
            
            // Initialize particle system for hero section
            const particlesContainer = $('.particles-container');
            if (particlesContainer) {
                this.components.particleSystem = new ParticleSystem(particlesContainer);
            }
            
            // Initialize hero particles
            this.initializeHeroParticles();
            
            // Initialize animations
            this.initializeServiceCardAnimations();
            this.initializeCaseCardAnimations();
            this.initializeStatsCounter();
            
            // Initialize terminal animation
            const terminal = $('.code-terminal');
            if (terminal) {
                this.components.terminalAnimation = new TerminalAnimation(terminal);
            }
            
            // Initialize contact form
            const contactForm = $('.form');
            if (contactForm) {
                this.components.contactForm = new AdvancedContactForm('.form');
            }
            
            // Add blink animation for cursor
            this.addBlinkAnimation();
            
            // Make scrollToSection globally available
            window.scrollToSection = this.scrollToSection;

            // Initialize WeChat Login
            this.components.wechatLogin = new WechatLoginIntegration('.nav-menu', '.nav-cta');
            
            console.log('🚀 AIMORELOGY App initialized successfully');
            
        } catch (error) {
            console.error('Error initializing AIMORELOGY App:', error);
        }
    }
    
    // === HERO PARTICLES ===
    initializeHeroParticles() {
        const heroParticles = $('#heroParticles');
        if (!heroParticles) return;
        
        const particleCount = 50;
        const particles = [];
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: 2px;
                height: 2px;
                background: rgba(0, 255, 136, 0.6);
                border-radius: 50%;
                pointer-events: none;
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                animation: float ${3 + Math.random() * 4}s ease-in-out infinite;
                animation-delay: ${Math.random() * 2}s;
            `;
            
            heroParticles.appendChild(particle);
            particles.push(particle);
        }
        
        // Add floating animation if not exists
        if (!document.querySelector('#particle-styles')) {
            const style = document.createElement('style');
            style.id = 'particle-styles';
            style.textContent = `
                @keyframes float {
                    0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
                    50% { transform: translateY(-20px) translateX(10px); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // === SCROLL TO SECTION ===
    scrollToSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            const offsetTop = element.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }
    
    // === SERVICE CARD ANIMATIONS ===
    initializeServiceCardAnimations() {
        const serviceCards = document.querySelectorAll('.service-card');
        
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.transform = 'translateY(0)';
                    entry.target.style.opacity = '1';
                }
            });
        }, observerOptions);
        
        serviceCards.forEach((card, index) => {
            card.style.transform = 'translateY(50px)';
            card.style.opacity = '0';
            card.style.transition = `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`;
            observer.observe(card);
        });
    }
    
    // === CASE CARD ANIMATIONS ===
    initializeCaseCardAnimations() {
        const caseCards = document.querySelectorAll('.case-card');
        
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.transform = 'translateY(0) scale(1)';
                    entry.target.style.opacity = '1';
                }
            });
        }, observerOptions);
        
        caseCards.forEach((card, index) => {
            card.style.transform = 'translateY(60px) scale(0.95)';
            card.style.opacity = '0';
            card.style.transition = `all 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.15}s`;
            observer.observe(card);
        });
    }
    
    // === ENHANCED STATS COUNTER ===
    initializeStatsCounter() {
        const stats = document.querySelectorAll('.stat-number');
        
        const observerOptions = {
            threshold: 0.5
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    const finalValue = target.textContent.trim();
                    const isPercent = finalValue.includes('%');
                    const isTime = finalValue.includes('h') || finalValue.includes('年');
                    const isCount = finalValue.includes('+');
                    
                    let numericValue = parseFloat(finalValue.replace(/[^0-9.]/g, ''));
                    if (!numericValue) return;
                    
                    let current = 0;
                    const increment = numericValue / 50;
                    const duration = 2000;
                    const stepTime = duration / 50;
                    
                    const counter = setInterval(() => {
                        current += increment;
                        if (current >= numericValue) {
                            current = numericValue;
                            clearInterval(counter);
                        }
                        
                        let displayValue = Math.floor(current);
                        if (isPercent) {
                            target.textContent = displayValue + '%';
                        } else if (isTime && finalValue.includes('h')) {
                            target.textContent = displayValue + 'h';
                        } else if (isTime && finalValue.includes('年')) {
                            target.textContent = displayValue + '年+';
                        } else if (isCount) {
                            if (displayValue >= 1000) {
                                target.textContent = (displayValue / 1000).toFixed(displayValue >= 10000 ? 0 : 1) + 'k+';
                            } else {
                                target.textContent = displayValue + '+';
                            }
                        } else {
                            target.textContent = displayValue.toLocaleString();
                        }
                    }, stepTime);
                    
                    observer.unobserve(target);
                }
            });
        }, observerOptions);
        
        stats.forEach(stat => observer.observe(stat));
    }
    
    addBlinkAnimation() {
        if (!$('#blink-style')) {
            const style = document.createElement('style');
            style.id = 'blink-style';
            style.textContent = `
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Public API for external access
    getComponent(name) {
        return this.components[name];
    }
    
    // Cleanup method for SPA navigation
    destroy() {
        Object.values(this.components).forEach(component => {
            if (component.destroy && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
    }
}

// === AUTO-INITIALIZATION ===
const app = new AIMorelogyApp();

// Make app globally available for debugging
if (typeof window !== 'undefined') {
    window.AIMorelogyApp = app;
}

// === CSS CUSTOM PROPERTIES SUPPORT ===
// Fallback for older browsers
if (!CSS.supports('color', 'var(--primary-color)')) {
    console.warn('CSS custom properties not supported. Consider adding a polyfill.');
}

// === EXPORT FOR MODULE SYSTEMS ===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIMorelogyApp;
}

/* === GLOBAL TOAST UTILITY === */
function createToast(type, message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
} 