import { ArraySchema, MapSchema, Metadata, Schema, type } from "@colyseus/schema";
import { Circle } from "@timohausmann/quadtree-ts";
import { CircleBoundsUnit } from "../../rooms/CellRoom";
import { RoleType } from "../commands/CellRoomCommands";
import { Float4 } from "../commands/Float4";
import { Vec2 } from "../commands/Vec2";
import { Vec3 } from "../commands/Vec3";

export function initializeScheme<T>(obj: T): T {
    Schema.initialize(obj);
    return obj;
}

Metadata.setFields(Vec2, { x: "number", y: "number" });
Metadata.setFields(Vec3, { x: "number", y: "number", z: "number" });
Metadata.setFields(Float4, { x: "number", y: "number", z: "number", w: "number" });

export class PlayerUnit extends Schema {
    @type("number")
    id: number = 0;
    @type(Vec2)
    position!: Vec2;
    @type("uint8")
    hp: number = 0;
    @type("uint8")
    mp: number = 0;
    @type("uint8")
    type: RoleType = RoleType.Other;
    @type("uint8")
    seat: number = 0;

    // 可根据需要添加更多玩家单位属性
}
export class MonsterUnit extends Schema {

    @type("uint8") public configId!: number;
    @type("uint8") public hp!: number;
    @type("uint8") public mp!: number;
    @type("uint8") public inputState!: number;
    @type("uint16") public level!: number;
    @type("uint32") public id!: number;
    @type(Vec2) public position!: Vec2;
    @type("string") public sessionId: string = "";

    //非 schema对象
    velocity: Vec2 = new Vec2();
    /** 上一帧位置，用于计算移动方向等 */
    prePosition: Vec2 = new Vec2();

    spawnTime: number = 0;

    
}

export class LeaderUnit extends Schema {
    @type("number")
    id: number = 0;
    @type(Vec2)
    position!: Vec2;
    // 可根据需要添加更多领袖单位属性
    @type([PlayerUnit])
    players: PlayerUnit[] = new ArraySchema<PlayerUnit>();

    @type("uint16")
    radius: number = 5;
    @type("uint8")
    viewRadius: number = 20;

    @type("uint8")
    type: RoleType = RoleType.Other;

    @type("string")
    sessionId: string = "";

    @type("uint32")
    inputState: number = 0;

    //非 schema对象
    velocity: Vec2 = new Vec2();
    /** 上一帧位置，用于计算移动方向等 */
    prePosition: Vec2 = new Vec2();

    circleBounds!: CircleBoundsUnit<string>;

    viewCircleBounds!: CircleBoundsUnit<string>;



    /** 更新圆形边界信息 */
    updateCircleBounds() {
        this.circleBounds.x = this.position.x;
        this.circleBounds.y = this.position.y;
        this.circleBounds.data = this.sessionId;

        this.viewCircleBounds.x = this.position.x;
        this.viewCircleBounds.y = this.position.y;
        this.viewCircleBounds.data = this.sessionId;
    }

    getViewCircleBounds(): Circle<string> {
        return this.viewCircleBounds;
    }
    getCircleBounds(): Circle<string> {
        return this.circleBounds;
    }
}


export class CellRoomUnit extends Schema {
    @type("uint32")
    cellRoomId: number = 0;
    @type("uint32")
    playerCount: number = 0;
    @type("uint32")
    frameCount: number = 0;
    @type({ map: LeaderUnit })
    leaders: MapSchema<LeaderUnit> = new MapSchema<LeaderUnit>();

    @type({ map: MonsterUnit })
    monsters: MapSchema<MonsterUnit> = new MapSchema<MonsterUnit>();

    @type("uint64")
    timestamp: number = 0;
    // 可根据需要添加更多小房间属性
}

export class GlobalRoomState extends Schema {
    @type("string")
    serverVersion: string = "";

    @type("uint32")
    onlinePlayerCount: number = 0;

    @type("uint32")
    uptimeSeconds: number = 0;

    // 可根据需要添加更多全局同步属性
    @type([PlayerUnit])
    players: PlayerUnit[] = new ArraySchema<PlayerUnit>();
}
