// Programmatically generate a simple 4x4 directional walk sheet (CC0).
// Avoids broken embedded base64 & allows easy future replacement.
import { Texture, Rectangle } from 'pixi.js';

export const PLAYER_FRAME_SIZE = 16;
export const PLAYER_FRAMES_PER_DIR = 4;
export type Direction = 'down' | 'left' | 'right' | 'up';
export const DIRECTION_ORDER: Direction[] = ['down', 'left', 'right', 'up'];

const SHEET_SIZE = PLAYER_FRAME_SIZE * PLAYER_FRAMES_PER_DIR; // 64
let baseTexture: Texture['baseTexture'] | null = null;
const frameCache = new Map<string, Texture>();

function generateSheet() {
  const canvas = document.createElement('canvas');
  canvas.width = SHEET_SIZE;
  canvas.height = SHEET_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < PLAYER_FRAMES_PER_DIR; frame++) {
      const x = frame * PLAYER_FRAME_SIZE;
      const y = dir * PLAYER_FRAME_SIZE;
      // background transparent
      // Body color varies by direction for quick visual debug
      const hue = (dir * 90 + frame * 15) % 360;
      ctx.fillStyle = `hsl(${hue} 60% 55%)`;
      ctx.fillRect(x + 3, y + 3, 10, 10);
      // Head
      ctx.fillStyle = '#ffe0c4';
      ctx.fillRect(x + 5, y + 2, 6, 5);
      // Simple leg swing: alternate pixel rows
      ctx.fillStyle = '#222';
      if (frame % 2 === 0) {
        ctx.fillRect(x + 4, y + 13, 3, 2);
        ctx.fillRect(x + 9, y + 13, 3, 2);
      } else {
        ctx.fillRect(x + 5, y + 13, 3, 2);
        ctx.fillRect(x + 8, y + 13, 3, 2);
      }
    }
  }
  const tex = Texture.from(canvas);
  baseTexture = tex.baseTexture;
}

function ensureBase() {
  if (!baseTexture) generateSheet();
  return baseTexture!;
}

export function getFrameRect(direction: Direction, frame: number) {
  const dirIndex = DIRECTION_ORDER.indexOf(direction);
  return new Rectangle(
    frame * PLAYER_FRAME_SIZE,
    dirIndex * PLAYER_FRAME_SIZE,
    PLAYER_FRAME_SIZE,
    PLAYER_FRAME_SIZE
  );
}

export function getFrameTexture(direction: Direction, frame: number) {
  const base = ensureBase();
  const key = direction + ':' + frame;
  if (frameCache.has(key)) return frameCache.get(key)!;
  const rect = getFrameRect(direction, frame);
  const tex = new Texture(base);
  // @ts-ignore assign frame (Pixi internal)
  tex.frame = rect;
  tex.updateUvs();
  frameCache.set(key, tex);
  return tex;
}
