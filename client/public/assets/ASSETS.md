# MMO Game Assets Documentation

## Overview

This directory contains all visual assets for the MMO game client, including character sprites, UI elements, skill icons, items, and environment tiles.

## Directory Structure

```
assets/
├── characters/      # Player, NPC, and enemy sprites
├── skills/          # Skill icons and effect sprites
├── ui/              # User interface elements (buttons, panels, bars)
├── items/           # Item and equipment icons
├── environment/     # Terrain tiles and background elements
├── assets-manifest.json  # Complete asset metadata catalog
├── generate_sample_assets.py  # Script to generate placeholder assets
└── ASSETS.md        # This documentation file
```

## Current Assets Status

**Current State**: Placeholder/Sample Assets  
**Production Ready**: No - These are generated placeholders for development

The current assets are **programmatically generated placeholders** created using Python/Pillow. They serve as:
- Development placeholders for testing game mechanics
- Reference dimensions for sprite slots
- Visual indicators for different game elements

## Asset Categories

### 1. Characters (64x64 sprites)

| Asset | Purpose | Current State |
|-------|---------|---------------|
| player-red.png | Current player indicator | Placeholder |
| player-blue.png | Blue team/variant | Placeholder |
| player-green.png | Other players (default) | Placeholder |
| player-yellow.png | Friends/party members | Placeholder |
| npc-merchant.png | Shop/trade NPCs | Placeholder |
| enemy-skeleton.png | Undead enemies | Placeholder |
| enemy-goblin.png | Hostile creatures | Placeholder |

**Needed for Production**:
- Animated spritesheets (idle, walk, run, attack, hurt, death)
- 4-directional movement support
- Multiple character classes/types
- Equipment variations (visible gear)

### 2. Skills (64x64 icons + 32x32 effects)

| Asset | Purpose | Current State |
|-------|---------|---------------|
| fireball.png | Fire attack skill (Slot 1) | Placeholder |
| heal.png | Healing skill (Slot 2) | Placeholder |
| shield.png | Defense buff (Slot 3) | Placeholder |
| dash.png | Speed buff (Slot 4) | Placeholder |
| ice-spike.png | Ice attack skill | Placeholder |
| poison.png | Poison DoT skill | Placeholder |
| fire-effect.png | Fire visual effect | Placeholder |
| heal-effect.png | Healing visual effect | Placeholder |
| hit-effect.png | Impact visual effect | Placeholder |
| level-up.png | Level up celebration | Placeholder |

**Needed for Production**:
- Animated effect spritesheets
- Particle system sprites
- Projectile sprites
- Buff/debuff icons
- Cooldown overlay animations

### 3. UI Elements

| Asset | Purpose | Current State |
|-------|---------|---------------|
| panel-background.png | Panel backgrounds | Placeholder |
| button-normal.png | Default button | Placeholder |
| button-hover.png | Hovered button | Placeholder |
| button-pressed.png | Pressed button | Placeholder |
| progress-bar-bg.png | Bar background | Placeholder |
| progress-bar-fill-hp.png | Health bar fill | Placeholder |
| progress-bar-fill-mana.png | Mana bar fill | Placeholder |
| progress-bar-fill-xp.png | XP bar fill | Placeholder |

**Needed for Production**:
- Window frames and borders
- Tab navigation elements
- Scrollbars
- Tooltips
- Dialog boxes
- Minimap elements
- Inventory slots

### 4. Items (32x32 icons)

| Asset | Purpose | Current State |
|-------|---------|---------------|
| sword.png | Weapon icon | Placeholder |
| potion-health.png | Health potion | Placeholder |
| potion-mana.png | Mana potion | Placeholder |
| armor.png | Chest armor | Placeholder |
| helmet.png | Head equipment | Placeholder |
| boots.png | Feet equipment | Placeholder |
| ring.png | Ring accessory | Placeholder |
| amulet.png | Amulet accessory | Placeholder |

**Needed for Production**:
- Complete equipment sets (weapons, armor, accessories)
- Consumables (potions, food, scrolls)
- Quest items
- Crafting materials
- Currency icons
- Rarity variants (common, rare, epic, legendary)

### 5. Environment (32x32 tiles)

| Asset | Purpose | Current State |
|-------|---------|---------------|
| grass.png | Grassland terrain | Placeholder |
| stone.png | Stone floor/path | Placeholder |
| water.png | Water (non-walkable) | Placeholder |
| dirt.png | Dirt paths | Placeholder |
| sand.png | Desert/beach | Placeholder |
| snow.png | Snowy areas | Placeholder |

**Needed for Production**:
- Tile transition sets (grass-to-dirt, etc.)
- Obstacles (trees, rocks, buildings)
- Decorative elements
- Animated tiles (water, lava)
- Multiple biomes
- Interior tiles

## Asset Manifest

All assets are cataloged in `assets-manifest.json` with:
- Unique ID
- Filename and path
- Dimensions and format
- Purpose and usage notes
- License information
- Tags for categorization
- Additional metadata (skill stats, tile properties, etc.)

## Recommended Production Asset Sources

### Free & Open Source

1. **LPC (Liberated Pixel Cup) Base Assets**
   - URL: https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles
   - License: CC-BY-SA 3.0 / GPL 3.0
   - Content: Complete character spritesheets with animations
   - Best for: Character sprites, animations

