import { Container, Sprite, Texture } from 'pixi.js';
import type { LoadedFxAtlas } from '../assets/loaders/assetLoader';

// Simple utility to spawn a transient FX animation from the atlas.
export function spawnFx(container: Container, atlas: LoadedFxAtlas | null, frameIndices: number[], fps = 12, lifetime?: number) {
  if (!atlas) return; // skip if not loaded
  const sprite = new Sprite();
  sprite.anchor.set(0.5);
  container.addChild(sprite);
  let elapsed = 0;
  const totalFrames = frameIndices.length;
  const duration = lifetime ?? (totalFrames / fps);

  const update = (dt: number) => {
    elapsed += dt;
    const progress = Math.min(elapsed / duration, 1);
    const frame = Math.floor(progress * (totalFrames - 1));
    const texIndex = frameIndices[frame];
    const tex: Texture | undefined = atlas.frames[texIndex];
    if (tex) sprite.texture = tex;
    if (progress >= 1) {
      sprite.parent?.removeChild(sprite);
      tickerListeners.delete(update);
    }
  };
  tickerListeners.add(update);
}

// Global ticker listeners set. main.ts should drive these each frame (dt seconds).
export const tickerListeners = new Set<(dt: number) => void>();
