import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, Download, Share2, 
  Trophy, Target, Sparkles, Map as MapIcon, 
  Settings, Info, ChevronRight, PlayCircle
} from 'lucide-react';
import { 
  ViewState, GameStats, FoundPattern, Achievement, 
  AIAnalysis, DailyChallenge, ColorScheme 
} from './types';
import { 
  COLOR_SCHEMES, PATTERNS, ACHIEVEMENTS, 
  INTERESTING_LOCATIONS, DAILY_CHALLENGES 
} from './constants';
import { getColor } from './utils/fractalUtils';
import { analyzeFractalLocation } from './services/geminiService';

const App: React.FC = () => {
  // --- View State ---
  const [view, setView] = useState<ViewState>({
    centerX: -0.5,
    centerY: 0,
    zoom: 1,
    maxIterations: 120,
    colorScheme: 'classic'
  });
  
  // --- Game State ---
  const [stats, setStats] = useState<GameStats>({
    zoom: 1,
    maxZoom: 1,
    patternsFound: 0,
    timeInSeconds: 0,
    points: 0
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  
  // --- UI State ---
  const [isRendering, setIsRendering] = useState(false);
  const [isContinuousZoom, setIsContinuousZoom] = useState(false);
  const [zoomTarget, setZoomTarget] = useState({ x: 0, y: 0 });
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const continuousZoomRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Refs for dragging logic to avoid stale closures and unnecessary re-renders
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);

  // Initialize Daily Challenge
  useEffect(() => {
    const today = new Date().getDay();
    setDailyChallenge(DAILY_CHALLENGES[today % DAILY_CHALLENGES.length]);
  }, []);

  // Exploration Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({ ...prev, timeInSeconds: prev.timeInSeconds + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Achievement Engine
  useEffect(() => {
    ACHIEVEMENTS.forEach(achievement => {
      if (!unlockedAchievements.includes(achievement.id) && achievement.condition(stats)) {
        setUnlockedAchievements(prev => [...prev, achievement.id]);
        setRecentAchievement(achievement);
        setTimeout(() => setRecentAchievement(null), 4000);
      }
    });
  }, [stats, unlockedAchievements]);

  // Sync Stats with View
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      zoom: view.zoom,
      maxZoom: Math.max(prev.maxZoom, view.zoom)
    }));
  }, [view.zoom]);

  // Main Rendering Logic
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsRendering(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { centerX, centerY, zoom, maxIterations, colorScheme } = view;
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const aspectRatio = width / height;
    const scale = 3.5 / zoom;

    setTimeout(() => {
      for (let px = 0; px < width; px++) {
        for (let py = 0; py < height; py++) {
          const x0 = centerX + ((px - width / 2) * scale * aspectRatio) / width;
          const y0 = centerY + ((py - height / 2) * scale) / height;

          let x = 0;
          let y = 0;
          let iteration = 0;

          while (x * x + y * y <= 4 && iteration < maxIterations) {
            const xtemp = x * x - y * y + x0;
            y = 2 * x * y + y0;
            x = xtemp;
            iteration++;
          }

          const pixelIndex = (py * width + px) * 4;
          const [r, g, b] = getColor(iteration, maxIterations, colorScheme);

          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setIsRendering(false);
    }, 0);
  }, [view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    }
  }, [draw]);

  // Continuous Zoom Logic
  useEffect(() => {
    if (isContinuousZoom) {
      continuousZoomRef.current = setInterval(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const aspectRatio = canvas.width / canvas.height;
        const scale = 3.5 / view.zoom;

        const targetX = view.centerX + ((zoomTarget.x - canvas.width / 2) * scale * aspectRatio) / canvas.width;
        const targetY = view.centerY + ((zoomTarget.y - canvas.height / 2) * scale) / canvas.height;

        setView(prev => ({
          ...prev,
          centerX: prev.centerX + (targetX - prev.centerX) * 0.2,
          centerY: prev.centerY + (targetY - prev.centerY) * 0.2,
          zoom: prev.zoom * 1.05
        }));
      }, 50);
    } else if (continuousZoomRef.current) {
      clearInterval(continuousZoomRef.current);
    }
    return () => {
      if (continuousZoomRef.current) clearInterval(continuousZoomRef.current);
    };
  }, [isContinuousZoom, zoomTarget, view.zoom]);

  // Handlers for click-and-drag and zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    isDraggingRef.current = true;
    setIsDragging(true);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    dragDistanceRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (isContinuousZoom) {
      setZoomTarget({ x: currentX, y: currentY });
    }

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      
      dragDistanceRef.current += Math.sqrt(dx * dx + dy * dy);

      const aspectRatio = canvas.width / canvas.height;
      const scale = 3.5 / view.zoom;

      // Displacement in fractal coordinate space
      const fractalDx = (dx * scale * aspectRatio) / canvas.width;
      const fractalDy = (dy * scale) / canvas.height;

      setView(prev => ({
        ...prev,
        centerX: prev.centerX - fractalDx,
        centerY: prev.centerY - fractalDy
      }));

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      // If movement was negligible, treat it as a click for zooming
      if (dragDistanceRef.current < 5) {
        handleCanvasClick(e);
      }
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Already checked dragDistance, handle zoom logic
    if (e.ctrlKey || e.metaKey) {
      setIsContinuousZoom(!isContinuousZoom);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const aspectRatio = canvas.width / canvas.height;
    const scale = 3.5 / view.zoom;

    const newX = view.centerX + ((x - canvas.width / 2) * scale * aspectRatio) / canvas.width;
    const newY = view.centerY + ((y - canvas.height / 2) * scale) / canvas.height;

    setView(prev => ({
      ...prev,
      centerX: newX,
      centerY: newY,
      zoom: prev.zoom * 2
    }));
  };

  const performAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeFractalLocation(view.centerX, view.centerY, view.zoom);
    setAiAnalysis(result);
    setIsAnalyzing(false);
    setStats(prev => ({ ...prev, points: prev.points + 25 }));
  };

  const downloadCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `pawli-explorer-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      
      {/* --- Sidebar --- */}
      <aside className={`transition-all duration-300 ease-in-out border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 space-y-8 h-full overflow-y-auto">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight leading-tight">Pawli Explorer</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Mandelbrot Explorer</p>
          </div>

          {/* Stats Card */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Points</p>
              <p className="text-xl font-bold text-indigo-400">{stats.points}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Max Zoom</p>
              <p className="text-xl font-bold text-emerald-400">{stats.maxZoom >= 1000 ? (stats.maxZoom / 1000).toFixed(1) + 'k' : stats.maxZoom.toFixed(0)}x</p>
            </div>
          </div>

          {/* Daily Quest Section */}
          {dailyChallenge && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-amber-500 px-1">
                <Target size={14} />
                <h3 className="text-xs font-bold uppercase tracking-wider">Daily Quest</h3>
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-amber-200">Seek: {PATTERNS[dailyChallenge.pattern]?.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Navigate to the hidden coordinates to claim your reward.</p>
                  </div>
                  <span className="text-xl">{PATTERNS[dailyChallenge.pattern]?.icon}</span>
                </div>
                <button 
                  onClick={() => setView(prev => ({ ...prev, centerX: dailyChallenge.x, centerY: dailyChallenge.y, zoom: dailyChallenge.zoom }))}
                  className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-500 transition-all flex items-center justify-center gap-2"
                >
                  <Target size={14} />
                  Scan Coordinates
                </button>
              </div>
            </section>
          )}

          {/* Controls Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 px-1">
              <Settings size={14} />
              <h3 className="text-xs font-bold uppercase tracking-wider">Engine Configuration</h3>
            </div>
            
            <div className="space-y-4 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Precision (Iterations)</span>
                  <span className="text-indigo-400 font-bold">{view.maxIterations}</span>
                </div>
                <input 
                  type="range" min="50" max="1000" step="50"
                  value={view.maxIterations}
                  onChange={(e) => setView(prev => ({ ...prev, maxIterations: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-medium px-1">Visual Palette</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(COLOR_SCHEMES).map((scheme) => (
                    <button
                      key={scheme}
                      onClick={() => setView(prev => ({ ...prev, colorScheme: scheme as ColorScheme }))}
                      className={`py-2 px-3 rounded-xl text-[11px] font-bold transition-all border ${
                        view.colorScheme === scheme 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                        : 'bg-slate-700/50 border-transparent text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {COLOR_SCHEMES[scheme as ColorScheme].name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Landmarks Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 px-1">
              <MapIcon size={14} />
              <h3 className="text-xs font-bold uppercase tracking-wider">Ancient Landmarks</h3>
            </div>
            <div className="space-y-2">
              {INTERESTING_LOCATIONS.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => setView(prev => ({ ...prev, centerX: loc.x, centerY: loc.y, zoom: loc.z }))}
                  className="group w-full p-3 rounded-2xl bg-slate-800/30 border border-slate-700/30 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold group-hover:text-indigo-400 transition-colors">{loc.name}</span>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-indigo-400" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{loc.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Achievements Footer */}
          <section className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Trophy size={14} />
                <h3 className="text-xs font-bold uppercase tracking-wider">Achievements</h3>
              </div>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full">
                {unlockedAchievements.length}/{ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ACHIEVEMENTS.map(ach => (
                <div 
                  key={ach.id} 
                  title={`${ach.name}: ${ach.desc}`}
                  className={`aspect-square flex items-center justify-center rounded-xl text-lg border transition-all ${
                    unlockedAchievements.includes(ach.id) 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                    : 'bg-slate-800 border-slate-700 text-slate-600 grayscale opacity-40'
                  }`}
                >
                  {ach.icon}
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* --- Main Viewport --- */}
      <main className="flex-1 relative flex flex-col min-w-0">
        <nav className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
             <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 text-slate-300 hover:text-white transition-all shadow-xl"
            >
              <Info size={20} />
            </button>
            <div className="flex items-center gap-4 p-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-xl px-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Center</span>
                <span className="text-xs font-mono text-indigo-300 tracking-tight">{view.centerX.toFixed(4)}, {view.centerY.toFixed(4)}</span>
              </div>
              <div className="h-8 w-px bg-slate-700/50"></div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Session Time</span>
                <span className="text-xs font-mono text-emerald-300 tracking-tight">{formatTime(stats.timeInSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
            <button 
              onClick={performAIAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50"
            >
              {isAnalyzing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" /> : <Sparkles size={18} />}
              AI Insight
            </button>
            <button 
              onClick={downloadCapture}
              className="p-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 text-slate-300 hover:text-white transition-all shadow-xl"
            >
              <Download size={20} />
            </button>
          </div>
        </nav>

        <div className={`flex-1 relative bg-black ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full block"
          />
          
          {isRendering && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
               <div className="px-4 py-2 bg-indigo-600/90 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl animate-pulse">
                Computing Infinity...
               </div>
            </div>
          )}

          {isContinuousZoom && (
            <div 
              className="absolute pointer-events-none"
              style={{ left: zoomTarget.x, top: zoomTarget.y, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-indigo-500 rounded-full animate-ping opacity-25"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-indigo-400 rounded-full animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-indigo-400 rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
           {recentAchievement && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-px rounded-2xl shadow-2xl animate-bounce">
              <div className="flex items-center gap-4 px-6 py-3 bg-slate-900 rounded-2xl">
                <div className="text-3xl">{recentAchievement.icon}</div>
                <div>
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Unlocked Achievement</h4>
                  <p className="text-sm font-bold text-white">{recentAchievement.name}</p>
                </div>
              </div>
            </div>
          )}

          {aiAnalysis && (
            <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-6 shadow-2xl max-w-lg w-screen mx-4 mb-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-indigo-300">{aiAnalysis.title}</h3>
                    <button onClick={() => setAiAnalysis(null)} className="text-slate-500 hover:text-white">✕</button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">"{aiAnalysis.description}"</p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-emerald-500 uppercase">Tip: {aiAnalysis.suggestion}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{aiAnalysis.coordinates}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-2 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl">
            <button 
              onClick={() => setView(prev => ({ ...prev, zoom: prev.zoom / 2 }))}
              className="p-3 rounded-2xl hover:bg-slate-800 text-slate-300 transition-all"
            >
              <ZoomOut size={20} />
            </button>
            <div className="h-8 w-px bg-slate-800"></div>
            <button 
              onClick={() => setIsContinuousZoom(!isContinuousZoom)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition-all ${isContinuousZoom ? 'bg-indigo-600 text-white animate-pulse shadow-lg shadow-indigo-600/20' : 'bg-transparent text-slate-400 hover:text-white'}`}
            >
              <PlayCircle size={18} />
              {isContinuousZoom ? 'Auto-Diving' : 'Continuous Zoom'}
            </button>
            <div className="h-8 w-px bg-slate-800"></div>
            <button 
              onClick={() => setView(prev => ({ ...prev, zoom: prev.zoom * 2 }))}
              className="p-3 rounded-2xl hover:bg-slate-800 text-slate-300 transition-all"
            >
              <ZoomIn size={20} />
            </button>
            <div className="h-8 w-px bg-slate-800"></div>
            <button 
              onClick={() => setView({ centerX: -0.5, centerY: 0, zoom: 1, maxIterations: 120, colorScheme: 'classic' })}
              className="p-3 rounded-2xl hover:bg-slate-800 text-slate-300 transition-all"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </main>

      {showShareModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl max-w-md w-full space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <Share2 className="text-white" size={32} />
              </div>
              <h2 className="text-2xl font-bold">Share Discovery</h2>
              <p className="text-slate-400 text-sm mt-2">Let others see the infinite complexity you've found.</p>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-2xl space-y-2 border border-slate-700/50">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Coordinates</span>
                <span className="text-indigo-400 font-mono">{view.centerX.toFixed(5)}, {view.centerY.toFixed(5)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Zoom Depth</span>
                <span className="text-emerald-400 font-mono">{view.zoom.toFixed(0)}x</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20">
                Copy Link
              </button>
              <button onClick={() => setShowShareModal(false)} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;