'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createRoom = () => {
    setIsLoading(true);
    const newRoomId = `room_${Math.random().toString(36).substr(2, 9)}`;
    // 延迟一下，给用户反馈
    setTimeout(() => {
      router.push(`/canvas?room=${newRoomId}`);
    }, 300);
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      setIsLoading(true);
      setTimeout(() => {
        router.push(`/canvas?room=${roomId.trim()}`);
      }, 300);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && roomId.trim()) {
      joinRoom();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">协作画布</h1>
          <p className="text-gray-600">实时协作，共同创作</p>
        </div>

        {/* 主卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 创建房间按钮 */}
          <button
            onClick={createRoom}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl text-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mb-6 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                进入中...
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                创建聊天室
              </>
            )}
          </button>

          {/* 分割线 */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">或</span>
            </div>
          </div>

          {/* 加入房间 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">加入现有聊天室</label>
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="输入房间 ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={joinRoom}
                disabled={!roomId.trim() || isLoading}
                className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                加入
              </button>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">使用说明</p>
                <ul className="space-y-1 text-blue-600">
                  <li>• 创建聊天室后，将自动进入画布页面</li>
                  <li>• 复制房间链接分享给朋友</li>
                  <li>• 朋友点击链接即可加入协作</li>
                  <li>• 所有人的绘画操作会实时同步</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <div className="text-center mt-6 text-sm text-gray-600">
          支持多人实时协作绘画 🎨
        </div>
      </div>
    </div>
  );
}
