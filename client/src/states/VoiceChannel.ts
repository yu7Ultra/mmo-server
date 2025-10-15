// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { VoiceChannelMember } from './VoiceChannelMember'

export class VoiceChannel extends Schema {
    @type("string") public id!: string;
    @type("string") public name!: string;
    @type("string") public type!: string;
    @type({ map: VoiceChannelMember }) public members: MapSchema<VoiceChannelMember> = new MapSchema<VoiceChannelMember>();
    @type("number") public maxMembers!: number;
    @type("number") public createdAt!: number;
    @type("string") public ownerId!: string;
}
