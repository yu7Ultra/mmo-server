import { Application, Graphics } from 'pixi.js';
import { Client } from 'colyseus.js';
import { MyRoomState } from './MyRoomState';

const client = new Client("ws://localhost:2567");

async function main() {
    const app = new Application();
    await app.init({
        resizeTo: window,
        backgroundColor: 0x000000
    });
    document.body.appendChild(app.canvas);

    const players = new Map<string, Graphics>();

    try {
        const room = await client.joinOrCreate<MyRoomState>("my_room");
        const currentPlayerId = room.sessionId;

        room.state.players.onAdd((player, sessionId) => {
            const isCurrentPlayer = sessionId === currentPlayerId;
            const color = isCurrentPlayer ? 0xff0000 : 0x00ff00;
            const graphics = new Graphics();
            graphics.fill(color);
            graphics.rect(-5, -5, 10, 10);

            app.stage.addChild(graphics);
            players.set(sessionId, graphics);

            player.onChange(() => {
                graphics.x = player.x;
                graphics.y = player.y;
            });
        });

        room.state.players.onRemove((_player, sessionId) => {
            const graphics = players.get(sessionId);
            if (graphics) {
                app.stage.removeChild(graphics);
                players.delete(sessionId);
            }
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
            }
        });

    } catch (e) {
        console.error("JOIN ERROR", e);
    }
}

main();