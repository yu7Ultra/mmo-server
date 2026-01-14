// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Player } from './Player'
import { Monster } from './Monster'
import { ChatMessage } from './ChatMessage'
import { LeaderboardEntry } from './LeaderboardEntry'
import { VoiceChannel } from './VoiceChannel'

export class MyRoomState extends Schema {
    @type({ map: Player }) public players: MapSchema<Player> = new MapSchema<Player>();
    @type({ map: Monster }) public monsters: MapSchema<Monster> = new MapSchema<Monster>();
    @type([ ChatMessage ]) public chatMessages: ArraySchema<ChatMessage> = new ArraySchema<ChatMessage>();
    @type([ LeaderboardEntry ]) public leaderboard: ArraySchema<LeaderboardEntry> = new ArraySchema<LeaderboardEntry>();
    @type({ map: VoiceChannel }) public voiceChannels: MapSchema<VoiceChannel> = new MapSchema<VoiceChannel>();
    @type("number") public serverTime!: number;
    @type("number") public worldWidth!: number;
    @type("number") public worldHeight!: number;
}
