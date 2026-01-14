// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class Monster extends Schema {
    @type("string") public id!: string;
    @type("string") public type!: string;
    @type("number") public x!: number;
    @type("number") public y!: number;
    @type("number") public health!: number;
    @type("number") public maxHealth!: number;
    @type("number") public mana!: number;
    @type("number") public maxMana!: number;
    @type("number") public level!: number;
    @type("string") public state!: string;
    @type("number") public stateStartTime!: number;
    @type("string") public targetId!: string;
}
