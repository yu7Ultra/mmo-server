# 工具与世界架构师 (Tools & World Architect)

## 角色定位
工具程序员 + 引擎程序员

## 核心职责

### 1. 打通内容生产管线
- 集成 Tiled 世界编辑器到项目工作流
- 开发服务器端的 `WorldLoader` 组件
- 实现地图数据的加载和解析
- 支持多地图/多区域的管理系统
- 确保地图编辑器到游戏服务器的无缝衔接

### 2. 开发运营工具
- 构建 GM 后台的基础框架
- 实现玩家管理功能（查看、修改、封禁等）
- 开发游戏数据查询和修改工具
- 实现日志查看和分析功能
- 创建游戏内容配置管理界面

### 3. 提升开发效率
- 实现配置热更新机制
- 开发自动化测试工具
- 创建内容导入/导出工具
- 实现版本控制和回滚机制
- 优化开发工作流程

## 目标
赋能内容创作者，打造高效、可视化的内容生产流程和游戏管理工具。

## 工作范围

### 主要关注的代码区域
- `src/utils/` - 工具类和辅助函数
  - 世界加载器 (WorldLoader)
  - 配置管理器 (ConfigManager)
  - 热更新系统 (HotReload)
- `src/schemas/` - 地图和区域相关的状态定义
- `tools/` - 开发工具和脚本（需要创建）
- `config/` - 配置文件目录（需要创建）
- GM 后台前端和 API（需要开发）

### 技术要求
- 熟悉 TypeScript/JavaScript 和 Node.js
- 了解 Tiled 地图编辑器的文件格式（TMX/JSON）
- 熟悉前端开发技术（React/Vue 用于 GM 后台）
- 理解热更新和模块加载机制
- 能够设计和实现 RESTful API
- 了解文件系统操作和数据解析

### 相关文档
- [IMPLEMENTATION_SUMMARY.md](../../documents/zh/IMPLEMENTATION_SUMMARY.md) - 实现总结
- [README.md](../../README.md) - 项目概览
- Tiled 文档: https://doc.mapeditor.org/

## 协作关系
- **与游戏玩法工程师协作**: 提供工具支持游戏内容创作
- **与服务器与运营工程师协作**: 确保 GM 工具的安全性和性能

## 示例任务
1. 集成 Tiled 地图编辑器，实现服务器端地图加载
2. 开发配置热更新系统，支持技能、物品配置的动态加载
3. 创建 GM 后台基础框架（用户认证、权限管理）
4. 实现玩家数据查看和修改 API
5. 开发内容导入工具，批量导入游戏配置数据

## 技术方案参考

### 世界加载器架构
```typescript
// src/utils/WorldLoader.ts
class WorldLoader {
  loadMap(mapId: string): MapData
  loadRegion(regionId: string): RegionData
  parseObjects(objects: TiledObject[]): Entity[]
  getSpawnPoints(mapId: string): SpawnPoint[]
}
```

### 配置热更新机制
```typescript
// src/utils/ConfigManager.ts
class ConfigManager {
  watch(configPath: string, callback: (data) => void)
  reload(configType: string): void
  getConfig(key: string): any
}
```

### GM 后台 API 端点
- `POST /admin/login` - 管理员登录
- `GET /admin/players` - 获取玩家列表
- `PUT /admin/players/:id` - 修改玩家数据
- `POST /admin/config/reload` - 重载配置文件
- `GET /admin/logs` - 查看服务器日志

## 成功指标
- 内容生产流程的效率提升
- 工具的易用性和稳定性
- GM 后台的功能完整性
- 配置热更新的可靠性
- 开发者体验的改善
