import { Container, Sprite, Texture } from 'pixi.js';
import type { LoadedPlayerSheet } from '../assets/loaders/assetLoader';

export type LpcAction = 'walk' | 'slash' | 'spell' | 'hurt' | 'idle';

export interface PlayerSpriteOptions {
  sheet: LoadedPlayerSheet | null; // can be null (fallback placeholder logic outside)
  getDirection: () => number; // 0..3 (down,right,up,left) or chosen ordering
  getMoving: () => boolean;
  getAction: () => LpcAction;
  getSpeedScale?: () => number; // multiplier derived from movement speed
  animationSpeed?: number; // base fps for walk
}

export class LpcPlayerSprite extends Container {
  private sprite: Sprite;
  private elapsed = 0;
  private frameIndex = 0;
  private lastAction: LpcAction = 'idle';
  private options: PlayerSpriteOptions;

  constructor(options: PlayerSpriteOptions) {
    super();
    this.options = { animationSpeed: 8, ...options };
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 0.5);
    this.addChild(this.sprite);
  }

  update(dt: number) {
    const sheet = this.options.sheet;
    if (!sheet) return; // nothing to animate yet

    const dir = this.options.getDirection();
    const action = this.options.getAction();
    const moving = this.options.getMoving();
    const speedScale = this.options.getSpeedScale ? this.options.getSpeedScale() : 1;

    // Assume sheet currently only holds walk cycle (9 frames). Other actions fall back to first frame for now.
    const framesPerDirection = sheet.framesPerDirection;
    const baseFPS = (this.options.animationSpeed || 8) * speedScale;

    if (action === 'walk' && moving) {
      this.elapsed += dt;
      const advance = this.elapsed * baseFPS;
      this.frameIndex = Math.floor(advance) % framesPerDirection;
    } else if (action === 'idle') {
      this.frameIndex = 0;
      this.elapsed = 0;
    } else {
      // placeholder for other actions until separate sheets integrated
      if (this.lastAction !== action) {
        this.frameIndex = 0;
        this.elapsed = 0;
      }
      // simple hold first frame
    }

    this.lastAction = action;
    const textureIndex = dir * framesPerDirection + this.frameIndex;
    const tex: Texture | undefined = sheet.frames[textureIndex];
    if (tex) this.sprite.texture = tex;
  }

  getSprite() { return this.sprite; }
}
