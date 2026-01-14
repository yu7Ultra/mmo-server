import { Client, Room } from '@colyseus/core';
import { Circle, Quadtree } from '@timohausmann/quadtree-ts';
import { randomInt } from 'crypto';
import * as flatbuffers from 'flatbuffers';
import { World } from 'miniplex';
import { AddChildCommandMessage, CommandMessage, CommandPendingMessage, FrameInfo, MessageType, MoveCommandMessage, RemoveChildCommandMessage, RoleType, SpawnCommandMessage, UnSpawnCommandMessage } from '../schemas/commands/CellRoomCommands';
import { MMO } from '../schemas/flatc/GlobalRoomState';
import { CellRoomUnit, initializeScheme, LeaderUnit } from '../schemas/sync/CellRoomSyncStates';
import { cellRoomCommandInputSystem, cellRoomMovementSystem, cellRoomSpawnLeaderUnitSystem, cellRoomUpdateSpatialSystem } from '../systems/cellRoom/systems';
import { Vec2 } from '../schemas/commands/Vec2';
import { loggerService } from '../services/loggerService';


export class CircleBoundsUnit<T> extends Circle<T> {
    role: RoleType = RoleType.Other;
    constructor(x: number, y: number, r: number, role: RoleType = RoleType.Other, data?: T) {
        super({ x, y, r, data });
        this.role = role;
    }
}

export class CellRoom extends Room<CellRoomUnit> {

    private leaderWorld: World<LeaderUnit> = new World<LeaderUnit>();

    private frameCount: number = 0;

    private currFrame: FrameInfo = new FrameInfo();

    private frameCache: Map<number, FrameInfo> = new Map();

    private clientDataMap: Map<string, LeaderUnit> = new Map();
    // private dispatch: Dispatcher<CellRoom> = new Dispatcher(this);

    private commandMap: Map<string, CommandPendingMessage> = new Map();

    private quadtree!: Quadtree<CircleBoundsUnit<string>>;

    private width: number = 2000;

    private height: number = 2000;

    private autoDestroy: boolean = false;

    private maxPlayers: number = 200;

    // 房间特定的日志器
    private logger = loggerService.child('CellRoom');

