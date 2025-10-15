import { Assets, Texture } from 'pixi.js';
import { manifest, AssetDefinition } from '../manifest';

export interface LoadedPlayerSheet {
  frames: Texture[]; // length = directions * framesPerDirection
  frameWidth: number;
  frameHeight: number;
  framesPerDirection: number;
  directions: number;
}

export interface LoadedFxAtlas {
  frames: Texture[];
  frameWidth: number;
  frameHeight: number;
}

export interface LoadedAssets {
  player: LoadedPlayerSheet | null;
  fx: LoadedFxAtlas | null;
  tiles: Texture[] | null; // 16x16 ground / decoration tiles
}

const cache: LoadedAssets = { player: null, fx: null, tiles: null };

async function loadTexture(def: AssetDefinition): Promise<Texture> {
  // Pixi v8 Assets.load returns a Texture when given an image URL.
  const tex = await Assets.load<Texture>(def.url);
  if (!tex || !tex.baseTexture) throw new Error(`Failed to load texture for ${def.url}`);
  return tex;
}

function sliceSheet(sheetTexture: Texture, frameWidth: number, frameHeight: number): Texture[] {
  const textures: Texture[] = [];
  const w = sheetTexture.width; // in pixels
  const h = sheetTexture.height;
  const cols = Math.floor(w / frameWidth);
  const rows = Math.floor(h / frameHeight);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const frame = new Texture({
        source: sheetTexture.baseTexture,
        frame: { x: x * frameWidth, y: y * frameHeight, width: frameWidth, height: frameHeight }
      } as any);
      textures.push(frame);
    }
  }
  return textures;
}

export async function loadGameAssets(): Promise<LoadedAssets> {
  // load sequentially (manifest small). Could parallelize with Promise.all if needed.
  for (const def of manifest) {
    try {
  const tex = await loadTexture(def);
  const frames = sliceSheet(tex, def.frameWidth!, def.frameHeight!);
      if (def.name === 'player_lpc_walkcycle') {
        cache.player = {
          frames,
          frameWidth: def.frameWidth!,
            frameHeight: def.frameHeight!,
          framesPerDirection: (def.frames ?? 32) / (def.directions ?? 4),
          directions: def.directions ?? 4
        };
      } else if (def.name === 'fx_atlas_placeholder') {
        cache.fx = {
          frames,
          frameWidth: def.frameWidth!,
          frameHeight: def.frameHeight!
        };
      } else if (def.name === 'pirates_tilemap') {
        cache.tiles = frames;
      }
    } catch (err) {
      console.warn('[assetLoader] Failed to load', def.name, err);
    }
  }
  return cache;
}

export function getLoadedAssets() { return cache; }
