import { Schema, MapSchema, type } from '@colyseus/schema';

export class Player extends Schema {
  @type('number') x: number = Math.random() * 800;
  @type('number') y: number = Math.random() * 600;
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
