// 怪物资源注册（基于可用的精灵素材）
export const MONSTER_SLIME: AssetDefinition = {
  name: 'monster_slime',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/slime.png',
  type: 'image',
  frameWidth: 32,
  frameHeight: 32,
  frames: 12,
  directions: 4
};
export const MONSTER_BAT: AssetDefinition = {
  name: 'monster_bat',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/bat.png',
  type: 'image',
  frameWidth: 32,
  frameHeight: 32,
  frames: 12, // 4方向*3帧
  directions: 4 // 上左下右
};
export const MONSTER_GHOST: AssetDefinition = {
  name: 'monster_ghost',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/ghost.png',
  type: 'image',
  frameWidth: 40,
  frameHeight: 46,
  frames: 12,
  directions: 4
};
export const MONSTER_SNAKE: AssetDefinition = {
  name: 'monster_snake',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/snake.png',
  type: 'image',
  frameWidth: 32,
  frameHeight: 32,
  frames: 12,
  directions: 4
};
export const MONSTER_BEE: AssetDefinition = {
  name: 'monster_bee',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/bee.png',
  type: 'image',
  frameWidth: 32,
  frameHeight: 32,
  frames: 12,
  directions: 4
};
export const MONSTER_BIG_WORM: AssetDefinition = {
  name: 'monster_big_worm',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/big_worm.png',
  type: 'image',
  frameWidth: 35,
  frameHeight: 33,
  frames: 18,
  directions: 6
};
export const MONSTER_EYEBALL: AssetDefinition = {
  name: 'monster_eyeball',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/eyeball.png',
  type: 'image',
  frameWidth: 32,
  frameHeight: 38,
  frames: 12,
  directions: 4
};
export const MONSTER_MAN_EATER_FLOWER: AssetDefinition = {
  name: 'monster_man_eater_flower',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/man_eater_flower.png',
  type: 'image',
  frameWidth: 36,
  frameHeight: 33,
  frames: 45,
  directions: 9
};
export const MONSTER_PUMPKING: AssetDefinition = {
  name: 'monster_pumpking',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/pumpking.png',
  type: 'image',
  frameWidth: 34,
  frameHeight: 36,
  frames: 20,
  directions: 5
};
export const MONSTER_SMALL_WORM: AssetDefinition = {
  name: 'monster_small_worm',
  url: 'assets/oga/LPC Base Assets/sprites/monsters/small_worm.png',
  type: 'image',
  frameWidth: 32,
  frameHeight: 32,
  frames: 12,
  directions: 4
};
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

export const manifest: AssetDefinition[] = [
  PLAYER_SPRITE,
  FX_ATLAS,
  PIRATES_TILEMAP,
  MONSTER_SLIME,
  MONSTER_BAT,
  MONSTER_GHOST,
  MONSTER_SNAKE,
  MONSTER_BEE,
  MONSTER_BIG_WORM,
  MONSTER_EYEBALL,
  MONSTER_MAN_EATER_FLOWER,
  MONSTER_PUMPKING,
  MONSTER_SMALL_WORM
];
