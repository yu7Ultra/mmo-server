import { Room, Client } from '@colyseus/core';
import { World } from 'miniplex';
import { MyRoomState, Player } from '../schemas/MyRoomState';
import { Entity } from '../entities';
import { movementSystem } from '../systems/movementSystem';
import { syncSystem } from '../systems/syncSystem';

export class MyRoom extends Room<MyRoomState> {
  private world = new World<Entity>();

  onCreate(options: any) {
    this.setState(new MyRoomState());

    this.setSimulationInterval((deltaTime: number) => {
      movementSystem(this.world);
      syncSystem(this.world);
    });

    this.onMessage("move", (client, message) => {
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
  }
}
