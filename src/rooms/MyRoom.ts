import { Client, Room } from '@colyseus/core';
import { World } from 'miniplex';
import { Command, Entity } from '../entities';
import { recordMessage, recordPatch, recordSlowTick, recordTick, registerRoom, unregisterRoom, updateAutoProfile, updateClients } from '../instrumentation/metrics';
import { ENV } from '../config/env';
import { MyRoomState, Player } from '../schemas/MyRoomState';
import { inputSystem } from '../systems/inputSystem';
import { movementSystem } from '../systems/movementSystem';
import { syncSystem } from '../systems/syncSystem';


export class MyRoom extends Room<MyRoomState> {

  private world = new World<Entity>();

  private entityByClient = new Map<string, Entity>();

  private entityCommandMap: Map<string, Command> = new Map();


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
  const slowThreshold = ENV.PERF_SLOW_TICK_MS; // ms
  const autoProfileCooldownMs = ENV.PERF_AUTO_PROFILE_COOLDOWN_MS; // ms
    let lastAutoProfileAt = 0;
    this.setSimulationInterval(() => {
      const start = Date.now();

      inputSystem(this.world, this.entityCommandMap, this.entityByClient);
      movementSystem(this.world);
      syncSystem(this.world);
      const end = Date.now();
      const duration = end - start;
      recordTick(this.roomId, duration);
      if (duration > slowThreshold) {
        recordSlowTick(this.roomId, duration, slowThreshold);
        const now = Date.now();
        if (now - lastAutoProfileAt > autoProfileCooldownMs) {
          // Fire and forget 1s CPU profile
          if (ENV.ENABLE_AUTO_PROFILE) {
            import('../instrumentation/profiler').then(mod => {
              mod.captureCPUProfile(ENV.AUTO_PROFILE_DURATION_MS).then(file => {
              updateAutoProfile(this.roomId, file);
              console.warn(`[perf] auto CPU profile captured for room ${this.roomId}: ${file}`);
              }).catch(err => console.error('[perf] auto profile error', err));
            }).catch(err => console.error('[perf] profiler import error', err));
          }
          lastAutoProfileAt = now;
        }
      }
      updateClients(this.roomId, this.clients.length);
      lastTickTime = end;
    }, 1000 / ENV.TICK_RATE); // configurable TPS

    this.onMessage("move", (client, message: { x: number; y: number }) => {
      recordMessage(this.roomId, 'move');
      this.entityCommandMap.set(client.sessionId, { sessionId: client.sessionId, x: message.x, y: message.y });
      // const entity = this.world.where((e) => e.sessionId === client.sessionId).first;
      // if (entity) {
      //   // entity.velocity.x = message.x;
      //   // entity.velocity.y = message.y;
      //   this.world.update(entity, { velocity: { x: message.x, y: message.y } });
      // }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, 'joined!');

    const player = new Player();
    this.state.players.set(client.sessionId, player);

    let entity = this.world.add({
      sessionId: client.sessionId,
      player: player,
      position: { x: player.x, y: player.y },
      velocity: { x: 0, y: 0 },
    });

    this.entityByClient.set(client.sessionId, entity);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');

    this.state.players.delete(client.sessionId);

    const entity = this.world.where((e) => e.sessionId === client.sessionId).first;
    if (entity) {
      this.world.remove(entity);
      console.log('Removed entity for', client.sessionId);
    }
    this.entityByClient.delete(client.sessionId);
  }

  onDispose() {
    console.log('room', this.roomId, 'disposing...');
    unregisterRoom(this.roomId);
  }
}
