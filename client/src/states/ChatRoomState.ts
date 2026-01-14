// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { ChatMessage } from './ChatMessage'
import { VoiceChannel } from './VoiceChannel'
import { VoiceChannelMember } from './VoiceChannelMember'

export class ChatRoomState extends Schema {
    @type([ ChatMessage ]) public chatMessages: ArraySchema<ChatMessage> = new ArraySchema<ChatMessage>();
    @type({ map: "boolean" }) public channelUsers: MapSchema<boolean> = new MapSchema<boolean>();
    @type({ map: VoiceChannel }) public voiceChannels: MapSchema<VoiceChannel> = new MapSchema<VoiceChannel>();
    @type({ map: VoiceChannelMember }) public voiceChannelMembers: MapSchema<VoiceChannelMember> = new MapSchema<VoiceChannelMember>();
    @type("number") public serverTime!: number;
    @type("string") public roomName!: string;
    @type("number") public worldWidth!: number;
    @type("number") public worldHeight!: number;
}
