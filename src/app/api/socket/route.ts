import { NextRequest } from 'next/server';
import { Server } from 'socket.io';

// 缓存 Socket.io 服务器实例
let io: Server;

interface SocketData {
  roomId: string;
  userId: string;
}

interface Room {
  users: Set<string>;
  canvasHistory: any[];
}

const rooms = new Map<string, Room>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const userId = searchParams.get('userId');

  if (!roomId || !userId) {
    return new Response('Missing roomId or userId', { status: 400 });
  }

  // 这里只是作为一个端点存在，实际的 Socket.io 连接会在客户端处理
  return new Response('Socket.io endpoint', { status: 200 });
}

// Socket.io 需要特殊的处理，我们在 middleware 中设置
export const config = {
  api: {
    bodyParser: false,
  },
};
