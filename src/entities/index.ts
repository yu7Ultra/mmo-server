import { Player } from '../schemas/MyRoomState';

export type Entity = {
  id?: number;
  // Components
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  player: Player;
  sessionId: string;
};


export type Command = {
  x: number;
  y: number;
  sessionId: string;
}