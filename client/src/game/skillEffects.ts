import { Container, Graphics, Sprite } from 'pixi.js';
import { PLAYER_FRAME_SIZE } from '../assets/playerSheet';
import type { PlayerVisual } from './players';

export function spawnFireballProjectile(world: Container, _caster: PlayerVisual, from: { x: number, y: number }, to: { x: number, y: number }, onHit: () => void) {
    const g = new Graphics();
    const radius = 6;
    g.circle(0, 0, radius).fill(0xff6600).stroke({ width: 2, color: 0xffffff });
    g.x = from.x; g.y = from.y; world.addChild(g);
    const dx = to.x - from.x; const dy = to.y - from.y; const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const speed = 360; const vx = dx / dist * speed; const vy = dy / dist * speed; const start = performance.now();
    function step() {
        const t = (performance.now() - start) / 1000; const traveled = t * speed;
        g.x = from.x + dx * (traveled / dist); g.y = from.y + dy * (traveled / dist);
        if (Math.random() < 0.4) {
            const puff = new Graphics();
            puff.circle(0, 0, 2 + Math.random() * 2).fill(0xffaa55).alpha = 0.8; puff.x = g.x; puff.y = g.y; world.addChild(puff);
            const puffStart = performance.now(); const puffLife = 250;
            const pf = () => { const dt = performance.now() - puffStart; puff.alpha = Math.max(0, 1 - dt / puffLife); puff.scale.set(1 + dt / puffLife * 0.8); if (dt < puffLife) requestAnimationFrame(pf); else world.removeChild(puff); }; pf();
        }
        if (traveled >= dist) { world.removeChild(g); onHit(); } else { requestAnimationFrame(step); }
    } requestAnimationFrame(step);
}

export function spawnExplosionParticles(world: Container, x: number, y: number, count: number, color: number) {
    for (let i = 0; i < count; i++) {
        const p = new Graphics(); p.circle(0, 0, 2 + Math.random() * 3).fill(color).alpha = 1; p.x = x; p.y = y; world.addChild(p);
        const angle = Math.random() * Math.PI * 2; const speed = 60 + Math.random() * 120; const vx = Math.cos(angle) * speed; const vy = Math.sin(angle) * speed; const life = 400 + Math.random() * 300; const start = performance.now();
        const anim = () => { const dt = performance.now() - start; const t = dt / 1000; p.x = x + vx * t * 0.05; p.y = y + vy * t * 0.05; p.alpha = Math.max(0, 1 - dt / life); if (dt < life) requestAnimationFrame(anim); else world.removeChild(p); }; anim();
    }
}

export function spawnCastCircle(world: Container, x: number, y: number, color: number, r = 22, duration = 300, startAlpha = 0.9) {
    const g = new Graphics(); g.circle(0, 0, r).stroke({ width: 2, color }).alpha = startAlpha; g.x = x; g.y = y; world.addChild(g);
    const start = performance.now(); const anim = () => { const dt = performance.now() - start; g.alpha = Math.max(0, startAlpha * (1 - dt / duration)); g.scale.set(1 + dt / duration * 0.3); if (dt < duration) requestAnimationFrame(anim); else world.removeChild(g); }; anim();
}

export function spawnHealEffect(world: Container, x: number, y: number) {
    spawnCastCircle(world, x, y, 0x33ff99, 26, 450, 0.95);
    const ring = new Graphics(); ring.circle(0, 0, 18).fill({ color: 0x33ff99, alpha: 0.15 }).stroke({ width: 3, color: 0x99ffd9 }).alpha = 0.9; ring.x = x; ring.y = y; world.addChild(ring);
    const start = performance.now(); const life = 500; const anim = () => { const dt = performance.now() - start; const t = dt / life; ring.scale.set(1 + t * 0.8); ring.alpha = Math.max(0, 0.9 * (1 - t)); if (dt < life) requestAnimationFrame(anim); else world.removeChild(ring); }; anim();
    for (let i = 0; i < 18; i++) { const p = new Graphics(); p.circle(0, 0, 2 + Math.random() * 2).fill(0x99ffe0).alpha = 1; p.x = x + (Math.random() * 2 - 1) * 14; p.y = y + (Math.random() * 2 - 1) * 10; world.addChild(p); const s = performance.now(); const plife = 600 + Math.random() * 300; const vy = - (20 + Math.random() * 25) / 1000; const animP = () => { const d = performance.now() - s; p.y += vy * (d < plife ? 16 : 0); p.alpha = Math.max(0, 1 - d / plife); if (d < plife) requestAnimationFrame(animP); else world.removeChild(p); }; animP(); }
}

