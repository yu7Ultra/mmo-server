# 中文文档

本目录包含 MMO Server 项目的所有中文文档。

## 文档索引

### 📚 核心文档

| 文档 | 描述 | 内容 |
|------|------|------|
| [FEATURES.md](./FEATURES.md) | 完整功能文档 | 战斗、技能、任务、成就、聊天、语音、安全 |
| [PERFORMANCE.md](./PERFORMANCE.md) | 性能优化指南 | 性能分析、指标、最佳实践 |
| [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) | 代码示例和片段 | 客户端集成、API 使用 |

### 🎮 客户端文档

| 文档 | 描述 | 内容 |
|------|------|------|
| [CLIENT_README.md](./CLIENT_README.md) | 客户端概览和设置 | 安装、功能、控制方式 |
| [CLIENT_FEATURES.md](./CLIENT_FEATURES.md) | 客户端功能指南 | 详细功能使用、服务器集成 |
| [CLIENT_USAGE_EXAMPLES.md](./CLIENT_USAGE_EXAMPLES.md) | 客户端使用示例 | 游戏场景、调试技巧 |

### 🎙️ 语音通讯

| 文档 | 描述 | 用途 |
|------|------|------|
| [VOICE_INTEGRATION.md](./VOICE_INTEGRATION.md) | 技术集成指南 | 开发者实现语音功能 |
| [VOICE_CLIENT_EXAMPLE.md](./VOICE_CLIENT_EXAMPLE.md) | 完整工作示例 | 可复制粘贴的客户端实现 |
| [VOICE_IMPLEMENTATION_SUMMARY.md](./VOICE_IMPLEMENTATION_SUMMARY.md) | 实现细节 | 理解语音系统架构 |

### 📝 实现总结

| 文档 | 描述 | 受众 |
|------|------|------|
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | 服务器整体增强 | 开发者和项目干系人 |
| [CLIENT_ENHANCEMENT_SUMMARY.md](./CLIENT_ENHANCEMENT_SUMMARY.md) | 客户端功能添加 | 前端开发者 |

### 🔧 框架和工具

| 文档 | 描述 | 内容 |
|------|------|------|
| [MINIPLEX_DOCS_CN.md](./MINIPLEX_DOCS_CN.md) | Miniplex ECS 框架指南 | 实体组件系统使用 |
| [POWERSHELL_HELP.md](./POWERSHELL_HELP.md) | PowerShell 设置帮助 | Windows 环境配置 |

## 快速开始

### 新手入门
1. 阅读 [CLIENT_README.md](./CLIENT_README.md) 了解客户端基本功能
2. 参考 [CLIENT_USAGE_EXAMPLES.md](./CLIENT_USAGE_EXAMPLES.md) 查看实际使用示例
3. 查看 [CLIENT_FEATURES.md](./CLIENT_FEATURES.md) 了解所有可用功能

### 开发者
1. 学习 [MINIPLEX_DOCS_CN.md](./MINIPLEX_DOCS_CN.md) 理解 ECS 架构
2. 阅读 [CLIENT_FEATURES.md](./CLIENT_FEATURES.md) 了解如何集成服务器功能
3. 参考 [CLIENT_USAGE_EXAMPLES.md](./CLIENT_USAGE_EXAMPLES.md) 的代码示例

## 文档分类

### 客户端文档
- **[CLIENT_README.md](./CLIENT_README.md)** - 客户端概览和快速开始
- **[CLIENT_FEATURES.md](./CLIENT_FEATURES.md)** - 功能详细说明
- **[CLIENT_USAGE_EXAMPLES.md](./CLIENT_USAGE_EXAMPLES.md)** - 使用示例和场景演示

### 框架文档
- **[MINIPLEX_DOCS_CN.md](./MINIPLEX_DOCS_CN.md)** - Miniplex ECS 框架完整指南

### 工具文档
- **[POWERSHELL_HELP.md](./POWERSHELL_HELP.md)** - Windows PowerShell 配置

## 游戏系统概览

客户端支持的游戏系统：
- ✅ **移动系统** - 方向键控制角色移动
- ✅ **战斗系统** - 点击攻击和技能战斗
- ✅ **技能系统** - 4种技能（火球、治疗、护盾、冲刺）
- ✅ **任务系统** - 任务追踪和完成
- ✅ **成就系统** - 成就解锁和进度显示
- ✅ **排行榜** - 玩家排名显示
- ✅ **聊天系统** - 实时聊天交流
- ✅ **社交系统** - 好友管理

详细说明请参阅 [CLIENT_FEATURES.md](./CLIENT_FEATURES.md)。

## 相关文档

- **English Documentation**: 查看 [../en/](../en/) 获取英文文档
- **Main README**: [../../README.md](../../README.md) 项目主说明
- **Client Directory**: [../../client/](../../client/) 客户端代码

## 贡献指南

添加新的中文文档时：
- 将文档放在此目录 `documents/zh/`
- 使用清晰的文件名（大写下划线格式）
- 在本 README.md 中添加文档链接
- 如需图片，放在 `documents/images/` 并引用
