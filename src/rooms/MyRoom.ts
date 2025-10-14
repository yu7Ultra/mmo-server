import { Client, Room } from '@colyseus/core';
import { World } from 'miniplex';
import { Entity } from '../entities';
import { MyRoomState, Player } from '../schemas/MyRoomState';
import { movementSystem } from '../systems/movementSystem';
import { syncSystem } from '../systems/syncSystem';
import { registerRoom, unregisterRoom, recordTick, recordMessage, updateClients } from '../instrumentation/metrics';
import { recordPatch } from '../instrumentation/metrics';

export class MyRoom extends Room<MyRoomState> {
  private world = new World<Entity>();

  onCreate(options: any) {
    this.state = new MyRoomState();
    registerRoom(this.roomId);
    let lastTickTime = Date.now();
    // Wrap broadcastPatch to record patch metrics
    const originalBroadcastPatch = (this as any).broadcastPatch;
    (this as any).broadcastPatch = (...args: any[]) => {
      try {
        const before = Date.now();
        const result = originalBroadcastPatch.apply(this, args);
        const after = Date.now();
        // We don't have direct patch bytes, approximate with duration * clients
        recordPatch(this.roomId, (after - before) * this.clients.length);
        return result;
      } catch (err) {
        return originalBroadcastPatch.apply(this, args);
      }
    };
    this.setSimulationInterval(() => {
      const start = Date.now();
      movementSystem(this.world);
      syncSystem(this.world);
      const end = Date.now();
      recordTick(this.roomId, end - start);
      updateClients(this.roomId, this.clients.length);
      lastTickTime = end;
    });

    this.onMessage("move", (client, message: { x: number; y: number }) => {
      recordMessage(this.roomId, 'move');
      const entity = this.world.where((e) => e.client.sessionId === client.sessionId).first;
      if (entity) {
        entity.velocity.x = message.x;
        entity.velocity.y = message.y;
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, 'joined!');

    const player = new Player();
    this.state.players.set(client.sessionId, player);

    this.world.add({
      client: client,
      player: player,
      position: { x: player.x, y: player.y },
      velocity: { x: 0, y: 0 },
    });
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');

    this.state.players.delete(client.sessionId);

    const entity = this.world.where((e) => e.client.sessionId === client.sessionId).first;
    if (entity) {
      this.world.remove(entity);
    }
  }

  onDispose() {
    console.log('room', this.roomId, 'disposing...');
    unregisterRoom(this.roomId);
  }
}
