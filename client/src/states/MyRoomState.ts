// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Player } from './Player'
import { ChatMessage } from './ChatMessage'
import { LeaderboardEntry } from './LeaderboardEntry'

export class MyRoomState extends Schema {
    @type({ map: Player }) public players: MapSchema<Player> = new MapSchema<Player>();
    @type([ ChatMessage ]) public chatMessages: ArraySchema<ChatMessage> = new ArraySchema<ChatMessage>();
    @type([ LeaderboardEntry ]) public leaderboard: ArraySchema<LeaderboardEntry> = new ArraySchema<LeaderboardEntry>();
    @type("number") public serverTime!: number;
}
