import { Client, getStateCallbacks, Room } from 'colyseus.js';
import { Application, Graphics, Text, Container, Sprite, Texture, Assets, Rectangle } from 'pixi.js';
import { PLAYER_FRAME_SIZE, PLAYER_FRAMES_PER_DIR, getFrameRect, Direction, getFrameTexture } from './assets/playerSheet';
import { MyRoomState } from './states/MyRoomState';
import { Player } from './states/Player';
import './style.css';

const client = new Client("ws://localhost:2567");

// Voice chat state
let localStream: MediaStream | null = null;
const voicePeerConnections = new Map<string, RTCPeerConnection>();
let isVoiceMuted = false;
let isVoiceDeafened = false;

// WebRTC configuration
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Player visual representation
interface PlayerVisual {
    container: Container;
    graphics: Graphics; // flash overlay / fallback
    sprite?: Sprite;
    nameText: Text;
    healthBar: Graphics;
    manaBar: Graphics;
    effectsContainer: Container;
    uiContainer: Container;
    anim: {
        direction: Direction;
        frame: number;
        elapsed: number;
        speed: number; // ms per frame
        lastX: number;
        lastY: number;
    };
    smooth: {
        health: number; // current smoothed health
        mana: number;   // current smoothed mana
        targetHealth: number;
        targetMana: number;
        maxHealth: number;
        maxMana: number;
    };
    movement: {
        x: number; // displayed x
        y: number; // displayed y
        targetX: number;
        targetY: number;
    };
}

// Screen shake state
let shakeTimeMs = 0;
let shakeDurationMs = 0;
let shakeIntensity = 0; // base intensity in pixels

