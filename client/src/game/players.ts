import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Player } from '../states/Player';
import { getLoadedAssets } from '../assets/loaders/assetLoader';
import { PLAYER_FRAME_SIZE, PLAYER_FRAMES_PER_DIR, Direction, getFrameTexture } from '../assets/playerSheet';
import { LpcPlayerSprite, LpcAction } from '../sprites/lpcPlayer';

export interface PlayerVisual {
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
        health: number;
        mana: number;
        targetHealth: number;
        targetMana: number;
        maxHealth: number;
        maxMana: number;
    };
    movement: {
        x: number;
        y: number;
        targetX: number;
        targetY: number;
        lerpFromX: number;
        lerpFromY: number;
        lerpStart: number;
        lerpDuration: number;
        lastServerUpdate: number;
        predicted: boolean;
        velocityX: number;
        velocityY: number;
    };
    action: LpcAction;
}

export function createPlayerVisual(player: Player, isCurrentPlayer: boolean): PlayerVisual {
    const container = new Container();
    const graphics = new Graphics();
    graphics.circle(0, 0, 10);
    graphics.fill(0xffffff);
    graphics.alpha = 0;

    let sprite: Sprite | undefined;
    const loaded = getLoadedAssets();
    if (loaded.player) {
        const lpc = new LpcPlayerSprite({
            sheet: loaded.player,
            getDirection: () => 0,
            getMoving: () => false,
            getAction: () => 'idle',
            animationSpeed: 10
        });
        lpc.scale.set(0.75);
        sprite = new Sprite();
        lpc.addChild(sprite);
        container.addChild(lpc);
    } else {
        sprite = new Sprite(getFrameTexture('down', 0));
        sprite.anchor.set(0.5);
        sprite.scale.set(1.5);
        sprite.tint = isCurrentPlayer ? 0xff6666 : 0x66ff66;
        container.addChild(sprite);
    }

    const uiContainer = new Container();
    uiContainer.y = - (PLAYER_FRAME_SIZE * 1.5) / 2 - 10;
    const nameText = new Text({ text: player.name, style: { fontSize: 12, fill: 0xffffff } });
    nameText.anchor.set(0.5, 1); nameText.y = -2;
    const healthBar = new Graphics();
    const manaBar = new Graphics();
    const effectsContainer = new Container();
    container.addChild(graphics);
    uiContainer.addChild(healthBar); uiContainer.addChild(manaBar); uiContainer.addChild(nameText);
    container.addChild(uiContainer); container.addChild(effectsContainer);
    container.x = player.x; container.y = player.y;
    if (!isCurrentPlayer) { container.eventMode = 'static'; container.cursor = 'pointer'; }

    const visual: PlayerVisual = {
        container, graphics, sprite, nameText, healthBar, manaBar, effectsContainer, uiContainer,
        anim: { direction: 'down', frame: 0, elapsed: 0, speed: 140, lastX: player.x, lastY: player.y },
        smooth: { health: player.health, mana: player.mana, targetHealth: player.health, targetMana: player.mana, maxHealth: player.maxHealth, maxMana: player.maxMana },
        movement: { x: player.x, y: player.y, targetX: player.x, targetY: player.y, lerpFromX: player.x, lerpFromY: player.y, lerpStart: performance.now(), lerpDuration: 120, lastServerUpdate: performance.now(), predicted: false, velocityX: 0, velocityY: 0 },
        action: 'idle'
    };
    if (loaded.player) {
        const lpcSpriteContainer = container.children.find(c => c instanceof LpcPlayerSprite) as LpcPlayerSprite | undefined;
        if (lpcSpriteContainer) {
            (lpcSpriteContainer as any).options.getDirection = () => {
                switch (visual.anim.direction) {
                    case 'up': return 0; case 'left': return 1; case 'down': return 2; case 'right': return 3; default: return 2;
                }
            };
            (lpcSpriteContainer as any).options.getMoving = () => {
                const dx = Math.abs(visual.movement.targetX - visual.movement.x);
                const dy = Math.abs(visual.movement.targetY - visual.movement.y);
                return dx > 0.2 || dy > 0.2;
            };
            loaded.player.framesPerDirection = 9;
        }
    }
    updateHealthBar(visual); updateManaBar(visual);
    return visual;
}

export function updateHealthBar(visual: PlayerVisual) {
    const W = 44; const H = 5;
    visual.healthBar.clear();
    visual.healthBar.rect(-W / 2, 0, W, H).fill(0x222222);
    const pct = visual.smooth.health / visual.smooth.maxHealth;
    visual.healthBar.rect(-W / 2, 0, W * pct, H).fill(0x00c040);
}

export function updateManaBar(visual: PlayerVisual) {
    const W = 44; const H = 4;
    visual.manaBar.clear();
    visual.manaBar.rect(-W / 2, 7, W, H).fill(0x222222);
    const pct = visual.smooth.mana / visual.smooth.maxMana;
    visual.manaBar.rect(-W / 2, 7, W * pct, H).fill(0x0088ff);
}

export function updateSpriteFrame(visual: PlayerVisual) {
    if (!visual.sprite) return;
    const loaded = getLoadedAssets();
    if (!loaded.player) {
        visual.sprite.texture = getFrameTexture(visual.anim.direction, visual.anim.frame);
    }
}

export function flashPlayer(visual: PlayerVisual, color: number) {
    if (visual.sprite) {
        const sprite = visual.sprite; const original = sprite.tint;
        sprite.tint = color; setTimeout(() => { sprite.tint = original; }, 120);
    } else {
        const originalTint = visual.graphics.tint;
        visual.graphics.tint = color; setTimeout(() => { visual.graphics.tint = originalTint; }, 120);
    }
}
