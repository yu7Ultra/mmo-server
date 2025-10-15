// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.62
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { EquipmentItem } from './EquipmentItem'
import { Skill } from './Skill'
import { Quest } from './Quest'
import { Achievement } from './Achievement'

export class Player extends Schema {
    @type("number") public x!: number;
    @type("number") public y!: number;
    @type("string") public name!: string;
    @type("number") public level!: number;
    @type("number") public experience!: number;
    @type("number") public experienceToNext!: number;
    @type("number") public health!: number;
    @type("number") public maxHealth!: number;
    @type("number") public mana!: number;
    @type("number") public maxMana!: number;
    @type("number") public attack!: number;
    @type("number") public defense!: number;
    @type("number") public speed!: number;
    @type("boolean") public inCombat!: boolean;
    @type("string") public targetId!: string;
    @type({ map: EquipmentItem }) public equipment: MapSchema<EquipmentItem> = new MapSchema<EquipmentItem>();
    @type([ Skill ]) public skills: ArraySchema<Skill> = new ArraySchema<Skill>();
    @type([ Quest ]) public quests: ArraySchema<Quest> = new ArraySchema<Quest>();
    @type([ Achievement ]) public achievements: ArraySchema<Achievement> = new ArraySchema<Achievement>();
    @type([ "string" ]) public friends: ArraySchema<string> = new ArraySchema<string>();
    @type("string") public currentVoiceChannel!: string;
    @type("boolean") public voiceMuted!: boolean;
    @type("boolean") public voiceDeafened!: boolean;
    @type("number") public kills!: number;
    @type("number") public deaths!: number;
    @type("number") public damageDealt!: number;
    @type("number") public damageTaken!: number;
}
