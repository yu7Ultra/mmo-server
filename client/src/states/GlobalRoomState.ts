// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { PlayerUnit } from './PlayerUnit'

export class GlobalRoomState extends Schema {
    @type("string") public serverVersion!: string;
    @type("number") public onlinePlayerCount!: number;
    @type("number") public uptimeSeconds!: number;
    @type([ PlayerUnit ]) public players: ArraySchema<PlayerUnit> = new ArraySchema<PlayerUnit>();
}
