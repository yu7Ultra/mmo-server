import { Vec2 } from "./Vec2";

export enum RoleType {
    Player = 1,  // 玩家
    NPC = 2,  // 普通 NPC
    Monster = 3,  // 普通怪物
    Boss = 4,  // Boss 怪
    Pet = 5,  // 宠物
    Summon = 6,  // 召唤物
    Ally = 7,  // 队友/同伴
    Merchant = 8,  // 商人
    QuestGiver = 9,  // 任务发布者
    Other = 10,  // 其他
    Bullet = 11, // 投射物
    Mouse = 12,// 鼠标指示器
    ViewArea = 13,// 视野范围的单位
}

export enum INPUT_KEY {
    C_KEY = 1 << 4, // 0001 0000
    F_KEY = 1 << 5, // 0010 0000
    V_KEY = 1 << 6, // 0100 0000
    T_KEY = 1 << 7, // 1000 0000
}

export class CommandMessage {
    type: MessageType = MessageType.Unknown;
    from: number = 0;
}

// 角色事件消息结构体
export class RoleHuiXueStartMsg extends CommandMessage {
    id: number = 0;
}

export class RoleDieMsg extends CommandMessage {
    id: number = 0;
}

export class CancelLockEnemyMsg extends CommandMessage {
    id: number = 0;
}

export class LockEnemyMsg extends CommandMessage {
    id: number = 0;
    enemyId: number = 0;
    lockType: number = 0;
}

export class RoleAttackMsg extends CommandMessage {
    id: number = 0;
}

export class RoleHurtMsg extends CommandMessage {
    id: number = 0;
    targetId: number = 0;
    damage: number = 0;
    artFontType: number = 0;
}

export class RoleAttackFireMsg extends CommandMessage {
    id: number = 0;
}

export class RoleAttackMeleeMsg extends CommandMessage {
    id: number = 0;
}

export class RoleReduceHpMsg extends CommandMessage {
    id: number = 0;
    targetId: number = 0;
    damage: number = 0;
    artFontType?: number;
}

export enum MessageType {
    Frame = 1,
    Move = 2,
    SkillUse = 3,
    Chat = 4,
    Stop_Move = 5,
    AddChild = 6,
    RemoveChild = 7,
    EntityUpdate = 8,
    ChildMove = 9,
    InputUpdate = 10,

    // 角色事件
    RoleHuiXueStart = 11,
    RoleDie = 12,
    CancelLockEnemy = 13,
    LockEnemy = 14,
    RoleAttack = 15,
    RoleHurt = 16,
    RoleAttackFire = 17,
    RoleAttackMelee = 18,
    RoleReduceHp = 19,


    Spawn = 250,
    Unspawn = 251,

    Room_Full = 252,
    Heartbeat = 253,
    Sync_Request = 254,
    Unknown = 255,
    UpdateChildState = 256,
}



export class ChildMoveCommandMessage extends CommandMessage {
    id: number = 0
    position: Vec2 = new Vec2();
}


export class MoveCommandMessage extends CommandMessage {
    velocity: Vec2 = new Vec2();
    position: Vec2 = new Vec2();
}

export class UnSpawnCommandMessage extends CommandMessage {
    id: number = 0;
    role: RoleType = RoleType.Other;
}



export class SpawnCommandMessage extends CommandMessage {
    playerId: number = 0;
    position: Vec2 = new Vec2();
    roles: SpawnRoleInfo[] = [];
}

export interface SpawnRoleInfo {
    playerId: number,
    position: Vec2,
    hp: number,
    mp: number,
    seat: number,
    type: RoleType
}

export class AddChildCommandMessage extends CommandMessage {
    id: number = 0;
    assignedPosition: Vec2 = new Vec2();
}

export class ChildUpdateCommandMessage extends CommandMessage {
    id: number = 0;
    position: Vec2 = new Vec2();
    hp: number = 0;
    mp: number = 0;
}


export class InputUpdateCommandMessage extends CommandMessage {
    inputState: INPUT_KEY = INPUT_KEY.C_KEY;
    down: boolean = false;
}

export class RemoveChildCommandMessage extends CommandMessage {
    childId: number = 0;
}

export class FrameInfo {
    frameNumber: number = 0;
    timestamp: number = 0;
    randomSeed: number = 0;
    commands: CommandMessage[] = [];
    deltaTime: number = 0;
}

export type CommandPendingMessage = Partial<Record<MessageType, CommandMessage[]>>;