2. **Kenney Game Assets**
   - URL: https://kenney.nl/assets
   - License: CC0 1.0 (Public Domain)
   - Content: High-quality UI, icons, sprites
   - Best for: UI elements, items, icons

3. **OpenGameArt RPG Collection**
   - URL: https://opengameart.org/art-search-advanced
   - License: Various (check individual assets)
   - Content: Large RPG/MMORPG asset collection
   - Best for: All categories

4. **Craft Pixel Art**
   - URL: https://opengameart.org/content/rpg-item-set
   - License: CC-BY 3.0
   - Content: RPG items and equipment
   - Best for: Item icons

### Commercial (Optional)

- Humble Bundle asset packs (periodic sales)
- itch.io asset marketplace
- Unity Asset Store
- GameDev Market

## Asset Requirements

### Technical Specifications

- **Format**: PNG with transparency (RGBA)
- **Character Sprites**: 64x64 pixels
- **Item Icons**: 32x32 pixels
- **Environment Tiles**: 32x32 pixels (must tile seamlessly)
- **UI Elements**: Variable, but must support scaling
- **Effects**: 32x32 to 64x64 pixels

### Animation Requirements

**Characters**:
- States: idle, walk, run, attack, hurt, death
- Directions: 4 (down, up, left, right) or 8
- Frame rate: 8-12 FPS
- Layout: Horizontal spritesheet or grid

**Effects**:
- Types: cast, hit, buff, debuff, level-up
- Frame rate: 12-15 FPS
- Looping: Yes (most effects)

## Replacing Placeholder Assets

### Step 1: Acquire Production Assets

Download assets from recommended sources, ensuring:
- License compatibility (CC0, CC-BY, CC-BY-SA, GPL, MIT)
- Proper attribution if required
- Correct dimensions and format

### Step 2: Organize Files

Place assets in appropriate subdirectories:
```bash
assets/characters/  # Character sprites
assets/skills/      # Skill icons and effects
assets/ui/          # UI elements
assets/items/       # Item icons
assets/environment/ # Terrain tiles
```

### Step 3: Update Manifest

Edit `assets-manifest.json` to reflect:
- New filenames
- Updated metadata
- License information
- Source attribution

### Step 4: Update Game Code

Modify `/client/src/main.ts` and related files to:
- Load sprite textures instead of generating Graphics
- Implement sprite animation systems
- Update rendering logic

### Step 5: Validate

Run validation script:
```bash
node validate-assets.js
```

## Asset Validation

A validation script (`validate-assets.js`) checks:
- ✅ All manifest entries have corresponding files
- ✅ Image files are valid PNG format
- ✅ Dimensions match specifications
- ✅ Required metadata is present
- ⚠️ License information is documented

Run validation:
```bash
cd /home/runner/work/mmo-server/mmo-server/client/public/assets
node validate-assets.js
```

## License Information

### Current Placeholders
- License: CC0 1.0 Universal (Public Domain)
- Source: Generated programmatically
- Author: MMO Server Project
- Usage: Free for any purpose, no attribution required

### Production Assets
When replacing placeholders, ensure:
- License is documented in manifest
- Attribution is provided where required
- License terms are followed (share-alike, etc.)
- Commercial use is permitted (if applicable)

## Integration Guide

### Loading Sprites in Pixi.js

```typescript
import { Sprite, Assets } from 'pixi.js';

// Load texture
await Assets.load('/assets/characters/player-red.png');
const texture = Assets.get('/assets/characters/player-red.png');

// Create sprite
const playerSprite = new Sprite(texture);
playerSprite.anchor.set(0.5);
```

### Sprite Animation

```typescript
import { AnimatedSprite, Assets } from 'pixi.js';

// Load spritesheet
await Assets.load('/assets/characters/player-spritesheet.json');
const sheet = Assets.get('/assets/characters/player-spritesheet.json');

// Create animation
const walkAnim = new AnimatedSprite(sheet.animations['walk-down']);
walkAnim.animationSpeed = 0.15;
walkAnim.play();
```

### Using Asset Manifest

```typescript
// Load manifest
const manifest = await fetch('/assets/assets-manifest.json').then(r => r.json());

// Get asset info
const fireballData = manifest.categories.skills.assets
  .find(a => a.id === 'fireball');

console.log(fireballData.skillData.manaCost); // 20
console.log(fireballData.purpose); // "Fireball skill icon"
```

## Future Enhancements

- [ ] Animated character spritesheets
- [ ] Particle system for effects
- [ ] Multiple character classes
- [ ] Equipment layering system
- [ ] Dynamic terrain generation
- [ ] Weather effects
- [ ] Day/night cycle assets
- [ ] Seasonal variations
- [ ] Localization (different art styles)

## Contributing Assets

If you'd like to contribute assets:

1. Ensure assets are original or properly licensed
2. Follow dimension and format specifications
3. Update assets-manifest.json
4. Include license information
5. Provide attribution if required
6. Submit via pull request

## Support

For questions about assets:
- Check `assets-manifest.json` for metadata
- Run validation script for issues
- See game documentation in `/client/README.md`
- Review integration examples above

---

**Last Updated**: 2025-10-15  
**Version**: 1.0.0  
**Status**: Placeholder Assets (Development Only)
