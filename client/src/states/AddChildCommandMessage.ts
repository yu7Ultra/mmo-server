// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vec2 } from './Vec2'
import { CommandMessage } from './CommandMessage'

export class AddChildCommandMessage extends CommandMessage {
    @type("number") public childId!: number;
    @type(Vec2) public assignedPosition: Vec2 = new Vec2();
}