function triggerScreenShake(durationMs: number, intensity: number) {
    shakeTimeMs = durationMs;
    shakeDurationMs = durationMs;
    shakeIntensity = Math.max(shakeIntensity, intensity); // take stronger
}

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

    // Create UI panels & loading overlay
    createUI(container);
    setLoading(true, '加载资源...');

    const app = new Application();
    await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x101014,
        antialias: false
    });
    const gameCanvas = document.getElementById('game-canvas');
    if (gameCanvas) {
        gameCanvas.appendChild(app.canvas);
    }

    // Resize so canvas uses remaining space (window width - UI overlay width)
    const resizeRenderer = () => {
        const ui = document.getElementById('ui-overlay');
        const sideWidth = ui ? ui.offsetWidth : 320; // fallback expected width
        const w = Math.max(200, window.innerWidth - sideWidth);
        const h = window.innerHeight;
        app.renderer.resize(w, h);
    };
    resizeRenderer();
    window.addEventListener('resize', resizeRenderer);

    // World container (camera target)
    const world = new Container();
    app.stage.addChild(world);

    // Camera state
    let cameraLocked = true; // follow player when true
    let freeCamTarget = { x: 0, y: 0 }; // world coords center when unlocked
    const cameraStatusEl = document.createElement('div');
    cameraStatusEl.id = 'camera-status';
    cameraStatusEl.style.position = 'absolute';
    cameraStatusEl.style.top = '180px';
    cameraStatusEl.style.left = '12px';
    cameraStatusEl.style.padding = '4px 8px';
    cameraStatusEl.style.background = 'rgba(0,0,0,0.45)';
    cameraStatusEl.style.fontSize = '11px';
    cameraStatusEl.style.border = '1px solid #333';
    cameraStatusEl.style.borderRadius = '4px';
    cameraStatusEl.style.pointerEvents = 'none';
    cameraStatusEl.textContent = '摄像机: 锁定 (Space 切换)';
    document.body.appendChild(cameraStatusEl);

    const players = new Map<string, PlayerVisual>();
    const playersUnCallback = new Map<string, Function[]>();

    // Generate procedural sheet (instant); hide loading
    setLoading(false);
    
    try {
        const room = await client.joinOrCreate<MyRoomState>("my_room", { name: "Player" + Math.floor(Math.random() * 1000) });
        const currentPlayerId = room.sessionId;

        const $$ = getStateCallbacks(room);

        // Setup UI handlers
        setupUIHandlers(room, currentPlayerId);
        
        // Setup voice communication
        setupVoiceChat(room, currentPlayerId);

        $$(room.state).players.onAdd((player, sessionId) => {
            const isCurrentPlayer = sessionId === currentPlayerId;
            const playerVisual = createPlayerVisual(player, isCurrentPlayer);

            world.addChild(playerVisual.container);
            players.set(sessionId, playerVisual);

            // Track previous health for damage/heal numbers
            let previousHealth = player.health;
            
            // Setup change listeners
            const callbacks = [
                $$(player).listen("x", (newValue) => { playerVisual.movement.targetX = newValue; }),
                $$(player).listen("y", (newValue) => { playerVisual.movement.targetY = newValue; }),
                $$(player).listen("health", (newValue) => {
                    const healthDiff = newValue - previousHealth;
                    playerVisual.smooth.targetHealth = newValue;
                    if (healthDiff < 0) {
                        showFloatingText(playerVisual, Math.abs(Math.round(healthDiff)).toString(), 0xff2222);
                        flashPlayer(playerVisual, 0xff0000);
                        if (sessionId === currentPlayerId) {
                            // shake stronger with proportion of max health lost (capped)
                            const lossPct = Math.min(1, Math.abs(healthDiff) / player.maxHealth);
                            triggerScreenShake(300, 6 + 24 * lossPct);
                            spawnHitParticles(playerVisual, Math.min(12, 3 + Math.round(lossPct * 12)));
                        } else {
                            spawnHitParticles(playerVisual, 4);
                        }
                    } else if (healthDiff > 0) {
                        showFloatingText(playerVisual, '+' + Math.round(healthDiff), 0x00ff66);
                        flashPlayer(playerVisual, 0x00ff00);
                        spawnHealParticles(playerVisual, Math.min(10, 3 + Math.round(healthDiff / player.maxHealth * 10)));
                    }
                    previousHealth = newValue;
                }),
                $$(player).listen("maxHealth", (newValue) => { playerVisual.smooth.maxHealth = newValue; }),
                $$(player).listen("mana", (newValue) => { playerVisual.smooth.targetMana = newValue; }),
                $$(player).listen("maxMana", (newValue) => { playerVisual.smooth.maxMana = newValue; }),
                $$(player).listen("name", (newValue) => { playerVisual.nameText.text = newValue; })
            ];
            
            playersUnCallback.set(sessionId, callbacks);

            // Update current player UI
            if (isCurrentPlayer) {
                updatePlayerUI(player);
                $$(player).onChange(() => updatePlayerUI(player));
            }
        });

        // 监听移除玩家
        $$(room.state).players.onRemove((_player, sessionId) => {
            const playerVisual = players.get(sessionId);
            if (playerVisual) {
                world.removeChild(playerVisual.container);
                players.delete(sessionId);
            }
            playersUnCallback.get(sessionId)?.forEach(unbind => unbind());
        });

        // Chat messages
        $$(room.state).chatMessages.onAdd((msg) => {
            addChatMessage(msg.sender, msg.message, msg.channel);
        });

        // Listen to server broadcasted skill casts for visuals
        room.onMessage('skill_cast', (data: any) => {
            const { casterId, skillId, from, to, targetId } = data;
            const casterVisual = players.get(casterId);
            if (!casterVisual) return;
            switch (skillId) {
                case 'fireball':
                    spawnFireballProjectile(world, casterVisual, from, to, () => {
                        // impact effect
                        spawnExplosionParticles(world, to.x, to.y, 14, 0xff9933);
                    });
                    // cast indicator
                    spawnCastCircle(world, from.x, from.y, 0xff6600);
                    break;
                case 'heal':
                    spawnCastCircle(world, from.x, from.y, 0x22ff88, 24, 350);
                    break;
                case 'shield':
                    attachTimedAura(casterVisual, 0x44aaff, 5000);
                    spawnCastCircle(world, from.x, from.y, 0x3399ff, 26, 400);
                    break;
                case 'dash':
                    // Dash trail start marker
                    attachDashTrail(casterVisual, 1500);
                    spawnCastCircle(world, from.x, from.y, 0xffffff, 18, 200, 0.6);
                    break;
            }
        });

        // Leaderboard updates
        $$(room.state).leaderboard.onChange(() => {
            updateLeaderboard(room.state.leaderboard);
        });

        // Periodic UI updates for cooldowns
        setInterval(() => {
            const myPlayer = room.state.players.get(currentPlayerId);
            if (myPlayer) {
                updateSkillsUI(myPlayer); // still fills side panel list
                updateHotbar(myPlayer);
            }
        }, 100); // Update every 100ms for smooth cooldown display

        // Space toggles camera lock
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                cameraLocked = !cameraLocked;
                if (cameraLocked) {
                    cameraStatusEl.textContent = '摄像机: 锁定 (Space 切换)';
                } else {
                    // Initialize free cam target at current world center (player)
                    const myVis = players.get(currentPlayerId);
                    if (myVis) {
                        freeCamTarget.x = myVis.container.x;
                        freeCamTarget.y = myVis.container.y;
                    }
                    cameraStatusEl.textContent = '摄像机: 自由 (Space 切换)';
                }
            }
        });

        // Minimap click to pan in free mode
        const minimap = document.getElementById('minimap') as HTMLCanvasElement | null;
        if (minimap) {
            minimap.style.cursor = 'pointer';
            minimap.addEventListener('click', (ev) => {
                if (cameraLocked) return;
                const rect = minimap.getBoundingClientRect();
                const localX = ev.clientX - rect.left;
                const localY = ev.clientY - rect.top;
                const worldW = room.state.worldWidth || 2000;
                const worldH = room.state.worldHeight || 2000;
                const scaleX = minimap.width / worldW;
                const scaleY = minimap.height / worldH;
                const scale = Math.min(scaleX, scaleY);
                const offsetX = (minimap.width - worldW * scale)/2;
                const offsetY = (minimap.height - worldH * scale)/2;
                // Convert minimap click -> world coords
                const wx = (localX - offsetX) / scale;
                const wy = (localY - offsetY) / scale;
                freeCamTarget.x = Math.min(worldW, Math.max(0, wx));
                freeCamTarget.y = Math.min(worldH, Math.max(0, wy));
            });
        }

        // Movement controls
        const movement = { x: 0, y: 0 };
        window.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") movement.x = -1;
            if (e.key === "ArrowRight") movement.x = 1;
            if (e.key === "ArrowUp") movement.y = -1;
            if (e.key === "ArrowDown") movement.y = 1;

            if ((movement.x !== 0 || movement.y !== 0) && room) {
                room.send("move", movement);
            }
        });

        window.addEventListener("keyup", (e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") movement.x = 0;
            if (e.key === "ArrowUp" || e.key === "ArrowDown") movement.y = 0;
            
            if (movement.x === 0 && movement.y === 0) {
                room.send("move", { x: 0, y: 0 });
            }
        });

        // Click to attack
        app.canvas.addEventListener('click', (e) => {
            const rect = app.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Find clicked player
            for (const [sessionId, playerVisual] of players.entries()) {
                if (sessionId === currentPlayerId) continue;
                
                const dx = playerVisual.container.x - x;
                const dy = playerVisual.container.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 20) {
                    room.send("attack", { targetId: sessionId });
                    console.log("Attacking player:", sessionId);
                    break;
                }
            }
        });

        // Animation ticker: update sprite frame & camera
        app.ticker.add((ticker) => {
            const dtMs = ticker.deltaMS;
            const myVisual = players.get(currentPlayerId);

            // Update smoothing & bars
            players.forEach((visual) => {
                // Health smoothing
                const hTarget = visual.smooth.targetHealth;
                const mTarget = visual.smooth.targetMana;
                // exponential smoothing based on frame time
                const lerpFactor = 1 - Math.pow(0.001, dtMs / 16.6667); // ~fast catch-up but smooth
                visual.smooth.health += (hTarget - visual.smooth.health) * lerpFactor;
                visual.smooth.mana += (mTarget - visual.smooth.mana) * lerpFactor;
                // Redraw bars (cheap for low entity counts)
                updateHealthBar(visual);
                updateManaBar(visual);
                // Movement smoothing
                visual.movement.x += (visual.movement.targetX - visual.movement.x) * 0.35;
                visual.movement.y += (visual.movement.targetY - visual.movement.y) * 0.35;
                visual.container.x = visual.movement.x;
                visual.container.y = visual.movement.y;
            });

            // Camera update
            if (cameraLocked && myVisual) {
                const targetX = -myVisual.container.x + app.renderer.width / 2;
                const targetY = -myVisual.container.y + app.renderer.height / 2;
                world.x += (targetX - world.x) * 0.12;
                world.y += (targetY - world.y) * 0.12;
            } else if (!cameraLocked) {
                // Smooth pan toward freeCamTarget
                const targetX = -freeCamTarget.x + app.renderer.width / 2;
                const targetY = -freeCamTarget.y + app.renderer.height / 2;
                world.x += (targetX - world.x) * 0.08;
                world.y += (targetY - world.y) * 0.08;
            }

            // Screen shake
            if (shakeTimeMs > 0) {
                shakeTimeMs -= dtMs;
                const t = Math.max(0, shakeTimeMs) / shakeDurationMs;
                const intensity = shakeIntensity * (t * t); // ease out (quadratic)
                world.x += (Math.random() * 2 - 1) * intensity;
                world.y += (Math.random() * 2 - 1) * intensity;
                if (shakeTimeMs <= 0) {
                    shakeIntensity = 0;
                }
            }

            // Update animations (after camera movement so shake doesn't affect detection)
            players.forEach((visual, sessionId) => {
                const p = room.state.players.get(sessionId);
                if (!p || !visual.sprite) return;
                const dx = p.x - visual.anim.lastX;
                const dy = p.y - visual.anim.lastY;
                visual.anim.lastX = p.x;
                visual.anim.lastY = p.y;
                const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
                if (!moving) {
                    visual.anim.frame = 0;
                    updateSpriteFrame(visual);
                } else {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        visual.anim.direction = dx > 0 ? 'right' : 'left';
                    } else {
                        visual.anim.direction = dy > 0 ? 'down' : 'up';
                    }
                    visual.anim.elapsed += dtMs;
                    if (visual.anim.elapsed >= visual.anim.speed) {
                        visual.anim.elapsed = 0;
                        visual.anim.frame = (visual.anim.frame + 1) % PLAYER_FRAMES_PER_DIR;
                        updateSpriteFrame(visual);
                    }
                }
            });

            // Update top HUD bars
            if (myVisual) {
                const hpEl = document.getElementById('hud-hp');
                const mpEl = document.getElementById('hud-mp');
                if (hpEl) {
                    const pct = myVisual.smooth.health / myVisual.smooth.maxHealth;
                    (hpEl as HTMLElement).style.width = (pct * 100) + '%';
                }
                if (mpEl) {
                    const pct = myVisual.smooth.mana / myVisual.smooth.maxMana;
                    (mpEl as HTMLElement).style.width = (pct * 100) + '%';
                }
                renderMinimap(room, players, currentPlayerId, world, app.renderer.width, app.renderer.height);
            }
        });

    } catch (e) {
        console.error("JOIN ERROR", e);
    }
}

