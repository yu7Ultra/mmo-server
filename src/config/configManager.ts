import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

/**
 * ConfigManager - Manages configuration files with hot-reload support
 * 
 * Features:
 * - Load and cache configuration files
 * - Watch for file changes and auto-reload
 * - Maintain version history for rollback
 * - Emit events on configuration updates
 */
export class ConfigManager extends EventEmitter {
  private configs: Map<string, any> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private configHistory: Map<string, ConfigHistory[]> = new Map();
  private maxHistorySize: number = 10;

  /**
   * Load a configuration file
   * @param configName - Unique name for this config
   * @param configPath - Path to the config file
   * @param watch - Whether to watch for changes (default: true)
   */
  loadConfig<T>(configName: string, configPath: string, watch: boolean = true): T {
    const absolutePath = path.isAbsolute(configPath) 
      ? configPath 
      : path.join(process.cwd(), configPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Config file not found: ${absolutePath}`);
    }

    const data = this.parseConfigFile(absolutePath);
    this.validateConfig(configName, data);
    
    this.configs.set(configName, data);
    console.log(`[ConfigManager] Loaded config: ${configName} from ${configPath}`);

    // Watch for file changes
    if (watch && !this.watchers.has(configName)) {
      const watcher = fs.watch(absolutePath, (eventType) => {
        if (eventType === 'change') {
          this.reloadConfig(configName, absolutePath);
        }
      });
      this.watchers.set(configName, watcher);
    }

    return data as T;
  }

  /**
   * Parse configuration file (supports JSON)
   */
  private parseConfigFile(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      return JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to parse config file ${filePath}: ${err}`);
    }
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(configName: string, data: any): void {
    if (!data) {
      throw new Error(`Config ${configName} is empty or invalid`);
    }

    // Check for version field
    if (!data.version) {
      console.warn(`[ConfigManager] Config ${configName} does not have a version field`);
    }
  }

  /**
   * Reload configuration from file
   */
  private reloadConfig(configName: string, configPath: string): void {
    try {
      const newData = this.parseConfigFile(configPath);
      this.validateConfig(configName, newData);
      
      const oldData = this.configs.get(configName);

      // Save to history
      this.saveToHistory(configName, oldData);

      // Update config
      this.configs.set(configName, newData);

      console.log(`[ConfigManager] Reloaded config: ${configName}`);
      this.emit('config-updated', { configName, oldData, newData });
    } catch (err) {
      console.error(`[ConfigManager] Failed to reload ${configName}:`, err);
      this.emit('config-reload-error', { configName, error: err });
    }
  }

  /**
   * Save configuration to history
   */
  private saveToHistory(configName: string, data: any): void {
    if (!this.configHistory.has(configName)) {
      this.configHistory.set(configName, []);
    }

    const history = this.configHistory.get(configName)!;
    history.push({
      data,
      timestamp: Date.now(),
      version: data?.version || 'unknown'
    });

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Get current configuration
   */
  getConfig<T>(configName: string): T | undefined {
    return this.configs.get(configName) as T;
  }

  /**
   * Rollback to previous configuration version
   */
  rollback(configName: string): boolean {
    const history = this.configHistory.get(configName);
    if (!history || history.length === 0) {
      console.warn(`[ConfigManager] No history available for ${configName}`);
      return false;
    }

    const previous = history.pop();
    if (!previous) return false;

    const oldData = this.configs.get(configName);
    this.configs.set(configName, previous.data);
    
    console.log(`[ConfigManager] Rolled back ${configName} to version ${previous.version}`);
    this.emit('config-updated', { configName, oldData, newData: previous.data });
    
    return true;
  }

  /**
   * Get configuration history
   */
  getHistory(configName: string): ConfigHistory[] {
    return this.configHistory.get(configName) || [];
  }

  /**
   * Manually trigger reload
   */
  reload(configName: string): boolean {
    const watcher = this.watchers.get(configName);
    if (!watcher) {
      console.warn(`[ConfigManager] No watcher found for ${configName}`);
      return false;
    }

    // Trigger reload by emitting event
    this.emit('reload-requested', configName);
    return true;
  }

  /**
   * Clean up watchers and resources
   */
  dispose(): void {
    this.watchers.forEach((watcher, name) => {
      watcher.close();
      console.log(`[ConfigManager] Closed watcher for ${name}`);
    });
    this.watchers.clear();
    this.configs.clear();
    this.configHistory.clear();
  }

  /**
   * List all loaded configurations
   */
  listConfigs(): string[] {
    return Array.from(this.configs.keys());
  }
}

/**
 * Configuration history entry
 */
interface ConfigHistory {
  data: any;
  timestamp: number;
  version: string;
}

/**
 * Singleton instance
 */
export const configManager = new ConfigManager();
