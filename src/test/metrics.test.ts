import { boot, ColyseusTestServer } from '@colyseus/testing';
import appConfig from '../app.config';
import { collectAllMetrics, toPrometheusText } from '../instrumentation/metrics';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await boot(appConfig);
});

afterAll(async () => {
  await colyseus.shutdown();
});

it('collectAllMetrics returns expected shape', async () => {
  const room = await colyseus.createRoom('my_room', {});
  await room.waitForNextPatch();
  const metrics = collectAllMetrics();
  expect(metrics.process).toBeDefined();
  expect(metrics.aggregate.roomCount).toBeGreaterThanOrEqual(1);
  expect(Array.isArray(metrics.rooms)).toBe(true);
  // There should be at least one room metrics entry
  const found = metrics.rooms.find((r: any) => r.roomId === room.roomId);
  expect(found).toBeDefined();
});

it('toPrometheusText contains key metrics', async () => {
  const text = toPrometheusText();
  expect(text).toContain('colyseus_room_count');
  expect(text).toContain('colyseus_event_loop_lag_ms');
});
