// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type } from '@colyseus/schema';
import { Vec2 } from './Vec2';

export class MonsterUnit extends Schema {
    // @type([ PlayerUnit ]) public players: ArraySchema<PlayerUnit> = new ArraySchema<PlayerUnit>();
    // @type("number") public radius!: number;
    // @type("number") public viewRadius!: number;
    @type("uint8") public type!: number;
    @type("uint8") public hp!: number;
    @type("uint8") public mp!: number;
    @type("uint8") public inputState!: number;
    @type("uint16") public level!: number;
    @type("uint32") public id!: number;
    @type("uint32") public targetId!: number;
    @type(Vec2) public position: Vec2 = new Vec2();
}
