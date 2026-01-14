// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vec2 } from './Vec2'
import { PlayerUnit } from './PlayerUnit'

export class LeaderUnit extends Schema {
    @type("number") public id!: number;
    @type(Vec2) public position: Vec2 = new Vec2();
    @type([ PlayerUnit ]) public players: ArraySchema<PlayerUnit> = new ArraySchema<PlayerUnit>();
    @type("number") public radius!: number;
    @type("number") public viewRadius!: number;
    @type("uint8") public type!: number;
}
