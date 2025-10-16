import { Client, getStateCallbacks, Room } from 'colyseus.js';
import { Application, Graphics, Text, Container, Sprite } from 'pixi.js';
import { PLAYER_FRAMES_PER_DIR, Direction, getFrameTexture, PLAYER_FRAME_SIZE } from './assets/playerSheet';
import { loadGameAssets, getLoadedAssets } from './assets/loaders/assetLoader';
import { loadTMX, TMXMap } from './map/tmxLoader';
import { LpcPlayerSprite } from './sprites/lpcPlayer';
import { MyRoomState } from './states/MyRoomState';
import { Player } from './states/Player';
import './style.css';
// Modularized game logic
import { triggerScreenShake, applyScreenShake } from './game/screenShake';
import { createPlayerVisual, PlayerVisual, updateHealthBar, updateManaBar, updateSpriteFrame, flashPlayer } from './game/players';
import { spawnFireballProjectile, spawnExplosionParticles, spawnCastCircle, spawnHealEffect, spawnShieldEffect, spawnDashEffect, spawnHitParticles, spawnHealParticles } from './game/skillEffects';
import { renderMinimap } from './game/minimap';
import { addChatMessage } from './game/chat';
import { updateLeaderboard } from './game/leaderboard';
import { createUI, setLoading, setupUIHandlers, updatePlayerUI, updateSkillsUI, updateHotbar } from './game/ui';
import { initVoiceChat } from './game/voice/voiceManager';

const client = new Client("ws://192.168.1.46:2567");

