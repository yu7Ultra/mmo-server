// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { CommandMessage } from './CommandMessage'

export class FrameInfo extends Schema {
    @type("uint32") public frameNumber!: number;
    @type("float32") public timestamp!: number;
    @type("uint32") public randomSeed!: number;
    @type([ CommandMessage ]) public commands: ArraySchema<CommandMessage> = new ArraySchema<CommandMessage>();
    @type("float32") public deltaTime!: number;
}