function createPlayerVisual(player: Player, isCurrentPlayer: boolean): PlayerVisual {
    const container = new Container();
    // Flash / fallback
    const graphics = new Graphics();
    graphics.circle(0, 0, 10);
    graphics.fill(0xffffff);
    graphics.alpha = 0;

    // Spritesheet base texture
    const sprite = new Sprite(getFrameTexture('down', 0));
    sprite.anchor.set(0.5);
    sprite.scale.set(1.5);
    sprite.tint = isCurrentPlayer ? 0xff6666 : 0x66ff66;

    // UI container above sprite
    const uiContainer = new Container();
    uiContainer.y = - (PLAYER_FRAME_SIZE * 1.5) / 2 - 10; // a bit above

    const nameText = new Text({
        text: player.name,
        style: { fontSize: 12, fill: 0xffffff }
    });
    nameText.anchor.set(0.5, 1);
    nameText.y = -2;

    const healthBar = new Graphics();
    const manaBar = new Graphics();

    // Effects container for floating text
    const effectsContainer = new Container();

    container.addChild(sprite);
    container.addChild(graphics);
    uiContainer.addChild(healthBar);
    uiContainer.addChild(manaBar);
    uiContainer.addChild(nameText);
    container.addChild(uiContainer);
    container.addChild(effectsContainer);
    container.x = player.x;
    container.y = player.y;

    // Make enemy players interactive
    if (!isCurrentPlayer) {
        container.eventMode = 'static';
        container.cursor = 'pointer';
    }

    const visual: PlayerVisual = { 
        container, graphics, sprite, nameText, healthBar, manaBar, effectsContainer, uiContainer,
        anim: { direction: 'down', frame: 0, elapsed: 0, speed: 140, lastX: player.x, lastY: player.y },
        smooth: {
            health: player.health,
            mana: player.mana,
            targetHealth: player.health,
            targetMana: player.mana,
            maxHealth: player.maxHealth,
            maxMana: player.maxMana
        },
        movement: {
            x: player.x,
            y: player.y,
            targetX: player.x,
            targetY: player.y
        }
    };
    updateHealthBar(visual);
    updateManaBar(visual);
    return visual;
}

