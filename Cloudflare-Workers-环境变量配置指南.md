# Cloudflare Workers 环境变量配置指南

为了确保您的微信 `AppID` 和 `AppSecret` 的安全，我们已经将它们从代码中移除，并改为使用 Cloudflare 的环境变量进行管理。

请按照以下步骤在您的 Cloudflare Workers 控制台中进行配置。

## 1. 进入 Workers 设置

1.  登录到您的 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2.  在左侧菜单中，选择 **Workers & Pages**。
3.  找到并点击您的 Worker 服务（例如 `ecommerce-api`）。

## 2. 配置环境变量

1.  在 Worker 的详情页面，点击 **Settings** (设置) 选项卡。
2.  在下拉菜单中，选择 **Variables** (变量)。
3.  在 **Environment Variables** (环境变量) 部分，点击 **Add variable** (添加变量) 来添加以下三个变量：

| 变量名 (Variable name) | 值 (Value)                               |
| :--------------------- | :----------------------------------------- |
| `APPID`                | `wx2e1f9ccab9e27176`                       |
| `APPSECRET`            | `2b0086643a47fe0de574efbfc27c0718`         |
| `ALLOWED_ORIGINS`      | `https://jeff010726.github.io`             |

**重要提示：**

*   **变量名必须完全匹配**，包括大小写。
*   对于 `APPSECRET`，建议点击旁边的 **Encrypt** (加密) 按钮，以增加安全性。加密后，该值将无法被再次查看。
*   `ALLOWED_ORIGINS` 限制了哪些网站可以调用您的 Worker API，设置为您的 GitHub Pages 地址可以有效防止其他人滥用您的服务。

## 3. 保存并部署

添加完所有变量后，点击页面底部的 **Save and deploy** (保存并部署) 按钮。

新的环境变量将在几秒钟内部署到您的 Worker 服务中。部署完成后，您的网站登录功能将继续正常工作，但密钥已经得到了安全的保护。

---

这样配置后，您的项目就达到了生产环境的安全标准。恭喜！