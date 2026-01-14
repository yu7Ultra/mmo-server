import { Quadtree } from '@timohausmann/quadtree-ts';
import { World } from 'miniplex';
import { CircleBoundsUnit } from '../../rooms/CellRoom';
import { ChildMoveCommandMessage, ChildUpdateCommandMessage, CommandPendingMessage, INPUT_KEY, InputUpdateCommandMessage, MessageType, MoveCommandMessage, RoleType, SpawnCommandMessage, UnSpawnCommandMessage } from '../../schemas/commands/CellRoomCommands';
import { Vec2 } from '../../schemas/commands/Vec2';
import { initializeScheme, LeaderUnit, PlayerUnit } from '../../schemas/sync/CellRoomSyncStates';
import { loggerService } from '../../services/loggerService';


// Allow world bounds to be provided externally (set by room before system run)
// export let worldBounds = { width: 2000, height: 2000 };
// export const setWorldBounds = (w: number, h: number) => { worldBounds.width = w; worldBounds.height = h; };


export type SystemCall = (world: World<LeaderUnit>, clientDataMap: Map<string, LeaderUnit>, deltaTime: number, commandMap?: Map<string, CommandPendingMessage>) => void;


export const cellRoomCommandInputSystem: SystemCall = (world, clientDataMap, deltaTime, commandMap) => {
    // Process command inputs for each leader unit
    const entities = world.entities;
    for (const entity of entities) {
        const sessionId = entity.sessionId;
        if (!sessionId) continue;

        const pending = commandMap?.get(sessionId);
        if (!pending) continue;
        const inputUpdates = pending[MessageType.InputUpdate] as InputUpdateCommandMessage[] | undefined;
        inputUpdates?.forEach(inputUpdate => {
            switch (inputUpdate.inputState) {
                case INPUT_KEY.C_KEY:
                // Handle C key input
                case INPUT_KEY.F_KEY:
                    // Handle F key input
                    break;
                case INPUT_KEY.V_KEY:
                    // Handle X key input
                    break;
                case INPUT_KEY.T_KEY:
                    // Handle T key input
                    break;
                default:
                    return;
            }
            loggerService.child("CellRoomTiny").info(`LeaderUnit ID: ${entity.id} Input State Updated: ${entity.inputState} Before ${inputUpdate.inputState}`,);
            entity.inputState = inputUpdate.inputState;
            return;
            if (inputUpdate.down) {
                entity.inputState = entity.inputState | inputUpdate.inputState;
            } else {
                entity.inputState = entity.inputState & ~inputUpdate.inputState;
            }
        });


        const moveCommand = pending[MessageType.Move] as MoveCommandMessage[] | undefined;
        moveCommand?.forEach(mc => {
            if (mc && mc.position) {
                // Update position from move command
                entity.position.x = mc.position.x;
                entity.position.y = mc.position.y;
            }
        })


        // const stopMoveCommand = pending[MessageType.Stop_Move] as CommandMessage[] | undefined;
        // if (stopMoveCommand) {
        //     // Stop movement
        //     stopMoveCommand.forEach(() => {
        //         entity.velocity.x = 0;
        //         entity.velocity.y = 0;
        //     });
        // }
    }
};


export const cellRoomMovementSystem: SystemCall = (world: World<LeaderUnit>, clientDataMap: Map<string, LeaderUnit>, deltaTime: number, commandMap?: Map<string, CommandPendingMessage>) => {
    const entities = world.entities;;
    for (const entity of entities) {
        const { position, velocity } = entity;
        if (velocity.x || velocity.y) {
            // Update position based on velocity
            position.x += velocity.x * deltaTime;
            position.y += velocity.y * deltaTime;
        }
        //TODO Clamp position to world bounds if necessary
        // position.x = Math.min(maxX, Math.max(0, position.x));
        // position.y = Math.min(maxY, Math.max(0, position.y));
    }
};



export const cellRoomUpdateSpatialSystem = (world: World<LeaderUnit>, quadtree: Quadtree<CircleBoundsUnit<string>>, deltaTime: number) => {
    let entities = world.entities;
    for (const entity of entities) {
        if (entity.id === 0) continue; // Skip uninitialized entities
        if (!entity.circleBounds || !entity.viewCircleBounds) continue; // Skip if bounds not initialized

        // Update entity position in spatial system if needed
        if (entity.prePosition.x !== entity.position.x || entity.prePosition.y !== entity.position.y) {
            entity.prePosition.x = entity.position.x;
            entity.prePosition.y = entity.position.y;

            // Update circle bounds position
            entity.circleBounds.x = entity.position.x;
            entity.circleBounds.y = entity.position.y;
            entity.viewCircleBounds.x = entity.position.x;
            entity.viewCircleBounds.y = entity.position.y;

            // Update in quadtree
            quadtree.update(entity.circleBounds, true);
            quadtree.update(entity.viewCircleBounds, true);
        }
    }
}