// ---------- Skill Visual Helpers ----------
function spawnFireballProjectile(world: Container, caster: PlayerVisual, from: {x:number,y:number}, to:{x:number,y:number}, onHit: () => void) {
    const g = new Graphics();
    const radius = 6;
    g.circle(0,0,radius).fill(0xff6600).stroke({width:2,color:0xffffff});
    g.x = from.x; g.y = from.y;
    world.addChild(g);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.max(1, Math.sqrt(dx*dx + dy*dy));
    const speed = 360; // px per second
    const vx = dx / dist * speed;
    const vy = dy / dist * speed;
    const start = performance.now();
    function step() {
        const t = (performance.now() - start) / 1000;
        const traveled = t * speed;
        g.x = from.x + dx * (traveled / dist);
        g.y = from.y + dy * (traveled / dist);
        // simple trail
        if (Math.random() < 0.4) {
            const puff = new Graphics();
            puff.circle(0,0,2+Math.random()*2).fill(0xffaa55).alpha=0.8;
            puff.x = g.x; puff.y = g.y;
            world.addChild(puff);
            const puffStart = performance.now();
            const puffLife = 250;
            const pf = () => {
                const dt = performance.now() - puffStart;
                puff.alpha = Math.max(0, 1 - dt / puffLife);
                puff.scale.set(1 + dt / puffLife * 0.8);
                if (dt < puffLife) requestAnimationFrame(pf); else world.removeChild(puff);
            }; pf();
        }
        if (traveled >= dist) {
            world.removeChild(g);
            onHit();
        } else {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

function spawnExplosionParticles(world: Container, x: number, y: number, count: number, color: number) {
    for (let i=0;i<count;i++) {
        const p = new Graphics();
        p.circle(0,0,2+Math.random()*3).fill(color).alpha=1;
        p.x = x; p.y = y; world.addChild(p);
        const angle = Math.random()*Math.PI*2;
        const speed = 60 + Math.random()*120;
        const vx = Math.cos(angle)*speed;
        const vy = Math.sin(angle)*speed;
        const life = 400 + Math.random()*300;
        const start = performance.now();
        const anim = () => {
            const dt = performance.now() - start;
            const t = dt/1000;
            p.x = x + vx * t * 0.05; // scaled down for visual compactness
            p.y = y + vy * t * 0.05;
            p.alpha = Math.max(0, 1 - dt / life);
            if (dt < life) requestAnimationFrame(anim); else world.removeChild(p);
        }; anim();
    }
}

function spawnCastCircle(world: Container, x:number,y:number,color:number,r=22,duration=300,startAlpha=0.9) {
    const g = new Graphics();
    g.circle(0,0,r).stroke({width:2,color}).alpha=startAlpha;
    g.x=x; g.y=y; world.addChild(g);
    const start = performance.now();
    const anim = () => {
        const dt = performance.now()-start;
        g.alpha = Math.max(0, startAlpha * (1 - dt/duration));
        g.scale.set(1 + dt/duration*0.3);
        if (dt<duration) requestAnimationFrame(anim); else world.removeChild(g);
    }; anim();
}

function attachTimedAura(visual: PlayerVisual, color: number, duration: number) {
    const aura = new Graphics();
    aura.circle(0,0, (PLAYER_FRAME_SIZE*1.5)/2 + 6).stroke({width:3,color}).alpha=0.85;
    aura.zIndex = -1;
    visual.container.addChild(aura);
    const start = performance.now();
    const anim = () => {
        const dt = performance.now()-start;
        aura.alpha = 0.85 * (1 - dt/duration);
        aura.rotation += 0.02;
        if (dt<duration) requestAnimationFrame(anim); else visual.container.removeChild(aura);
    }; anim();
}

function attachDashTrail(visual: PlayerVisual, duration: number) {
    const start = performance.now();
    const spawnTrail = () => {
        const dt = performance.now()-start;
        if (dt>duration) return;
        if (visual.sprite) {
            const trail = new Sprite(visual.sprite.texture);
            trail.anchor.copyFrom(visual.sprite.anchor);
            trail.position.copyFrom(visual.sprite.position);
            trail.scale.copyFrom(visual.sprite.scale);
            trail.tint = 0xffffff;
            trail.alpha = 0.5;
            visual.container.addChild(trail);
            const tStart = performance.now();
            const life = 300;
            const fade = () => {
                const d = performance.now()-tStart;
                trail.alpha = Math.max(0, 0.5 * (1 - d/life));
                trail.y -= 0.05 * d/16; // slight upward drift
                if (d<life) requestAnimationFrame(fade); else visual.container.removeChild(trail);
            }; fade();
        }
        setTimeout(spawnTrail, 60); // spawn every 60ms
    };
    spawnTrail();
}

function updateHealthBar(visual: PlayerVisual) {
    const W = 44;
    const H = 5;
    visual.healthBar.clear();
    visual.healthBar.rect(-W/2, 0, W, H).fill(0x222222);
    const pct = visual.smooth.health / visual.smooth.maxHealth;
    visual.healthBar.rect(-W/2, 0, W * pct, H).fill(0x00c040);
}

function updateManaBar(visual: PlayerVisual) {
    const W = 44;
    const H = 4;
    visual.manaBar.clear();
    visual.manaBar.rect(-W/2, 7, W, H).fill(0x222222);
    const pct = visual.smooth.mana / visual.smooth.maxMana;
    visual.manaBar.rect(-W/2, 7, W * pct, H).fill(0x0088ff);
}

// Simple particle spawners
function spawnHitParticles(visual: PlayerVisual, count: number) {
    for (let i = 0; i < count; i++) {
        const g = new Graphics();
        const r = 2 + Math.random() * 3;
        g.circle(0, 0, r).fill(0xff4422).alpha = 1;
        g.x = (Math.random() * 2 - 1) * 8;
        g.y = (Math.random() * 2 - 1) * 8;
        visual.effectsContainer.addChild(g);
        const life = 400 + Math.random() * 200;
        const vy = -0.02 - Math.random() * 0.05;
        const vx = (Math.random() * 2 - 1) * 0.05;
        const start = performance.now();
        const animate = () => {
            const t = performance.now() - start;
            g.x += vx * 16;
            g.y += vy * 16;
            g.alpha = Math.max(0, 1 - t / life);
            if (t < life) requestAnimationFrame(animate); else visual.effectsContainer.removeChild(g);
        };
        requestAnimationFrame(animate);
    }
}

function spawnHealParticles(visual: PlayerVisual, count: number) {
    for (let i = 0; i < count; i++) {
        const g = new Graphics();
        const r = 2 + Math.random() * 3;
        g.circle(0, 0, r).fill(0x22ff66).alpha = 1;
        g.x = (Math.random() * 2 - 1) * 8;
        g.y = (Math.random() * 2 - 1) * 8;
        visual.effectsContainer.addChild(g);
        const life = 450 + Math.random() * 250;
        const vy = -0.03 - Math.random() * 0.06;
        const vx = (Math.random() * 2 - 1) * 0.04;
        const start = performance.now();
        const animate = () => {
            const t = performance.now() - start;
            g.x += vx * 16;
            g.y += vy * 16;
            g.alpha = Math.max(0, 1 - t / life);
            if (t < life) requestAnimationFrame(animate); else visual.effectsContainer.removeChild(g);
        };
        requestAnimationFrame(animate);
    }
}

function showFloatingText(visual: PlayerVisual, text: string, color: number) {
    const floatingText = new Text({
        text: text,
        style: {
            fontSize: 14,
            fill: color,
            fontWeight: 'bold',
            stroke: { color: 0x000000, width: 2 }
        }
    });
    floatingText.anchor.set(0.5, 0.5);
    floatingText.y = -30;
    floatingText.alpha = 1;
    
    visual.effectsContainer.addChild(floatingText);
    
    // Animate floating up and fading out
    let frame = 0;
    const animate = () => {
        frame++;
        floatingText.y -= 1;
        floatingText.alpha = Math.max(0, 1 - frame / 60);
        
        if (frame < 60) {
            requestAnimationFrame(animate);
        } else {
            visual.effectsContainer.removeChild(floatingText);
        }
    };
    animate();
}

function flashPlayer(visual: PlayerVisual, color: number) {
    if (visual.sprite) {
        const sprite = visual.sprite;
        const original = sprite.tint;
        sprite.tint = color;
        setTimeout(() => { sprite.tint = original; }, 120);
    } else {
        const originalTint = visual.graphics.tint;
        visual.graphics.tint = color;
        setTimeout(() => { visual.graphics.tint = originalTint; }, 120);
    }
}

function updateSpriteFrame(visual: PlayerVisual) {
    if (!visual.sprite) return;
    visual.sprite.texture = getFrameTexture(visual.anim.direction, visual.anim.frame);
}

function createUI(container: HTMLElement) {
    container.innerHTML = `
        <div id="game-container">
            <div id="game-canvas"></div>
            <div id="ui-overlay">
                <div id="floating-overlay">
                    <div id="minimap-container">
                        <canvas id="minimap" width="160" height="160"></canvas>
                        <div class="mini-label">地图</div>
                    </div>
                    <div id="bottom-left-hud">
                        <div id="bottom-bars">
                            <div class="hud-bar hp"><div class="fill" id="hud-hp"></div></div>
                            <div class="hud-bar mp"><div class="fill" id="hud-mp"></div></div>
                        </div>
                        <div id="hotbar" class="hotbar"></div>
                    </div>
                </div>
                <div id="controls-panel" class="panel">
                    <h3>控制说明</h3>
                    <div class="controls-info">
                        <div>↑↓←→ 移动</div>
                        <div>1-4 使用技能</div>
                        <div>点击敌人攻击</div>
                    </div>
                </div>
                <div id="player-stats" class="panel">
                    <h3>玩家状态</h3>
                    <div id="player-info"></div>
                </div>
                <div id="skills-panel" class="panel">
                    <h3>技能 (快捷键 1-4)</h3>
                    <div id="skills-list"></div>
                </div>
                <div id="quests-panel" class="panel">
                    <h3>任务</h3>
                    <div id="quests-list"></div>
                </div>
                <div id="achievements-panel" class="panel">
                    <h3>成就</h3>
                    <div id="achievements-list"></div>
                </div>
                <div id="leaderboard-panel" class="panel">
                    <h3>排行榜</h3>
                    <div id="leaderboard-list"></div>
                </div>
                <div id="chat-panel" class="panel">
                    <h3>聊天</h3>
                    <div id="chat-messages"></div>
                    <div id="chat-input-container">
                        <input type="text" id="chat-input" placeholder="输入消息..." maxlength="200">
                        <button id="chat-send">发送</button>
                    </div>
                </div>
                <div id="voice-panel" class="panel">
                    <h3>🎙️ 语音</h3>
                    <div id="voice-controls">
                        <button id="voice-join-global">加入全局</button>
                        <button id="voice-leave">离开频道</button>
                        <button id="voice-mute">静音</button>
                        <button id="voice-deafen">免打扰</button>
                    </div>
                    <div id="voice-status">未连接</div>
                    <div id="voice-members"></div>
                </div>
                <div id="loading-overlay" class="overlay hidden">
                    <div class="loader"></div>
                    <div class="text" id="loading-text">Loading...</div>
                </div>
            </div>
        </div>
    `;
}

function setLoading(show: boolean, text?: string) {
    const overlay = document.getElementById('loading-overlay');
    const label = document.getElementById('loading-text');
    if (overlay) overlay.classList.toggle('hidden', !show);
    if (label && text) label.textContent = text;
}

function setupUIHandlers(room: Room<MyRoomState>, currentPlayerId: string) {
    // Chat input
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const chatSend = document.getElementById('chat-send') as HTMLButtonElement;
    
    const sendChat = () => {
        const message = chatInput.value.trim();
        if (message) {
            room.send('chat', { message, channel: 'global' });
            chatInput.value = '';
        }
    };
    
    chatSend?.addEventListener('click', sendChat);
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });

    // Skill hotkeys
    window.addEventListener('keypress', (e) => {
        const player = room.state.players.get(currentPlayerId);
        if (!player) return;
        
        const skillMap: { [key: string]: number } = {
            '1': 0, '2': 1, '3': 2, '4': 3
        };
        
        if (e.key in skillMap) {
            const skillIndex = skillMap[e.key];
            if (player.skills[skillIndex]) {
                const skill = player.skills[skillIndex];
                const cooldownRemaining = Math.max(0, skill.cooldown - (Date.now() - skill.lastUsed));
                
                if (cooldownRemaining === 0 && player.mana >= skill.manaCost) {
                    // For self-targeting skills like heal, target self
                    if (skill.id === 'heal' || skill.id === 'shield' || skill.id === 'dash') {
                        room.send('attack', { targetId: currentPlayerId, skillId: skill.id });
                    } else {
                        // For attack skills, need a target - attack nearest enemy
                        const target = findNearestEnemy(room.state.players, currentPlayerId, player);
                        if (target) {
                            room.send('attack', { targetId: target, skillId: skill.id });
                        }
                    }
                }
            }
        }
    });
}

function findNearestEnemy(players: any, currentPlayerId: string, currentPlayer: Player): string | null {
    let nearestId: string | null = null;
    let nearestDistance = Infinity;
    
    players.forEach((player: Player, sessionId: string) => {
        if (sessionId === currentPlayerId) return;
        
        const dx = player.x - currentPlayer.x;
        const dy = player.y - currentPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestId = sessionId;
        }
    });
    
    return nearestId;
}

