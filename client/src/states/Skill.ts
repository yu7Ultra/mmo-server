// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class Skill extends Schema {
    @type("string") public id!: string;
    @type("string") public name!: string;
    @type("string") public description!: string;
    @type("number") public level!: number;
    @type("number") public cooldown!: number;
    @type("number") public lastUsed!: number;
    @type("number") public manaCost!: number;
    @type("number") public damage!: number;
}
