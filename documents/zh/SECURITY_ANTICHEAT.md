# 安全与反作弊系统

MMO服务器的完整安全和反作弊文档。

## 概述

安全管理器提供实时验证和检测，以防止作弊并维护公平的游戏环境。

## 功能特性

### 移动验证
- 速度作弊检测
- 传送检测
- 位置不同步监控
- 服务器权威验证

### 战斗验证
- 攻击频率速率限制
- 冷却时间强制执行
- 技能刷屏检测

### 玩家举报系统
- 8个举报类别
- 重复举报预防
- 管理员审核队列
- 举报者跟踪

### 自动操作
- 警告系统（3次违规）
- 自动踢出（5次违规）
- 自动封禁（10次违规）
- 可配置阈值

### 安全指标
- `security_violations_total` - 按类型计数器
- `security_reports_total` - 按类别计数器
- `security_banned_players` - 仪表盘
- `security_actions_taken` - 按操作计数器

## 配置

```json
{
  "movement": {
    "maxSpeedMultiplier": 2.0,
    "teleportDistanceThreshold": 500,
    "validateInterval": 100
  },
  "combat": {
    "minAttackInterval": 100,
    "maxAttacksPerSecond": 10
  },
  "violations": {
    "warningThreshold": 3,
    "kickThreshold": 5,
    "banThreshold": 10,
    "violationExpiry": 86400000
  },
  "autoActions": {
    "enabled": true,
    "banDuration": 86400000
  }
}
```

## API使用

```typescript
import { getSecurityManager } from '../security/securityManager';

const security = getSecurityManager();

// 验证移动
const isValid = security.validateMovement(playerId, oldPos, newPos, deltaTime, playerSpeed);

// 验证攻击
const canAttack = security.validateAttack(playerId, skillId, cooldown);

// 举报玩家
const reportId = security.reportPlayer(reporterId, reportedId, 'cheating', 'Speed hacking');

// 检查是否被封禁
const isBanned = security.isPlayerBanned(playerId);

// 获取统计信息
const stats = security.getSecurityStats();
```

## 集成

### 移动系统

```typescript
// 在移动处理器中
if (!security.validateMovement(sessionId, oldPosition, newPosition, deltaTime, player.speed)) {
  // 拒绝移动
  return;
}
```

### 战斗系统

```typescript
// 攻击前
if (!security.validateAttack(sessionId, skillId, skill.cooldown)) {
  // 拒绝攻击
  return;
}
```

## 举报类别

- **cheating**: 使用作弊或漏洞
- **harassment**: 言语辱骂或骚扰
- **botting**: 自动化游戏
- **exploiting**: 利用游戏漏洞
- **spam**: 消息刷屏
- **inappropriate_name**: 攻击性用户名
- **real_money_trading**: 真实货币交易违规
- **other**: 其他违规

## 违规类型

- **speed_hack**: 移动速度超过可能值
- **teleport**: 瞬间位置变化
- **attack_spam**: 攻击过于频繁
- **position_desync**: 位置不匹配
- **impossible_action**: 物理上不可能的操作
- **suspicious_pattern**: 可疑行为模式

## 性能

- CPU影响：<2%
- 内存：每个活跃玩家约100字节
- 检测延迟：<10ms
- 网络：无额外带宽

## 生产部署

1. 在生产环境中启用安全验证
2. 监控安全指标
3. 定期审核举报
4. 根据需要调整阈值
5. 记录所有违规

## 最佳实践

1. 使用服务器权威验证
2. 记录所有违规以供审核
3. 结合多种检测方法
4. 允许人工GM审核
5. 提供申诉流程
6. 平衡误报与安全性

## 故障排除

### 误报

在配置中调整阈值：
- 对于延迟连接增加 `maxSpeedMultiplier`
- 对于传送增加 `teleportDistanceThreshold`
- 根据严重程度调整违规阈值

### 性能问题

- 降低验证频率
- 禁用自动操作
- 增加清理间隔
- 限制存储的违规记录

## 指标与监控

使用Prometheus跟踪：
```promql
# 违规率
rate(security_violations_total[5m])

# 按类别举报
security_reports_total

# 活跃封禁
security_banned_players

# 已采取的操作
rate(security_actions_taken[1h])
```

## 未来增强功能

- 机器学习模式检测
- 基于IP的跟踪
- 设备指纹识别
- 跨会话分析
- 高级行为分析