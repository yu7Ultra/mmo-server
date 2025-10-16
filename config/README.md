# Configuration Files

This directory contains game configuration files that are loaded at runtime.

## Files

- **skills.json** - Skill definitions including effects, cooldowns, and mana costs

## Configuration Hot Reload

All configuration files support hot reload. When a config file is modified, the server will automatically detect the change and reload the configuration without requiring a restart.

### Monitoring Config Changes

The ConfigManager logs all configuration reloads:
```
[ConfigManager] Reloaded config: skills
```

### Rollback

If a configuration change causes issues, you can rollback to a previous version:
```typescript
configManager.rollback('skills');
```

The system maintains the last 10 versions of each configuration file.

## Adding New Configurations

1. Create a new JSON file in this directory
2. Define TypeScript interfaces for the config structure in `src/config/`
3. Load the config using ConfigManager in the appropriate system
4. Listen for `config-updated` events to handle hot reloads

Example:
```typescript
import { configManager } from '../config/configManager';

// Load config
const config = configManager.loadConfig<MyConfig>('myconfig', 'config/myconfig.json');

// Listen for updates
configManager.on('config-updated', ({ configName, newData }) => {
  if (configName === 'myconfig') {
    // Handle reload
  }
});
```

## Configuration Validation

All configurations should include:
- `version` field (semantic versioning)
- `lastUpdated` timestamp (ISO 8601 format)

The ConfigManager will warn if these fields are missing.

## Best Practices

1. **Test changes locally** before committing config changes
2. **Use semantic versioning** - increment version numbers appropriately
3. **Document breaking changes** in commit messages
4. **Keep configs readable** - use proper indentation and comments where needed
5. **Validate JSON** before committing to avoid syntax errors

## Future Configurations

Planned configuration files (see ROADMAP.md):
- `monsters.json` - Monster AI behaviors and stats
- `items.json` - Item definitions and properties
- `loot-tables.json` - Drop rate configurations
- `spawn-points.json` - Monster/NPC spawn locations
- `balance.json` - Game balance parameters
