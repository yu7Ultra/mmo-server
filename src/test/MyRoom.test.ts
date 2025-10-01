import { ColyseusTestServer, boot } from "@colyseus/testing";
import appConfig from "../app.config";
 
describe("testing your Colyseus app", () => {
  let colyseus: ColyseusTestServer;
 
  beforeAll(async () => colyseus = await boot(appConfig));
  afterAll(async () => await colyseus.shutdown());
 
  beforeEach(async () => await colyseus.cleanup());
 
  it("connecting into a room", async() => {
    const room = await colyseus.createRoom("my_room", {});
    const client1 = await colyseus.connectTo(room);
    expect(client1.sessionId).toEqual(room.clients[0].sessionId);
  });

  it("should receive message", async() => {
    const room = await colyseus.createRoom("my_room", {});
    const client1 = await colyseus.connectTo(room);
 
    client1.send("move", { x: 1, y: 1 });
 
    const [ client, message ] = await room.waitForMessage("move");
 
    expect(client.sessionId).toEqual(client1.sessionId);
    expect(message).toEqual({ x: 1, y: 1 });
  });

  it("client state must match server's after patch is received", async() => {
    const room = await colyseus.createRoom("my_room", {});
    const client1 = await colyseus.connectTo(room);
 
    await room.waitForNextPatch();

    expect(client1.state.players.get(client1.sessionId).x).toBeCloseTo(room.state.players.get(client1.sessionId).x);
    expect(client1.state.players.get(client1.sessionId).y).toBeCloseTo(room.state.players.get(client1.sessionId).y);
  });

  it("should change velocity on 'move' message", async () => {
    const room = await colyseus.createRoom("my_room", {});
    const client = await colyseus.connectTo(room);

    // Wait for the player to be added to the state
    await room.waitForNextPatch();

    const initialX = client.state.players.get(client.sessionId).x;

    client.send("move", { x: 1, y: 0 });

    // Wait for the server to process the move and send a patch
    await room.waitForNextPatch();

    expect(client.state.players.get(client.sessionId).x).not.toBeCloseTo(initialX);
  });
});
