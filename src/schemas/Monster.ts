import { Schema, type } from '@colyseus/schema';

export class Monster extends Schema {
  @type('string') id: string = '';
  @type('string') type: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') health: number = 100;
  @type('number') maxHealth: number = 100;
  @type('number') mana: number = 0;
  @type('number') maxMana: number = 0;
  @type('number') level: number = 1;
  @type('string') state: string = 'idle';
  @type('number') stateStartTime: number = 0;
  @type('string') targetId: string = '';
}
