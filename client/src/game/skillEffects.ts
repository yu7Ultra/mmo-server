import { Container, Graphics, Sprite } from 'pixi.js';
import { PLAYER_FRAME_SIZE } from '../assets/playerSheet';
import type { PlayerVisual } from './players';
import { scheduleParticle } from './particles';

type Display = Graphics | Sprite;

function removeDisplay(display: Display) {
    display.parent?.removeChild(display);
}

function animateDisplay(display: Display, durationMs: number, update: (elapsedMs: number, deltaMs: number, progress: number) => void, onComplete?: () => void) {
    scheduleParticle((elapsed, delta) => {
        const clamped = Math.min(elapsed, durationMs);
        const progress = durationMs > 0 ? clamped / durationMs : 1;
        update(clamped, delta, progress);
        if (elapsed >= durationMs) {
            removeDisplay(display);
            onComplete?.();
            return true;
        }
        return false;
    });
}

export function spawnFireballProjectile(world: Container, _caster: PlayerVisual, from: { x: number, y: number }, to: { x: number, y: number }, onHit: () => void) {
    const g = new Graphics();
    const radius = 6;
    g.circle(0, 0, radius).fill(0xff6600).stroke({ width: 2, color: 0xffffff });
    g.position.set(from.x, from.y);
    world.addChild(g);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const speed = 360; // pixels per second
    const travelTimeMs = (dist / speed) * 1000;
    let puffCooldown = 0;

    const spawnPuff = (px: number, py: number) => {
        const puff = new Graphics();
        puff.circle(0, 0, 2 + Math.random() * 2).fill(0xffaa55).alpha = 0.8;
        puff.position.set(px, py);
        world.addChild(puff);
        const life = 250;
        animateDisplay(puff, life, (elapsed, _delta, progress) => {
            puff.alpha = Math.max(0, 1 - progress);
            puff.scale.set(1 + progress * 0.8);
        });
    };

    scheduleParticle((elapsed, delta) => {
        const progress = Math.min(1, elapsed / travelTimeMs);
        g.position.set(from.x + dx * progress, from.y + dy * progress);

        puffCooldown += delta;
        if (puffCooldown > 40 && Math.random() < 0.4) {
            puffCooldown = 0;
            spawnPuff(g.x, g.y);
        }

        if (elapsed >= travelTimeMs) {
            removeDisplay(g);
            onHit();
            return true;
        }
        return false;
    });
}

export function spawnExplosionParticles(world: Container, x: number, y: number, count: number, color: number) {
    for (let i = 0; i < count; i++) {
        const particle = new Graphics();
        particle.circle(0, 0, 2 + Math.random() * 3).fill(color).alpha = 1;
        particle.position.set(x, y);
        world.addChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 120;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const life = 400 + Math.random() * 300;

        animateDisplay(particle, life, (elapsed, delta, progress) => {
            const seconds = elapsed / 1000;
            particle.x = x + vx * seconds * 0.05;
            particle.y = y + vy * seconds * 0.05;
            particle.alpha = Math.max(0, 1 - progress);
        });
    }
}

export function spawnCastCircle(world: Container, x: number, y: number, color: number, r = 22, duration = 300, startAlpha = 0.9) {
    const circle = new Graphics();
    circle.circle(0, 0, r).stroke({ width: 2, color }).alpha = startAlpha;
    circle.position.set(x, y);
    world.addChild(circle);

    animateDisplay(circle, duration, (elapsed, _delta, progress) => {
        circle.alpha = Math.max(0, startAlpha * (1 - progress));
        circle.scale.set(1 + progress * 0.3);
    });
}

export function spawnHealEffect(world: Container, x: number, y: number) {
    spawnCastCircle(world, x, y, 0x33ff99, 26, 450, 0.95);

    const ring = new Graphics();
    ring.circle(0, 0, 18).fill({ color: 0x33ff99, alpha: 0.15 }).stroke({ width: 3, color: 0x99ffd9 }).alpha = 0.9;
    ring.position.set(x, y);
    world.addChild(ring);

    const ringLife = 500;
    animateDisplay(ring, ringLife, (elapsed, _delta, progress) => {
        ring.scale.set(1 + progress * 0.8);
        ring.alpha = Math.max(0, 0.9 * (1 - progress));
    });

    for (let i = 0; i < 18; i++) {
        const spark = new Graphics();
        spark.circle(0, 0, 2 + Math.random() * 2).fill(0x99ffe0).alpha = 1;
        spark.x = x + (Math.random() * 2 - 1) * 14;
        spark.y = y + (Math.random() * 2 - 1) * 10;
        world.addChild(spark);

        const life = 600 + Math.random() * 300;
        const riseSpeed = 20 + Math.random() * 25; // pixels per second
        animateDisplay(spark, life, (elapsed, delta) => {
            spark.y -= (riseSpeed / 1000) * delta;
            spark.alpha = Math.max(0, 1 - elapsed / life);
        });
    }
}

