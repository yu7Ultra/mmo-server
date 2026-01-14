import { Room } from 'colyseus.js';
import { MyRoomState } from '../states/MyRoomState';
import { Player } from '../states/Player';
import { getMovementKeys, updateMovementKeys, DEFAULT_MOVEMENT_KEYS, ARROW_KEYS } from '../config/movementConfig';

export function createUI(container: HTMLElement) {
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
                    <div class="controls-info" id="controls-info">
                        <div>移动按键将在此显示</div>
                        <div>1-4 使用技能</div>
                        <div>点击敌人攻击</div>
                    </div>
                    <button id="settings-btn" class="settings-btn">⚙️ 设置</button>
                </div>
                <div id="settings-panel" class="panel hidden">
                    <h3>按键设置</h3>
                    <div class="settings-content">
                        <div class="key-config">
                            <h4>移动按键</h4>
                            <div class="key-row">
                                <label>上:</label>
                                <input type="text" id="key-up" class="key-input" maxlength="1" readonly>
                                <button class="key-change-btn" data-direction="up">更改</button>
                            </div>
                            <div class="key-row">
                                <label>下:</label>
                                <input type="text" id="key-down" class="key-input" maxlength="1" readonly>
                                <button class="key-change-btn" data-direction="down">更改</button>
                            </div>
                            <div class="key-row">
                                <label>左:</label>
                                <input type="text" id="key-left" class="key-input" maxlength="1" readonly>
                                <button class="key-change-btn" data-direction="left">更改</button>
                            </div>
                            <div class="key-row">
                                <label>右:</label>
                                <input type="text" id="key-right" class="key-input" maxlength="1" readonly>
                                <button class="key-change-btn" data-direction="right">更改</button>
                            </div>
                            <div class="preset-buttons">
                                <button id="preset-wasd" class="preset-btn">WASD</button>
                                <button id="preset-arrows" class="preset-btn">方向键</button>
                            </div>
                        </div>
                    </div>
                    <button id="close-settings" class="close-btn">关闭</button>
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
                <div id="loading-overlay" class="overlay hidden">
                    <div class="loader"></div>
                    <div class="text" id="loading-text">Loading...</div>
                </div>
            </div>
        </div>
    `;
}

export function setLoading(show: boolean, text?: string) {
    const overlay = document.getElementById('loading-overlay');
    const label = document.getElementById('loading-text');
    if (overlay) overlay.classList.toggle('hidden', !show);
    if (label && text) label.textContent = text;
}

export function updatePlayerUI(player: Player) {
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
                <div class="bar"><div class="bar-fill" style="width: ${(player.health / player.maxHealth * 100)}%; background: #00ff00;"></div></div>
            </div>
            <div class="stat-row">
                <span>魔法: ${player.mana.toFixed(1)}/${player.maxMana}</span>
                <div class="bar"><div class="bar-fill" style="width: ${(player.mana / player.maxMana * 100)}%; background: #0088ff;"></div></div>
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
    updateSkillsUI(player); updateQuestsUI(player); updateAchievementsUI(player);
}

export function updateSkillsUI(player: Player) {
    const skillIcons: { [key: string]: string } = { 'fireball': '🔥', 'heal': '💚', 'shield': '🛡️', 'dash': '🏃' };
    const skillsList = document.getElementById('skills-list');
    if (skillsList) {
        skillsList.innerHTML = player.skills.map((skill, idx) => {
            const cooldownRemaining = Math.max(0, skill.cooldown - (Date.now() - skill.lastUsed));
            const isReady = cooldownRemaining === 0 && player.mana >= skill.manaCost; const icon = skillIcons[skill.id] || '⚡';
            const cooldownPercent = cooldownRemaining > 0 ? ((skill.cooldown - cooldownRemaining) / skill.cooldown * 100) : 100;
            const tooltipParts = [skill.description || skill.name]; if (skill.damage > 0) { if (skill.id === 'heal') { tooltipParts.push(`恢复: ${skill.damage}`); } else { tooltipParts.push(`伤害: ${skill.damage}`); } }
            tooltipParts.push(`冷却: ${skill.cooldown / 1000}秒`); tooltipParts.push(`魔法消耗: ${skill.manaCost}`); const tooltip = tooltipParts.join(' | ');
            return `
                <div class="skill ${isReady ? 'ready' : 'cooldown'}" title="${tooltip}">
                    ${cooldownRemaining > 0 ? `<div class="skill-cooldown-overlay" style="width: ${cooldownPercent}%"></div>` : ''}
                    <span class="skill-key">${idx + 1}</span>
                    <span class="skill-icon">${icon}</span>
                    <span class="skill-name">${skill.name}</span>
                    <span class="skill-cost">${skill.manaCost} 魔法</span>
                    ${!isReady && cooldownRemaining > 0 ? `<span class="skill-cooldown">${(cooldownRemaining / 1000).toFixed(1)}s</span>` : ''}
                </div>
            `; }).join('');
    }
}

export function updateHotbar(player: Player) {
    const hotbar = document.getElementById('hotbar'); if (!hotbar) return; const icons: Record<string, string> = { fireball: '🔥', heal: '💚', shield: '🛡️', dash: '🏃' };
    hotbar.innerHTML = player.skills.map((skill, idx) => { const cooldownRemaining = Math.max(0, skill.cooldown - (Date.now() - skill.lastUsed)); const isReady = cooldownRemaining === 0 && player.mana >= skill.manaCost; const cdText = cooldownRemaining > 0 ? (cooldownRemaining / 1000).toFixed(1) : ''; return `<div class="hotbar-slot ${isReady ? 'ready' : 'cooldown'}" data-skill="${skill.id}" title="${skill.name}">
            <div class="key">${idx + 1}</div>
            <div class="ico">${icons[skill.id] || '⚡'}</div>
            ${!isReady ? `<div class="overlay"></div><div class="cd">${cdText}</div>` : ''}
        </div>`; }).join('');
}

function updateQuestsUI(player: Player) {
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
}

function updateAchievementsUI(player: Player) {
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

export function setupUIHandlers(room: Room<MyRoomState>, currentPlayerId: string) {
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const chatSend = document.getElementById('chat-send') as HTMLButtonElement;
    const sendChat = () => { const message = chatInput.value.trim(); if (message) { room.send('chat', { message, channel: 'global' }); chatInput.value = ''; } };
    chatSend?.addEventListener('click', sendChat); chatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });
    window.addEventListener('keypress', (e) => { const player = room.state.players.get(currentPlayerId); if (!player) return; const skillMap: { [key: string]: number } = { '1': 0, '2': 1, '3': 2, '4': 3 }; if (e.key in skillMap) { const skillIndex = skillMap[e.key]; if (player.skills[skillIndex]) { const skill = player.skills[skillIndex]; const cooldownRemaining = Math.max(0, skill.cooldown - (Date.now() - skill.lastUsed)); if (cooldownRemaining === 0 && player.mana >= skill.manaCost) { if (skill.id === 'heal' || skill.id === 'shield' || skill.id === 'dash') { room.send('attack', { targetId: currentPlayerId, skillId: skill.id }); } else { const target = findNearestEnemy(room.state, currentPlayerId, player as any); if (target) { room.send('attack', { targetId: target, skillId: skill.id }); } else { console.log('No valid target in range for skill'); } } } } } });
    
    // Setup settings panel handlers
    setupSettingsHandlers();
}

function setupSettingsHandlers() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettingsBtn = document.getElementById('close-settings');
    const presetWASDBtn = document.getElementById('preset-wasd');
    const presetArrowsBtn = document.getElementById('preset-arrows');
    
    // Show/hide settings panel
    settingsBtn?.addEventListener('click', () => {
        settingsPanel?.classList.remove('hidden');
        updateKeyDisplay();
    });
    
    closeSettingsBtn?.addEventListener('click', () => {
        settingsPanel?.classList.add('hidden');
    });
    
    // Preset buttons
    presetWASDBtn?.addEventListener('click', () => {
        updateMovementKeys(DEFAULT_MOVEMENT_KEYS);
        updateKeyDisplay();
        updateControlsInfo();
    });
    
    presetArrowsBtn?.addEventListener('click', () => {
        updateMovementKeys(ARROW_KEYS);
        updateKeyDisplay();
        updateControlsInfo();
    });
    
    // Key change buttons
    const keyChangeButtons = document.querySelectorAll('.key-change-btn');
    keyChangeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const direction = (e.target as HTMLElement).dataset.direction;
            if (direction) {
                startKeyChange(direction);
            }
        });
    });
    
    // Initialize display
    updateKeyDisplay();
    updateControlsInfo();
}

function updateKeyDisplay() {
    const keys = getMovementKeys();
    const keyUp = document.getElementById('key-up') as HTMLInputElement;
    const keyDown = document.getElementById('key-down') as HTMLInputElement;
    const keyLeft = document.getElementById('key-left') as HTMLInputElement;
    const keyRight = document.getElementById('key-right') as HTMLInputElement;
    
    if (keyUp) keyUp.value = keys.up.toUpperCase();
    if (keyDown) keyDown.value = keys.down.toUpperCase();
    if (keyLeft) keyLeft.value = keys.left.toUpperCase();
    if (keyRight) keyRight.value = keys.right.toUpperCase();
}

function updateControlsInfo() {
    const keys = getMovementKeys();
    const controlsInfo = document.getElementById('controls-info');
    if (controlsInfo) {
        controlsInfo.innerHTML = `
            <div>${keys.up.toUpperCase()}${keys.down.toUpperCase()}${keys.left.toUpperCase()}${keys.right.toUpperCase()} 移动</div>
            <div>1-4 使用技能</div>
            <div>点击敌人攻击</div>
        `;
    }
}

let currentKeyChangeDirection: string | null = null;

function startKeyChange(direction: string) {
    currentKeyChangeDirection = direction;
    const button = document.querySelector(`[data-direction="${direction}"]`) as HTMLButtonElement;
    if (button) {
        button.textContent = '按下任意键...';
        button.disabled = true;
    }
    
    // Add temporary key listener
    const handleKeyDown = (e: KeyboardEvent) => {
        if (currentKeyChangeDirection === direction) {
            e.preventDefault();
            e.stopPropagation();
            
            const newKey = e.key.toLowerCase();
            
            // Update the key
            updateMovementKeys({ [direction]: newKey });
            
            // Update display
            updateKeyDisplay();
            updateControlsInfo();
            
            // Reset button
            if (button) {
                button.textContent = '更改';
                button.disabled = false;
            }
            
            // Clean up
            currentKeyChangeDirection = null;
            window.removeEventListener('keydown', handleKeyDown, true);
        }
    };
    
    window.addEventListener('keydown', handleKeyDown, true);
}

function findNearestEnemy(state: MyRoomState, currentPlayerId: string, currentPlayer: Player): string | null {
    const MAX_SKILL_RANGE = 200;
    let nearestId: string | null = null;
    let nearestDistance = Infinity;

    // Priority 1: Check monsters first (within range)
    state.monsters.forEach((monster: any, monsterId: string) => {
        if (monster.state === 'dead') return; // Skip dead monsters
        const dx = monster.x - currentPlayer.x;
        const dy = monster.y - currentPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= MAX_SKILL_RANGE && distance < nearestDistance) {
            nearestDistance = distance;
            nearestId = monsterId;
        }
    });

    // If found monster in range, return it
    if (nearestId) {
        console.log(`Skill targeting monster: ${nearestId} distance: ${nearestDistance.toFixed(0)}px`);
        return nearestId;
    }

    // Priority 2: Fall back to players (within range)
    state.players.forEach((player: Player, sessionId: string) => {
        if (sessionId === currentPlayerId) return; // Skip self
        const dx = player.x - currentPlayer.x;
        const dy = player.y - currentPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= MAX_SKILL_RANGE && distance < nearestDistance) {
            nearestDistance = distance;
            nearestId = sessionId;
        }
    });

    if (nearestId) {
        console.log(`Skill targeting player: ${nearestId} distance: ${nearestDistance.toFixed(0)}px`);
    } else {
        console.log(`No target in range (max: ${MAX_SKILL_RANGE}px)`);
    }

    return nearestId;
}
