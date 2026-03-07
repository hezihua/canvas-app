'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

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

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Scale {
  scaleX: number;
  scaleY: number;
}

interface TextConfig {
  left: number;
  top: number;
  right: number;
  bottom: number;
  font: string;
  color: string;
}

interface Path {
  beginX: number;
  beginY: number;
  endX: number;
  endY: number;
}

export interface CanvasAction {
  type: string;
  data: any;
}

export const useCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCacheRef = useRef<HTMLCanvasElement>(null);
  const textFakerRef = useRef<HTMLTextAreaElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [coordinate, setCoordinate] = useState<Point[]>([]);
  const [path, setPath] = useState<Path>({
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
  const [textConfig, setTextConfig] = useState<TextConfig>({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    font: '20px Arial',
    color: '#000000'
  });
  const [scale, setScale] = useState<Scale>({ scaleX: 1, scaleY: 1 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const canvasCache = canvasCacheRef.current;
    if (canvas && canvasCache) {
      // 设置 canvas 尺寸为窗口尺寸
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvasCache.width = width;
      canvas.height = height;
      canvasCache.height = height;

      const cxt = canvas.getContext('2d');
      const cxtCache = canvasCache.getContext('2d');
      if (cxt && cxtCache) {
        cxt.translate(0.5, 0.5);
        cxtCache.translate(0.5, 0.5);
        
        // 此时 canvas 的 getBoundingClientRect 应该返回 CSS 像素尺寸
        const rect = canvas.getBoundingClientRect();
        setStageInfo(rect);
        
        // 计算缩放比例（canvas 内部像素 / CSS 像素）
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        setScale({ scaleX, scaleY });
        
        const imageData = cxt.getImageData(0, 0, canvas.width, canvas.height);
        setDrawHistory([imageData]);
        setHistoryIndex(0);
      }
    }

    // 处理窗口大小变化
    const handleResize = () => {
      const canvas = canvasRef.current;
      const canvasCache = canvasCacheRef.current;
      if (canvas && canvasCache) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = width;
        canvasCache.width = width;
        canvas.height = height;
        canvasCache.height = height;

        const cxt = canvas.getContext('2d');
        const cxtCache = canvasCache.getContext('2d');
        if (cxt && cxtCache) {
          cxt.translate(0.5, 0.5);
          cxtCache.translate(0.5, 0.5);
          
          const rect = canvas.getBoundingClientRect();
          setStageInfo(rect);
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          setScale({ scaleX, scaleY });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getMousePos = useCallback((event: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return { x, y };
  }, []);

  const drawGraffiti = useCallback((ctx: CanvasRenderingContext2D, points: Point[]) => {
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
  }, [config.color, config.lineWidth, config.lineCap, config.lineJoin]);

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, beginX: number, beginY: number, endX: number, endY: number) => {
    ctx.save();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = config.lineWidth;
    ctx.lineCap = config.lineCap;
    ctx.lineJoin = config.lineJoin;
    ctx.beginPath();
    ctx.moveTo(beginX, beginY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  }, [config.color, config.lineWidth, config.lineCap, config.lineJoin]);

  const drawRect = useCallback((ctx: CanvasRenderingContext2D, isFill: boolean, beginX: number, beginY: number, endX: number, endY: number) => {
    const width = Math.abs(endX - beginX);
    const height = Math.abs(endY - beginY);
    const left = endX > beginX ? beginX : endX;
    const top = endY > beginY ? beginY : endY;

    ctx.save();
    ctx.strokeStyle = config.color;
    ctx.fillStyle = config.color;
    ctx.lineWidth = config.lineWidth;
    if (isFill) {
      ctx.fillRect(left, top, width, height);
    } else {
      ctx.strokeRect(left, top, width, height);
    }
    ctx.restore();
  }, [config.color, config.lineWidth]);

  const drawEllipse = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, isFill: boolean) => {
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
  }, [config.color, config.lineWidth]);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const cxt = canvas?.getContext('2d');
    if (!canvas || !cxt) return;
    
    const imageData = cxt.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = drawHistory.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setDrawHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [drawHistory, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const canvas = canvasRef.current;
      const cxt = canvas?.getContext('2d');
      if (!canvas || !cxt) return;
      
      cxt.putImageData(drawHistory[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  }, [historyIndex, drawHistory]);

  const redo = useCallback(() => {
    if (historyIndex < drawHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const canvas = canvasRef.current;
      const cxt = canvas?.getContext('2d');
      if (!canvas || !cxt) return;
      
      cxt.putImageData(drawHistory[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  }, [historyIndex, drawHistory]);

  const clearAll = useCallback(() => {
    const canvas = canvasRef.current;
    const canvasCache = canvasCacheRef.current;
    if (!canvas || !canvasCache || !stageInfo) return;

    const cxt = canvas.getContext('2d');
    const cxtCache = canvasCache.getContext('2d');
    if (!cxt || !cxtCache) return;
    
    cxt.clearRect(0, 0, canvas.width, canvas.height);
    cxtCache.clearRect(0, 0, canvasCache.width, canvasCache.height);
    saveHistory();
  }, [stageInfo, saveHistory]);

  const clear = useCallback((sel?: string) => {
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
  }, [stageInfo]);

  const drawBegin = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    
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
  }, [isLocked, config.shapeType, getMousePos]);

  const drawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isLocked) return;
    
    if (config.shapeType === 'mouse') {
      const mousePos = getMousePos(e);
      if (selection) {
        setSelection({
          x: selection.x,
          y: selection.y,
          width: mousePos.x - selection.x,
          height: mousePos.y - selection.y
        });
      }
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
        drawRect(cxtCache, false, path.beginX, path.beginY, endX, endY);
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
            cxt.clearRect(0, 0, canvas.width, canvas.height);
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
        drawLine(cxtCache, path.beginX, path.beginY, endX, endY);
        break;
      }
      case 'emptyrect': {
        clear('cache');
        drawRect(cxtCache, false, path.beginX, path.beginY, endX, endY);
        break;
      }
      case 'fillrect': {
        clear('cache');
        drawRect(cxtCache, true, path.beginX, path.beginY, endX, endY);
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
  }, [isDrawing, isLocked, config.shapeType, coordinate, selection, path, getMousePos, clear, drawGraffiti, drawLine, drawRect, drawEllipse]);

  const drawEnd = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isLocked) return;
    
    if (config.shapeType === 'mouse') {
      const mousePos = getMousePos(e);
      if (selection) {
        setSelection({
          x: selection.x,
          y: selection.y,
          width: mousePos.x - selection.x,
          height: mousePos.y - selection.y
        });
      }
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
    const canvasCache = canvasCacheRef.current;
    if (!canvas || !canvasCache) return;

    const cxt = canvas.getContext('2d');
    const cxtCache = canvasCache.getContext('2d');
    if (!cxt || !cxtCache) return;

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
          bottom: y1 < y2 ? y2 : y1,
          font: config.font,
          color: config.color
        });
        // 清除缓存层的矩形框，不绘制到主 canvas
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
        // 将缓存层内容绘制到主 canvas
        cxt.drawImage(canvasCache, 0, 0);
        clear('cache');
        saveHistory();
        break;
      }
      case 'line': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        // 将缓存层内容绘制到主 canvas
        cxt.drawImage(canvasCache, 0, 0);
        clear('cache');
        saveHistory();
        break;
      }
      case 'emptyrect': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        // 将缓存层内容绘制到主 canvas
        cxt.drawImage(canvasCache, 0, 0);
        clear('cache');
        saveHistory();
        break;
      }
      case 'fillrect': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        // 将缓存层内容绘制到主 canvas
        cxt.drawImage(canvasCache, 0, 0);
        clear('cache');
        saveHistory();
        break;
      }
      case 'emptyellipse': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        // 将缓存层内容绘制到主 canvas
        cxt.drawImage(canvasCache, 0, 0);
        clear('cache');
        saveHistory();
        break;
      }
      case 'fillellipse': {
        const updatedCoordinate = [...coordinate, mousePos];
        setCoordinate(updatedCoordinate);
        // 将缓存层内容绘制到主 canvas
        cxt.drawImage(canvasCache, 0, 0);
        clear('cache');
        saveHistory();
        break;
      }
      default:
        break;
    }

    setIsDrawing(false);
  }, [isDrawing, isLocked, config.shapeType, coordinate, selection, getMousePos, clear, saveHistory]);

  const handleTextBlur = useCallback(() => {
    const textFaker = textFakerRef.current;
    if (!textFaker) return;

    const text = textFaker.value;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cxt = canvas.getContext('2d');
    if (!cxt) return;

    if (text !== '') {
      // 绘制文字到 canvas
      cxt.save();
      cxt.font = textConfig.font;
      cxt.fillStyle = textConfig.color;
      cxt.textBaseline = 'top';
      cxt.fillText(text, textConfig.left, textConfig.top);
      cxt.restore();
      
      saveHistory();
    }
    textFaker.value = '';
    textFaker.style.display = 'none';
  }, [textConfig, saveHistory]);

  const handleToolChange = useCallback((tool: string) => {
    setConfig(prev => ({ ...prev, shapeType: tool }));
    if (tool !== 'mouse') {
      setSelection(null);
    }
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setConfig(prev => ({ ...prev, color }));
  }, []);

  const handleLineWidthChange = useCallback((width: number) => {
    setConfig(prev => ({ ...prev, lineWidth: width }));
  }, []);

  const handleLineWidthLevel = useCallback((level: number) => {
    const widthMap: { [key: number]: number } = { 1: 1, 2: 3, 3: 5 };
    setConfig(prev => ({ ...prev, lineWidth: widthMap[level] || 3 }));
  }, []);

  const handleFontSizeLevel = useCallback((level: number) => {
    const fontSizeMap: { [key: number]: string } = { 1: '16px Arial', 2: '20px Arial', 3: '24px Arial' };
    setConfig(prev => ({ ...prev, font: fontSizeMap[level] || '20px Arial' }));
  }, []);

  const handleEraserSizeLevel = useCallback((level: number) => {
    const eraserSizeMap: { [key: number]: number } = { 1: 20, 2: 30, 3: 50 };
    setConfig(prev => ({ ...prev, eraserSize: eraserSizeMap[level] || 30 }));
  }, []);

  const toggleLock = useCallback(() => {
    setIsLocked(!isLocked);
  }, [isLocked]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  // 处理远程画布操作
  const handleRemoteCanvasAction = useCallback((action: CanvasAction) => {
    const canvas = canvasRef.current;
    const canvasCache = canvasCacheRef.current;
    if (!canvas || !canvasCache) return;

    const cxt = canvas.getContext('2d');
    const cxtCache = canvasCache.getContext('2d');
    if (!cxt || !cxtCache) return;

    switch (action.type) {
      case 'drawGraffiti': {
        const { points, color, lineWidth, lineCap, lineJoin } = action.data;
        
        // 防御性检查：points 不能为空
        if (!points || points.length === 0) {
          console.warn('Received empty points array for drawGraffiti');
          return;
        }
        
        cxt.save();
        cxt.beginPath();
        cxt.strokeStyle = color;
        cxt.lineWidth = lineWidth;
        cxt.lineCap = lineCap;
        cxt.lineJoin = lineJoin;

        if (points.length <= 4) {
          cxt.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            cxt.lineTo(points[i].x, points[i].y);
          }
          cxt.stroke();
        } else {
          cxt.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i + 1].x + points[i].x) / 2;
            const yc = (points[i + 1].y + points[i].y) / 2;
            cxt.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          cxt.quadraticCurveTo(
            points[points.length - 2].x,
            points[points.length - 2].y,
            points[points.length - 1].x,
            points[points.length - 1].y
          );
          cxt.stroke();
        }
        cxt.restore();
        break;
      }
      case 'drawLine': {
        const { beginX, beginY, endX, endY, color, lineWidth, lineCap, lineJoin } = action.data;
        cxt.save();
        cxt.strokeStyle = color;
        cxt.lineWidth = lineWidth;
        cxt.lineCap = lineCap;
        cxt.lineJoin = lineJoin;
        cxt.beginPath();
        cxt.moveTo(beginX, beginY);
        cxt.lineTo(endX, endY);
        cxt.stroke();
        cxt.restore();
        break;
      }
      case 'drawRect': {
        const { isFill, beginX, beginY, endX, endY, color, lineWidth } = action.data;
        const width = Math.abs(endX - beginX);
        const height = Math.abs(endY - beginY);
        const left = endX > beginX ? beginX : endX;
        const top = endY > beginY ? beginY : endY;

        cxt.save();
        cxt.strokeStyle = color;
        cxt.fillStyle = color;
        cxt.lineWidth = lineWidth;
        if (isFill) {
          cxt.fillRect(left, top, width, height);
        } else {
          cxt.strokeRect(left, top, width, height);
        }
        cxt.restore();
        break;
      }
      case 'drawEllipse': {
        const { x, y, a, b, isFill, color, lineWidth } = action.data;
        cxt.save();
        const r = a > b ? a : b;
        const ratioX = a / r;
        const ratioY = b / r;
        cxt.scale(ratioX, ratioY);
        cxt.beginPath();
        cxt.arc(x / ratioX, y / ratioY, r, 0, 2 * Math.PI, false);
        cxt.closePath();
        if (isFill) {
          cxt.fillStyle = color;
          cxt.fill();
        } else {
          cxt.strokeStyle = color;
          cxt.lineWidth = lineWidth;
          cxt.stroke();
        }
        cxt.restore();
        break;
      }
      case 'drawText': {
        const { text, left, top, font, color } = action.data;
        cxt.save();
        cxt.font = font;
        cxt.fillStyle = color;
        cxt.textBaseline = 'top';
        cxt.fillText(text, left, top);
        cxt.restore();
        break;
      }
      case 'clear': {
        cxt.clearRect(0, 0, canvas.width, canvas.height);
        break;
      }
    }
  }, []);

  // 监听远程画布操作
  useEffect(() => {
    const handleAction = (event: CustomEvent<CanvasAction>) => {
      handleRemoteCanvasAction(event.detail);
    };

    window.addEventListener('canvasAction' as any, handleAction as any);
    return () => {
      window.removeEventListener('canvasAction' as any, handleAction as any);
    };
  }, [handleRemoteCanvasAction]);

  return {
    canvasRef,
    canvasCacheRef,
    textFakerRef,
    isDrawing,
    coordinate,
    path,
    config,
    stageInfo,
    textConfig,
    scale,
    selection,
    drawHistory,
    historyIndex,
    isLocked,
    isFullscreen,
    getMousePos,
    saveHistory,
    undo,
    redo,
    clearAll,
    clear,
    drawBegin,
    drawing,
    drawEnd,
    handleTextBlur,
    handleToolChange,
    handleColorChange,
    handleLineWidthChange,
    handleLineWidthLevel,
    handleFontSizeLevel,
    handleEraserSizeLevel,
    toggleLock,
    toggleFullscreen,
    setSelection,
  };
};
