
export type ColorScheme = 'classic' | 'fire' | 'ocean' | 'purple' | 'matrix' | 'sunset' | 'psychedelic';

export interface ViewState {
  centerX: number;
  centerY: number;
  zoom: number;
  maxIterations: number;
  colorScheme: ColorScheme;
}

export interface Pattern {
  id: string;
  name: string;
  icon: string;
  points: number;
  type: string;
}

export interface FoundPattern {
  type: string;
  x: number;
  y: number;
  zoom: number;
  timestamp: number;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  condition: (stats: GameStats) => boolean;
}

export interface GameStats {
  zoom: number;
  maxZoom: number;
  patternsFound: number;
  timeInSeconds: number;
  points: number;
}

export interface DailyChallenge {
  x: number;
  y: number;
  zoom: number;
  pattern: string;
  day: number;
}

export interface AIAnalysis {
  title: string;
  description: string;
  coordinates: string;
  suggestion: string;
}