    onCreate(options: any) {
        // 初始化房间特定的日志器，包含房间ID
        this.logger = loggerService.child(`CellRoom:${this.roomId}`);
        
        this.state = new CellRoomUnit();
        this.quadtree = new Quadtree<CircleBoundsUnit<string>>({
            width: this.width,
            height: this.height,
            maxObjects: 10,
            maxLevels: 5
        });
        this.state = new CellRoomUnit();
        // Initialize ECS world
        this.leaderWorld = new World<LeaderUnit>();
        this.autoDispose = true;

        this.setSimulationInterval((deltaTime) => {
            if (this.frameCount && this.currFrame) {
                this.frameCache.set(this.currFrame.frameNumber, this.currFrame);
                //删除300帧前的数据
                this.frameCache.delete(this.frameCount - 300);
            }
            deltaTime /= 1000;
            this.currFrame = new FrameInfo();
            this.frameCount++;
            this.currFrame.frameNumber = this.frameCount;
            this.currFrame.timestamp = Date.now()/1000;
            this.currFrame.randomSeed = Math.floor(Math.random() * 1000000);
            this.currFrame.commands = [];
            this.currFrame.deltaTime = deltaTime;
            this.state.frameCount = this.frameCount;
            const start = Date.now();
            // Update ECS world
            // this.world.update(deltaTime);
            // Run registered systems
            cellRoomSpawnLeaderUnitSystem(this.leaderWorld, this.clientDataMap, deltaTime, this.commandMap);
            cellRoomCommandInputSystem(this.leaderWorld, this.clientDataMap, deltaTime, this.commandMap);
            cellRoomMovementSystem(this.leaderWorld, this.clientDataMap, deltaTime);
            cellRoomUpdateSpatialSystem(this.leaderWorld, this.quadtree, deltaTime);
            this.commandMap.clear();


            // 创建 FlatBuffers FrameInfo
            let fbb = new flatbuffers.Builder(1);

            // 处理每个命令并将其添加到 FlatBuffers
            const commandTypes: MMO.CommandUnion[] = [];
            const commandOffsets: flatbuffers.Offset[] = [];

            this.currFrame.commands.push({ type: MessageType.Unknown, from: randomInt(0, 1000000) });
            
            const moveCmd = new MoveCommandMessage();
            moveCmd.type = MessageType.Move;
            moveCmd.from = randomInt(0, 1000000);
            moveCmd.velocity = new Vec2(randomInt(0, 100), randomInt(0, 100));
            this.currFrame.commands.push(moveCmd);
            
            const spawnCmd = new SpawnCommandMessage();
            spawnCmd.type = MessageType.Spawn;
            spawnCmd.from = randomInt(0, 1000000);
            spawnCmd.playerId = randomInt(0, 1000000);
            spawnCmd.position = new Vec2(randomInt(0, 1000), randomInt(0, 1000));
            this.currFrame.commands.push(spawnCmd);
            
            const despawnCmd = new UnSpawnCommandMessage();
            despawnCmd.type = MessageType.Unspawn;
            despawnCmd.from = randomInt(0, 1000000);
            despawnCmd.id = randomInt(0, 1000000);
            this.currFrame.commands.push(despawnCmd);
            
            const removeChildCmd = new RemoveChildCommandMessage();
            removeChildCmd.type = MessageType.RemoveChild;
            removeChildCmd.from = randomInt(0, 1000000);
            removeChildCmd.childId = randomInt(0, 1000000);
            this.currFrame.commands.push(removeChildCmd);
            
            const addChildCmd = new AddChildCommandMessage();
            addChildCmd.type = MessageType.AddChild;
            addChildCmd.from = randomInt(0, 1000000);
            addChildCmd.id = randomInt(0, 1000000);
            addChildCmd.assignedPosition = new Vec2(randomInt(0, 1000), randomInt(0, 1000));
            this.currFrame.commands.push(addChildCmd);


            this.currFrame.commands.forEach(cmd => {
                let commandType: MMO.CommandUnion = MMO.CommandUnion.NONE;
                let commandOffset: flatbuffers.Offset = 0;

                switch (cmd.type) {
                    case MessageType.Move:
                        const moveCmd = cmd as MoveCommandMessage;
                        // 创建 Vec2
                        const velocityOffset = MMO.Vec2.createVec2(fbb, moveCmd.velocity.x, moveCmd.velocity.y);
                        // 创建 MoveCommandMessage
                        MMO.MoveCommandMessage.startMoveCommandMessage(fbb);
                        MMO.MoveCommandMessage.addType(fbb, moveCmd.type as number);
                        MMO.MoveCommandMessage.addFrom(fbb, moveCmd.from);
                        MMO.MoveCommandMessage.addVelocity(fbb, velocityOffset);
                        commandOffset = MMO.MoveCommandMessage.endMoveCommandMessage(fbb);
                        commandType = MMO.CommandUnion.MoveCommandMessage;
                        break;

                    case MessageType.Spawn:
                        const spawnCmd = cmd as SpawnCommandMessage;
                        // 创建 Vec2
                        const positionOffset = MMO.Vec2.createVec2(fbb, spawnCmd.position.x, spawnCmd.position.y);
                        // 创建 SpawnCommandMessage
                        MMO.SpawnCommandMessage.startSpawnCommandMessage(fbb);
                        MMO.SpawnCommandMessage.addType(fbb, spawnCmd.type as number);
                        MMO.SpawnCommandMessage.addFrom(fbb, spawnCmd.from);
                        MMO.SpawnCommandMessage.addId(fbb, spawnCmd.playerId);
                        MMO.SpawnCommandMessage.addPosition(fbb, positionOffset);
                        commandOffset = MMO.SpawnCommandMessage.endSpawnCommandMessage(fbb);
                        commandType = MMO.CommandUnion.SpawnCommandMessage;
                        break;

                    case MessageType.Unspawn:
                        const despawnCmd = cmd as UnSpawnCommandMessage;
                        // 创建 UnSpawnCommandMessage
                        MMO.UnSpawnCommandMessage.startUnSpawnCommandMessage(fbb);
                        MMO.UnSpawnCommandMessage.addType(fbb, despawnCmd.type as number);
                        MMO.UnSpawnCommandMessage.addFrom(fbb, despawnCmd.from);
                        MMO.UnSpawnCommandMessage.addId(fbb, despawnCmd.id);
                        commandOffset = MMO.UnSpawnCommandMessage.endUnSpawnCommandMessage(fbb);
                        commandType = MMO.CommandUnion.UnSpawnCommandMessage;
                        break;

                    case MessageType.AddChild:
                        const addChildCmd = cmd as AddChildCommandMessage;
                        // 创建 Vec2
                        const assignedPositionOffset = MMO.Vec2.createVec2(fbb, addChildCmd.assignedPosition.x, addChildCmd.assignedPosition.y);
                        // 创建 AddChildCommandMessage
                        MMO.AddChildCommandMessage.startAddChildCommandMessage(fbb);
                        MMO.AddChildCommandMessage.addType(fbb, addChildCmd.type as number);
                        MMO.AddChildCommandMessage.addFrom(fbb, addChildCmd.from);
                        MMO.AddChildCommandMessage.addChildId(fbb, addChildCmd.id);
                        MMO.AddChildCommandMessage.addAssignedPosition(fbb, assignedPositionOffset);
                        commandOffset = MMO.AddChildCommandMessage.endAddChildCommandMessage(fbb);
                        commandType = MMO.CommandUnion.AddChildCommandMessage;
                        break;

                    case MessageType.RemoveChild:
                        const removeChildCmd = cmd as RemoveChildCommandMessage;
                        // 创建 RemoveChildCommandMessage
                        MMO.RemoveChildCommandMessage.startRemoveChildCommandMessage(fbb);
                        MMO.RemoveChildCommandMessage.addType(fbb, removeChildCmd.type as number);
                        MMO.RemoveChildCommandMessage.addFrom(fbb, removeChildCmd.from);
                        MMO.RemoveChildCommandMessage.addChildId(fbb, removeChildCmd.childId);
                        commandOffset = MMO.RemoveChildCommandMessage.endRemoveChildCommandMessage(fbb);
                        commandType = MMO.CommandUnion.RemoveChildCommandMessage;
                        break;

                    case MessageType.Chat:
                    case MessageType.Stop_Move:
                    case MessageType.SkillUse:
                    case MessageType.Sync_Request:
                        // 对于简单命令，使用基础 CommandMessage
                        MMO.CommandMessage.startCommandMessage(fbb);
                        MMO.CommandMessage.addType(fbb, cmd.type as number);
                        MMO.CommandMessage.addFrom(fbb, cmd.from);
                        commandOffset = MMO.CommandMessage.endCommandMessage(fbb);
                        commandType = MMO.CommandUnion.NONE; // 基础命令没有特定的 union 类型
                        break;

                    default:
                        this.logger.warn("未知命令类型", { commandType: cmd.type });
                        return; // 跳过未知命令类型
                }

                if (commandType !== MMO.CommandUnion.NONE) {
                    commandTypes.push(commandType);
                    commandOffsets.push(commandOffset);
                }
            });

            // 创建命令向量
            const commandsTypeOffset = commandTypes.length > 0
                ? MMO.FrameInfo.createCommandsTypeVector(fbb, commandTypes)
                : 0;
            const commandsOffset = commandOffsets.length > 0
                ? MMO.FrameInfo.createCommandsVector(fbb, commandOffsets)
                : 0;
            const frameInfoOffset = MMO.FrameInfo.createFrameInfo(
                fbb,
                this.currFrame.frameNumber,
                this.currFrame.randomSeed,
                this.currFrame.timestamp,
                this.currFrame.deltaTime,
                commandsTypeOffset,
                commandsOffset
            );

            fbb.finish(frameInfoOffset);
            const frameData = fbb.asUint8Array();
            let _frame = MMO.FrameInfo.getRootAsFrameInfo(new flatbuffers.ByteBuffer(frameData));
            this.logger.debug("广播帧数据", {
                frameNumber: _frame.frameNumber(),
                timestamp: _frame.timestamp(),
                randomSeed: _frame.randomSeed(),
                deltaTime: _frame.deltaTime()
            });
            this.broadcast(MessageType.Frame, frameData, { afterNextPatch: true });
        }, 1000 / 10); // 20 ticks per second

        // Helper to register simple command handlers to avoid repetition.
        const registerCommandHandler = <T extends CommandMessage>(msgType: MessageType) => {
            this.onMessage(msgType, (client: Client, message: T) => {
                this.logger.debug("收到命令", {
                    messageType: msgType,
                    clientSessionId: client.sessionId
                });
                
                const clientData = this.clientDataMap.get(client.sessionId);
                if (!clientData) {
                    this.logger.warn("客户端数据不存在", {
                        sessionId: client.sessionId,
                        messageType: msgType
                    });
                    return;
                }

                let commandPending = this.commandMap.get(client.sessionId);
                if (!commandPending) {
                    this.logger.debug("创建新的命令挂起对象", {
                        sessionId: client.sessionId
                    });
                    commandPending = {};
                    this.commandMap.set(client.sessionId, commandPending);
                }

                // store the message under its type
                this.logger.debug("存储命令", {
                    sessionId: client.sessionId,
                    messageType: msgType,
                    commandType: message.type
                });
                commandPending[message.type] = message as unknown as any;
                
                this.logger.debug("命令存储完成", {
                    sessionId: client.sessionId,
                    messageType: msgType
                });
            });
        };


        // Register common handlers concisely
        registerCommandHandler<MoveCommandMessage>(MessageType.Move);
        registerCommandHandler<CommandMessage>(MessageType.Stop_Move);
        registerCommandHandler<CommandMessage>(MessageType.SkillUse);
        registerCommandHandler<CommandMessage>(MessageType.Chat);
        registerCommandHandler<CommandMessage>(MessageType.Spawn);
        registerCommandHandler<CommandMessage>(MessageType.Unspawn);
        // registerCommandHandler<CommandMessage>(MessageType.Update_State);
        // registerCommandHandler<CommandMessage>(MessageType.Heartbeat);
        registerCommandHandler<CommandMessage>(MessageType.Sync_Request);
        registerCommandHandler<CommandMessage>(MessageType.AddChild);
        registerCommandHandler<CommandMessage>(MessageType.RemoveChild);

        // Unknown handler (left for custom processing)
        this.onMessage(MessageType.Unknown, (client, message: CommandMessage) => {
            // this.currFrame.commands.push(message);
        });

    }

