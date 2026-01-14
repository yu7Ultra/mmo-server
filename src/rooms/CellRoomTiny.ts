import { AuthContext, Client, Room } from '@colyseus/core';
import { Circle, Quadtree } from '@timohausmann/quadtree-ts';
import { randomInt } from 'crypto';
import { World } from 'miniplex';
import { configManager } from '../config/configManager';
import { ENV } from '../config/env';
import { ChildMoveCommandMessage, ChildUpdateCommandMessage, CommandMessage, CommandPendingMessage, FrameInfo, InputUpdateCommandMessage, MessageType, MoveCommandMessage, RoleType } from '../schemas/commands/CellRoomCommands';
import { Vec2 } from '../schemas/commands/Vec2';
import { CellRoomUnit, initializeScheme, LeaderUnit, MonsterUnit } from '../schemas/sync/CellRoomSyncStates';
import { loggerService } from '../services/loggerService';
import { cellRoomChildUpdateSystem, cellRoomCommandInputSystem, cellRoomMovementSystem, cellRoomSpawnLeaderUnitSystem, cellRoomUpdateSpatialSystem } from '../systems/cellRoom/systems';
import { parseTileMap } from '../utils/map/mapParser';
import { ParsedMapData } from '../utils/map/MapTypes';
import { TiledMap } from '../utils/tmx/TiledMapUtils';


export class CircleBoundsUnit<T> extends Circle<T> {
    role: RoleType = RoleType.Other;
    constructor(x: number, y: number, r: number, role: RoleType = RoleType.Other, data?: T) {
        super({ x, y, r, data });
        this.role = role;
    }
}

export class CellRoomTiny extends Room<CellRoomUnit> {

    private leaderWorld: World<LeaderUnit> = new World<LeaderUnit>();

    private monsterWorld: World<MonsterUnit> = new World<MonsterUnit>();

    private npcWorld: World<LeaderUnit> = new World<LeaderUnit>();

    private frameCount: number = 0;

    private currFrame: FrameInfo = new FrameInfo();

    private frameCache: Map<number, FrameInfo> = new Map();

    private static readonly MAX_COMMANDS_PER_FRAME = 200; // anti-abuse safeguard

    private clientDataMap: Map<string, LeaderUnit> = new Map();
    // private dispatch: Dispatcher<CellRoom> = new Dispatcher(this);

    private commandMap: Map<string, CommandPendingMessage> = new Map();

    private quadtree!: Quadtree<CircleBoundsUnit<string>>;

    private width: number = 2000;

    private height: number = 2000;

    private scaleWidth: number = 5;

    private scaleHeight: number = 5;

    private autoDestroy: boolean = false;

    private maxPlayers: number = 200;

    // 房间特定的日志器
    private logger = loggerService.child('CellRoomTiny');

