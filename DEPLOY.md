# 部署指南

## 部署到 Railway（推荐）

### 步骤：

1. **安装 Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **登录 Railway**
   ```bash
   railway login
   ```

3. **创建新项目**
   ```bash
   railway init
   ```

4. **连接 GitHub（可选）**
   - 访问 https://railway.app
   - 连接你的 GitHub 仓库
   - Railway 会自动检测并部署

5. **设置环境变量**
   ```bash
   # Railway 会自动设置 PORT 环境变量
   # 你需要设置 ALLOWED_ORIGINS
   railway variables set ALLOWED_ORIGINS="https://your-domain.com"
   ```

6. **部署**
   ```bash
   railway up
   ```

7. **获取应用地址**
   ```bash
   railway domain
   ```
   记下你的应用地址，例如：`https://canvas-app-production-xxxx.up.railway.app`

8. **更新前端配置**
   
   创建 `.env.production.local` 文件：
   ```env
   NEXT_PUBLIC_SOCKET_URL=https://canvas-app-production-xxxx.up.railway.app
   ```

9. **重新构建并部署**
   ```bash
   railway up
   ```

## 部署到 Render

### 步骤：

1. **创建 Render 账号**
   - 访问 https://render.com
   - 使用 GitHub 登录

2. **创建新服务**
   - 点击 "New +" -> "Web Service"
   - 连接你的 GitHub 仓库

3. **配置服务**
   - **Name**: canvas-app
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.mjs & npm run start`

4. **设置环境变量**
   - `PORT`: 3001（Render 会自动设置）
   - `ALLOWED_ORIGINS`: 你的域名

5. **部署**
   - 点击 "Create Web Service"
   - Render 会自动构建和部署

6. **获取应用地址**
   - 部署完成后，你会得到一个地址，例如：`https://canvas-app.onrender.com`

7. **更新前端配置**
   
   在 Render 中添加环境变量：
   - `NEXT_PUBLIC_SOCKET_URL`: `https://canvas-app.onrender.com`

## 部署到 Fly.io

### 步骤：

1. **安装 Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **登录**
   ```bash
   fly auth login
   ```

3. **创建应用**
   ```bash
   fly launch
   ```

4. **配置**
   - 选择地区
   - Fly.io 会自动检测 Next.js 应用

5. **修改 `fly.toml`**
   ```toml
   [build]
     builder = "heroku/buildpacks"
   
   [env]
     PORT = "3001"
   
   [[services]]
     http_checks = []
     internal_port = 3001
     protocol = "tcp"
   ```

6. **部署**
   ```bash
   fly deploy
   ```

7. **获取应用地址**
   - 例如：`https://canvas-app.fly.dev`

## 本地测试生产配置

1. **创建 `.env.local` 文件**
   ```env
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ALLOWED_ORIGINS=http://localhost:3000
   ```

2. **构建并运行**
   ```bash
   npm run build
   npm run dev:full
   ```

## 注意事项

1. **CORS 配置**
   - 确保 `ALLOWED_ORIGINS` 包含你的前端域名
   - 多个域名用逗号分隔

2. **WebSocket 连接**
   - 生产环境必须使用 HTTPS
   - Railway 和 Render 都自动提供 HTTPS

3. **持久化**
   - 当前实现使用内存存储画布历史
   - 重启后数据会丢失
   - 如需持久化，需要添加数据库

4. **性能优化**
   - 考虑使用 Redis 存储房间数据
   - 添加画布操作的压缩

## 分享使用

部署完成后：
1. 将应用地址分享给朋友
2. 朋友访问地址，创建聊天室
3. 分享聊天室链接（包含 room ID）
4. 多人可以同时在一个画布上绘画
