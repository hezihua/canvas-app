import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest } from 'next';

export type NextApiResponseServerIO = {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

interface SocketData {
  roomId: string;
  userId: string;
}

interface Room {
  users: Set<string>;
  canvasHistory: any[];
}

const rooms = new Map<string, Room>();

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
      },
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      const { roomId, userId } = socket.handshake.query as unknown as SocketData;

      if (!roomId || !userId) {
        socket.disconnect();
        return;
      }

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
  } else {
    res.end();
  }
};

export default SocketHandler;
