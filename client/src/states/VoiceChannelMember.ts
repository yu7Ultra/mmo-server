// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class VoiceChannelMember extends Schema {
    @type("string") public sessionId!: string;
    @type("string") public playerName!: string;
    @type("boolean") public muted!: boolean;
    @type("boolean") public deafened!: boolean;
    @type("number") public joinedAt!: number;
}
