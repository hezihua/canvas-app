import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3001;

const server = createServer((req, res) => {
  // 手动设置 CORS 头
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end('Socket.io server is running');
});

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  },
  path: '/api/socket',
});

const rooms = new Map();

io.on('connection', async (socket) => {
  const { roomId, userId } = socket.handshake.query;

  if (!roomId || !userId) {
    socket.disconnect();
    return;
  }

  console.log(`User ${userId} connected to room ${roomId}`);

  // 加入房间
  socket.join(roomId);
  console.log(`User ${userId} joined room ${roomId}`);
  
  // 验证 socket 是否在房间中
  const sockets = await io.in(roomId).fetchSockets();
  console.log(`Sockets in room ${roomId}:`, sockets.map(s => s.id));

  // 初始化房间
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Set(),
      canvasHistory: [],
    });
  }

  const room = rooms.get(roomId);
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
  socket.on('message', (message) => {
    console.log(`Message in room ${roomId}: ${message.text}`);
    io.to(roomId).emit('message', message);
  });

  // 处理画布操作
  socket.on('canvasAction', (action) => {
    console.log(`✅ Received canvasAction in room ${roomId} from ${userId}:`, action.type);
    // 保存画布操作到历史
    room.canvasHistory.push(action);
    // 广播给其他用户
    socket.to(roomId).emit('canvasAction', action);
    console.log(`Broadcasted canvasAction to room ${roomId}`);
  });

  // 处理画布初始化
  socket.on('canvasInit', (data) => {
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

server.listen(PORT, () => {
  console.log(`> Socket.io server ready on http://localhost:${PORT}`);
});
