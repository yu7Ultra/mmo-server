# MMO Server Documentation

Welcome to the MMO Server documentation. This directory contains organized documentation in both English and Chinese.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     MMO Server Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐         ┌─────────────┐                    │
│  │   Client    │◄───────►│   Server    │                    │
│  │ (Pixi.js +  │  WebSocket│ (Colyseus + │                    │
│  │  Vite)      │         │  uWS)       │                    │
│  └─────────────┘         └──────┬──────┘                    │
│                                  │                            │
│                          ┌───────┴───────┐                   │
│                          │                │                   │
│                    ┌─────▼─────┐   ┌─────▼─────┐            │
│                    │   Rooms   │   │  Systems   │            │
│                    │ (MyRoom)  │   │  (ECS)     │            │
│                    └─────┬─────┘   └─────┬──────┘            │
│                          │                │                   │
│                    ┌─────▼────────────────▼─────┐            │
│                    │    State Management         │            │
│                    │  (Colyseus Schema)          │            │
│                    └──────────────────────────────┘           │
│                                                               │
│  Features: Combat, Skills, Quests, Achievements, Chat,       │
│            Voice (WebRTC), Leaderboard, Social                │
│                                                               │
│  Performance: Metrics, Profiling, Rate Limiting, Pooling     │
└─────────────────────────────────────────────────────────────┘
```

## Documentation Structure

```
documents/
├── README.md (this file)
├── en/                    # English Documentation
│   ├── FEATURES.md
│   ├── PERFORMANCE.md
│   ├── USAGE_EXAMPLES.md
│   ├── VOICE_INTEGRATION.md
│   ├── VOICE_CLIENT_EXAMPLE.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── CLIENT_ENHANCEMENT_SUMMARY.md
│   └── VOICE_IMPLEMENTATION_SUMMARY.md
├── zh/                    # Chinese Documentation (中文文档)
│   ├── MINIPLEX_DOCS_CN.md
│   ├── CLIENT_README.md
│   ├── CLIENT_FEATURES.md
│   ├── CLIENT_USAGE_EXAMPLES.md
│   └── POWERSHELL_HELP.md
└── images/                # Documentation Images
```

## English Documentation

### Core Documentation
- **[FEATURES.md](./en/FEATURES.md)** - Complete feature documentation for all game systems
- **[PERFORMANCE.md](./en/PERFORMANCE.md)** - Performance optimization guide and profiling instructions
- **[USAGE_EXAMPLES.md](./en/USAGE_EXAMPLES.md)** - Code examples for using server features

### Voice Communication
- **[VOICE_INTEGRATION.md](./en/VOICE_INTEGRATION.md)** - Technical integration guide for voice communication
- **[VOICE_CLIENT_EXAMPLE.md](./en/VOICE_CLIENT_EXAMPLE.md)** - Complete client-side voice implementation examples

### Implementation Details
- **[IMPLEMENTATION_SUMMARY.md](./en/IMPLEMENTATION_SUMMARY.md)** - Summary of MMO server enhancements
- **[CLIENT_ENHANCEMENT_SUMMARY.md](./en/CLIENT_ENHANCEMENT_SUMMARY.md)** - Client feature enhancements overview
- **[VOICE_IMPLEMENTATION_SUMMARY.md](./en/VOICE_IMPLEMENTATION_SUMMARY.md)** - Voice system implementation details

## Chinese Documentation (中文文档)

### 核心文档
- **[MINIPLEX_DOCS_CN.md](./zh/MINIPLEX_DOCS_CN.md)** - Miniplex ECS 框架中文文档
- **[CLIENT_README.md](./zh/CLIENT_README.md)** - 客户端说明文档
- **[CLIENT_FEATURES.md](./zh/CLIENT_FEATURES.md)** - 客户端功能使用指南
- **[CLIENT_USAGE_EXAMPLES.md](./zh/CLIENT_USAGE_EXAMPLES.md)** - 客户端使用示例

### 其他
- **[POWERSHELL_HELP.md](./zh/POWERSHELL_HELP.md)** - PowerShell 执行策略帮助

## Quick Links

### For Developers
1. Start with [FEATURES.md](./en/FEATURES.md) to understand available systems
2. Refer to [USAGE_EXAMPLES.md](./en/USAGE_EXAMPLES.md) for integration examples
3. Check [PERFORMANCE.md](./en/PERFORMANCE.md) for optimization techniques

### For Chinese Developers (中文开发者)
1. 从 [CLIENT_README.md](./zh/CLIENT_README.md) 开始了解客户端
2. 参考 [CLIENT_FEATURES.md](./zh/CLIENT_FEATURES.md) 了解功能详情
3. 查看 [CLIENT_USAGE_EXAMPLES.md](./zh/CLIENT_USAGE_EXAMPLES.md) 获取使用示例

### Voice Communication Setup
1. Read [VOICE_INTEGRATION.md](./en/VOICE_INTEGRATION.md) for architecture and API
2. Use [VOICE_CLIENT_EXAMPLE.md](./en/VOICE_CLIENT_EXAMPLE.md) for implementation

## Contributing

When adding new documentation:
- Place English documentation in `documents/en/`
- Place Chinese documentation in `documents/zh/`
- Add images to `documents/images/` and reference them in markdown
- Update this README.md with links to new documents
- Use descriptive filenames in UPPER_SNAKE_CASE.md format