export function spawnShieldEffect(caster: PlayerVisual, duration: number) {
    attachTimedAura(caster, 0x55b6ff, duration);

    const hex = new Graphics();
    const r = (PLAYER_FRAME_SIZE * 1.5) / 2 + 10;
    hex
        .poly([0, -r, r * 0.86, -r * 0.5, r * 0.86, r * 0.5, 0, r, -r * 0.86, r * 0.5, -r * 0.86, -r * 0.5])
        .stroke({ width: 3, color: 0x55ccff })
        .alpha = 0.85;
    caster.container.addChild(hex);

    animateDisplay(hex, duration, (elapsed) => {
        hex.rotation = (elapsed / 1000);
        hex.alpha = 0.4 + 0.45 * Math.sin(elapsed / 250);
    }, () => {
        removeDisplay(hex);
    });
}

export function spawnDashEffect(caster: PlayerVisual, duration: number) {
    const parent = caster.container.parent as Container | null;
    if (parent) {
        spawnExplosionParticles(parent, caster.container.x, caster.container.y, 8, 0xffffff);
    }
    attachDashTrail(caster, duration);

    const streak = new Graphics();
    streak.rect(-4, -2, 8, 4).fill(0xffffff).alpha = 0.9;
    caster.container.addChild(streak);

    const life = 200;
    animateDisplay(streak, life, (elapsed, _delta, progress) => {
        streak.scale.x = 1 + progress * 4;
        streak.alpha = Math.max(0, 0.9 * (1 - progress));
    }, () => {
        removeDisplay(streak);
    });
}

export function spawnHitParticles(visual: PlayerVisual, count: number) {
    for (let i = 0; i < count; i++) {
        const particle = new Graphics();
        const radius = 2 + Math.random() * 3;
        particle.circle(0, 0, radius).fill(0xff4422).alpha = 1;
        particle.x = (Math.random() * 2 - 1) * 8;
        particle.y = (Math.random() * 2 - 1) * 8;
        visual.effectsContainer.addChild(particle);

        const life = 400 + Math.random() * 200;
        const vx = (Math.random() * 2 - 1) * 0.05; // pixels per ms
        const vy = -0.02 - Math.random() * 0.05;

        animateDisplay(particle, life, (elapsed, delta) => {
            particle.x += vx * delta;
            particle.y += vy * delta;
            particle.alpha = Math.max(0, 1 - elapsed / life);
        }, () => {
            removeDisplay(particle);
        });
    }
}

export function spawnHealParticles(visual: PlayerVisual, count: number) {
    for (let i = 0; i < count; i++) {
        const particle = new Graphics();
        const radius = 2 + Math.random() * 3;
        particle.circle(0, 0, radius).fill(0x22ff66).alpha = 1;
        particle.x = (Math.random() * 2 - 1) * 8;
        particle.y = (Math.random() * 2 - 1) * 8;
        visual.effectsContainer.addChild(particle);

        const life = 450 + Math.random() * 250;
        const vx = (Math.random() * 2 - 1) * 0.04;
        const vy = -0.03 - Math.random() * 0.06;

        animateDisplay(particle, life, (elapsed, delta) => {
            particle.x += vx * delta;
            particle.y += vy * delta;
            particle.alpha = Math.max(0, 1 - elapsed / life);
        }, () => {
            removeDisplay(particle);
        });
    }
}

export function showFloatingText(_visual: PlayerVisual, _text: string, _color: number) {
    // Intentionally left blank – floating combat text handled in main.ts for now.
}

function attachTimedAura(visual: PlayerVisual, color: number, duration: number) {
    const aura = new Graphics();
    aura.circle(0, 0, (PLAYER_FRAME_SIZE * 1.5) / 2 + 6).stroke({ width: 3, color }).alpha = 0.85;
    aura.zIndex = -1;
    visual.container.addChild(aura);

    animateDisplay(aura, duration, (elapsed, delta) => {
        aura.alpha = 0.85 * (1 - elapsed / duration);
        const rotationSpeedPerMs = 0.02 / 16;
        aura.rotation += rotationSpeedPerMs * delta;
    }, () => {
        removeDisplay(aura);
    });
}

function attachDashTrail(visual: PlayerVisual, duration: number) {
    let spawnAccumulator = 0;
    const interval = 60; // ms between trail copies

    scheduleParticle((elapsed, delta) => {
        if (elapsed >= duration) {
            return true;
        }

        spawnAccumulator += delta;
        if (spawnAccumulator >= interval && visual.sprite) {
            spawnAccumulator -= interval;
            const trail = new Sprite(visual.sprite.texture);
            trail.anchor.copyFrom(visual.sprite.anchor);
            trail.position.copyFrom(visual.sprite.position);
            trail.scale.copyFrom(visual.sprite.scale);
            trail.tint = 0xffffff;
            trail.alpha = 0.5;
            visual.container.addChild(trail);

            const life = 300;
            animateDisplay(trail, life, (_elapsed, deltaStep, progress) => {
                trail.alpha = Math.max(0, 0.5 * (1 - progress));
                trail.y -= 0.05 * deltaStep;
            }, () => {
                removeDisplay(trail);
            });
        }

        return false;
    });
}
