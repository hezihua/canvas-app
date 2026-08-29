# 协作画布

多人实时协作白板。创建或加入房间后，绘画会通过 WebSocket 同步到同房间的其他人，并附带文字聊天。

## 功能

- **房间**：首页创建房间，或用房间 ID / 分享链接加入
- **画笔**：铅笔、直线、空心/填充矩形、空心/填充椭圆、文字、橡皮擦
- **画布**：颜色与线宽、撤销 / 重做、清屏、锁定、全屏
- **协作**：同房间笔画实时同步；后加入的人会收到已有操作历史
- **聊天**：房间内文字消息、在线用户列表、复制房间链接

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Next.js 16（App Router）、React 19、TypeScript、Tailwind CSS 4 |
| 实时通信 | Socket.IO 4（独立进程，默认 `3001`） |
| 画布 | HTML Canvas（主层 + 预览缓存层） |

房间与画布历史存在服务端内存里，进程重启后会清空。

## 本地运行

需要 Node.js 20+。

```bash
npm install
```

本地开发要同时跑 Next.js 和 Socket.IO：

```bash
npm run dev:full
```

这会启动：

- 前端：http://localhost:3000
- Socket.IO：http://localhost:3001（path：`/api/socket`）

只改页面、不测实时同步时，可以用 `npm run dev`。

打开首页后：

1. 点「创建聊天室」，或输入房间 ID 加入
2. 进入 `/canvas?room=<房间ID>`
3. 复制房间链接发给其他人，即可一起画

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_SOCKET_URL` | 生产环境 Socket.IO 地址；不设则用当前域名 |
| `ALLOWED_ORIGINS` | Socket.IO CORS 白名单，逗号分隔 |
| `PORT` | Socket.IO 监听端口，默认 `3001` |

本地示例（`.env.local`）：

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000
```

开发环境前端会固定连 `http://localhost:3001`，生产环境才读 `NEXT_PUBLIC_SOCKET_URL`。

## 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 只启动 Next.js |
| `npm run dev:full` | 同时启动 Next.js 和 `server.mjs` |
| `npm run build` | 生产构建 |
| `npm run start` | 启动 Next.js 生产服务 |
| `npm run lint` | ESLint |

## 目录

```
src/app/page.tsx              首页：创建 / 加入房间
src/app/canvas/page.tsx       画布页：工具栏 + 同步
src/components/ChatRoom.tsx   侧边聊天室
src/hooks/useCanvas.ts        本地绘制、历史、远程回放
src/hooks/useChatRoom.ts      Socket.IO 连接、消息与画布事件
server.mjs                    独立 Socket.IO 服务（本地 / 部署用）
DEPLOY.md                     Railway / Render / Fly.io 部署说明
```

`server.ts`、`src/pages/api/socket.ts` 是早期集成方式，当前本地与部署以 `server.mjs` 为准。

## 同步方式

1. 用户松开鼠标后，前端把本次笔画（轨迹、颜色、线宽等）发给服务器
2. 服务器写入该房间的内存历史，并广播给房间内其他人
3. 其他人用同样的绘制函数回放
4. 新成员进房时，服务器下发完整历史，客户端按序重放

支持的操作类型：`drawGraffiti`、`drawLine`、`drawRect`、`drawEllipse`、`drawText`、`clear`。

## 部署

推荐 [Railway](https://railway.app)：前端与 Socket.IO 同进程组启动。构建后执行：

```bash
node server.mjs & npm run start
```

并设置 `ALLOWED_ORIGINS`、`NEXT_PUBLIC_SOCKET_URL`。Railway、Render、Fly.io 的逐步说明见 [DEPLOY.md](./DEPLOY.md)。

生产环境需 HTTPS，否则浏览器可能拦 WebSocket。

## 限制

- 画布历史只在内存中，重启或房间空了就会丢
- 撤销 / 重做、清屏、橡皮擦目前是本地操作，不会同步到其他人
- 没有账号体系，用户 ID 在进房时随机生成
- 未做笔画压缩或 Redis 等持久化，房间变大后内存会涨
