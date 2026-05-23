# AI视频去水印助手

一个纯前端 + Node.js后端代理的视频去水印和字幕工具。界面简洁、快速、无广告，支持拖拽上传，支持一键部署到 Vercel 免费平台。

## 功能特性

- 📁 **本地视频上传**：支持拖拽或点击上传本地视频文件。
- 🎯 **区域框选**：在视频预览区直接拖拽鼠标，精准框选需要去除的水印、字幕或Logo区域。
- ⚡ **智能处理**：集成腾讯云智能视频去水印 API（支持后端代理保护密钥）。
- 📊 **异步进度**：实时显示处理进度，处理过程中可关闭页面，支持并发处理。
- 🎨 **现代 UI**：基于 Tailwind CSS 构建，适配手机与电脑端。
- 🚀 **一键部署**：完美适配 Vercel Serverless 环境，零服务器成本。

---

## 目录结构

```text
/ai-video-watermark
├── api/
│   ├── process.js       # Vercel Serverless: 提交去水印任务到腾讯云
│   └── status.js        # Vercel Serverless: 轮询查询任务进度
├── public/
│   ├── index.html       # 前端主页面
│   ├── app.js           # 前端交互逻辑（框选、API请求）
│   └── style.css        # 补充样式
├── package.json         # 项目依赖
├── vercel.json          # Vercel 路由与构建配置
└── README.md            # 项目说明文档
```

---

## 使用指南

1. **上传视频**：在首页点击上传区域，或直接将视频拖入框内（支持 MP4、MOV 等格式）。
2. **框选区域**：
   - 进入编辑页后，点击右侧工具栏的 **"开启绘制"** 按钮。
   - 在左侧视频画面上拖拽鼠标，框选出水印或字幕的位置（可多次框选）。
   - 如果框选错误，可点击区域列表旁的 **"×"** 删除，或点击 **"清除全部"**。
3. **调整强度**：在右侧选择处理强度（低/中/高）。
4. **开始处理**：点击 **"开始处理视频"**。
5. **下载保存**：等待进度条达到 100% 后，即可预览处理后的视频，并点击下载保存到本地。

---

## 部署说明 (Vercel)

本项目采用 `纯前端 + Serverless 接口` 架构，可以直接托管在 Vercel 免费平台上。

### 第一步：申请腾讯云 API 密钥
1. 注册并登录 [腾讯云控制台](https://console.cloud.tencent.com/)。
2. 开通 **云点播 (VOD)** 或 **媒体处理 (MPS)** 服务。
3. 进入 [API 密钥管理](https://console.cloud.tencent.com/cam/capi)，新建一个密钥，获取 `SecretId` 和 `SecretKey`。

### 第二步：一键部署到 Vercel
1. 将本项目推送到你的 GitHub 仓库。
2. 登录 [Vercel](https://vercel.com/)，点击 **"Add New..." -> "Project"**。
3. 导入你刚刚推送的 GitHub 仓库。
4. 在部署配置页面的 **"Environment Variables" (环境变量)** 模块中，添加以下变量：
   - `TENCENTCLOUD_SECRET_ID`: 你的腾讯云 SecretId
   - `TENCENTCLOUD_SECRET_KEY`: 你的腾讯云 SecretKey
   - `TENCENTCLOUD_REGION`: 腾讯云地域（如 `ap-guangzhou`）
   - `TENCENTCLOUD_COS_BUCKET`: 用于存储输出视频的 COS Bucket 名称（按需配置）
5. 点击 **"Deploy"** 按钮，等待部署完成。

> **提示**：如果未配置环境变量，本项目将自动进入 **"模拟演示模式"**，前端交互、进度条轮询等逻辑均可正常体验，但不会实际调用腾讯云 API。

### 第三步：关于大文件上传的说明
由于 Vercel 的免费 Serverless API 对请求体有大小限制（最大 4.5MB），生产环境中处理高达 500MB 的视频时，建议：
1. 配合腾讯云 COS（对象存储）的 **STS 临时密钥** 功能。
2. 前端获取 STS 密钥后，使用 COS JavaScript SDK **直传** 视频文件到云端。
3. 上传完成后，将文件的云端 URL 传给 `/api/process` 进行去水印处理。

本项目的 `app.js` 中已预留了相关请求逻辑的注释，开发者可根据业务需求轻松接入直传功能。

---

## 本地开发与测试

如果你希望在本地运行和调试本项目：

1. 确保已安装 Node.js。
2. 在项目根目录执行安装依赖：
   ```bash
   npm install
   ```
3. 使用 Vercel CLI 进行本地模拟：
   ```bash
   npm i -g vercel
   vercel dev
   ```
4. 浏览器访问 `http://localhost:3000` 即可预览。

---

## 协议与免责声明

- 本工具代码开源，仅供个人学习、技术交流使用。
- 请勿将本工具用于任何商业用途。
- 请尊重视频原作者的版权，切勿使用本工具进行侵权行为。
