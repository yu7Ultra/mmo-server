// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class ChatMessage extends Schema {
    @type("string") public sender!: string;
    @type("string") public message!: string;
    @type("number") public timestamp!: number;
    @type("string") public channel!: string;
}
