let shakeTimeMs = 0;
let shakeDurationMs = 0;
let shakeIntensity = 0; // base intensity in pixels

export function triggerScreenShake(durationMs: number, intensity: number) {
    shakeTimeMs = durationMs;
    shakeDurationMs = durationMs;
    shakeIntensity = Math.max(shakeIntensity, intensity); // take stronger
}

export function applyScreenShake(world: import('pixi.js').Container, dtMs: number) {
    if (shakeTimeMs <= 0) return;
    shakeTimeMs -= dtMs;
    const t = Math.max(0, shakeTimeMs) / shakeDurationMs;
    const intensity = shakeIntensity * (t * t); // ease out (quadratic)
    world.x += (Math.random() * 2 - 1) * intensity;
    world.y += (Math.random() * 2 - 1) * intensity;
    if (shakeTimeMs <= 0) {
        shakeIntensity = 0;
    }
}
