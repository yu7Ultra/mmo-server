// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class VoiceSignal extends Schema {
    @type("string") public from!: string;
    @type("string") public to!: string;
    @type("string") public type!: string;
    @type("string") public data!: string;
    @type("number") public timestamp!: number;
}
