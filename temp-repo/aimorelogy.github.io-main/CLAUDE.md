# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是深圳市爱谋科技有限公司的官方网站，托管在 GitHub Pages 上。这是一个静态网站项目，主要用于展示公司的技术服务和产品案例。

## 技术栈

- **前端**: 纯 HTML5, CSS3, JavaScript (ES6+)
- **样式**: 自定义 CSS，使用 CSS 变量和现代布局技术
- **图标**: Font Awesome 6.5.1
- **字体**: Google Fonts (Inter + Noto Sans SC)
- **邮件服务**: EmailJS (用于联系表单)
- **托管**: GitHub Pages (域名: aimorelogy.com)

## 项目结构

```
/
├── index.html          # 主页
├── about.html          # 关于页面
├── test-menu.html      # 测试菜单页面
├── style.css           # 主样式文件
├── script.js           # 主要 JavaScript 逻辑
├── seo.js             # SEO 相关脚本
├── CNAME              # GitHub Pages 自定义域名配置
└── EMAIL_SETUP.md     # 邮件设置文档
```

## 开发指南

### 本地开发

由于这是一个静态网站，可以直接在浏览器中打开 HTML 文件进行预览，或使用任何静态服务器：

```bash
# 使用 Python 的简单 HTTP 服务器
python3 -m http.server 8000

# 或使用 Node.js 的 http-server
npx http-server

# 或使用 VS Code 的 Live Server 扩展
```

### 部署

网站通过 GitHub Pages 自动部署。推送到 `main` 分支的更改会自动发布到 aimorelogy.com。

## 核心功能模块

### JavaScript 架构 (script.js)

代码采用面向对象的模块化设计，主要包含以下类：

- **AIMorelogyApp**: 主应用控制器，管理所有组件的初始化
- **ModernNavigation**: 响应式导航栏，支持移动端汉堡菜单
- **ParticleSystem**: 粒子动画系统，用于视觉效果
- **TerminalAnimation**: 终端打字机动画效果
- **ScrollAnimations**: 滚动触发的动画效果
- **AdvancedContactForm**: 联系表单处理，集成 EmailJS
- **PageTransitions**: 页面切换过渡效果
- **MouseEffects**: 鼠标交互效果
- **PerformanceMonitor**: 性能监控和优化

### 关键功能实现

1. **EmailJS 集成**: 
   - Service ID: `service_yv5k23f`
   - Template ID: `template_ipdubf5`
   - User ID: `0w8MRNqwsVkqPBbOy`

2. **响应式设计**: 
   - 移动优先设计
   - 断点: 768px (平板), 1024px (桌面)

3. **性能优化**:
   - 使用 Intersection Observer 实现懒加载
   - 节流和防抖函数优化滚动事件
   - CSS 动画使用 transform 和 will-change

## 注意事项

1. **浏览器兼容性**: 代码使用了现代 JavaScript 特性（ES6+），需要较新的浏览器支持
2. **中文内容**: 网站面向中文用户，所有内容和交互都使用中文
3. **EmailJS 配置**: 联系表单依赖 EmailJS 服务，需要确保配置正确
4. **GitHub Pages 限制**: 作为静态网站，没有后端服务器支持

## 常见任务

### 修改联系方式
联系信息位于 `index.html` 的联系我们部分（#contact）

### 添加新案例
在 `index.html` 的案例展示部分（#cases）添加新的 `.case-card` 元素

### 更新服务内容
在 `index.html` 的服务板块（#services）修改相应的 `.service-card` 内容

### 调试 JavaScript
打开浏览器开发者工具，主要关注 Console 和 Network 面板。代码中已有 console.log 输出用于调试。