
import { ColorScheme } from '../types';
import { COLOR_SCHEMES } from '../constants';

export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
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

export const getColor = (iteration: number, maxIter: number, scheme: ColorScheme): [number, number, number] => {
  if (iteration === maxIter) return [0, 0, 0];
  
  const t = iteration / maxIter;
  const config = COLOR_SCHEMES[scheme];
  const hue = (config.baseHue + t * 360) % 360;

  switch(scheme) {
    case 'matrix':
      return [0, Math.round(255 * t * 2), 0];
    case 'fire':
      const r = Math.min(255, t * 510);
      const g = Math.min(255, Math.max(0, t * 510 - 255));
      return [r, g, 0];
    case 'psychedelic':
      const psychHue = (t * 5 + Date.now() / 10000) % 1;
      return hslToRgb(psychHue, 0.8, 0.5);
    default:
      return hslToRgb(hue / 360, 0.7, 0.2 + t * 0.6);
  }
};