export const cellRoomSpawnLeaderUnitSystem: SystemCall = (world, clientDataMap, deltaTime, commandMap) => {

    const entities: LeaderUnit[] = world.entities;
    for (const entity of entities) {
        let command = commandMap?.get(entity.sessionId);
        if (!command) continue;

        let spawnCommand = command[MessageType.Spawn] as SpawnCommandMessage[] | undefined;
        if (spawnCommand) {
            spawnCommand.forEach(spawn => {
                spawn.roles.forEach(inof => {
                    switch (inof.type) {
                        case RoleType.Player:
                            let plyaerIndex = entity.players.findIndex(pu => pu.id == inof.playerId)
                            let player = plyaerIndex == -1 ? new PlayerUnit() : entity.players[plyaerIndex];
                            player.position = initializeScheme(new Vec2());
                            player.id = inof.playerId;
                            player.position.x = inof.position.x;
                            player.position.y = inof.position.y;
                            player.hp = inof.hp;
                            player.mp = inof.mp;
                            player.seat = inof.seat;
                            player.type = RoleType.Player;
                            console.log(`Spawning PlayerUnit ID: ${player.id} for LeaderUnit ID: ${entity.id}`, player);
                            plyaerIndex == -1 && entity.players.push(player);
                            break;
                        case RoleType.Mouse:
                            entity.position.x = inof.position.x;
                            entity.position.y = inof.position.x;
                            break;

                        case RoleType.NPC:
                            // Handle NPC spawn if needed
                            break;
                        case RoleType.Monster:
                            // Handle Monster spawn if needed
                            break;
                    }

                });
            });
            let unspawnCommand = command[MessageType.Unspawn] as UnSpawnCommandMessage[] | undefined;
            if (unspawnCommand) {
                unspawnCommand.forEach(unspawn => {
                    switch (unspawn.role) {
                        case RoleType.Player:
                            let playerIndex = entity.players.findIndex(pu => pu.id == unspawn.id);
                            if (playerIndex != -1) {
                                console.log(`Unspawning PlayerUnit ID: ${unspawn.id} from LeaderUnit ID: ${entity.id}`);
                                entity.players.splice(playerIndex, 1);
                            }
                            break;
                        case RoleType.Mouse:
                            // Handle mouse unspawn if needed
                            world.remove(entity);
                            clientDataMap.delete(entity.sessionId);
                            break;
                    }
                });
                // Handle despawn logic if needed
                continue;
            }


            if (entity.id === 0) { // Assuming 0 means uninitialized
                entity.id = clientDataMap.get(entity.sessionId)?.id || 0;
                world.add(entity);
            }
            command[MessageType.Spawn] = undefined;
            command[MessageType.Unspawn] = undefined;
            command[MessageType.AddChild] = undefined;
            command[MessageType.RemoveChild] = undefined;
        }
    }
};


export const cellRoomChildUpdateSystem: SystemCall = (world, clientDataMap, deltaTime, commandMap) => {
    const entities: LeaderUnit[] = world.entities;
    for (const entity of entities) {
        let command = commandMap?.get(entity.sessionId);
        if (!command) continue;

        const childMoveCommands = command[MessageType.ChildMove] as ChildMoveCommandMessage[] | undefined;
        if (childMoveCommands) {
            childMoveCommands.forEach(cm => {
                let child = entity.players.find(pu => pu.id == cm.id);
                if (child) {
                    child.position.x = cm.position.x;
                    child.position.y = cm.position.y;
                }
            });
        }

        const childUpdateCommands = command[MessageType.UpdateChildState] as ChildUpdateCommandMessage[] | undefined;
        if (childUpdateCommands) {
            childUpdateCommands.forEach(cu => {
                // Implement child update logic if needed
                let child = entity.players.find(pu => pu.id == cu.id);
                if (child) {
                    child.hp = cu.hp;
                    child.mp = cu.mp;
                }
            });
        }
    }
}