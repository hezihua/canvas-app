import { NextApiRequest } from 'next';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

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

let io: SocketIOServer;

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io...');

    const httpServer: NetServer = res.socket.server as any;
    io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      cors: {
        origin: '*',
        credentials: true,
      },
    });

    res.socket.server.io = io;

    io.on('connection', async (socket) => {
      const { roomId, userId } = socket.handshake.query as SocketData;

      if (!roomId || !userId) {
        socket.disconnect();
        return;
      }

      console.log(`User ${userId} connected to room ${roomId}`);

      socket.join(roomId);
      console.log(`User ${userId} joined room ${roomId}`);
      
      const sockets = await io.in(roomId).fetchSockets();
      console.log(`Sockets in room ${roomId}:`, sockets.map(s => s.id));

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Set(),
          canvasHistory: [],
        });
      }

      const room = rooms.get(roomId)!;
      room.users.add(userId);

      io.to(roomId).emit('users', Array.from(room.users));
      socket.emit('userJoined', userId);

      if (room.canvasHistory.length > 0) {
        socket.emit('canvasHistory', room.canvasHistory);
      }

      socket.on('canvasAction', (action) => {
        console.log(`✅ Received canvasAction in room ${roomId} from ${userId}:`, action.type);
        socket.to(roomId).emit('canvasAction', action);
        console.log(`Broadcasted canvasAction to room ${roomId}`);
        
        room.canvasHistory.push(action);
      });

      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected from room ${roomId}`);
        room.users.delete(userId);
        io.to(roomId).emit('users', Array.from(room.users));
        io.to(roomId).emit('userLeft', userId);
      });
    });
  }

  res.end();
}
