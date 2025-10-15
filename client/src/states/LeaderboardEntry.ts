// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class LeaderboardEntry extends Schema {
    @type("string") public playerId!: string;
    @type("string") public playerName!: string;
    @type("number") public score!: number;
    @type("number") public level!: number;
    @type("number") public rank!: number;
}
