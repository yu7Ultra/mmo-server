# MMO 服务器使用示例

本文件包含 MMO 服务器功能的使用示例。

## 客户端连接

```typescript
import { Client } from 'colyseus.js';

const client = new Client('ws://localhost:2567');

// 使用玩家名称加入房间
const room = await client.joinOrCreate('my_room', {
  name: 'PlayerName'
});

console.log('已加入房间:', room.id);
```

## 移动

```typescript
// 发送移动命令
room.send('move', { x: 1, y: 0 }); // 向右移动
room.send('move', { x: -1, y: 0 }); // 向左移动
room.send('move', { x: 0, y: 1 }); // 向下移动
room.send('move', { x: 0, y: -1 }); // 向上移动
room.send('move', { x: 0, y: 0 }); // 停止
```

## 战斗

```typescript
// 攻击其他玩家
room.send('attack', {
  targetId: 'target_session_id'
});

// 使用技能攻击
room.send('attack', {
  targetId: 'target_session_id',
  skillId: 'fireball' // 或 'heal', 'shield', 'dash'
});
```

## 聊天

```typescript
// 发送全局聊天消息
room.send('chat', {
  message: 'Hello everyone!',
  channel: 'global'
});

// 发送队伍消息
room.send('chat', {
  message: 'Let\'s group up!',
  channel: 'team'
});
```

## 好友

```typescript
// 添加好友
room.send('friend', {
  targetId: 'friend_session_id',
  action: 'add'
});

// 删除好友
room.send('friend', {
  targetId: 'friend_session_id',
  action: 'remove'
});
```

## 任务

```typescript
// 放弃任务
room.send('quest', {
  questId: 'kill_enemies_1',
  action: 'abandon'
});
```

## 监听状态变化

```typescript
// 监听玩家变化
room.state.players.onAdd((player, sessionId) => {
  console.log('玩家加入:', sessionId);
  
  // 监听玩家属性变化
  player.onChange(() => {
    console.log('玩家更新:', {
      name: player.name,
      level: player.level,
      health: player.health,
      experience: player.experience
    });
  });
});

room.state.players.onRemove((player, sessionId) => {
  console.log('玩家离开:', sessionId);
});

// 监听聊天消息
room.state.chatMessages.onAdd((message) => {
  console.log(`[${message.channel}] ${message.sender}: ${message.message}`);
});

// 监听排行榜变化
room.state.leaderboard.onChange(() => {
  console.log('排行榜更新:');
  room.state.leaderboard.forEach((entry, index) => {
    console.log(`${entry.rank}. ${entry.playerName} - 等级 ${entry.level} - 分数: ${entry.score}`);
  });
});
```

## 访问玩家数据

```typescript
const myPlayer = room.state.players.get(room.sessionId);

// 角色信息
console.log('等级:', myPlayer.level);
console.log('经验:', myPlayer.experience, '/', myPlayer.experienceToNext);

// 战斗属性
console.log('生命值:', myPlayer.health, '/', myPlayer.maxHealth);
console.log('魔法值:', myPlayer.mana, '/', myPlayer.maxMana);
console.log('攻击:', myPlayer.attack);
console.log('防御:', myPlayer.defense);

// 技能
myPlayer.skills.forEach(skill => {
  const cooldownRemaining = Math.max(0, skill.cooldown - (Date.now() - skill.lastUsed));
  console.log(`${skill.name}: ${cooldownRemaining > 0 ? '冷却中' : '就绪'}`);
});

// 任务
myPlayer.quests.forEach(quest => {
  console.log(`${quest.name}: ${quest.progress}/${quest.target} ${quest.completed ? '✓' : ''}`);
});

// 成就
myPlayer.achievements.forEach(achievement => {
  if (achievement.unlocked) {
    console.log(`✓ ${achievement.name}: ${achievement.description}`);
  }
});

// 统计
console.log('击杀/死亡:', myPlayer.kills, '/', myPlayer.deaths);
console.log('造成伤害:', myPlayer.damageDealt);
console.log('承受伤害:', myPlayer.damageTaken);

// 好友
console.log('好友:', myPlayer.friends.length);
```

## 完整游戏循环示例

