'use client';

import { useCanvas } from '@/hooks/useCanvas';
import { useChatRoom } from '@/hooks/useChatRoom';
import ChatRoom from '@/components/ChatRoom';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// 提取使用 useSearchParams 的子组件
function CanvasContent() {
  const searchParams = useSearchParams();
  const roomFromUrl = searchParams?.get('room') || '';
  
  const {
      canvasRef,
      canvasCacheRef,
      textFakerRef,
      config,
      scale,
      selection,
      drawHistory,
      historyIndex,
      isLocked,
      isFullscreen,
      coordinate,
      path,
      undo,
      redo,
      clearAll,
      drawBegin,
      drawing,
      drawEnd,
      handleTextBlur,
      handleToolChange,
      handleColorChange,
      handleLineWidthLevel,
      handleFontSizeLevel,
      handleEraserSizeLevel,
      toggleLock,
      toggleFullscreen
    } = useCanvas();
  
    const {
      roomId,
      userId,
      isConnected,
      sendCanvasAction,
      initCanvas,
    } = useChatRoom({ roomId: roomFromUrl });
    
    console.log('Canvas - roomFromUrl:', roomFromUrl, 'isConnected:', isConnected);

  // 监听远程画布操作
  useEffect(() => {
    if (!isConnected) {
      console.log('Not connected, skipping socket listener setup');
      return;
    }

    const handleSocketCanvasAction = (action: any) => {
      console.log('Received canvasAction from socket:', action.type);
      // 触发自定义事件，让 useCanvas 处理
      window.dispatchEvent(new CustomEvent('canvasAction', { detail: action }));
    };

    const socket = (window as any).socket;
    if (socket) {
      socket.on('canvasAction', handleSocketCanvasAction);
      console.log('Socket listener for canvasAction registered');
    }

    return () => {
      if (socket) {
        socket.off('canvasAction', handleSocketCanvasAction);
        console.log('Socket listener for canvasAction removed');
      }
    };
  }, [isConnected]);

  // 发送画布操作 - 铅笔
  const sendGraffitiAction = useCallback((points: any[], color: string, lineWidth: number, lineCap: string, lineJoin: string) => {
    console.log('sendGraffitiAction called, isConnected:', isConnected);
    if (isConnected) {
      sendCanvasAction({
        type: 'drawGraffiti',
        data: { points, color, lineWidth, lineCap, lineJoin }
      });
    }
  }, [isConnected, sendCanvasAction]);

  // 发送画布操作 - 直线
  const sendLineAction = useCallback((beginX: number, beginY: number, endX: number, endY: number, color: string, lineWidth: number, lineCap: string, lineJoin: string) => {
    if (isConnected) {
      sendCanvasAction({
        type: 'drawLine',
        data: { beginX, beginY, endX, endY, color, lineWidth, lineCap, lineJoin }
      });
    }
  }, [isConnected, sendCanvasAction]);

  // 发送画布操作 - 矩形
  const sendRectAction = useCallback((isFill: boolean, beginX: number, beginY: number, endX: number, endY: number, color: string, lineWidth: number) => {
    if (isConnected) {
      sendCanvasAction({
        type: 'drawRect',
        data: { isFill, beginX, beginY, endX, endY, color, lineWidth }
      });
    }
  }, [isConnected, sendCanvasAction]);

  // 发送画布操作 - 椭圆
  const sendEllipseAction = useCallback((x: number, y: number, a: number, b: number, isFill: boolean, color: string, lineWidth: number) => {
    if (isConnected) {
      sendCanvasAction({
        type: 'drawEllipse',
        data: { x, y, a, b, isFill, color, lineWidth }
      });
    }
  }, [isConnected, sendCanvasAction]);

  // 发送画布操作 - 文字
  const sendTextAction = useCallback((text: string, left: number, top: number, font: string, color: string) => {
    if (isConnected) {
      sendCanvasAction({
        type: 'drawText',
        data: { text, left, top, font, color }
      });
    }
  }, [isConnected, sendCanvasAction]);

  // 处理绘制结束 - 发送画布操作（只在 mouseup 时同步一次）
  const handleDrawEnd = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // 先执行绘制
    drawEnd(e);
    
    // 然后发送画布操作（如果已连接，并且确实有绘制操作）
    if (isConnected && config.shapeType !== 'mouse') {
      const mousePos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
      
      switch (config.shapeType) {
        case 'pencil':
          // 发送完整的轨迹数据（只有在有轨迹时才发送）
          if (coordinate && coordinate.length > 0) {
            sendGraffitiAction(
              coordinate,
              config.color,
              config.lineWidth,
              config.lineCap,
              config.lineJoin
            );
          }
          break;
        case 'line':
          sendLineAction(
            path.beginX,
            path.beginY,
            mousePos.x,
            mousePos.y,
            config.color,
            config.lineWidth,
            config.lineCap,
            config.lineJoin
          );
          break;
        case 'emptyrect':
        case 'fillrect':
          sendRectAction(
            config.shapeType === 'fillrect',
            path.beginX,
            path.beginY,
            mousePos.x,
            mousePos.y,
            config.color,
            config.lineWidth
          );
          break;
        case 'emptyellipse':
        case 'fillellipse':
          // 只有在有有效的起点时才发送椭圆数据
          if (path.beginX !== undefined && path.beginY !== undefined) {
            const a = (mousePos.x - path.beginX) / 2;
            const b = (mousePos.y - path.beginY) / 2;
            const x = path.beginX + a;
            const y = path.beginY + b;
            sendEllipseAction(
              x,
              y,
              Math.abs(a),
              Math.abs(b),
              config.shapeType === 'fillellipse',
              config.color,
              config.lineWidth
            );
          }
          break;
        case 'text':
          if (coordinate.length >= 2) {
            const x1 = coordinate[0].x;
            const y1 = coordinate[0].y;
            const x2 = mousePos.x;
            const y2 = mousePos.y;
            sendTextAction(
              '示例文字',
              x1 < x2 ? x1 : x2,
              y1 < y2 ? y1 : y2,
              config.font,
              config.color
            );
          }
          break;
      }
    }
  }, [drawEnd, isConnected, config.shapeType, coordinate, path, sendGraffitiAction, sendLineAction, sendRectAction, sendEllipseAction, sendTextAction]);

  const presetColors = [
    { name: '黑色', value: '#000000' },
    { name: '橙色', value: '#FFA500' },
    { name: '红色', value: '#FF0000' },
    { name: '蓝色', value: '#0000FF' },
    { name: '绿色', value: '#00FF00' },
    { name: '紫色', value: '#800080' },
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 横向主工具栏 - 顶部 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 flex gap-2 items-center">
        {/* 工具选择 */}
        <div className="flex gap-1">
          <button 
            onClick={() => handleToolChange('mouse')}
            className={`px-3 py-2 rounded text-sm ${config.shapeType === 'mouse' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            title="选择工具 (鼠标)"
          >
            <span className="text-lg">👆</span>
          </button>
          <button 
            onClick={() => handleToolChange('pencil')}
            className={`px-3 py-2 rounded text-sm ${config.shapeType === 'pencil' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            title="铅笔工具"
          >
            ✏️
          </button>
          <button 
            onClick={() => handleToolChange('line')}
            className={`px-3 py-2 rounded text-sm ${config.shapeType === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            title="直线工具"
          >
            📏
          </button>
          <button 
            onClick={() => handleToolChange('emptyrect')}
            className={`px-3 py-2 rounded text-sm ${config.shapeType === 'emptyrect' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            title="空心矩形"
          >
            ⬜
          </button>
          <button 
            onClick={() => handleToolChange('fillrect')}
            className={`px-3 py-2 rounded text-sm ${config.shapeType === 'fillrect' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            title="填充矩形"
          >
            🟦
          </button>
          <button 
            onClick={() => handleToolChange('emptyellipse')}
            className={`px-3 py-2 rounded text-sm ${config.shapeType === 'emptyellipse' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            title="空心椭圆"
          >
            ⭕
          </button>
          <button 
            onClick={() => handleToolChange('fillellipse')}
            className={`px-3 py-2 rounded text-sm ${config.shapeType === 'fillellipse' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            title="填充椭圆"
          >
            🔵
          </button>
          <button 
            onClick={() => handleToolChange('text')}
            className={`px-3 py-2 rounded text-sm ${config.shapeType === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            title="文本工具"
          >
            T
          </button>
          <button 
            onClick={() => handleToolChange('eraser')}
            className={`px-3 py-2 rounded text-sm ${config.shapeType === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            title="橡皮擦"
          >
            🧹
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 mx-2"></div>

        {/* 撤销/重做 */}
        <div className="flex gap-1">
          <button 
            onClick={undo}
            disabled={historyIndex <= 0}
            className="px-3 py-2 rounded bg-gray-200 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="撤销 (Ctrl+Z)"
          >
            ↩️
          </button>
          <button 
            onClick={redo}
            disabled={historyIndex >= drawHistory.length - 1}
            className="px-3 py-2 rounded bg-gray-200 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="重做 (Ctrl+Y)"
          >
            ↪️
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 mx-2"></div>

        {/* 清屏 */}
        <button 
          onClick={clearAll}
          className="px-3 py-2 rounded bg-red-500 text-white text-sm font-medium hover:bg-red-600"
          title="清除所有内容"
        >
          🗑️ 清屏
        </button>

        {/* 全屏模式 */}
        <button 
          onClick={toggleFullscreen}
          className="px-3 py-2 rounded bg-gray-200 text-gray-800 text-sm font-medium"
          title={isFullscreen ? '退出全屏模式' : '进入全屏模式'}
        >
          {isFullscreen ? '❌ 退出全屏' : '📺 全屏'}
        </button>
      </div>

      {/* 竖向侧边工具栏 - 右侧 */}
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 flex flex-col gap-3">
        {/* 颜色选择 */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-medium text-gray-800">颜色</label>
          <input 
            type="color" 
            value={config.color} 
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-10 h-10 rounded-full cursor-pointer border-0 p-0"
            title="选择颜色"
          />
          <div className="flex flex-col gap-1">
            {presetColors.map((c) => (
              <button
                key={c.value}
                onClick={() => handleColorChange(c.value)}
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="w-8 h-px bg-gray-300"></div>

        {/* 线条设置 */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-medium text-gray-800">线宽</label>
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => handleLineWidthLevel(1)}
              className={`w-8 h-8 rounded text-xs ${config.lineWidth === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="细线条 (1px)"
            >
              细
            </button>
            <button 
              onClick={() => handleLineWidthLevel(2)}
              className={`w-8 h-8 rounded text-xs ${config.lineWidth === 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="中等线条 (3px)"
            >
              中
            </button>
            <button 
              onClick={() => handleLineWidthLevel(3)}
              className={`w-8 h-8 rounded text-xs ${config.lineWidth === 5 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="粗线条 (5px)"
            >
              粗
            </button>
          </div>
        </div>

        <div className="w-8 h-px bg-gray-300"></div>

        {/* 字体大小设置 */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-medium text-gray-800">字体</label>
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => handleFontSizeLevel(1)}
              className={`w-8 h-8 rounded text-xs ${config.font.includes('16px') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="小字体 (16px)"
            >
              小
            </button>
            <button 
              onClick={() => handleFontSizeLevel(2)}
              className={`w-8 h-8 rounded text-xs ${config.font.includes('20px') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="中等字体 (20px)"
            >
              中
            </button>
            <button 
              onClick={() => handleFontSizeLevel(3)}
              className={`w-8 h-8 rounded text-xs ${config.font.includes('24px') ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="大字体 (24px)"
            >
              大
            </button>
          </div>
        </div>

        <div className="w-8 h-px bg-gray-300"></div>

        {/* 橡皮擦大小设置 */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-medium text-gray-800">橡皮擦</label>
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => handleEraserSizeLevel(1)}
              className={`w-8 h-8 rounded text-xs ${config.eraserSize === 20 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="小橡皮擦 (20px)"
            >
              小
            </button>
            <button 
              onClick={() => handleEraserSizeLevel(2)}
              className={`w-8 h-8 rounded text-xs ${config.eraserSize === 30 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="中等橡皮擦 (30px)"
            >
              中
            </button>
            <button 
              onClick={() => handleEraserSizeLevel(3)}
              className={`w-8 h-8 rounded text-xs ${config.eraserSize === 50 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="大橡皮擦 (50px)"
            >
              大
            </button>
          </div>
        </div>

        <div className="w-8 h-px bg-gray-300"></div>

        {/* 锁定画布 */}
        <button 
          onClick={toggleLock}
          className={`px-2 py-2 rounded text-sm font-medium ${isLocked ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'}`}
          title={isLocked ? '点击解锁画布' : '点击锁定画布，防止误操作'}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>
      </div>

      {/* 画布 - 全屏 */}
      <div className="fixed inset-0">
        <canvas
          ref={canvasCacheRef}
          className="absolute top-0 left-0 z-10 pointer-events-none"
        />
        <canvas
          ref={canvasRef}
          className={`absolute top-0 left-0 bg-white z-0 ${
            isLocked 
              ? 'cursor-not-allowed' 
              : config.shapeType === 'mouse'
                ? 'cursor-default'
                : 'cursor-crosshair'
          }`}
          onMouseDown={drawBegin}
          onMouseMove={drawing}
          onMouseUp={handleDrawEnd}
        />
        {/* 选择区域高亮 */}
        {selection && selection.width !== 0 && selection.height !== 0 && (
          <div
            className="absolute z-20 border-2 border-blue-500 border-dashed bg-transparent pointer-events-none"
            style={{
              left: Math.min(selection.x, selection.x + selection.width) / scale.scaleX,
              top: Math.min(selection.y, selection.y + selection.height) / scale.scaleY,
              width: Math.abs(selection.width) / scale.scaleX,
              height: Math.abs(selection.height) / scale.scaleY
            }}
          />
        )}
        <textarea
          ref={textFakerRef}
          className="absolute z-20 border border-gray-300 outline-none bg-white resize-none p-2 shadow-lg"
          onBlur={handleTextBlur}
          style={{ display: 'none' }}
        />
</div>

        {/* 聊天室组件 */}
        {roomId && <ChatRoom />}
      </div>
    );
};

// 主组件，用 Suspense 包裹
export default function CanvasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <CanvasContent />
    </Suspense>
  );
}
