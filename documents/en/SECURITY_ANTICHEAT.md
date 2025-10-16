# Security & Anti-cheat System

Complete security and anti-cheat documentation for the MMO server.

## Overview

The Security Manager provides real-time validation and detection to prevent cheating and maintain fair gameplay.

## Features

### Movement Validation
- Speed hack detection
- Teleportation detection
- Position desync monitoring
- Server-authoritative validation

### Combat Validation
- Attack frequency rate limiting
- Cooldown enforcement
- Skill spam detection

### Player Report System
- 8 report categories
- Duplicate prevention
- Admin review queue
- Reporter tracking

### Automatic Actions
- Warning system (3 violations)
- Auto-kick (5 violations)
- Auto-ban (10 violations)
- Configurable thresholds

### Security Metrics
- `security_violations_total` - Counter by type
- `security_reports_total` - Counter by category
- `security_banned_players` - Gauge
- `security_actions_taken` - Counter by action

## Configuration

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

## API Usage

```typescript
import { getSecurityManager } from '../security/securityManager';

const security = getSecurityManager();

// Validate movement
const isValid = security.validateMovement(playerId, oldPos, newPos, deltaTime, playerSpeed);

// Validate attack
const canAttack = security.validateAttack(playerId, skillId, cooldown);

// Report player
const reportId = security.reportPlayer(reporterId, reportedId, 'cheating', 'Speed hacking');

// Check if banned
const isBanned = security.isPlayerBanned(playerId);

// Get statistics
const stats = security.getSecurityStats();
```

## Integration

### Movement System

```typescript
// In movement handler
if (!security.validateMovement(sessionId, oldPosition, newPosition, deltaTime, player.speed)) {
  // Reject movement
  return;
}
```

### Combat System

```typescript
// Before attack
if (!security.validateAttack(sessionId, skillId, skill.cooldown)) {
  // Reject attack
  return;
}
```

## Report Categories

- **cheating**: Using cheats or exploits
- **harassment**: Verbal abuse or harassment
- **botting**: Automated gameplay
- **exploiting**: Exploiting game bugs
- **spam**: Message spam
- **inappropriate_name**: Offensive username
- **real_money_trading**: RMT violations
- **other**: Other violations

## Violation Types

- **speed_hack**: Movement faster than possible
- **teleport**: Instant position changes
- **attack_spam**: Attacks too frequently
- **position_desync**: Position mismatch
- **impossible_action**: Physically impossible actions
- **suspicious_pattern**: Suspicious behavior patterns

## Performance

- CPU Impact: <2%
- Memory: ~100 bytes per active player
- Detection Latency: <10ms
- Network: No additional bandwidth

## Production Deployment

1. Enable security validation in production
2. Monitor security metrics
3. Review reports regularly
4. Adjust thresholds as needed
5. Log all violations

## Best Practices

1. Use server-authoritative validation
2. Log all violations for review
3. Combine multiple detection methods
4. Allow manual GM review
5. Provide appeal process
6. Balance false positives vs security

## Troubleshooting

### False Positives

Adjust thresholds in config:
- Increase `maxSpeedMultiplier` for laggy connections
- Increase `teleportDistanceThreshold` for warping
- Adjust violation thresholds for severity

### Performance Issues

- Reduce validation frequency
- Disable auto-actions
- Increase cleanup interval
- Limit stored violations

## Metrics & Monitoring

Use Prometheus to track:
```promql
# Violation rate
rate(security_violations_total[5m])

# Reports by category
security_reports_total

# Active bans
security_banned_players

# Actions taken
rate(security_actions_taken[1h])
```

## Future Enhancements

- Machine learning pattern detection
- IP-based tracking
- Device fingerprinting
- Cross-session analysis
- Advanced behavioral analysis