function updatePlayerUI(player: Player) {
    const infoEl = document.getElementById('player-info');
    if (infoEl) {
        const kdRatio = player.deaths === 0 ? player.kills : (player.kills / player.deaths).toFixed(2);
        infoEl.innerHTML = `
            <div class="stat-row">
                <span>等级: ${player.level}</span>
                <span>经验: ${player.experience}/${player.experienceToNext}</span>
            </div>
            <div class="stat-row">
                <span>生命: ${Math.round(player.health)}/${player.maxHealth}</span>
                <div class="bar"><div class="bar-fill" style="width: ${(player.health/player.maxHealth*100)}%; background: #00ff00;"></div></div>
            </div>
            <div class="stat-row">
                <span>魔法: ${player.mana.toFixed(1)}/${player.maxMana}</span>
                <div class="bar"><div class="bar-fill" style="width: ${(player.mana/player.maxMana*100)}%; background: #0088ff;"></div></div>
            </div>
            <div class="stat-row">
                <span>攻击: ${player.attack}</span>
                <span>防御: ${player.defense}</span>
                <span>速度: ${player.speed}</span>
            </div>
            <div class="stat-row">
                <span>击杀: ${player.kills}</span>
                <span>死亡: ${player.deaths}</span>
                <span>K/D: ${kdRatio}</span>
            </div>
        `;
    }
    
    updateSkillsUI(player);
    
    // Update quests
    const questsList = document.getElementById('quests-list');
    if (questsList) {
        questsList.innerHTML = player.quests.map(quest => `
            <div class="quest ${quest.completed ? 'completed' : ''}">
                <div class="quest-name">${quest.name} ${quest.completed ? '✓' : ''}</div>
                <div class="quest-progress">${quest.progress}/${quest.target}</div>
                <div class="quest-reward">奖励: ${quest.expReward} 经验</div>
            </div>
        `).join('') || '<div class="empty">暂无任务</div>';
    }
    
    // Update achievements
    const achievementsList = document.getElementById('achievements-list');
    if (achievementsList) {
        const unlocked = player.achievements.filter(a => a.unlocked);
        achievementsList.innerHTML = unlocked.map(achievement => `
            <div class="achievement unlocked">
                <div class="achievement-name">✓ ${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `).join('') || '<div class="empty">暂无成就</div>';
    }
}

