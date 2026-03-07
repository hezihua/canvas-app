import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { CanvasAction } from './useCanvas';

interface ChatRoomProps {
  roomId?: string;
  userId?: string;
}

interface Message {
  user: string;
  text: string;
  timestamp: number;
}

export const useChatRoom = ({ roomId: initialRoomId, userId: initialUserId }: ChatRoomProps = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>(initialRoomId || '');
  const [userId, setUserId] = useState<string>(initialUserId || '');
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [canvasHistory, setCanvasHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 同步 roomId props 到 state
  useEffect(() => {
    if (initialRoomId && initialRoomId !== roomId) {
      setRoomId(initialRoomId);
    }
  }, [initialRoomId, roomId]);

  // 同步 userId props 到 state
  useEffect(() => {
    if (initialUserId && initialUserId !== userId) {
      setUserId(initialUserId);
    }
  }, [initialUserId, userId]);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 连接到 Socket.io 服务器
  useEffect(() => {
    console.log('useEffect - roomId:', roomId);
    if (!roomId) {
      console.log('useEffect - no roomId, skipping');
      return;
    }

    const newUserId = `user_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Creating new socket connection for roomId:', roomId);
    
    // 连接到 Socket.io 服务器 - 生产环境使用环境变量
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    
    const newSocket = io(socketUrl, {
      path: '/api/socket',
      query: {
        roomId,
        userId: newUserId,
      },
    });

    newSocket.on('connect', () => {
      console.log('Socket connected, setting isConnected to true');
      setIsConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected, reason:', reason);
      setIsConnected(false);
    });

    newSocket.on('users', (userList: string[]) => {
      setUsers(userList);
    });

    newSocket.on('userJoined', (newUser: string) => {
      setUsers(prev => [...prev, newUser]);
      setMessages(prev => [...prev, {
        user: 'System',
        text: `${newUser} 加入了房间`,
        timestamp: Date.now()
      }]);
    });

    newSocket.on('userLeft', (leftUser: string) => {
      setUsers(prev => prev.filter(user => user !== leftUser));
      setMessages(prev => [...prev, {
        user: 'System',
        text: `${leftUser} 离开了房间`,
        timestamp: Date.now()
      }]);
    });

    newSocket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('canvasAction', (action: CanvasAction) => {
      console.log('Received canvasAction from server:', action.type);
      // 触发自定义事件，让 canvas 组件监听
      window.dispatchEvent(new CustomEvent('canvasAction', { detail: action }));
    });

    newSocket.on('canvasHistory', (history: any[]) => {
      setCanvasHistory(history);
      // 重放画布历史
      window.dispatchEvent(new CustomEvent('canvasHistory', { detail: history }));
    });

    newSocket.on('canvasInit', (data: any) => {
      window.dispatchEvent(new CustomEvent('canvasInit', { detail: data }));
    });

    setSocket(newSocket);
    setUserId(newUserId);
    
    // 暴露 socket 到 window 以便调试
    (window as any).socket = newSocket;

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  // 获取房间 URL
  const getRoomUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/canvas?room=${roomId}`;
  }, [roomId]);

  // 发送消息
  const sendMessage = useCallback((text: string) => {
    if (socket && text.trim()) {
      const message: Message = {
        user: userId,
        text: text.trim(),
        timestamp: Date.now(),
      };
      socket.emit('message', message);
    }
  }, [socket, userId]);

  // 发送画布操作
  const sendCanvasAction = useCallback((action: CanvasAction) => {
    console.log('sendCanvasAction:', action.type);
    console.log('socket:', socket?.id, 'connected:', socket?.connected);
    if (socket) {
      socket.emit('canvasAction', action, (ack: any) => {
        console.log('Server acknowledged canvasAction:', ack);
      });
      console.log('Emitted canvasAction to server');
    } else {
      console.error('Socket is null, cannot send canvasAction');
    }
  }, [socket]);

  // 初始化画布
  const initCanvas = useCallback((data: any) => {
    if (socket) {
      socket.emit('canvasInit', data);
    }
  }, [socket]);

  // 创建新的聊天室
  const createRoom = useCallback(() => {
    const newRoomId = `room_${Math.random().toString(36).substr(2, 9)}`;
    setRoomId(newRoomId);
    return newRoomId;
  }, []);

  // 加入聊天室
  const joinRoom = useCallback((newRoomId: string) => {
    setRoomId(newRoomId);
  }, []);

  // 离开聊天室
  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setRoomId('');
      setUserId('');
      setIsConnected(false);
      setUsers([]);
      setMessages([]);
      setCanvasHistory([]);
    }
  }, [socket]);

  return {
    socket,
    roomId,
    userId,
    isConnected,
    users,
    messages,
    sendMessage,
    sendCanvasAction,
    initCanvas,
    createRoom,
    joinRoom,
    leaveRoom,
    messagesEndRef,
    getRoomUrl
  };
};
