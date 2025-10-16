import { World } from 'miniplex';
import { Entity } from '../entities';
import { MyRoomState } from '../schemas/MyRoomState';

// Allow world bounds to be provided externally (set by room before system run)
export let worldBounds = { width: 2000, height: 2000 };
export const setWorldBounds = (w: number, h: number) => { worldBounds.width = w; worldBounds.height = h; };

export const movementSystem = (world: World<Entity>) => {
  const entities = world.with('position', 'velocity', 'player');
  const maxX = worldBounds.width;
  const maxY = worldBounds.height;
  for (const { position, velocity, player } of entities) {
    // Use player speed with buffs applied (from buffSystem)
    const movementSpeed = Math.max(1, player.speed) * 2; // Scale speed appropriately
    position.x = Math.min(maxX, Math.max(0, position.x + velocity.x * movementSpeed));
    position.y = Math.min(maxY, Math.max(0, position.y + velocity.y * movementSpeed));
  }
};
