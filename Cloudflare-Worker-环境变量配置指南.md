# 紧急修复：Cloudflare Worker 环境变量配置指南

## 1. 问题根源 (已锁定)

你遇到的 `invalid appid` (错误码: 40013) 问题，100% 是因为你在 Cloudflare Worker 后台配置的环境变量 `APPID` 的值不正确。

- **前端 AppID**: `wx2e1f9ccab9e27176`
- **后端 Worker AppID**: **配置错误**

必须保证前端和后端 Worker 使用的 AppID 完全一致。

## 2. 修复步骤 (请立即执行)

1.  **登录 Cloudflare 控制台**
    [https://dash.cloudflare.com/](https://dash.cloudflare.com/)

2.  **进入你的 Worker**
    在左侧菜单选择 **Workers & Pages**，然后点击你的 Worker 服务，名称应为 `ecommerce-api`。

3.  **进入设置**
    点击你的 Worker 后，在顶部导航栏选择 **Settings**。

4.  **找到环境变量配置**
    在 **Settings** 页面中，点击左侧的 **Variables** 子菜单。

5.  **修改环境变量**
    在 **Environment Variables** 部分，找到 `APPID` 这一行，点击 **Edit**。

    - **确保 `APPID` 的值是**: `wx2e1f9ccab9e27176`
    - **点击 "Save" 保存**

    

6.  **检查其他变量 (重要)**
    请一并检查以下两个环境变量是否已按要求配置：
    - `APPSECRET`: 你的公众号 AppSecret，**请务必保密，不要发给我**。
    - `ALLOWED_ORIGINS`: 你的前端域名，应为 `https://jeff010726.github.io`

7.  **重新部署**
    修改并保存环境变量后，Cloudflare 会自动完成一次新的部署。请等待 1-2 分钟让部署生效。

## 3. 重新测试

完成上述步骤后，请**清除浏览器缓存**，然后重新访问你的测试页面进行授权：

[https://jeff010726.github.io/AIMORELOGY-FUNCTIONS/wechat-login-base-scope.html](https://jeff010726.github.io/AIMORELOGY-FUNCTIONS/wechat-login-base-scope.html)

这次应该可以成功获取用户信息，不再报 `invalid appid` 错误。