    private loading: number = 0;
    private tileMap!: TiledMap;
    private parsedMap!: ParsedMapData;
    onCreate(options: any) {

        this.loading = 0;
        // 初始化房间特定的日志器，包含房间ID
        this.logger = loggerService.child(`CellRoomTiny:${this.roomId}`);

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

        // Only use presence channels if Redis is configured
        if (this.presence) {
            this.presence.channels("cellRoom").then(() => {
                this.logger.info("Presence channel joined", { channel: 'cellRoom' });
            }).catch((err) => {
                this.logger.error("Failed to join presence channel", err, { channel: 'cellRoom' });
            });
        }

        this.tileMap = configManager.loadConfig<TiledMap>('map_mmo', 'config/map/mmo.json', false);
        loggerService.info("加载地图配置完成", { roomId: this.roomId });
        const { map, diag } = parseTileMap(this.tileMap, { onWarn: (m, ctx) => this.logger.warn(m, ctx) });
        this.parsedMap = map;
        this.logger.info("地图解析结果", {
            territories: map.territories.length,
            crystals: map.crystals.length,
            resources: map.resources.length,
            monsterSpawns: map.monsterSpawns.length,
            teleports: map.teleports.length,
            obstaclePolygons: map.obstaclePolygons.length,
            obstacleTiles: map.obstacleTileLayers.reduce((a, l) => a + l.data.length, 0),
            polygonVertexTotal: diag.polygonVertexTotal
        });
        this.initializeResourcesFromParsedMap();
        this.setSimulationInterval((msDelta) => {
            const deltaTime = msDelta / 1000;
            this.initializeFrame(deltaTime);

            // Leader systems
            cellRoomSpawnLeaderUnitSystem(this.leaderWorld, this.clientDataMap, deltaTime, this.commandMap);
            cellRoomCommandInputSystem(this.leaderWorld, this.clientDataMap, deltaTime, this.commandMap);
            cellRoomMovementSystem(this.leaderWorld, this.clientDataMap, deltaTime);
            cellRoomChildUpdateSystem(this.leaderWorld, this.clientDataMap, deltaTime, this.commandMap);
            cellRoomUpdateSpatialSystem(this.leaderWorld, this.quadtree, deltaTime);

            // Monster systems
            // monsterSpawnSystem(this.monsterWorld, this.quadtree, { worldWidth: this.width, worldHeight: this.height });
            // monsterBehaviorSystem(this.monsterWorld, this.leaderWorld, deltaTime);
            // monsterMovementSystem(this.monsterWorld, this.quadtree, deltaTime, { worldWidth: this.width, worldHeight: this.height });

            // NPC systems
            // npcSpawnSystem(this.npcWorld, { worldWidth: this.width, worldHeight: this.height }, this.quadtree);
            // npcBehaviorSystem(this.npcWorld, this.leaderWorld, deltaTime, { worldWidth: this.width, worldHeight: this.height });
            // npcUpdateSpatialSystem(this.npcWorld, this.quadtree);

            // Clear per-frame command map after systems processed
            this.commandMap.clear();
        }, 1000 / (ENV.TICK_RATE || 10));

        // Helper to register simple command handlers to avoid repetition.
        const registerCommandHandler = <T extends CommandMessage | CommandMessage[]>(msgType: MessageType, isArr?: boolean) => {
            this.onMessage(msgType, (client: Client, message: T) => {
                this.logger.debug("收到命令", {
                    messageType: MessageType[msgType],
                    clientSessionId: client.sessionId,
                    isArray: isArr, cmd: message
                });

                const clientData = this.clientDataMap.get(client.sessionId);
                if (!clientData) {
                    this.logger.warn("客户端数据不存在", {
                        sessionId: client.sessionId,
                        messageType: MessageType[msgType]
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

                // Store the message directly, not the payload property
                if (isArr && commandPending[msgType]?.length) {
                    if (commandPending[msgType].length >= CellRoomTiny.MAX_COMMANDS_PER_FRAME) {
                        this.logger.warn("命令数量已达上限，忽略后续", { sessionId: client.sessionId, messageType: MessageType[msgType] });
                        return;
                    }
                    this.logger.debug("添加到现有命令数组", {
                        sessionId: client.sessionId,
                        messageType: MessageType[msgType],
                        currentLength: commandPending[msgType].length
                    });
                    commandPending[msgType].push((message as any).payload);
                } else {
                    this.logger.debug("创建新的命令数组", {
                        sessionId: client.sessionId,
                        messageType: MessageType[msgType]
                    });
                    commandPending[msgType] = [(message as any).payload];
                }

                this.logger.debug("命令存储完成", {
                    sessionId: client.sessionId,
                    messageType: MessageType[msgType],
                    finalLength: commandPending[msgType].length
                });
            });
        };


        // Register common handlers concisely
        registerCommandHandler<MoveCommandMessage>(MessageType.Move);
        registerCommandHandler<CommandMessage>(MessageType.Stop_Move);
        registerCommandHandler<CommandMessage>(MessageType.SkillUse);
        registerCommandHandler<CommandMessage>(MessageType.Chat);
        registerCommandHandler<CommandMessage>(MessageType.Spawn, true);
        registerCommandHandler<CommandMessage>(MessageType.Unspawn, true);
        // registerCommandHandler<CommandMessage>(MessageType.Update_State);
        // registerCommandHandler<CommandMessage>(MessageType.Heartbeat);
        registerCommandHandler<CommandMessage>(MessageType.Sync_Request);
        // registerCommandHandler<CommandMessage>(MessageType.AddChild);
        // registerCommandHandler<CommandMessage>(MessageType.RemoveChild);
        registerCommandHandler<ChildMoveCommandMessage>(MessageType.ChildMove, true);
        registerCommandHandler<ChildUpdateCommandMessage>(MessageType.UpdateChildState, true);
        registerCommandHandler<InputUpdateCommandMessage>(MessageType.InputUpdate, false);

        // Unknown handler (left for custom processing)
        this.onMessage(MessageType.Unknown, (client, message: CommandMessage) => {
            // this.currFrame.commands.push(message);
        });




    }

    onAuth(client: Client<any, any>, options: any, context: AuthContext) {
        this.logger.debug("客户端认证", {
            clientSessionId: client.sessionId
        });
        // Implement authentication logic here if needed
        return true;
    }

    onJoin(client: Client, options: any) {
        if (this.clientDataMap.size >= this.maxPlayers) {
            client.send(MessageType.Room_Full);
            client.leave();
            return;
        }
        let { position, players } = options;
        let leaderData = new LeaderUnit();
        leaderData.position = initializeScheme(new Vec2());
        leaderData.position.x = position?.x || 0;
        leaderData.position.y = position?.y || 0;
        leaderData.sessionId = client.sessionId;
        leaderData.id = randomInt(1, 1000000);

        // Initialize circle bounds for spatial partitioning
        leaderData.circleBounds = new CircleBoundsUnit(
            leaderData.position.x,
            leaderData.position.y,
            leaderData.radius,
            RoleType.Player,
            client.sessionId
        );

        leaderData.viewCircleBounds = new CircleBoundsUnit(
            leaderData.position.x,
            leaderData.position.y,
            leaderData.viewRadius,
            RoleType.ViewArea,
            client.sessionId
        );

        // Add to quadtree
        this.quadtree.insert(leaderData.circleBounds);
        this.quadtree.insert(leaderData.viewCircleBounds);

        this.logger.info("分配LeaderUnit给客户端", {
            leaderUnitId: leaderData.id,
            clientSessionId: client.sessionId
        });
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
            // Remove from quadtree
            if (entity.circleBounds) {
                this.quadtree.remove(entity.circleBounds);
            }
            if (entity.viewCircleBounds) {
                this.quadtree.remove(entity.viewCircleBounds);
            }

            this.leaderWorld.remove(entity);
        }

        this.state.leaders.delete(client.sessionId);

        this.logger.info("客户端离开房间", {
            clientSessionId: client.sessionId,
            consented: consented,
            remainingPlayers: this.clientDataMap.size
        });

        if (this.autoDestroy && this.clientDataMap.size === 0) {
            this.disconnect();
        }
    }

    onDispose() {
        // Clean up ECS world and systems
        this.leaderWorld.clear();
        this.monsterWorld.clear();
        this.npcWorld.clear();
        if (this.presence) {
            this.presence.unsubscribe("cellRoom").catch((err: any) => this.logger.error("Presence channel unsubscribe failed", err));
        }

        this.logger.info("房间已销毁", {
            totalPlayers: this.clientDataMap.size,
            frameCount: this.frameCount
        });
        this.clientDataMap.clear();
        this.frameCache.clear();
        this.currFrame = new FrameInfo();
        this.leaderWorld = new World<LeaderUnit>();
        this.frameCount = 0;
    }

    /** Initialize frame bookkeeping */
    private initializeFrame(deltaTime: number) {
        if (this.frameCount && this.currFrame) {
            this.frameCache.set(this.currFrame.frameNumber, this.currFrame);
            this.frameCache.delete(this.frameCount - 300); // prune old
        }
        this.currFrame = new FrameInfo();
        this.frameCount++;
        this.currFrame.frameNumber = this.frameCount;
        this.currFrame.timestamp = Date.now() / 1000;
        this.currFrame.randomSeed = Math.floor(Math.random() * 1000000);
        this.currFrame.deltaTime = deltaTime;
        this.currFrame.commands = [];
        this.state.frameCount = this.frameCount;
        this.state.timestamp = Date.now();
    }

    /** Initialize world bounds and entities from parsedMap */
    private initializeResourcesFromParsedMap() {
        try {
            if (!this.parsedMap) {
                this.logger.warn("parsedMap 未加载，跳过资源初始化");
                return;
            }
            this.width = this.parsedMap.world.widthPx;
            this.height = this.parsedMap.world.heightPx;
            this.quadtree = new Quadtree<CircleBoundsUnit<string>>({
                width: this.width,
                height: this.height,
                maxObjects: 10,
                maxLevels: 5
            });
            this.logger.info("根据解析地图设置世界尺寸", { width: this.width, height: this.height });

            for (const spawn of this.parsedMap.monsterSpawns) {
                
                const m = new MonsterUnit();
                m.id = randomInt(1, 1000000);
                m.position = initializeScheme(new Vec2());
                // m.position.x = spawn.position.x * this.scaleWidth;
                // m.position.y = spawn.position.y * this.scaleHeight;
                m.position.x = spawn.position.x - this.width;
                m.position.y = -(spawn.position.y - this.height);
                m.inputState = 0;
                m.hp = 100;
                m.mp = 100;
                m.configId = spawn.monsterConfigId;
                // m.level = 1;
                m.velocity = new Vec2();
                m.inputState = 0;
                this.state.monsters.set(`${m.id}`, m);
                this.monsterWorld.add(m);
                break;
                // this.state.monsters.set(`${m.id}`, m);
                // if ((m as any).circleBounds) {
                //     (m as any).circleBounds.x = m.position.x;
                //     (m as any).circleBounds.y = m.position.y;
                //     (m as any).circleBounds.r = (m as any).radius ?? 16;
                //     this.quadtree.insert((m as any).circleBounds);
                // }
            }
            this.logger.info("已根据地图生成怪物", { count: this.parsedMap.monsterSpawns.length });

            // for (const terr of this.parsedMap.territories) {
            //     const npc = new LeaderUnit();
            //     npc.position = initializeScheme(new Vec2());
            //     npc.position.x = terr.bounds.x + terr.bounds.w / 2;
            //     npc.position.y = terr.bounds.y + terr.bounds.h / 2;
            //     this.npcWorld.add(npc);
            //     if ((npc as any).circleBounds) {
            //         (npc as any).circleBounds.x = npc.position.x;
            //         (npc as any).circleBounds.y = npc.position.y;
            //         (npc as any).circleBounds.r = (npc as any).radius ?? npc.radius;
            //         this.quadtree.insert((npc as any).circleBounds);
            //     }
            // }
            this.logger.info("已根据领地生成NPC", { count: this.parsedMap.territories.length });
            this.logger.info("资源节点统计", { count: this.parsedMap.resources.length });
        } catch (err: any) {
            this.logger.error("根据parsedMap初始化资源失败", err);
        }
    }
}