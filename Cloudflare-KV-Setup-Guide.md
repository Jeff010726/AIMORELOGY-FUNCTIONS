# Cloudflare KV 存储设置指南

为了实现扫码登录功能，我们需要使用 Cloudflare 的 KV (Key-Value) 存储来临时记录每个登录二维码的状态（例如：等待扫码、已扫码、登录成功）。

请按照以下步骤为您的 Worker 服务创建并绑定一个 KV 命名空间。**此操作是新功能正常运行的必要前提。**

## 1. 创建 KV 命名空间

1.  登录到您的 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2.  在左侧菜单中，选择 **Workers & Pages**。
3.  在右侧的选项卡中，选择 **KV**。
4.  点击 **Create a namespace** (创建命名空间) 按钮。
5.  在 **Namespace name** (命名空间名称) 输入框中，输入 `WECHAT_LOGIN_KV`。
6.  点击 **Add** (添加)。

您现在已经成功创建了一个名为 `WECHAT_LOGIN_KV` 的 KV 存储空间。

## 2. 绑定 KV 命名空间到 Worker

创建后，您需要将其“绑定”到我们的 Worker 服务上，这样代码才能访问它。

1.  返回到 **Workers & Pages** 的概览页面。
2.  找到并点击您的 Worker 服务（例如 `ecommerce-api`）。
3.  点击 **Settings** (设置) 选项卡。
4.  在下拉菜单中，选择 **Variables** (变量)。
5.  向下滚动到 **KV Namespace Bindings** (KV 命名空间绑定) 部分，然后点击 **Add binding** (添加绑定)。
6.  在 **Variable name** (变量名称) 输入框中，输入 `WECHAT_LOGIN_KV`。
7.  在 **KV namespace** (KV 命名空间) 下拉菜单中，选择您刚刚创建的 `WECHAT_LOGIN_KV`。
8.  点击 **Save** (保存)。

## 3. 部署更改

完成绑定后，页面顶部会出现一个提示，告知您有新的设置需要部署。

请点击 **Save and deploy** (保存并部署) 按钮，以使您的更改生效。

---

完成以上所有步骤后，您的后端服务就已经准备就绪，可以支持全新的扫码登录功能了。