import fs from 'fs';
import path from 'path';
import inspector from 'inspector';

const session = new inspector.Session();
session.connect();

export async function captureCPUProfile(durationMs: number = 10000): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    session.post('Profiler.enable', (err) => {
      if (err) return reject(err);
      session.post('Profiler.start', (err2) => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });

  await new Promise((r) => setTimeout(r, durationMs));

  const profile = await new Promise<any>((resolve, reject) => {
    session.post('Profiler.stop', (err, { profile }) => {
      if (err) return reject(err);
      resolve(profile);
    });
  });

  const fileName = `cpu-${Date.now()}-${durationMs}.cpuprofile`;
  const filePath = path.join(process.cwd(), 'profiles', fileName);
  fs.writeFileSync(filePath, JSON.stringify(profile));
  return filePath;
}

export async function captureHeapSnapshot(): Promise<string> {
  const fileName = `heap-${Date.now()}.heapsnapshot`;
  const filePath = path.join(process.cwd(), 'profiles', fileName);
  const writeStream = fs.createWriteStream(filePath);

  return await new Promise<string>((resolve, reject) => {
    session.post('HeapProfiler.enable', (err) => {
      if (err) return reject(err);
      session.post('HeapProfiler.takeHeapSnapshot', (err2) => {
        if (err2) return reject(err2);
      });
    });

    session.on('HeapProfiler.addHeapSnapshotChunk', (m) => {
      writeStream.write(m.params.chunk);
    });
    session.once('HeapProfiler.reportHeapSnapshotProgress', (m) => {
      // ignore progress events
    });
    session.once('HeapProfiler.heapStatsUpdate', () => {
      // ignore stats
    });
    session.once('HeapProfiler.takeHeapSnapshot', () => {
      writeStream.end();
      resolve(filePath);
    });
  });
}

export function listProfiles() {
  const dir = path.join(process.cwd(), 'profiles');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.cpuprofile') || f.endsWith('.heapsnapshot'));
}