function updateSkillsUI(player: Player) {
    // Skill icon mapping
    const skillIcons: { [key: string]: string } = {
        'fireball': '🔥',
        'heal': '💚',
        'shield': '🛡️',
        'dash': '🏃'
    };
    
    // Update skills
    const skillsList = document.getElementById('skills-list');
    if (skillsList) {
        skillsList.innerHTML = player.skills.map((skill, idx) => {
            const cooldownRemaining = Math.max(0, skill.cooldown - (Date.now() - skill.lastUsed));
            const isReady = cooldownRemaining === 0 && player.mana >= skill.manaCost;
            const icon = skillIcons[skill.id] || '⚡';
            const cooldownPercent = cooldownRemaining > 0 ? ((skill.cooldown - cooldownRemaining) / skill.cooldown * 100) : 100;
            
            // Build tooltip with skill details
            const tooltipParts = [skill.description || skill.name];
            if (skill.damage > 0) {
                if (skill.id === 'heal') {
                    tooltipParts.push(`恢复: ${skill.damage}`);
                } else {
                    tooltipParts.push(`伤害: ${skill.damage}`);
                }
            }
            tooltipParts.push(`冷却: ${skill.cooldown / 1000}秒`);
            tooltipParts.push(`魔法消耗: ${skill.manaCost}`);
            const tooltip = tooltipParts.join(' | ');
            
            return `
                <div class="skill ${isReady ? 'ready' : 'cooldown'}" title="${tooltip}">
                    ${cooldownRemaining > 0 ? `<div class="skill-cooldown-overlay" style="width: ${cooldownPercent}%"></div>` : ''}
                    <span class="skill-key">${idx + 1}</span>
                    <span class="skill-icon">${icon}</span>
                    <span class="skill-name">${skill.name}</span>
                    <span class="skill-cost">${skill.manaCost} 魔法</span>
                    ${!isReady && cooldownRemaining > 0 ? `<span class="skill-cooldown">${(cooldownRemaining/1000).toFixed(1)}s</span>` : ''}
                </div>
            `;
        }).join('');
    }
}

