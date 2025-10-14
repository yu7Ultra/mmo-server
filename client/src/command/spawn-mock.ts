import { fork } from 'node:child_process';
import path from 'node:path';

interface LaunchOptions {
    processes: number;
    countPerProcess: number;
    interval: number;
    endpoint: string;
    restart: boolean;
}

function parseArgs(): LaunchOptions {
    const args = process.argv.slice(2);
    const get = (flags: string[], def?: string) => {
        const idx = args.findIndex(a => flags.includes(a));
        if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
        return def;
    };
    return {
        processes: Number(get(['-p','--processes'], '2')),
        countPerProcess: Number(get(['-c','--count'], '20')),
        interval: Number(get(['-i','--interval'], '150')),
        endpoint: get(['--endpoint'], 'ws://localhost:2567')!,
        restart: args.includes('--restart'),
    };
}

type WorkerStatMessage = {
    type: 'STAT';
    moves?: number;
    [k: string]: unknown;
};

function isStatMessage(msg: unknown): msg is WorkerStatMessage {
    return typeof msg === 'object' && msg !== null && (msg as any).type === 'STAT';
}

const opts = parseArgs();
console.log(`[LAUNCHER] processes=${opts.processes}, botsPerProc=${opts.countPerProcess}, interval=${opts.interval}ms, endpoint=${opts.endpoint}`);

const scriptPath = path.resolve('dist-mock/command/mockClient.js');
const children: Map<number, ReturnType<typeof fork>> = new Map();

function launch(index: number) {
    const idOffset = index * opts.countPerProcess;
    const childEnv = {
        ...process.env,
        BOT_COUNT: String(opts.countPerProcess),
        ID_OFFSET: String(idOffset),
        CHANGE_INTERVAL: String(opts.interval),
        SERVER_ENDPOINT: opts.endpoint
    };

    const child = fork(scriptPath, [], {
        env: childEnv,
        stdio: ['inherit','inherit','inherit','ipc']
    });

    children.set(child.pid!, child);

    child.on('message', (msg: unknown) => {
        if (isStatMessage(msg)) {
            // 这里可以做统计聚合
            console.log(`[WORKER ${child.pid}] moves=${msg.moves}`);
        }
    });

    child.on('exit', (code, signal) => {
        console.log(`[WORKER EXIT] pid=${child.pid} code=${code} signal=${signal}`);
        children.delete(child.pid!);
        if (opts.restart) {
            console.log(`[WORKER RESTART] pid=${child.pid} -> relaunch`);
            launch(index);
        }
    });
}

for (let i = 0; i < opts.processes; i++) {
    launch(i);
}

process.on('SIGINT', () => {
    console.log('\n[LAUNCHER] SIGINT received, shutting down workers...');
    for (const child of children.values()) {
        child.kill('SIGINT');
    }
    setTimeout(() => process.exit(0), 300);
});