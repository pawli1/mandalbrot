
import { ColorScheme, Pattern, Achievement, DailyChallenge } from './types';

export const COLOR_SCHEMES: Record<ColorScheme, { name: string; baseHue: number }> = {
  classic: { name: 'Classic Blue', baseHue: 200 },
  fire: { name: 'Inferno', baseHue: 0 },
  ocean: { name: 'Abyssal Ocean', baseHue: 190 },
  purple: { name: 'Cosmic Purple', baseHue: 280 },
  matrix: { name: 'Digital Rain', baseHue: 120 },
  sunset: { name: 'Vaporwave Sunset', baseHue: 330 },
  psychedelic: { name: 'Psychedelic', baseHue: 60 }
};

export const PATTERNS: Record<string, Pattern> = {
  miniMandelbrot: { id: 'miniMandelbrot', name: 'Mini Mandelbrot', icon: '🔮', points: 150, type: 'rare' },
  spiral: { id: 'spiral', name: 'Infinite Spiral', icon: '🌀', points: 50, type: 'common' },
  seahorse: { id: 'seahorse', name: 'Seahorse Tail', icon: '🌊', points: 75, type: 'uncommon' },
  elephant: { id: 'elephant', name: 'Elephant Trunk', icon: '🐘', points: 60, type: 'common' },
  dragon: { id: 'dragon', name: 'Dragon fractal', icon: '🐉', points: 100, type: 'uncommon' }
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_dive', name: 'First Dive', desc: 'Zoom in past 10x', icon: '🔍', condition: (s) => s.zoom > 10 },
  { id: 'depth_seeker', name: 'Depth Seeker', desc: 'Reach 1,000x zoom', icon: '🚀', condition: (s) => s.maxZoom >= 1000 },
  { id: 'abyssal_explorer', name: 'Abyssal Explorer', desc: 'Reach 1,000,000x zoom', icon: '💎', condition: (s) => s.maxZoom >= 1000000 },
  { id: 'pattern_hunter', name: 'Hunter', desc: 'Find 5 unique patterns', icon: '🎯', condition: (s) => s.patternsFound >= 5 },
  { id: 'stay_awhile', name: 'Stay Awhile', desc: 'Explore for 10 minutes', icon: '⏳', condition: (s) => s.timeInSeconds >= 600 },
  { id: 'high_score', name: 'Scholar', desc: 'Earn 1,000 exploration points', icon: '🏆', condition: (s) => s.points >= 1000 }
];

export const INTERESTING_LOCATIONS = [
  { name: 'The Root', x: -0.5, y: 0, z: 1, desc: 'Where it all begins.' },
  { name: 'Seahorse Valley', x: -0.7463, y: 0.1102, z: 100, desc: 'Countless seahorse-like filaments.' },
  { name: 'Spiral Galaxy', x: -0.74364, y: 0.13182, z: 2000, desc: 'Infinite rotating structures.' },
  { name: 'Elephant Valley', x: -0.1011, y: 0.9563, z: 100, desc: 'Bulbous, organic shapes.' },
  { name: 'Triple Spiral', x: 0.285, y: 0.01, z: 500, desc: 'A rare triple-symmetry point.' },
  { name: 'The Satellite', x: -0.7269, y: 0.1889, z: 5000, desc: 'A perfect miniature set.' }
];

export const DAILY_CHALLENGES: DailyChallenge[] = [
  { x: -0.7463, y: 0.1102, zoom: 100, pattern: 'seahorse', day: 0 },
  { x: -1.768, y: 0.001, zoom: 1000, pattern: 'miniMandelbrot', day: 1 },
  { x: -0.101, y: 0.956, zoom: 150, pattern: 'elephant', day: 2 },
  { x: -0.7436, y: 0.1318, zoom: 5000, pattern: 'spiral', day: 3 },
  { x: 0.285, y: 0.01, zoom: 800, pattern: 'dragon', day: 4 }
];