// Bottom hotbar (1-4) simplified visual clone of side skills
function updateHotbar(player: Player) {
    const hotbar = document.getElementById('hotbar');
    if (!hotbar) return;
    const icons: Record<string,string> = { fireball:'🔥', heal:'💚', shield:'🛡️', dash:'🏃' };
    hotbar.innerHTML = player.skills.map((skill, idx) => {
        const cooldownRemaining = Math.max(0, skill.cooldown - (Date.now() - skill.lastUsed));
        const isReady = cooldownRemaining === 0 && player.mana >= skill.manaCost;
        const cdText = cooldownRemaining > 0 ? (cooldownRemaining/1000).toFixed(1) : '';
        return `<div class="hotbar-slot ${isReady? 'ready':'cooldown'}" data-skill="${skill.id}" title="${skill.name}">
            <div class="key">${idx+1}</div>
            <div class="ico">${icons[skill.id]||'⚡'}</div>
            ${!isReady?`<div class="overlay"></div><div class="cd">${cdText}</div>`:''}
        </div>`;
    }).join('');
}

// ---------- Minimap ----------
function renderMinimap(room: Room<MyRoomState>, players: Map<string, PlayerVisual>, currentId: string, world: Container, viewW: number, viewH: number) {
    const canvas = document.getElementById('minimap') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const worldW = room.state.worldWidth || 2000;
    const worldH = room.state.worldHeight || 2000;
    // Fit entire world inside minimap (no center-on-player, full map) OR keep centered mode. We will show full map then draw view rect.
    const scaleX = w / worldW;
    const scaleY = h / worldH;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (w - worldW * scale) / 2;
    const offsetY = (h - worldH * scale) / 2;
    // Background & border
    ctx.fillStyle = 'rgba(20,20,20,0.6)';
    ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(0.5,0.5,w-1,h-1);

    const me = room.state.players.get(currentId);
    // Vision cone for current player
    if (me) {
        const pv = players.get(currentId);
        const dir = pv?.anim.direction || 'down';
        let angle = 0; // radians
        switch (dir) {
            case 'up': angle = -Math.PI/2; break;
            case 'down': angle = Math.PI/2; break;
            case 'left': angle = Math.PI; break;
            case 'right': angle = 0; break;
        }
        const coneRange = 250; // world units
        const coneHalfAngle = Math.PI/6; // 30 deg
        const px = offsetX + me.x * scale;
        const py = offsetY + me.y * scale;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.fillStyle = 'rgba(0,255,120,0.15)';
        const steps = 12;
        for (let i=0;i<=steps;i++) {
            const a = angle - coneHalfAngle + (i/steps)*(coneHalfAngle*2);
            const sx = px + Math.cos(a) * coneRange * scale;
            const sy = py + Math.sin(a) * coneRange * scale;
            ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
    }
    // Entities
    players.forEach((visual, id) => {
        const p = room.state.players.get(id);
        if (!p) return;
        const mx = offsetX + p.x * scale;
        const my = offsetY + p.y * scale;
        ctx.fillStyle = id === currentId ? '#0f8' : '#f55';
        ctx.beginPath();
        ctx.arc(mx, my, id===currentId?4:3, 0, Math.PI*2);
        ctx.fill();
    });

    // Viewport rectangle (current visible area)
    // world container translation: screen (0,0) corresponds to world coords (-world.x, -world.y)
    const viewX = -world.x;
    const viewY = -world.y;
    const viewRectW = viewW;
    const viewRectH = viewH;
    // Convert to minimap space
    const mvx = offsetX + viewX * scale;
    const mvy = offsetY + viewY * scale;
    const mvw = viewRectW * scale;
    const mvh = viewRectH * scale;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1;
    ctx.strokeRect(mvx + 0.5, mvy + 0.5, mvw, mvh);
}

function addChatMessage(sender: string, message: string, channel: string) {
    const messagesEl = document.getElementById('chat-messages');
    if (messagesEl) {
        const msgEl = document.createElement('div');
        msgEl.className = `chat-message channel-${channel}`;
        msgEl.innerHTML = `<span class="sender">${sender}:</span> <span class="message">${message}</span>`;
        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        
        // Keep only last 50 messages
        while (messagesEl.children.length > 50) {
            messagesEl.removeChild(messagesEl.firstChild!);
        }
    }
}

function updateLeaderboard(leaderboard: any) {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (leaderboardList) {
        leaderboardList.innerHTML = Array.from(leaderboard).map((entry: any) => `
            <div class="leaderboard-entry">
                <span class="rank">#${entry.rank}</span>
                <span class="player-name">${entry.playerName}</span>
                <span class="level">Lv.${entry.level}</span>
                <span class="score">${entry.score}</span>
            </div>
        `).join('') || '<div class="empty">排行榜暂无数据</div>';
    }
}

// Voice chat functionality
function setupVoiceChat(room: Room<MyRoomState>, currentPlayerId: string) {
    const $$ = getStateCallbacks(room);
    
    // Setup voice channel listeners
    $$(room.state).voiceChannels.onAdd((channel, channelId) => {
        updateVoiceDisplay(room);
        
        // Listen for members in this channel
        $$(channel).members.onAdd((member, sessionId) => {
            updateVoiceDisplay(room);
            
            // If it's not me and I'm in this channel, setup peer connection
            const myPlayer = room.state.players.get(currentPlayerId);
            if (sessionId !== currentPlayerId && 
                myPlayer?.currentVoiceChannel === channelId) {
                setupVoicePeerConnection(room, sessionId);
            }
        });
        
        $$(channel).members.onRemove((member, sessionId) => {
            updateVoiceDisplay(room);
            closeVoicePeerConnection(sessionId);
        });
    });
    
    $$(room.state).voiceChannels.onRemove(() => {
        updateVoiceDisplay(room);
    });
    
    // Listen for WebRTC signaling messages
    room.onMessage('voice:signal', (message: any) => {
        handleVoiceSignal(room, message);
    });
    
    // Listen for player state changes
    const myPlayer = room.state.players.get(currentPlayerId);
    if (myPlayer) {
        const $$ = getStateCallbacks(room);
        $$(myPlayer).listen("currentVoiceChannel", () => {
            updateVoiceDisplay(room);
        });
    }
    
    // Setup button handlers
    const joinBtn = document.getElementById('voice-join-global');
    const leaveBtn = document.getElementById('voice-leave');
    const muteBtn = document.getElementById('voice-mute');
    const deafenBtn = document.getElementById('voice-deafen');
    
    joinBtn?.addEventListener('click', async () => {
        // Request microphone permission if not already done
        if (!localStream) {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            } catch (err) {
                console.error('Microphone access denied:', err);
                alert('请授予麦克风权限以使用语音功能');
                return;
            }
        }
        room.send('voice:join', { channelId: 'global' });
    });
    
    leaveBtn?.addEventListener('click', () => {
        voicePeerConnections.forEach((pc, peerId) => closeVoicePeerConnection(peerId));
        voicePeerConnections.clear();
        room.send('voice:leave');
    });
    
    muteBtn?.addEventListener('click', () => {
        isVoiceMuted = !isVoiceMuted;
        
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isVoiceMuted;
            });
        }
        
        room.send('voice:mute', { muted: isVoiceMuted });
        updateVoiceDisplay(room);
    });
    
    deafenBtn?.addEventListener('click', () => {
        isVoiceDeafened = !isVoiceDeafened;
        
        voicePeerConnections.forEach(pc => {
            const audio = (pc as any).remoteAudio;
            if (audio) {
                audio.muted = isVoiceDeafened;
            }
        });
        
        room.send('voice:deafen', { deafened: isVoiceDeafened });
        updateVoiceDisplay(room);
    });
}

