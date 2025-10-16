import { Container } from 'pixi.js';
import { Room } from 'colyseus.js';
import { MyRoomState } from '../states/MyRoomState';
import { Player } from '../states/Player';
import type { PlayerVisual } from './players';

const MONSTER_SHAPE: Record<string, 'circle' | 'triangle' | 'diamond' | 'square'> = {
    slime: 'circle',
    bat: 'triangle',
    goblin: 'diamond',
    wolf: 'triangle',
    skeleton: 'square'
};

const MONSTER_COLOR: Record<string, string> = {
    slime: '#34d399',
    bat: '#c084fc',
    goblin: '#a3e635',
    wolf: '#94a3b8',
    skeleton: '#f8fafc'
};

function drawMonsterIcon(ctx: CanvasRenderingContext2D, x: number, y: number, type: string) {
    const shape = MONSTER_SHAPE[type] ?? 'square';
    const color = MONSTER_COLOR[type] ?? '#f87171';
    const size = 4;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = 1;
    switch (shape) {
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.lineTo(x - size, y + size);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'square':
            ctx.beginPath();
            ctx.rect(x - size, y - size, size * 2, size * 2);
            ctx.fill();
            ctx.stroke();
            break;
        default:
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
    }
}

export function renderMinimap(room: Room<MyRoomState>, players: Map<string, PlayerVisual>, currentId: string, world: Container, viewW: number, viewH: number) {
    const canvas = document.getElementById('minimap') as HTMLCanvasElement | null;
    if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
    const worldW = room.state.worldWidth || 2000; const worldH = room.state.worldHeight || 2000;
    const scaleX = w / worldW; const scaleY = h / worldH; const scale = Math.min(scaleX, scaleY); const offsetX = (w - worldW * scale) / 2; const offsetY = (h - worldH * scale) / 2;
    ctx.fillStyle = 'rgba(20,20,20,0.6)'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#666'; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    const me: Player | undefined = room.state.players.get(currentId) as any;
    if (me) {
        const pv = players.get(currentId); const dir = pv?.anim.direction || 'down'; let angle = 0; switch (dir) { case 'up': angle = -Math.PI / 2; break; case 'down': angle = Math.PI / 2; break; case 'left': angle = Math.PI; break; case 'right': angle = 0; break; }
        const coneRange = 250; const coneHalfAngle = Math.PI / 6; const px = offsetX + me.x * scale; const py = offsetY + me.y * scale; ctx.beginPath(); ctx.moveTo(px, py); ctx.fillStyle = 'rgba(0,255,120,0.15)'; const steps = 12; for (let i = 0; i <= steps; i++) { const a = angle - coneHalfAngle + (i / steps) * (coneHalfAngle * 2); const sx = px + Math.cos(a) * coneRange * scale; const sy = py + Math.sin(a) * coneRange * scale; ctx.lineTo(sx, sy); } ctx.closePath(); ctx.fill();
    }
    room.state.monsters.forEach(monster => {
        const mx = offsetX + monster.x * scale;
        const my = offsetY + monster.y * scale;
        drawMonsterIcon(ctx, mx, my, monster.type);
    });
    players.forEach((visual, id) => { const p = room.state.players.get(id); if (!p) return; const mx = offsetX + p.x * scale; const my = offsetY + p.y * scale; ctx.fillStyle = id === currentId ? '#0f8' : '#f55'; ctx.beginPath(); ctx.arc(mx, my, id === currentId ? 4 : 3, 0, Math.PI * 2); ctx.fill(); });
    const viewX = -world.x; const viewY = -world.y; const mvx = offsetX + viewX * scale; const mvy = offsetY + viewY * scale; const mvw = viewW * scale; const mvh = viewH * scale; ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 1; ctx.strokeRect(mvx + 0.5, mvy + 0.5, mvw, mvh);
}
