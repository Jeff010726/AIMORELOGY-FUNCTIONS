# AIMORELOGY 公众号爆文生成器

## 项目简介

这是一个集成了DeepSeek AI的微信公众号爆文生成器，具有完整的用户管理系统和微信服务号登录功能。

## 功能特性

- 🤖 **AI文章生成**：集成DeepSeek API，支持流式文本生成
- 🔐 **微信登录**：支持微信服务号扫码登录
- 👥 **用户管理**：多级用户系统（普通用户/VIP/SVIP/管理员）
- 📊 **使用限制**：基于用户等级的每日使用次数限制
- 🎨 **现代UI**：采用glassmorphism设计风格
- 📱 **响应式设计**：完美适配移动端和桌面端

## 在线访问

项目已部署到GitHub Pages：
- **主页面**：https://jeff010726.github.io/AIMORELOGY-FUNCTIONS/
- **测试页面**：https://jeff010726.github.io/AIMORELOGY-FUNCTIONS/debug-login.html

## 用户等级说明

| 用户等级 | 每日使用次数 | 获取方式 |
|---------|-------------|----------|
| 普通用户 | 10次 | 微信登录即可获得 |
| VIP用户 | 50次 | 联系客服升级 |
| SVIP用户 | 200次 | 联系客服升级 |
| 管理员 | 无限制 | 系统管理员 |

## 管理员登录

- 双击微信登录按钮显示管理员登录入口
- 用户名：`admin`
- 密码：`Blackrail200107.`

## 微信配置

项目使用微信服务号进行用户认证：
- AppID: `wx2e1f9ccab9e27176`
- 授权回调域名: `aimorelogy.github.io`

## 技术栈

- **前端**：HTML5 + CSS3 + JavaScript (ES6+)
- **AI服务**：DeepSeek API
- **认证**：微信OAuth 2.0
- **部署**：GitHub Pages
- **样式**：CSS Variables + Glassmorphism

## 本地开发

1. 克隆仓库：
```bash
git clone https://github.com/Jeff010726/AIMORELOGY-FUNCTIONS.git
cd AIMORELOGY-FUNCTIONS
```

2. 启动本地服务器：
```bash
python -m http.server 8080
```

3. 访问：http://localhost:8080

**注意**：微信登录功能需要在线环境才能正常工作，本地开发建议使用mock登录。

## 联系我们

**深圳市爱谋科技有限公司**
- 联系人：谢旭涵
- 职位：VP
- 联系电话（微信同号）：18933063380

## 许可证

本项目仅供学习和商业使用。