```typescript
import { Client } from 'colyseus.js';

async function main() {
  const client = new Client('ws://localhost:2567');
  const room = await client.joinOrCreate('my_room', { name: 'Hero' });
  
  console.log('已连接到房间:', room.id);
  
  // 监听状态
  room.state.players.onAdd((player, sessionId) => {
    console.log('玩家加入:', player.name);
  });
  
  room.state.chatMessages.onAdd((msg) => {
    console.log(`[${msg.channel}] ${msg.sender}: ${msg.message}`);
  });
  
  // 发送初始聊天
  room.send('chat', { message: 'Hello world!', channel: 'global' });
  
  // 游戏循环
  let moveDirection = { x: 1, y: 0 };
  let skillCooldowns = {};
  
  setInterval(() => {
    const myPlayer = room.state.players.get(room.sessionId);
    if (!myPlayer) return;
    
    // 移动
    room.send('move', moveDirection);
    
    // 生命值低时使用治疗技能
    if (myPlayer.health < myPlayer.maxHealth * 0.5) {
      const healSkill = myPlayer.skills.find(s => s.id === 'heal');
      if (healSkill) {
        const cooldownRemaining = Math.max(0, healSkill.cooldown - (Date.now() - healSkill.lastUsed));
        if (cooldownRemaining === 0) {
          room.send('attack', { targetId: room.sessionId, skillId: 'heal' });
        }
      }
    }
    
    // 查找并攻击附近的敌人
    room.state.players.forEach((otherPlayer, otherId) => {
      if (otherId !== room.sessionId && !myPlayer.inCombat) {
        // 计算距离（简化版）
        const dx = otherPlayer.x - myPlayer.x;
        const dy = otherPlayer.y - myPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          room.send('attack', { targetId: otherId, skillId: 'fireball' });
        }
      }
    });
    
  }, 100); // 每秒 10 次更新
  
  // 处理断开连接
  room.onLeave((code) => {
    console.log('离开房间，代码:', code);
  });
}

main().catch(console.error);
```

## 性能提示

1. **批量更新**: 不要在每一帧发送消息，使用合理的间隔
2. **客户端预测**: 立即更新本地状态，然后与服务器协调
3. **兴趣管理**: 只追踪附近的实体，而不是所有玩家
4. **节流状态变化**: 谨慎使用 onChange 回调
5. **缓存计算**: 预计算距离和冷却时间

## 安全注意事项

1. 所有消息在服务器端都有速率限制
2. 输入已验证和清理
3. 不要信任客户端数据 - 服务器是权威的
4. 聊天消息会过滤亵渎内容
5. 玩家名称已验证（字母数字，3-20 字符）

## 语音通讯

### 加入语音频道

```typescript
// 加入全局语音频道
room.send('voice:join', { channelId: 'global' });

// 监听频道更新
room.state.voiceChannels.onAdd((channel, channelId) => {
  console.log('语音频道可用:', channel.name);
  
  // 监听成员
  channel.members.onAdd((member, sessionId) => {
    console.log(`${member.playerName} 加入语音`);
    if (member.muted) console.log('  (静音)');
  });
});
```

### 创建语音频道

```typescript
// 创建团队语音频道
room.send('voice:create', {
  name: 'Team Alpha',
  type: 'group',      // 'global', 'proximity', 'group', 'private'
  maxMembers: 10
});

// 创建私人通话
room.send('voice:create', {
  name: 'Private Call',
  type: 'private',
  maxMembers: 2
});
```

### 语音控制

```typescript
// 切换静音
room.send('voice:mute', { muted: true });

// 切换屏蔽（无法听到其他人）
room.send('voice:deafen', { deafened: true });

// 离开语音频道
room.send('voice:leave');
```

### WebRTC 语音设置

```typescript
// 为语音聊天设置对等连接
const peerConnections = new Map<string, RTCPeerConnection>();

// 创建与其他玩家的对等连接
async function setupVoiceConnection(peerId: string) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  peerConnections.set(peerId, pc);
  
  // 添加麦克风流
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  
  // 接收对等方的音频
  pc.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.play();
  };
  
  // 处理 ICE 候选
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      room.send('voice:signal', {
        to: peerId,
        type: 'ice-candidate',
        data: event.candidate.toJSON()
      });
    }
  };
  
  // 创建并发送 offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  
  room.send('voice:signal', {
    to: peerId,
    type: 'offer',
    data: offer
  });
}

// 处理信令消息
room.onMessage('voice:signal', async (message) => {
  const { from, type, data } = message;
  
  let pc = peerConnections.get(from);
  
  if (type === 'offer') {
    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnections.set(from, pc);
      // ... 设置处理器
    }
    
    await pc.setRemoteDescription(new RTCSessionDescription(data));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    room.send('voice:signal', {
      to: from,
      type: 'answer',
      data: answer
    });
  } else if (type === 'answer') {
    await pc?.setRemoteDescription(new RTCSessionDescription(data));
  } else if (type === 'ice-candidate') {
    await pc?.addIceCandidate(new RTCIceCandidate(data));
  }
});

// 当成员加入你的频道时
room.state.voiceChannels.get(myChannelId).members.onAdd((member, sessionId) => {
  if (sessionId !== room.sessionId) {
    setupVoiceConnection(sessionId);
  }
});
```

### 语音频道信息

```typescript
// 获取当前语音频道
const myPlayer = room.state.players.get(room.sessionId);
if (myPlayer.currentVoiceChannel) {
  const channel = room.state.voiceChannels.get(myPlayer.currentVoiceChannel);
  console.log('在频道:', channel.name);
  console.log('成员:', channel.members.size);
  
  // 列出成员
  channel.members.forEach((member, sessionId) => {
    console.log(`  - ${member.playerName} ${member.muted ? '(静音)' : ''}`);
  });
}

// 列出所有可用频道
room.state.voiceChannels.forEach((channel, channelId) => {
  console.log(`${channel.name} (${channel.type}): ${channel.members.size}/${channel.maxMembers}`);
});
```
