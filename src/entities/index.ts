import { Client } from '@colyseus/core';
import { Player } from '../schemas/MyRoomState';

export type Entity = {
  id?: number;
  // Components
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  player: Player;
  client: Client;
};
