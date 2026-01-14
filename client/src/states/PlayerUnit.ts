// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vec2 } from './Vec2'

export class PlayerUnit extends Schema {
    @type(Vec2) public position: Vec2 = new Vec2();
    @type("uint8") public hp!: number;
    @type("uint8") public mp!: number;
    @type("uint8") public type!: number;
    @type("uint32") public id!: number;
    @type("uint32") public inputState!: number;
}
