# 最终配置指南：设置微信服务器令牌 (Token)

为了确保您的服务器与微信服务器之间的通信安全，并成功完成 URL 验证，您必须配置一个匹配的令牌 (Token)。

请严格按照以下步骤操作。

## 1. 在 Cloudflare 中添加环境变量

1.  登录到您的 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2.  进入 **Workers & Pages** -> 您的 Worker 服务 (`ecommerce-api`) -> **Settings** -> **Variables**。
3.  在 **Environment Variables** (环境变量) 部分，点击 **Add variable** (添加变量)。
4.  添加以下变量：

| 变量名 (Variable name) | 值 (Value)                   |
| :--------------------- | :--------------------------- |
| `WECHAT_TOKEN`         | `AimoreTechWechatToken2025`  |

5.  点击 **Save and deploy** (保存并部署) 使更改生效。

## 2. 在微信公众号后台配置服务器

1.  登录您的[微信公众平台](https://mp.weixin.qq.com/)。
2.  进入“开发” -> “基本配置”。
3.  点击服务器配置区域的“修改配置”或“启用”。
4.  填写以下信息：

*   **URL (服务器地址)**: `https://ecommerce-api.jeff010726bd.workers.dev/wechat/event`
*   **Token (令牌)**: `AimoreTechWechatToken2025`  **(必须与 Cloudflare 中设置的完全一致)**
*   **EncodingAESKey (消息加解密密钥)**: 点击“随机生成”。
*   **消息加解密方式**: 选择“安全模式”。

5.  点击“提交”。

**重要提示**：请务必先完成 Cloudflare 的配置和部署，等待1分钟后再到微信后台点击“提交”，否则验证可能会因为部署延迟而失败。

完成以上步骤后，您的后端就已准备就绪，可以接收微信的事件通知了。