export function spawnShieldEffect(caster: PlayerVisual, duration: number) {
    attachTimedAura(caster, 0x55b6ff, duration);
    const hex = new Graphics(); const r = (PLAYER_FRAME_SIZE * 1.5) / 2 + 10;
    hex.poly([0, -r, r * 0.86, -r * 0.5, r * 0.86, r * 0.5, 0, r, -r * 0.86, r * 0.5, -r * 0.86, -r * 0.5]).stroke({ width: 3, color: 0x55ccff }).alpha = 0.85; caster.container.addChild(hex);
    const start = performance.now(); const anim = () => { const dt = performance.now() - start; hex.rotation = dt / 1000; hex.alpha = 0.4 + 0.45 * Math.sin(dt / 250); if (dt < duration) requestAnimationFrame(anim); else caster.container.removeChild(hex); }; anim();
}

export function spawnDashEffect(caster: PlayerVisual, duration: number) {
    spawnExplosionParticles(caster.container.parent as Container, caster.container.x, caster.container.y, 8, 0xffffff); attachDashTrail(caster, duration);
    const streak = new Graphics(); streak.rect(-4, -2, 8, 4).fill(0xffffff).alpha = 0.9; caster.container.addChild(streak);
    const start = performance.now(); const life = 200; const anim = () => { const dt = performance.now() - start; streak.scale.x = 1 + dt / life * 4; streak.alpha = Math.max(0, 0.9 * (1 - dt / life)); if (dt < life) requestAnimationFrame(anim); else caster.container.removeChild(streak); }; anim();
}

export function spawnHitParticles(visual: PlayerVisual, count: number) {
    for (let i = 0; i < count; i++) { const g = new Graphics(); const r = 2 + Math.random() * 3; g.circle(0, 0, r).fill(0xff4422).alpha = 1; g.x = (Math.random() * 2 - 1) * 8; g.y = (Math.random() * 2 - 1) * 8; visual.effectsContainer.addChild(g); const life = 400 + Math.random() * 200; const vy = -0.02 - Math.random() * 0.05; const vx = (Math.random() * 2 - 1) * 0.05; const start = performance.now(); const animate = () => { const t = performance.now() - start; g.x += vx * 16; g.y += vy * 16; g.alpha = Math.max(0, 1 - t / life); if (t < life) requestAnimationFrame(animate); else visual.effectsContainer.removeChild(g); }; requestAnimationFrame(animate); }
}

export function spawnHealParticles(visual: PlayerVisual, count: number) {
    for (let i = 0; i < count; i++) { const g = new Graphics(); const r = 2 + Math.random() * 3; g.circle(0, 0, r).fill(0x22ff66).alpha = 1; g.x = (Math.random() * 2 - 1) * 8; g.y = (Math.random() * 2 - 1) * 8; visual.effectsContainer.addChild(g); const life = 450 + Math.random() * 250; const vy = -0.03 - Math.random() * 0.06; const vx = (Math.random() * 2 - 1) * 0.04; const start = performance.now(); const animate = () => { const t = performance.now() - start; g.x += vx * 16; g.y += vy * 16; g.alpha = Math.max(0, 1 - t / life); if (t < life) requestAnimationFrame(animate); else visual.effectsContainer.removeChild(g); }; requestAnimationFrame(animate); }
}

export function showFloatingText(visual: PlayerVisual, text: string, color: number) {
    const floatingText = new Sprite(); // replaced by simple Graphics? Keep Text? We'll keep Text in main for now.
    // Placeholder not used here to avoid Text import; main kept original implementation if needed.
}

function attachTimedAura(visual: PlayerVisual, color: number, duration: number) {
    const aura = new Graphics(); aura.circle(0, 0, (PLAYER_FRAME_SIZE * 1.5) / 2 + 6).stroke({ width: 3, color }).alpha = 0.85; aura.zIndex = -1; visual.container.addChild(aura);
    const start = performance.now(); const anim = () => { const dt = performance.now() - start; aura.alpha = 0.85 * (1 - dt / duration); aura.rotation += 0.02; if (dt < duration) requestAnimationFrame(anim); else visual.container.removeChild(aura); }; anim();
}

function attachDashTrail(visual: PlayerVisual, duration: number) {
    const start = performance.now(); const spawnTrail = () => { const dt = performance.now() - start; if (dt > duration) return; if (visual.sprite) { const trail = new Sprite(visual.sprite.texture); trail.anchor.copyFrom(visual.sprite.anchor); trail.position.copyFrom(visual.sprite.position); trail.scale.copyFrom(visual.sprite.scale); trail.tint = 0xffffff; trail.alpha = 0.5; visual.container.addChild(trail); const tStart = performance.now(); const life = 300; const fade = () => { const d = performance.now() - tStart; trail.alpha = Math.max(0, 0.5 * (1 - d / life)); trail.y -= 0.05 * d / 16; if (d < life) requestAnimationFrame(fade); else visual.container.removeChild(trail); }; fade(); } setTimeout(spawnTrail, 60); }; spawnTrail();
}
