'use client';

import { useState } from 'react';
import { useChatRoom } from '@/hooks/useChatRoom';

interface ChatRoomProps {
  onCanvasAction?: (action: any) => void;
}

const ChatRoom = ({ onCanvasAction }: ChatRoomProps) => {
  const {
    roomId,
    userId,
    isConnected,
    users,
    messages,
    sendMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    messagesEndRef,
    getRoomUrl
  } = useChatRoom();

  const [message, setMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyRoomUrl = () => {
    const url = getRoomUrl();
    navigator.clipboard.writeText(url);
    alert('房间链接已复制到剪贴板！');
  };

  return (
    <div className="fixed right-4 top-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex flex-col max-h-[80vh]">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <h2 className="text-lg font-semibold text-white">聊天室</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-white/20 rounded p-1 transition-colors"
            title={isMinimized ? '展开' : '最小化'}
          >
            {isMinimized ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
          <button
            onClick={leaveRoom}
            className="text-white hover:bg-white/20 rounded p-1 transition-colors"
            title="离开房间"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* 房间信息 */}
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="text-xs text-gray-500 mb-1">房间 ID: {roomId}</div>
            <button
              onClick={copyRoomUrl}
              className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors font-medium"
            >
              分享房间链接
            </button>
          </div>

          {/* 用户列表 */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="text-xs font-medium text-gray-600 mb-2">在线用户 ({users.length}):</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {users.map((user) => (
                <div key={user} className="text-xs bg-white p-1.5 rounded border border-gray-200 flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${user === userId ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span className="text-gray-700">{user}</span>
                  {user === userId && <span className="ml-auto text-gray-400 text-xs">(我)</span>}
                </div>
              ))}
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[300px] bg-white">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                暂无消息，开始聊天吧！
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.user === userId ? 'items-end' : 'items-start'}`}>
                  <div className="text-xs text-gray-500 mb-0.5">{msg.user === userId ? '我' : msg.user}</div>
                  <div
                    className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${
                      msg.user === 'System'
                        ? 'bg-gray-100 text-gray-600 text-center w-full'
                        : msg.user === userId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="输入消息..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                发送
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatRoom;