function updateVoiceDisplay(room: Room<MyRoomState>) {
    const myPlayer = room.state.players.get(room.sessionId);
    const statusDiv = document.getElementById('voice-status');
    const membersDiv = document.getElementById('voice-members');
    
    if (!statusDiv || !membersDiv) return;
    
    if (myPlayer?.currentVoiceChannel) {
        const channel = room.state.voiceChannels.get(myPlayer.currentVoiceChannel);
        const channelName = channel ? channel.name : myPlayer.currentVoiceChannel;
        const muteStatus = isVoiceMuted ? '🔇' : '🎤';
        const deafStatus = isVoiceDeafened ? '🔈' : '🔊';
        
        statusDiv.innerHTML = `${muteStatus} ${deafStatus} ${channelName}`;
        
        if (channel) {
            let html = '<div style="font-size: 12px; margin-top: 8px;">成员:</div>';
            channel.members.forEach((member) => {
                const mute = member.muted ? '🔇' : '🎤';
                const deaf = member.deafened ? '🔈' : '🔊';
                html += `<div style="font-size: 11px; padding: 2px;">${mute}${deaf} ${member.playerName}</div>`;
            });
            membersDiv.innerHTML = html;
        } else {
            membersDiv.innerHTML = '';
        }
    } else {
        statusDiv.textContent = '未连接';
        membersDiv.innerHTML = '';
    }
}

async function setupVoicePeerConnection(room: Room<MyRoomState>, peerId: string) {
    if (voicePeerConnections.has(peerId) || !localStream) return;
    
    const pc = new RTCPeerConnection(rtcConfig);
    voicePeerConnections.set(peerId, pc);
    
    // Add local tracks
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream!);
    });
    
    // Handle incoming streams
    pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
        (pc as any).remoteAudio = audio;
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            room.send('voice:signal', {
                to: peerId,
                type: 'ice-candidate',
                data: event.candidate.toJSON()
            });
        }
    };
    
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            closeVoicePeerConnection(peerId);
        }
    };
    
    // Create and send offer
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        room.send('voice:signal', {
            to: peerId,
            type: 'offer',
            data: offer
        });
    } catch (err) {
        console.error('Error creating offer:', err);
    }
}

async function handleVoiceSignal(room: Room<MyRoomState>, message: any) {
    const { from, type, data } = message;
    
    let pc = voicePeerConnections.get(from);
    
    if (type === 'offer') {
        if (!pc) {
            pc = new RTCPeerConnection(rtcConfig);
            voicePeerConnections.set(from, pc);
            
            // Add local tracks
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    pc!.addTrack(track, localStream!);
                });
            }
            
            // Setup handlers
            pc.ontrack = (event) => {
                const audio = new Audio();
                audio.srcObject = event.streams[0];
                audio.play();
                (pc as any).remoteAudio = audio;
            };
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    room.send('voice:signal', {
                        to: from,
                        type: 'ice-candidate',
                        data: event.candidate.toJSON()
                    });
                }
            };
        }
        
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            room.send('voice:signal', {
                to: from,
                type: 'answer',
                data: answer
            });
        } catch (err) {
            console.error('Error handling offer:', err);
        }
    } else if (type === 'answer') {
        try {
            await pc?.setRemoteDescription(new RTCSessionDescription(data));
        } catch (err) {
            console.error('Error handling answer:', err);
        }
    } else if (type === 'ice-candidate') {
        try {
            await pc?.addIceCandidate(new RTCIceCandidate(data));
        } catch (err) {
            console.error('Error adding ICE candidate:', err);
        }
    }
}

function closeVoicePeerConnection(peerId: string) {
    const pc = voicePeerConnections.get(peerId);
    if (pc) {
        const audio = (pc as any).remoteAudio;
        if (audio) {
            audio.srcObject = null;
        }
        pc.close();
        voicePeerConnections.delete(peerId);
    }
}

main();