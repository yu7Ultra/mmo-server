import { World } from 'miniplex';
import { Entity } from '../entities';

export const syncSystem = (world: World<Entity>) => {
  const entities = world.with('player', 'position');
  for (const { player, position } of entities) {
    player.x = position.x;
    player.y = position.y;
  }
};
