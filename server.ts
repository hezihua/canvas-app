import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3001;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: '/api/socket',
    addTrailingSlash: false,
  });

  interface Room {
    users: Set<string>;
    canvasHistory: any[];
  }

  const rooms = new Map<string, Room>();

  io.on('connection', (socket) => {
    const { roomId, userId } = socket.handshake.query as unknown as {
      roomId: string;
      userId: string;
    };

    if (!roomId || !userId) {
      socket.disconnect();
      return;
    }

    console.log(`User ${userId} connected to room ${roomId}`);

    // 加入房间
    socket.join(roomId);

    // 初始化房间
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Set(),
        canvasHistory: [],
      });
    }

    const room = rooms.get(roomId)!;
    room.users.add(userId);

    // 通知其他用户
    socket.to(roomId).emit('userJoined', userId);

    // 发送当前用户列表
    socket.emit('users', Array.from(room.users));

    // 发送当前画布历史
    if (room.canvasHistory.length > 0) {
      socket.emit('canvasHistory', room.canvasHistory);
    }

    // 处理消息
    socket.on('message', (message: { user: string; text: string; timestamp: number }) => {
      console.log(`Message in room ${roomId}: ${message.text}`);
      io.to(roomId).emit('message', message);
    });

    // 处理画布操作
    socket.on('canvasAction', (action: { type: string; data: any }) => {
      // 保存画布操作到历史
      room.canvasHistory.push(action);
      // 广播给其他用户
      socket.to(roomId).emit('canvasAction', action);
    });

    // 处理画布初始化
    socket.on('canvasInit', (data: any) => {
      room.canvasHistory = [data];
      socket.to(roomId).emit('canvasInit', data);
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from room ${roomId}`);
      if (rooms.has(roomId)) {
        room.users.delete(userId);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        } else {
          socket.to(roomId).emit('userLeft', userId);
        }
      }
    });
  });

  server.listen(PORT, (err?: any) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
