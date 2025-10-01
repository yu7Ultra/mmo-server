import { World } from 'miniplex';

export type Entity = {
  id: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
};

export const world = new World<Entity>();
