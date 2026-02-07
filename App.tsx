import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, Download, Share2, 
  Trophy, Target, Sparkles, Map as MapIcon, 
  Settings, Info, ChevronRight, PlayCircle, Menu, X
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
type ColorScheme = 'classic' | 'fire' | 'ocean' | 'purple' | 'matrix' | 'sunset' | 'psychedelic';

interface ViewState {
  centerX: number;
  centerY: number;
  zoom: number;
  maxIterations: number;
  colorScheme: ColorScheme;
}

interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  condition: (stats: GameStats) => boolean;
}

interface GameStats {
  zoom: number;
  maxZoom: number;
  patternsFound: number;
  timeInSeconds: number;
  points: number;
}

interface AIAnalysis {
  title: string;
  description: string;
  coordinates: string;
  suggestion: string;
}

// --- Constants ---
const COLOR_SCHEMES: Record<ColorScheme, { name: string; baseHue: number }> = {
  classic: { name: 'Classic Blue', baseHue: 200 },
  fire: { name: 'Inferno', baseHue: 0 },
  ocean: { name: 'Abyssal Ocean', baseHue: 190 },
  purple: { name: 'Cosmic Purple', baseHue: 280 },
  matrix: { name: 'Digital Rain', baseHue: 120 },
  sunset: { name: 'Vaporwave Sunset', baseHue: 330 },
  psychedelic: { name: 'Psychedelic', baseHue: 60 }
};

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_dive', name: 'First Dive', desc: 'Zoom in past 10x', icon: '🔍', condition: (s) => s.zoom > 10 },
  { id: 'depth_seeker', name: 'Depth Seeker', desc: 'Reach 1,000x zoom', icon: '🚀', condition: (s) => s.maxZoom >= 1000 },
  { id: 'abyssal_explorer', name: 'Abyssal Explorer', desc: 'Reach 1,000,000x zoom', icon: '💎', condition: (s) => s.maxZoom >= 1000000 },
  { id: 'stay_awhile', name: 'Scholar', desc: 'Explore for 10 minutes', icon: '⏳', condition: (s) => s.timeInSeconds >= 600 },
  { id: 'high_score', name: 'Grand Master', desc: 'Earn 1,000 exploration points', icon: '🏆', condition: (s) => s.points >= 1000 }
];

const INTERESTING_LOCATIONS = [
  { name: 'The Root', x: -0.5, y: 0, z: 1, desc: 'Where it all begins.' },
  { name: 'Seahorse Valley', x: -0.7463, y: 0.1102, z: 100, desc: 'Countless seahorse-like filaments.' },
  { name: 'Spiral Galaxy', x: -0.74364, y: 0.13182, z: 2000, desc: 'Infinite rotating structures.' },
  { name: 'Elephant Valley', x: -0.1011, y: 0.9563, z: 100, desc: 'Bulbous, organic shapes.' },
  { name: 'Triple Spiral', x: 0.285, y: 0.01, z: 500, desc: 'A rare triple-symmetry point.' },
  { name: 'The Satellite', x: -0.7269, y: 0.1889, z: 5000, desc: 'A perfect miniature set.' }
];

// --- Utilities ---
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const getColor = (iteration: number, maxIter: number, scheme: ColorScheme): [number, number, number] => {
  if (iteration === maxIter) return [0, 0, 0];
  const t = iteration / maxIter;
  const config = COLOR_SCHEMES[scheme];
  const hue = (config.baseHue + t * 360) % 360;

  switch(scheme) {
    case 'matrix': return [0, Math.round(255 * t * 2), 0];
    case 'fire':
      const r = Math.min(255, t * 510);
      const g = Math.min(255, Math.max(0, t * 510 - 255));
      return [r, g, 0];
    case 'psychedelic': return hslToRgb((t * 5 + Date.now() / 10000) % 1, 0.8, 0.5);
    default: return hslToRgb(hue / 360, 0.7, 0.2 + t * 0.6);
  }
};

// --- Services ---
const analyzeFractalLocation = async (x: number, y: number, zoom: number): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Describe the Mandelbrot set at X:${x}, Y:${y}, Zoom:${zoom}x. Be poetic and scientific. Suggest what to look for next.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            suggestion: { type: Type.STRING },
          },
          required: ["title", "description", "suggestion"],
        },
      }
    });
    const result = JSON.parse(response.text?.trim() || '{}');
    return {
      title: result.title || "The Infinite Edge",
      description: result.description || "Chaos meets order in a recursive dance.",
      suggestion: result.suggestion || "Look deeper into the filaments.",
      coordinates: `(${x.toFixed(6)}, ${y.toFixed(6)})`
    };
  } catch (error) {
    return {
      title: "Mathematical Infinity",
      description: "A boundary where beautiful complexity is revealed.",
      suggestion: "Keep exploring the edges.",
      coordinates: `(${x.toFixed(6)}, ${y.toFixed(6)})`
    };
  }
};

