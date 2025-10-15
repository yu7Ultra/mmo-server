// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class EquipmentItem extends Schema {
    @type("string") public id!: string;
    @type("string") public name!: string;
    @type("string") public slot!: string;
    @type("number") public attack!: number;
    @type("number") public defense!: number;
}
