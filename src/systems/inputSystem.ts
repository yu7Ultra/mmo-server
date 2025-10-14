import { World } from 'miniplex';
import { Command, Entity } from '../entities';

export const inputSystem = (world: World<Entity>, entityCommandMap: Map<string, Command>, entityByClient: Map<string, Entity>) => {
    for (const entity of world.entities) {
        // 处理 entity
        let command = entityCommandMap.get(entity.sessionId);
        if (command) {
            // Update entity velocity based on command
            entity.velocity.x = command.x;
            entity.velocity.y = command.y;
            // world.update(entity, { velocity: { x: command.x, y: command.y } });
        }

        entityCommandMap.delete(entity.sessionId);
    }
};