// --- Main Component ---
const App: React.FC = () => {
  const [view, setView] = useState<ViewState>({
    centerX: -0.5,
    centerY: 0,
    zoom: 1,
    maxIterations: 120,
    colorScheme: 'classic'
  });
  
  const [stats, setStats] = useState<GameStats>({ zoom: 1, maxZoom: 1, patternsFound: 0, timeInSeconds: 0, points: 0 });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isContinuousZoom, setIsContinuousZoom] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => setStats(prev => ({ ...prev, timeInSeconds: prev.timeInSeconds + 1 })), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    ACHIEVEMENTS.forEach(achievement => {
      if (!unlockedAchievements.includes(achievement.id) && achievement.condition(stats)) {
        setUnlockedAchievements(prev => [...prev, achievement.id]);
        setRecentAchievement(achievement);
        setStats(s => ({ ...s, points: s.points + 100 }));
        setTimeout(() => setRecentAchievement(null), 4000);
      }
    });
  }, [stats, unlockedAchievements]);

  useEffect(() => {
    setStats(prev => ({ ...prev, zoom: view.zoom, maxZoom: Math.max(prev.maxZoom, view.zoom) }));
  }, [view.zoom]);

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
          let x = 0, y = 0, iteration = 0;
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

  useEffect(() => {
    if (isContinuousZoom) {
      const timer = setInterval(() => {
        setView(prev => ({ ...prev, zoom: prev.zoom * 1.05 }));
      }, 50);
      return () => clearInterval(timer);
    }
  }, [isContinuousZoom]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const analysis = await analyzeFractalLocation(view.centerX, view.centerY, view.zoom);
    setAiAnalysis(analysis);
    setStats(s => ({ ...s, points: s.points + 25 }));
    setIsAnalyzing(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !canvasRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    const scale = 3.5 / view.zoom;
    const aspectRatio = canvasRef.current.width / canvasRef.current.height;
    setView(prev => ({
      ...prev,
      centerX: prev.centerX - (dx * scale * aspectRatio) / canvasRef.current!.width,
      centerY: prev.centerY - (dy * scale) / canvasRef.current!.height
    }));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <div className={`transition-all duration-300 flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-md ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" /> Pawli Explorer
          </h1>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setView(v => ({...v, zoom: v.zoom * 2}))} className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center gap-2 text-sm"><ZoomIn size={16}/> Zoom</button>
            <button onClick={() => setView(v => ({...v, zoom: v.zoom * 0.5}))} className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center gap-2 text-sm"><ZoomOut size={16}/> Out</button>
          </div>
          <section className="space-y-3">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Color Schemes</span>
            <div className="grid grid-cols-1 gap-1">
              {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map(scheme => (
                <button key={scheme} onClick={() => setView(v => ({...v, colorScheme: scheme}))} className={`p-2 px-3 text-left rounded-lg text-sm border transition-all ${view.colorScheme === scheme ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  {COLOR_SCHEMES[scheme].name}
                </button>
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Landmarks</span>
            <div className="space-y-1">
              {INTERESTING_LOCATIONS.map(loc => (
                <button key={loc.name} onClick={() => setView({ ...view, centerX: loc.x, centerY: loc.y, zoom: loc.z })} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs group transition-all">
                  <div className="flex justify-between items-center"><span className="font-bold">{loc.name}</span><ChevronRight size={12}/></div>
                  <p className="text-slate-500 mt-1">{loc.desc}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900">
           <div className="flex justify-between items-end">
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Points</p><p className="text-xl font-bold text-emerald-400">{stats.points}</p></div>
              <div className="text-right"><p className="text-[10px] text-slate-500 uppercase font-bold">Max Depth</p><p className="text-lg font-bold text-blue-400">{stats.maxZoom.toFixed(0)}x</p></div>
           </div>
        </div>
      </div>
      <div className="flex-1 relative flex flex-col bg-black">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-slate-900/80 border border-slate-700 rounded-full text-slate-300"><Menu size={20}/></button>
          <div className="bg-slate-900/80 border border-slate-700 rounded-full py-1.5 px-4 flex items-center gap-3">
             <span className="text-xs font-mono text-slate-400">{view.centerX.toFixed(4)}, {view.centerY.toFixed(4)}</span>
             <button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 transition-all disabled:opacity-50">
               {isAnalyzing ? '...' : <><Sparkles size={10}/> Analyze</>}
             </button>
          </div>
        </div>
        {recentAchievement && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 animate-bounce">
            <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400">
              <Trophy size={24}/><div className="text-left"><p className="text-[10px] font-bold uppercase opacity-80">Achievement!</p><p className="font-bold">{recentAchievement.name}</p></div>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => isDraggingRef.current = false} onMouseLeave={() => isDraggingRef.current = false} className="flex-1 w-full h-full cursor-crosshair"/>
        {isRendering && <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none"><div className="px-4 py-2 bg-slate-900/80 rounded-full text-[10px] font-bold tracking-widest uppercase animate-pulse">Rendering...</div></div>}
        {aiAnalysis && (
          <div className="absolute bottom-10 right-10 w-80 bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-2xl">
            <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-slate-500"><X size={16}/></button>
            <h3 className="font-bold text-blue-300 text-sm mb-2">{aiAnalysis.title}</h3>
            <p className="text-xs text-slate-300 italic mb-4">"{aiAnalysis.description}"</p>
            <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500"><span className="text-blue-400 font-bold">NEXT:</span> {aiAnalysis.suggestion}</div>
          </div>
        )}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
           <button onClick={() => setIsContinuousZoom(!isContinuousZoom)} className={`p-3 rounded-xl border shadow-lg transition-all ${isContinuousZoom ? 'bg-blue-600 border-blue-400 text-white animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-300'}`}><PlayCircle size={24}/></button>
           <button onClick={() => setView({...view, centerX: -0.5, centerY: 0, zoom: 1})} className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-300"><RotateCcw size={24}/></button>
        </div>
      </div>
    </div>
  );
};

export default App;