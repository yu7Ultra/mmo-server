import { Client, getStateCallbacks, Room } from 'colyseus.js';
import { Application, Graphics, Text, Container } from 'pixi.js';
import { MyRoomState } from './states/MyRoomState';
import { Player } from './states/Player';
import './style.css';

const client = new Client("ws://localhost:2567");

// Player visual representation
interface PlayerVisual {
    container: Container;
    graphics: Graphics;
    nameText: Text;
    healthBar: Graphics;
    manaBar: Graphics;
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

    // Create UI panels
    createUI(container);

    const app = new Application();
    await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x1a1a1a
    });
    const gameCanvas = document.getElementById('game-canvas');
    if (gameCanvas) {
        gameCanvas.appendChild(app.canvas);
    }

    const players = new Map<string, PlayerVisual>();
    const playersUnCallback = new Map<string, Function[]>();
    
    try {
        const room = await client.joinOrCreate<MyRoomState>("my_room", { name: "Player" + Math.floor(Math.random() * 1000) });
        const currentPlayerId = room.sessionId;

        const $$ = getStateCallbacks(room);

        // Setup UI handlers
        setupUIHandlers(room, currentPlayerId);

        $$(room.state).players.onAdd((player, sessionId) => {
            const isCurrentPlayer = sessionId === currentPlayerId;
            const playerVisual = createPlayerVisual(player, isCurrentPlayer);
            
            app.stage.addChild(playerVisual.container);
            players.set(sessionId, playerVisual);

            // Setup change listeners
            const callbacks = [
                $$(player).listen("x", (newValue) => { playerVisual.container.x = newValue; }),
                $$(player).listen("y", (newValue) => { playerVisual.container.y = newValue; }),
                $$(player).listen("health", () => updateHealthBar(playerVisual, player)),
                $$(player).listen("maxHealth", () => updateHealthBar(playerVisual, player)),
                $$(player).listen("mana", () => updateManaBar(playerVisual, player)),
                $$(player).listen("maxMana", () => updateManaBar(playerVisual, player)),
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
                app.stage.removeChild(playerVisual.container);
                players.delete(sessionId);
            }
            playersUnCallback.get(sessionId)?.forEach(unbind => unbind());
        });

        // Chat messages
        $$(room.state).chatMessages.onAdd((msg) => {
            addChatMessage(msg.sender, msg.message, msg.channel);
        });

        // Leaderboard updates
        $$(room.state).leaderboard.onChange(() => {
            updateLeaderboard(room.state.leaderboard);
        });

        // Periodic UI updates for cooldowns
        setInterval(() => {
            const myPlayer = room.state.players.get(currentPlayerId);
            if (myPlayer) {
                updateSkillsUI(myPlayer);
            }
        }, 100); // Update every 100ms for smooth cooldown display

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

    } catch (e) {
        console.error("JOIN ERROR", e);
    }
}

function createPlayerVisual(player: Player, isCurrentPlayer: boolean): PlayerVisual {
    const container = new Container();
    
    // Player body
    const color = isCurrentPlayer ? 0xff0000 : 0x00ff00;
    const graphics = new Graphics();
    graphics.circle(0, 0, 10);
    graphics.fill(color);
    
    // Combat indicator (initially hidden)
    if (!isCurrentPlayer) {
        graphics.lineStyle(2, 0xff0000, 0);
        graphics.circle(0, 0, 15);
    }
    
    // Name text
    const nameText = new Text({
        text: player.name,
        style: {
            fontSize: 12,
            fill: 0xffffff
        }
    });
    nameText.anchor.set(0.5, 1);
    nameText.y = -15;
    
    // Health bar background
    const healthBar = new Graphics();
    healthBar.rect(-15, -25, 30, 3);
    healthBar.fill(0x333333);
    
    // Mana bar background
    const manaBar = new Graphics();
    manaBar.rect(-15, -21, 30, 2);
    manaBar.fill(0x333333);
    
    container.addChild(graphics);
    container.addChild(nameText);
    container.addChild(healthBar);
    container.addChild(manaBar);
    container.x = player.x;
    container.y = player.y;
    
    // Make enemy players interactive
    if (!isCurrentPlayer) {
        container.eventMode = 'static';
        container.cursor = 'pointer';
    }
    
    const visual = { container, graphics, nameText, healthBar, manaBar };
    updateHealthBar(visual, player);
    updateManaBar(visual, player);
    
    return visual;
}

function updateHealthBar(visual: PlayerVisual, player: Player) {
    visual.healthBar.clear();
    visual.healthBar.rect(-15, -25, 30, 3);
    visual.healthBar.fill(0x333333);
    const healthPercent = player.health / player.maxHealth;
    visual.healthBar.rect(-15, -25, 30 * healthPercent, 3);
    visual.healthBar.fill(0x00ff00);
}

function updateManaBar(visual: PlayerVisual, player: Player) {
    visual.manaBar.clear();
    visual.manaBar.rect(-15, -21, 30, 2);
    visual.manaBar.fill(0x333333);
    const manaPercent = player.mana / player.maxMana;
    visual.manaBar.rect(-15, -21, 30 * manaPercent, 2);
    visual.manaBar.fill(0x0088ff);
}

function createUI(container: HTMLElement) {
    container.innerHTML = `
        <div id="game-container">
            <div id="game-canvas"></div>
            <div id="ui-overlay">
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
            </div>
        </div>
    `;
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
        infoEl.innerHTML = `
            <div class="stat-row">
                <span>等级: ${player.level}</span>
                <span>经验: ${player.experience}/${player.experienceToNext}</span>
            </div>
            <div class="stat-row">
                <span>生命: ${player.health}/${player.maxHealth}</span>
                <div class="bar"><div class="bar-fill" style="width: ${(player.health/player.maxHealth*100)}%; background: #00ff00;"></div></div>
            </div>
            <div class="stat-row">
                <span>魔法: ${player.mana}/${player.maxMana}</span>
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
    // Update skills
    const skillsList = document.getElementById('skills-list');
    if (skillsList) {
        skillsList.innerHTML = player.skills.map((skill, idx) => {
            const cooldownRemaining = Math.max(0, skill.cooldown - (Date.now() - skill.lastUsed));
            const isReady = cooldownRemaining === 0 && player.mana >= skill.manaCost;
            return `
                <div class="skill ${isReady ? 'ready' : 'cooldown'}">
                    <span class="skill-key">${idx + 1}</span>
                    <span class="skill-name">${skill.name}</span>
                    <span class="skill-cost">${skill.manaCost} 魔法</span>
                    ${!isReady && cooldownRemaining > 0 ? `<span class="skill-cooldown">${(cooldownRemaining/1000).toFixed(1)}s</span>` : ''}
                </div>
            `;
        }).join('');
    }
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

main();