    onJoin(client: Client, options: any) {
        if (this.clientDataMap.size >= this.maxPlayers) {
            client.send(MessageType.Room_Full);
            client.leave();
            return;
        }
        let leaderData = new LeaderUnit();
        leaderData.position = initializeScheme(new Vec2());
        leaderData.position.x = 0;
        leaderData.position.y = 0;

        leaderData.sessionId = client.sessionId;
        // this.state.leaders.set(client.sessionId, leaderData);
        this.clientDataMap.set(client.sessionId, leaderData);
        client.userData = leaderData;
        this.leaderWorld.add(leaderData);
        this.state.leaders.set(client.sessionId, leaderData);
        this.logger.info("客户端加入房间", {
            clientSessionId: client.sessionId
        });
    }



    onLeave(client: Client, consented: boolean) {
        let entity = this.clientDataMap.get(client.sessionId);
        this.clientDataMap.delete(client.sessionId);
        if (entity) {
            this.leaderWorld.remove(entity);
        }
        this.state.leaders.delete(client.sessionId);


        if (this.autoDestroy && this.clientDataMap.size === 0) {
            this.disconnect();
        }
    }

    onDispose() {
        // Clean up ECS world and systems
        this.leaderWorld.clear();

        this.logger.info("房间已销毁");
        this.clientDataMap.clear();
        this.frameCache.clear();
        this.currFrame = new FrameInfo();
        this.leaderWorld = new World<LeaderUnit>();
        this.frameCount = 0;
    }
}