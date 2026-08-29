# 画布

本地全屏绘画工具。绘制、历史和缩放都封装在 `useCanvas` 里，页面只负责工具栏和画布事件。

多人实时协作（房间 + 聊天）在 `feature/room` 分支。

## 功能

- **画笔**：选择框、铅笔、直线、空心/填充矩形、空心/填充椭圆、文字、橡皮擦
- **样式**：颜色（取色器 + 预设）、线宽、字号、橡皮擦大小
- **编辑**：撤销 / 重做、清屏、锁定画布、全屏

直线、矩形、椭圆在缓存层预览，松开鼠标后再落到主画布。

## 技术栈

Next.js 16（App Router）、React 19、TypeScript、Tailwind CSS 4、HTML Canvas（主层 + 预览缓存层）。

## 本地运行

需要 Node.js 20+。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务 |
| `npm run lint` | ESLint |

## 目录

```
src/app/page.tsx         首页，挂载全屏画布
src/app/canvas.tsx       工具栏与画布事件
src/hooks/useCanvas.ts   绘制、历史栈、缩放、锁定
```

## 部署

可直接部署到 [Vercel](https://vercel.com)。仓库根目录有 `vercel.json`。
