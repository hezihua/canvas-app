'use client';

import { useRef, useState, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

interface DrawConfig {
  shapeType: string;
  color: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  font: string;
  eraserSize: number;
  isFill: boolean;
}

interface DrawAction {
  type: string;
  config: DrawConfig;
  coordinate: Point[];
  text?: string;
  textConfig?: { left: number; top: number; width: number; height: number };
}

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCacheRef = useRef<HTMLCanvasElement>(null);
  const textFakerRef = useRef<HTMLTextAreaElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [coordinate, setCoordinate] = useState<Point[]>([]);
  const [path, setPath] = useState<{ beginX: number; beginY: number; endX: number; endY: number }>({
    beginX: 0,
    beginY: 0,
    endX: 0,
    endY: 0
  });
  const [config, setConfig] = useState<DrawConfig>({
    shapeType: 'pencil',
    color: '#000000',
    lineWidth: 3,
    lineCap: 'round',
    lineJoin: 'round',
    font: '20px Arial',
    eraserSize: 30,
    isFill: false
  });
  const [stageInfo, setStageInfo] = useState<DOMRect>();
  const [textConfig, setTextConfig] = useState<{ left: number; top: number; right: number; bottom: number }>({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  });
  
  // 选择工具的状态
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // 撤销/重做功能
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // 锁定画布
  const [isLocked, setIsLocked] = useState(false);
  
  // 全屏模式
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const canvasCache = canvasCacheRef.current;
    if (canvas && canvasCache) {
      const cxt = canvas.getContext('2d');
      const cxtCache = canvasCache.getContext('2d');
      if (cxt && cxtCache) {
        cxt.translate(0.5, 0.5);
        cxtCache.translate(0.5, 0.5);
        setStageInfo(canvas.getBoundingClientRect());
        
        // 保存初始状态
        const imageData = cxt.getImageData(0, 0, canvas.width, canvas.height);
        setDrawHistory([imageData]);
        setHistoryIndex(0);
      }
    }
  }, []);

  const getMousePos = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return { x, y };
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    const cxt = canvas?.getContext('2d');
    if (!canvas || !cxt) return;
    
    const imageData = cxt.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = drawHistory.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setDrawHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const canvas = canvasRef.current;
      const cxt = canvas?.getContext('2d');
      if (!canvas || !cxt) return;
      
      cxt.putImageData(drawHistory[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < drawHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const canvas = canvasRef.current;
      const cxt = canvas?.getContext('2d');
      if (!canvas || !cxt) return;
      
      cxt.putImageData(drawHistory[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    const canvasCache = canvasCacheRef.current;
    if (!canvas || !canvasCache || !stageInfo) return;

    const cxt = canvas.getContext('2d');
    const cxtCache = canvasCache.getContext('2d');
    if (!cxt || !cxtCache) return;
    
    cxt.clearRect(0, 0, canvas.width, canvas.height);
    cxtCache.clearRect(0, 0, canvasCache.width, canvasCache.height);
    saveHistory();
  };

  const drawBegin = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    
    // 选择工具模式
    if (config.shapeType === 'mouse') {
      const mousePos = getMousePos(e);
      setSelection({
        x: mousePos.x,
        y: mousePos.y,
        width: 0,
        height: 0
      });
      setIsDrawing(true);
      return;
    }
    
    const mousePos = getMousePos(e);
    setCoordinate([mousePos]);
    setPath({
      beginX: mousePos.x,
      beginY: mousePos.y,
      endX: mousePos.x,
      endY: mousePos.y
    });
    setIsDrawing(true);
  };

  const clear = (sel?: string) => {
    const canvas = canvasRef.current;
    const canvasCache = canvasCacheRef.current;
    if (!canvas || !canvasCache || !stageInfo) return;

    const cxt = canvas.getContext('2d');
    const cxtCache = canvasCache.getContext('2d');
    if (!cxt || !cxtCache) return;

    switch (sel) {
      case 'cache':
        cxtCache.clearRect(0, 0, stageInfo.width, stageInfo.height);
        break;
      case 'default':
        cxt.clearRect(0, 0, stageInfo.width, stageInfo.height);
        break;
      default:
        cxtCache.clearRect(0, 0, stageInfo.width, stageInfo.height);
        cxt.clearRect(0, 0, stageInfo.width, stageInfo.height);
        break;
    }
  };

  const drawGraffiti = (ctx: CanvasRenderingContext2D, points: Point[]) => {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = config.lineWidth;
    ctx.lineCap = config.lineCap;
    ctx.lineJoin = config.lineJoin;

    if (points.length <= 4) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i + 1].x + points[i].x) / 2;
        const yc = (points[i + 1].y + points[i].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.quadraticCurveTo(
        points[points.length - 2].x,
        points[points.length - 2].y,
        points[points.length - 1].x,
        points[points.length - 1].y
      );
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawLine = (isCxt: boolean, beginX: number, beginY: number, endX: number, endY: number) => {
    const canvas = canvasRef.current;
    const canvasCache = canvasCacheRef.current;
    if (!canvas || !canvasCache) return;

    const cxt = isCxt ? canvas.getContext('2d') : canvasCache.getContext('2d');
    if (!cxt) return;

    cxt.save();
    cxt.strokeStyle = config.color;
    cxt.lineWidth = config.lineWidth;
    cxt.lineCap = config.lineCap;
    cxt.lineJoin = config.lineJoin;
    cxt.beginPath();
    cxt.moveTo(beginX, beginY);
    cxt.lineTo(endX, endY);
    cxt.stroke();
    cxt.restore();
  };

  const drawRect = (isCxt: boolean, isFill: boolean, beginX: number, beginY: number, endX: number, endY: number) => {
    const canvas = canvasRef.current;
    const canvasCache = canvasCacheRef.current;
    if (!canvas || !canvasCache) return;

    const cxt = isCxt ? canvas.getContext('2d') : canvasCache.getContext('2d');
    if (!cxt) return;

    const width = Math.abs(endX - beginX);
    const height = Math.abs(endY - beginY);
    const left = endX > beginX ? beginX : endX;
    const top = endY > beginY ? beginY : endY;

    cxt.save();
    cxt.strokeStyle = config.color;
    cxt.fillStyle = config.color;
    cxt.lineWidth = config.lineWidth;
    if (isFill) {
      cxt.fillRect(left, top, width, height);
    } else {
      cxt.strokeRect(left, top, width, height);
    }
    cxt.restore();
  };

  const drawEllipse = (ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, isFill: boolean = false) => {
    ctx.save();
    const r = a > b ? a : b;
    const ratioX = a / r;
    const ratioY = b / r;
    ctx.scale(ratioX, ratioY);
    ctx.beginPath();
    ctx.arc(x / ratioX, y / ratioY, r, 0, 2 * Math.PI, false);
    ctx.closePath();
    if (isFill) {
      ctx.fillStyle = config.color;
      ctx.fill();
    } else {
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawText = (text: string, isFill: boolean, left: number, top: number, w: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cxt = canvas.getContext('2d');
    if (!cxt) return;

    cxt.font = config.font;
    cxt.fillStyle = config.color;
    cxt.strokeStyle = config.color;
    const fontSize = parseInt(config.font.match(/([0-9]+)px/)?.[1] || '20');

    const chr = text.split('');
    const temp = '';
    const row: string[] = [];
    let currentText = '';

    for (let a = 0; a < chr.length; a++) {
      if (cxt.measureText(currentText).width < w) {
        currentText += chr[a];
      } else {
        row.push(currentText);
        currentText = chr[a];
      }
    }
    if (currentText) row.push(currentText);

    for (let b = 0; b < row.length; b++) {
      if (isFill) {
        cxt.fillText(row[b], left, top + fontSize * (b + 1));
      } else {
        cxt.strokeText(row[b], left, top + fontSize * (b + 1));
      }
    }
  };

  const drawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isLocked) return;
    
    // 选择工具模式
    if (config.shapeType === 'mouse' && selection) {
      const mousePos = getMousePos(e);
      setSelection({
        x: selection.x,
        y: selection.y,
        width: mousePos.x - selection.x,
        height: mousePos.y - selection.y
      });
      return;
    }

    const mousePos = getMousePos(e);
    const endX = mousePos.x;
    const endY = mousePos.y;
    setPath(prev => ({
      ...prev,
      endX,
      endY
    }));

    const canvasCache = canvasCacheRef.current;
    if (!canvasCache) return;

    const cxtCache = canvasCache.getContext('2d');
    if (!cxtCache) return;

    switch (config.shapeType) {
      case 'text': {
        clear('cache');
        cxtCache.strokeStyle = '#333333';
        cxtCache.lineWidth = 1;
        drawRect(false, false, path.beginX, path.beginY, endX, endY);
        break;
      }
      case 'eraser': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        const canvas = canvasRef.current;
        if (canvas) {
          const cxt = canvas.getContext('2d');
          if (cxt) {
            cxt.save();
            cxt.beginPath();
            cxt.arc(endX, endY, config.eraserSize / 2, 0, Math.PI * 2, false);
            cxt.clip();
            cxt.clearRect(0, 0, stageInfo?.width || 0, stageInfo?.height || 0);
            cxt.restore();
          }
        }
        break;
      }
      case 'pencil': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        drawGraffiti(cxtCache, [coordinate[coordinate.length - 1], { x: endX, y: endY }]);
        break;
      }
      case 'line': {
        clear('cache');
        drawLine(false, path.beginX, path.beginY, endX, endY);
        break;
      }
      case 'emptyrect': {
        clear('cache');
        drawRect(false, false, path.beginX, path.beginY, endX, endY);
        break;
      }
      case 'fillrect': {
        clear('cache');
        drawRect(false, true, path.beginX, path.beginY, endX, endY);
        break;
      }
      case 'emptyellipse': {
        clear('cache');
        const a = (endX - path.beginX) / 2;
        const b = (endY - path.beginY) / 2;
        const x = path.beginX + a;
        const y = path.beginY + b;
        drawEllipse(cxtCache, x, y, Math.abs(a), Math.abs(b), false);
        break;
      }
      case 'fillellipse': {
        clear('cache');
        const a = (endX - path.beginX) / 2;
        const b = (endY - path.beginY) / 2;
        const x = path.beginX + a;
        const y = path.beginY + b;
        drawEllipse(cxtCache, x, y, Math.abs(a), Math.abs(b), true);
        break;
      }
      default:
        break;
    }
  };

  const drawEnd = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isLocked) return;
    
    // 选择工具模式
    if (config.shapeType === 'mouse' && selection) {
      const mousePos = getMousePos(e);
      setSelection({
        x: selection.x,
        y: selection.y,
        width: mousePos.x - selection.x,
        height: mousePos.y - selection.y
      });
      setIsDrawing(false);
      return;
    }

    const mousePos = getMousePos(e);
    const endX = mousePos.x;
    const endY = mousePos.y;
    setPath(prev => ({
      ...prev,
      endX,
      endY
    }));

    const canvas = canvasRef.current;
    if (!canvas) return;

    const cxt = canvas.getContext('2d');
    if (!cxt) return;

    switch (config.shapeType) {
      case 'text': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        const x1 = coordinate[0].x;
        const y1 = coordinate[0].y;
        const x2 = mousePos.x;
        const y2 = mousePos.y;
        setTextConfig({
          left: x1 < x2 ? x1 : x2,
          top: y1 < y2 ? y1 : y2,
          right: x1 < x2 ? x2 : x1,
          bottom: y1 < y2 ? y2 : y1
        });
        clear('cache');
        if (textFakerRef.current) {
          const width = Math.max(Math.abs(x1 - x2), 100);
          const height = Math.max(Math.abs(y1 - y2), 40);
          textFakerRef.current.style.left = `${x1 < x2 ? x1 : x2}px`;
          textFakerRef.current.style.top = `${y1 < y2 ? y1 : y2}px`;
          textFakerRef.current.style.width = `${width}px`;
          textFakerRef.current.style.height = `${height}px`;
          textFakerRef.current.style.color = config.color;
          textFakerRef.current.style.font = config.font;
          textFakerRef.current.style.display = 'block';
          textFakerRef.current.style.border = '1px solid #ccc';
          textFakerRef.current.focus();
        }
        break;
      }
      case 'eraser': {
        saveHistory();
        break;
      }
      case 'pencil': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        drawGraffiti(cxt, updatedCoordinate);
        clear('cache');
        saveHistory();
        break;
      }
      case 'line': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        drawLine(true, path.beginX, path.beginY, endX, endY);
        clear('cache');
        saveHistory();
        break;
      }
      case 'emptyrect': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        drawRect(true, false, path.beginX, path.beginY, endX, endY);
        clear('cache');
        saveHistory();
        break;
      }
      case 'fillrect': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        drawRect(true, true, path.beginX, path.beginY, endX, endY);
        clear('cache');
        saveHistory();
        break;
      }
      case 'emptyellipse': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        const a = (endX - path.beginX) / 2;
        const b = (endY - path.beginY) / 2;
        const x = path.beginX + a;
        const y = path.beginY + b;
        drawEllipse(cxt, x, y, Math.abs(a), Math.abs(b), false);
        clear('cache');
        saveHistory();
        break;
      }
      case 'fillellipse': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        const a = (endX - path.beginX) / 2;
        const b = (endY - path.beginY) / 2;
        const x = path.beginX + a;
        const y = path.beginY + b;
        drawEllipse(cxt, x, y, Math.abs(a), Math.abs(b), true);
        clear('cache');
        saveHistory();
        break;
      }
      default:
        break;
    }

    setIsDrawing(false);
  };

  const handleTextBlur = () => {
    const textFaker = textFakerRef.current;
    if (!textFaker) return;

    const text = textFaker.value;
    if (text !== '') {
      drawText(text, true, textConfig.left, textConfig.top, parseFloat(textFaker.style.width));
      saveHistory();
    }
    textFaker.value = '';
    textFaker.style.display = 'none';
  };

  const handleToolChange = (tool: string) => {
    setConfig(prev => ({ ...prev, shapeType: tool }));
    // 切换工具时清除选择区域
    if (tool !== 'mouse') {
      setSelection(null);
    }
  };

  const handleColorChange = (color: string) => {
    setConfig(prev => ({ ...prev, color }));
  };

  const handleLineWidthChange = (width: number) => {
    setConfig(prev => ({ ...prev, lineWidth: width }));
  };

  const handleLineWidthLevel = (level: number) => {
    const widthMap: { [key: number]: number } = { 1: 1, 2: 3, 3: 5 };
    setConfig(prev => ({ ...prev, lineWidth: widthMap[level] || 3 }));
  };

  const handleFontSizeLevel = (level: number) => {
    const fontSizeMap: { [key: number]: string } = { 1: '16px Arial', 2: '20px Arial', 3: '24px Arial' };
    setConfig(prev => ({ ...prev, font: fontSizeMap[level] || '20px Arial' }));
  };

  const handleEraserSizeLevel = (level: number) => {
    const eraserSizeMap: { [key: number]: number } = { 1: 20, 2: 30, 3: 50 };
    setConfig(prev => ({ ...prev, eraserSize: eraserSizeMap[level] || 30 }));
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

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
      <div className="w-full h-full" style={{ width: '100vw', height: '100vh' }}>
        <canvas
          ref={canvasCacheRef}
          width={typeof window !== 'undefined' ? window.innerWidth : 1920}
          height={typeof window !== 'undefined' ? window.innerHeight : 1080}
          className="absolute top-0 left-0 z-10 pointer-events-none"
          style={{ width: '100vw', height: '100vh' }}
        />
        <canvas
          ref={canvasRef}
          width={typeof window !== 'undefined' ? window.innerWidth : 1920}
          height={typeof window !== 'undefined' ? window.innerHeight : 1080}
          className={`bg-white z-0 ${
            isLocked 
              ? 'cursor-not-allowed' 
              : config.shapeType === 'mouse'
                ? 'cursor-default'
                : 'cursor-crosshair'
          }`}
          style={{ width: '100vw', height: '100vh' }}
          onMouseDown={drawBegin}
          onMouseMove={drawing}
          onMouseUp={drawEnd}
          onMouseLeave={drawEnd}
        />
        {/* 选择区域高亮 */}
        {selection && !isDrawing && (
          <div
            className="absolute z-20 border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
            style={{
              left: Math.min(selection.x, selection.x + selection.width),
              top: Math.min(selection.y, selection.y + selection.height),
              width: Math.abs(selection.width),
              height: Math.abs(selection.height)
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
    </div>
  );
};

export default Canvas;
