import { Client, getStateCallbacks } from 'colyseus.js';
const BOT_COUNT = Number(process.env.BOT_COUNT ?? '10');
const ID_OFFSET = Number(process.env.ID_OFFSET ?? '0');
const CHANGE_INTERVAL = Number(process.env.CHANGE_INTERVAL ?? '180'); // 提高默认间隔
const client = new Client(process.env.SERVER_ENDPOINT || "ws://localhost:2567");
async function main() {
    const bots = [];
    for (let i = 0; i < BOT_COUNT; i++) {
        const id = ID_OFFSET + i + 1;
        const bot = new Bot(new BotOptions(id, CHANGE_INTERVAL));
        bots.push(bot);
        bot.start();
    }
    process.on('SIGINT', () => {
        let totalSent = bots.reduce((acc, b) => acc + b.sent, 0);
        console.log(`\n[PROCESS ${process.pid}] EXIT bots=${BOT_COUNT} totalMoves=${totalSent}`);
        bots.forEach(b => b.stop());
        process.exit(0);
    });
}
class BotOptions {
    constructor(id, changeInterval = 180) {
        this.id = id;
        this.changeInterval = changeInterval;
    }
}
class Bot {
    constructor(opts) {
        this.opts = opts;
        this.playersUnCallback = new Map();
        this.timer = null;
        this.sent = 0;
    }
    async bootStrap() {
        const room = await client.joinOrCreate("my_room");
        this.room = room;
        const currentPlayerId = room.sessionId;
        const $$ = getStateCallbacks(room);
        $$(room.state).players.onAdd((player, sessionId) => {
            const unbindX = $$(player).listen("x", () => { });
            const unbindY = $$(player).listen("y", () => { });
            this.playersUnCallback.set(sessionId, [unbindX, unbindY]);
        });
        $$(room.state).players.onRemove((_player, sessionId) => {
            this.playersUnCallback.get(sessionId)?.forEach(fn => fn());
            this.playersUnCallback.delete(sessionId);
        });
    }
    start() {
        this.bootStrap().then(() => {
            // 随机初始延迟，平滑负载
            setTimeout(() => this.schedule(), Math.random() * 600);
        });
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
    }
    schedule() {
        this.timer = setInterval(() => {
            if (!this.room)
                return;
            const dirs = [-1, 0, 1];
            let x = dirs[Math.floor(Math.random() * dirs.length)];
            let y = dirs[Math.floor(Math.random() * dirs.length)];
            if (Math.random() < 0.4) { // 提高静止概率
                x = 0;
                y = 0;
            }
            this.room.send("move", { x, y });
            this.sent++;
            if (this.sent % 100 === 0) {
                console.log(`[BOT ${this.opts.id}] movesSent=${this.sent}`);
            }
            if (typeof process.send === 'function' && this.sent % 200 === 0) {
                process.send({ type: 'STAT', moves: this.sent });
            }
        }, this.opts.changeInterval);
    }
}
main();
