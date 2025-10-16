import { Schema, type } from '@colyseus/schema';

export class Monster extends Schema {
    @type("string") public id: string = "";
    @type("string") public type: string = "";
    @type("number") public x: number = 0;
    @type("number") public y: number = 0;
    @type("number") public health: number = 100;
    @type("number") public maxHealth: number = 100;
    @type("number") public mana: number = 0;
    @type("number") public maxMana: number = 0;
    @type("number") public level: number = 1;
    @type("string") public state: string = "idle";
    @type("number") public stateStartTime: number = 0;
    @type("string") public targetId: string = "";
}
