// Asset manifest centralizing all external textures / atlases.
// Placeholder entries (use local placeholder PNG path names); swap with real asset paths when added.

export interface AssetDefinition {
  name: string;
  url: string;
  type?: 'spritesheet' | 'image' | 'json' | 'atlas';
  frameWidth?: number;
  frameHeight?: number;
  frames?: number; // total frames if simple strip
  directions?: number; // for directional sheets
}

// LPC male walk cycle (4 directions * 9 frames = 36)
// Path contains spaces so we URL-encode them for safe fetching.
export const PLAYER_SPRITE: AssetDefinition = {
  name: 'player_lpc_walkcycle',
  // Use raw path with spaces since Vite dev server will serve it; Browser auto-encodes fetch.
  url: 'assets/oga/LPC Base Assets/sprites/people/male_walkcycle.png',
  type: 'image',
  frameWidth: 64,
  frameHeight: 64,
  frames: 36,
  directions: 4
};

// Simple FX atlas placeholder (e.g., contains fireball, explosion, shield, dash trail)
export const FX_ATLAS: AssetDefinition = {
  name: 'fx_atlas_placeholder',
  url: 'assets/fx/fx_atlas_placeholder.png', // TODO: provide file
  type: 'image',
  frameWidth: 64,
  frameHeight: 64,
  frames: 16
};

// Kenney Monochrome Pirates tilemap (16x16 tiles)
export const PIRATES_TILEMAP: AssetDefinition = {
  name: 'pirates_tilemap',
  url: 'assets/oga/kenney_monochrome-pirates/Default/Tilemap/tilemap_packed.png',
  type: 'image',
  frameWidth: 16,
  frameHeight: 16
};

export const manifest: AssetDefinition[] = [PLAYER_SPRITE, FX_ATLAS, PIRATES_TILEMAP];
