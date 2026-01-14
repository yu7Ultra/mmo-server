// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { LeaderUnit } from './LeaderUnit'

export class CellRoomUnit extends Schema {
    @type("number") public cellRoomId!: number;
    @type("number") public playerCount!: number;
    @type({ map: LeaderUnit }) public leaders: MapSchema<LeaderUnit> = new MapSchema<LeaderUnit>();
}
