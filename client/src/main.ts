import { Client, getStateCallbacks } from 'colyseus.js';
import { Application, Graphics } from 'pixi.js';
import { MyRoomState } from './states/MyRoomState';
import './style.css';

const client = new Client("ws://localhost:2567");

async function main() {
    // 等待 DOM 就绪（保证 #app 存在）
    await new Promise<void>(resolve => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => resolve());
        } else {
            resolve();
        }
    });

    const container = document.getElementById('app');
    if (!container) {
        console.error('#app 容器不存在!');
        return;
    }
    const app = new Application();
    await app.init({
        resizeTo: window,
        backgroundColor: 0x000000
    });
    container.appendChild(app.canvas);

    const players = new Map<string, Graphics>();
    const playersUnCallback = new Map<string, Function[]>();
    try {
        const room = await client.joinOrCreate<MyRoomState>("my_room");
        const currentPlayerId = room.sessionId;

        const $$ = getStateCallbacks(room);

        $$(room.state).players.onAdd((player, sessionId) => {
            const isCurrentPlayer = sessionId === currentPlayerId;
            const color = isCurrentPlayer ? 0xff0000 : 0x00ff00;
            const graphics = new Graphics();
            graphics.beginFill(color);
            graphics.drawRect(-5, -5, 10, 10);
            graphics.endFill();

            // 设置初始位置
            graphics.x = player.x;
            graphics.y = player.y;

            app.stage.addChild(graphics);
            players.set(sessionId, graphics);

            let unbindCallbackX = $$(player).listen("x", (newValue) => { graphics.x = newValue; });
            let unbindCallbackY = $$(player).listen("y", (newValue) => { graphics.y = newValue; });
            playersUnCallback.set(sessionId, [unbindCallbackX, unbindCallbackY]);

        })


        // 监听移除玩家
        $$(room.state).players.onRemove((_player, sessionId) => {
            const graphics = players.get(sessionId);
            if (graphics) {
                app.stage.removeChild(graphics);
                players.delete(sessionId);
            }
            playersUnCallback.get(sessionId)?.forEach(unbind => unbind());
        });

        window.addEventListener("keydown", (e) => {
            let x = 0;
            let y = 0;
            if (e.key === "ArrowLeft") x = -1;
            if (e.key === "ArrowRight") x = 1;
            if (e.key === "ArrowUp") y = -1;
            if (e.key === "ArrowDown") y = 1;

            if ((x !== 0 || y !== 0) && room) {
                room.send("move", { x, y });
                console.log("Sent move command", { x, y })
            }
        });

    } catch (e) {
        console.error("JOIN ERROR", e);
    }
}

main();