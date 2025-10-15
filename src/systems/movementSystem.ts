import { World } from 'miniplex';
import { Entity } from '../entities';
import { MyRoomState } from '../schemas/MyRoomState';

// Allow world bounds to be provided externally (set by room before system run)
export let worldBounds = { width: 2000, height: 2000 };
export const setWorldBounds = (w: number, h: number) => { worldBounds.width = w; worldBounds.height = h; };

export const movementSystem = (world: World<Entity>) => {
  const entities = world.with('position', 'velocity');
  const maxX = worldBounds.width;
  const maxY = worldBounds.height;
  for (const { position, velocity } of entities) {
    position.x = Math.min(maxX, Math.max(0, position.x + velocity.x));
    position.y = Math.min(maxY, Math.max(0, position.y + velocity.y));
  }
};