// Player & UI setup bootstrap (logic split across ./game modules)

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

    // Load external assets (LPC + FX). If fails, we still continue with procedural fallback.
    try {
        await loadGameAssets();
        console.log('[assets] External assets loaded');
    } catch (err) {
        console.warn('[assets] Failed to load external assets, using procedural fallback', err);
    }
    setLoading(false);

    try {
        const room = await client.joinOrCreate<MyRoomState>("my_room", { name: "Player" + Math.floor(Math.random() * 1000) });
        // Attempt TMX map load (Kenney sample overworld)
        let mapData: TMXMap | null = null;
        const loadedAssets = getLoadedAssets();
        try {
            mapData = await loadTMX('assets/oga/kenney_monochrome-pirates/Tiled/sample-overworld.tmx');
            console.log('[map] TMX loaded', mapData.width, 'x', mapData.height, 'tiles');
        } catch (e) {
            console.warn('[map] TMX load failed, using procedural ground fallback', e);
        }
        if (mapData && loadedAssets.tiles) {
            // Replace world size with TMX dimensions (client-side only) for camera/minimap consistency if larger
            const derivedW = mapData.width * mapData.tilewidth;
            const derivedH = mapData.height * mapData.tileheight;
            // Composite: repeat the small sample map NxM times to create a larger world quickly.
            const repeatX = 6;
            const repeatY = 6;
            for (let ry = 0; ry < repeatY; ry++) {
                for (let rx = 0; rx < repeatX; rx++) {
                    mapData.layers.forEach((layer, layerIndex) => {
                        const layerContainer = new Container();
                        layerContainer.zIndex = -1000 + layerIndex; // ensure behind entities
                        world.addChild(layerContainer);
                        const tiles = loadedAssets.tiles!;
                        for (let ty = 0; ty < layer.height; ty++) {
                            for (let tx = 0; tx < layer.width; tx++) {
                                const gid = layer.data[ty * layer.width + tx];
                                if (!gid) continue;
                                const tileIndex = gid - mapData.tileset.firstgid;
                                const tex = tiles[tileIndex];
                                if (!tex) continue;
                                const sprite = new Sprite(tex);
                                sprite.x = rx * derivedW + tx * mapData.tilewidth;
                                sprite.y = ry * derivedH + ty * mapData.tileheight;
                                sprite.anchor.set(0);
                                layerContainer.addChild(sprite);
                            }
                        }
                    });
                }
            }
            const bigW = derivedW * repeatX;
            const bigH = derivedH * repeatY;
            if ((room.state.worldWidth || 0) < bigW) (room.state as any).worldWidth = bigW;
            if ((room.state.worldHeight || 0) < bigH) (room.state as any).worldHeight = bigH;
        } else if (loadedAssets.tiles && loadedAssets.tiles.length > 0) {
            // Fallback to simple fill
            const ground = new Container();
            ground.zIndex = -1000;
            world.addChild(ground);
            const worldW = room.state.worldWidth || 2000;
            const worldH = room.state.worldHeight || 2000;
            const tileSize = 16;
            const cols = Math.ceil(worldW / tileSize);
            const rows = Math.ceil(worldH / tileSize);
            const candidateIndices = loadedAssets.tiles.slice(0, 40).map((_, i) => i);
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = candidateIndices[(x * 13 + y * 7) % candidateIndices.length];
                    const tex = loadedAssets.tiles[idx];
                    const s = new Sprite(tex);
                    s.x = x * tileSize;
                    s.y = y * tileSize;
                    s.anchor.set(0);
                    ground.addChild(s);
                }
            }
        }
        const currentPlayerId = room.sessionId;

        const $$ = getStateCallbacks(room);

        // Setup UI handlers
        setupUIHandlers(room, currentPlayerId);

        $$(room.state).players.onAdd((player, sessionId) => {
            const isCurrentPlayer = sessionId === currentPlayerId;
            const playerVisual = createPlayerVisual(player, isCurrentPlayer);

            world.addChild(playerVisual.container);
            players.set(sessionId, playerVisual);

            // Track previous health for damage/heal numbers
            let previousHealth = player.health;

            // Setup change listeners
            const callbacks = [
                $$(player).listen("x", (newValue) => {
                    const m = playerVisual.movement;
                    m.lerpFromX = m.x;
                    m.lerpFromY = m.y;
                    m.targetX = newValue;
                    m.lerpStart = performance.now();
                    m.lastServerUpdate = m.lerpStart;
                    m.predicted = false;
                }),
                $$(player).listen("y", (newValue) => {
                    const m = playerVisual.movement;
                    m.lerpFromX = m.x;
                    m.lerpFromY = m.y;
                    m.targetY = newValue;
                    m.lerpStart = performance.now();
                    m.lastServerUpdate = m.lerpStart;
                    m.predicted = false;
                }),
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
                    spawnHealEffect(world, from.x, from.y);
                    break;
                case 'shield':
                    spawnShieldEffect(casterVisual, 5000);
                    break;
                case 'dash':
                    spawnDashEffect(casterVisual, 1500);
                    break;
            }
        });

        // Leaderboard updates
        $$(room.state).leaderboard.onChange(() => {
            updateLeaderboard(room.state.leaderboard);
        });

        // Initialize voice chat (global channel opt-in)
        initVoiceChat(room, currentPlayerId);

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
                const offsetX = (minimap.width - worldW * scale) / 2;
                const offsetY = (minimap.height - worldH * scale) / 2;
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

            const me = players.get(currentPlayerId);
            if ((movement.x !== 0 || movement.y !== 0) && room && (me?.movement.velocityX !== movement.x || me?.movement.velocityY !== movement.y)) {
                console.log("Sending move command:", movement);
                room.send("move", movement);
                if (me) {
                    me.movement.velocityX = movement.x;
                    me.movement.velocityY = movement.y;
                }
            }
        });

        window.addEventListener("keyup", (e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") movement.x = 0;
            if (e.key === "ArrowUp" || e.key === "ArrowDown") movement.y = 0;

            if (movement.x === 0 && movement.y === 0) {
                room.send("move", { x: 0, y: 0 });
                const me = players.get(currentPlayerId);
                if (me) {
                    me.movement.velocityX = 0;
                    me.movement.velocityY = 0;
                }
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
                // Movement interpolation (time-based)
                const mv = visual.movement;
                const now = performance.now();
                // Adaptive lerpDuration: time since last authoritative update * factor (clamped)
                const interval = now - mv.lastServerUpdate;
                mv.lerpDuration = Math.min(180, Math.max(60, interval * 0.9));
                const elapsed = now - mv.lerpStart;
                const tRaw = mv.lerpDuration > 0 ? elapsed / mv.lerpDuration : 1;
                const t = Math.min(1, tRaw);
                const eased = t < 1 ? 1 - (1 - t) * (1 - t) : 1; // ease-out quad
                mv.x = mv.lerpFromX + (mv.targetX - mv.lerpFromX) * eased;
                mv.y = mv.lerpFromY + (mv.targetY - mv.lerpFromY) * eased;
                // If interpolation finished and we have a velocity, start light prediction until next server update
                if (t >= 1 && (Math.abs(mv.velocityX) > 0 || Math.abs(mv.velocityY) > 0)) {
                    mv.predicted = true;
                    const predictDt = dtMs / 1000;
                    mv.x += mv.velocityX * predictDt * 180; // approximate speed (tune)
                    mv.y += mv.velocityY * predictDt * 180;
                }
                visual.container.x = mv.x;
                visual.container.y = mv.y;
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

    // Screen shake application
    applyScreenShake(world, dtMs);

    // Pixel snapping to avoid tile seam gaps when camera has sub-pixel position.
    // (Seams appear during smooth vertical movement due to fractional sampling.)
    world.x = Math.round(world.x);
    world.y = Math.round(world.y);

            // Update animations (after camera movement so shake doesn't affect detection)
            players.forEach((visual, sessionId) => {
                const p = room.state.players.get(sessionId);
                if (!p || !visual.sprite) return;
                const dx = p.x - visual.anim.lastX;
                const dy = p.y - visual.anim.lastY;
                visual.anim.lastX = p.x;
                visual.anim.lastY = p.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    visual.anim.direction = dx > 0 ? 'right' : 'left';
                } else if (Math.abs(dy) > 0.01) {
                    visual.anim.direction = dy > 0 ? 'down' : 'up';
                }
                const loaded = getLoadedAssets();
                if (!loaded.player) {
                    const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
                    if (!moving) {
                        visual.anim.frame = 0;
                        updateSpriteFrame(visual);
                    } else {
                        visual.anim.elapsed += dtMs;
                        if (visual.anim.elapsed >= visual.anim.speed) {
                            visual.anim.elapsed = 0;
                            visual.anim.frame = (visual.anim.frame + 1) % PLAYER_FRAMES_PER_DIR;
                            updateSpriteFrame(visual);
                        }
                    }
                }
                // If using LPC wrapper container, call its internal update
                const lpcContainer = visual.container.children.find(c => c instanceof LpcPlayerSprite) as LpcPlayerSprite | undefined;
                if (lpcContainer) {
                    // speed scale from current velocity magnitude (predicted or smoothing diff)
                    const mv = visual.movement;
                    const vx = mv.predicted ? mv.velocityX * 180 : (mv.targetX - mv.lerpFromX) / Math.max(1, mv.lerpDuration / 1000);
                    const vy = mv.predicted ? mv.velocityY * 180 : (mv.targetY - mv.lerpFromY) / Math.max(1, mv.lerpDuration / 1000);
                    const speed = Math.sqrt(vx * vx + vy * vy);
                    const walkSpeed = 180; // baseline speed mapping to animationSpeed base
                    (lpcContainer as any).options.getSpeedScale = () => Math.min(2.2, Math.max(0.4, speed / walkSpeed));
                    (lpcContainer as any).options.getAction = () => visual.action;
                    (lpcContainer as any).options.getMoving = () => speed > 2;
                    visual.action = speed > 2 ? 'walk' : 'idle';
                    lpcContainer.update(dtMs / 1000);
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

// createPlayerVisual moved to ./game/players

// (Skill effect helpers imported from ./game/skillEffects)

// health/mana bar helpers imported

// Simple particle spawners
// particle helpers imported

// Local floating combat text implementation (kept inline)
function showFloatingText(visual: PlayerVisual, text: string, color: number) {
    const floatingText = new Text({ text, style: { fontSize: 14, fill: color, fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } } });
    floatingText.anchor.set(0.5, 0.5); floatingText.y = -30; floatingText.alpha = 1; visual.effectsContainer.addChild(floatingText);
    let frame = 0; const animate = () => { frame++; floatingText.y -= 1; floatingText.alpha = Math.max(0, 1 - frame / 60); if (frame < 60) { requestAnimationFrame(animate); } else { visual.effectsContainer.removeChild(floatingText); } }; animate();
}

// flashPlayer provided by ./game/players

// updateSpriteFrame imported

// UI creation handled by ./game/ui

// setLoading imported

// UI handlers in ./game/ui

// nearest enemy logic in ./game/ui

// updatePlayerUI imported

// updateSkillsUI imported

// updateHotbar imported

// minimap renderer imported

// chat message adder imported

// leaderboard updater imported

main();