# Cloudflare Workers 部署说明

## 概述
本文档说明如何部署Cloudflare Workers来解决微信授权的跨域和安全问题。

## 问题解决
使用Cloudflare Workers可以解决以下问题：
1. **跨域问题**：前端直接调用微信API会遇到CORS跨域限制
2. **安全问题**：AppSecret不能暴露在前端代码中
3. **状态验证失败**：通过后端统一处理state验证，避免前端验证失败

## 部署步骤

### 1. 登录Cloudflare Dashboard
- 访问 https://dash.cloudflare.com/
- 使用你的Cloudflare账号登录

### 2. 创建Workers
1. 点击左侧菜单的 "Workers & Pages"
2. 点击 "Create application"
3. 选择 "Create Worker"
4. 输入Worker名称，例如：`wechat-auth-api`
5. 点击 "Deploy"

### 3. 部署代码
1. 在Worker编辑器中，删除默认代码
2. 复制 `cloudflare-worker.js` 文件的全部内容
3. 粘贴到Worker编辑器中
4. 点击 "Save and Deploy"

### 4. 获取Worker URL
部署成功后，你会得到一个类似这样的URL：
```
https://ecommerce-api.jeff010726bd.workers.dev
```

### 5. 配置前端代码
Worker URL已经配置完成：`https://ecommerce-api.jeff010726bd.workers.dev`

所有相关文件中的URL已经更新：
- wechat-auth.js ✓
- wechat-callback.html ✓  
- admin-login.html ✓
- wechat-login-test.html ✓

### 6. 微信公众平台配置
在微信公众平台后台配置网页授权域名：
1. 登录微信公众平台
2. 进入"设置与开发" -> "账号设置" -> "功能设置"
3. 在"网页授权域名"中添加你的GitHub Pages域名
4. 例如：`jeff010726.github.io`

## API 接口说明

### 1. 生成授权URL
```
GET /wechat/auth-url?redirect_uri=CALLBACK_URL&scope=snsapi_userinfo
```

### 2. 处理微信授权
```
POST /wechat/auth
Content-Type: application/json

{
  "code": "微信返回的code",
  "state": "状态码"
}
```

### 3. 管理员登录
```
POST /admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Blackrail200107."
}
```

## 安全配置

### 环境变量（可选）
为了更好的安全性，可以在Cloudflare Workers中设置环境变量：

1. 在Worker设置页面，点击 "Settings" -> "Variables"
2. 添加以下环境变量：
   - `WECHAT_APPID`: wx2e1f9ccab9e27176
   - `WECHAT_SECRET`: 2b0086643a47fe0de574efbfc27c0718
   - `ADMIN_USERNAME`: admin
   - `ADMIN_PASSWORD`: Blackrail200107.

3. 修改Worker代码，使用环境变量：
```javascript
const WECHAT_APPID = env.WECHAT_APPID || 'wx2e1f9ccab9e27176';
const WECHAT_SECRET = env.WECHAT_SECRET || '2b0086643a47fe0de574efbfc27c0718';
```

## 测试验证

### 1. 测试授权URL生成
```bash
curl "https://ecommerce-api.jeff010726bd.workers.dev/wechat/auth-url?redirect_uri=https://jeff010726.github.io/AIMORELOGY-FUNCTIONS/wechat-callback.html&scope=snsapi_userinfo"
```

### 2. 测试管理员登录
```bash
curl -X POST "https://ecommerce-api.jeff010726bd.workers.dev/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Blackrail200107."}'
```

## 故障排除

### 1. CORS错误
确保Worker代码中包含正确的CORS头部设置。

### 2. 状态验证失败
- 检查前端是否正确保存和传递state参数
- 确保state在5分钟内使用
- 每个state只能使用一次

### 3. 微信API错误
- 检查AppID和AppSecret是否正确
- 确保网页授权域名配置正确
- 检查用户是否已关注公众号

## 注意事项

1. **域名配置**：确保微信公众平台中配置的授权域名与实际使用的域名一致
2. **HTTPS要求**：微信授权要求使用HTTPS协议
3. **频率限制**：微信API有调用频率限制，注意控制请求频率
4. **用户关注**：只有关注了公众号的用户才能成功登录

## 更新Worker代码

当需要更新Worker代码时：
1. 在Cloudflare Dashboard中找到你的Worker
2. 点击 "Edit code"
3. 修改代码后点击 "Save and Deploy"

## 监控和日志

可以在Cloudflare Dashboard中查看Worker的：
- 请求统计
- 错误日志
- 性能指标

这有助于监控API的使用情况和排查问题。