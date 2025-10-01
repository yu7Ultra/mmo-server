import { World } from 'miniplex';
import { Entity } from '../entities';

export const movementSystem = (world: World<Entity>) => {
  const entities = world.with('position', 'velocity');
  for (const { position, velocity } of entities) {
    position.x += velocity.x;
    position.y += velocity.y;

    // A simple boundary check
    if (position.x < 0) position.x = 800;
    if (position.x > 800) position.x = 0;
    if (position.y < 0) position.y = 600;
    if (position.y > 600) position.y = 0;
  }
};
