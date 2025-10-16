# MMO Server Documentation Index

This index organizes all documentation files in the MMO Server project for easy navigation and reference.

**Translation Status**: 16/22 documents translated (72.7% complete) - 6 Chinese translations missing
**Note**: Some technical documents are currently available only in English. Chinese translations are planned for future updates. Documents marked with *(English only)* do not have Chinese versions yet.

## 1. Project Overview & Setup

- [README.md](../README.md) - Main project README with installation, setup, and architecture overview
- [ROADMAP_STATUS.md](../ROADMAP_STATUS.md) - Development roadmap and current status
- [DOCUMENTATION_MIGRATION.md](../DOCUMENTATION_MIGRATION.md) - Documentation migration guide
- [ATTRIBUTIONS.md](../ATTRIBUTIONS.md) - Third-party attributions and licenses
- [documents/README.md](README.md) - General documentation overview

## 2. Technical Architecture & Implementation

### ECS & Framework Documentation
- [MINIPLEX_DOCS.md](en/MINIPLEX_DOCS.md) - Miniplex ECS framework documentation (English)
- [MINIPLEX_DOCS_CN.md](zh/MINIPLEX_DOCS_CN.md) - Miniplex ECS framework documentation (Chinese)

### Voice System
- [VOICE_IMPLEMENTATION_SUMMARY.md](../VOICE_IMPLEMENTATION_SUMMARY.md) - Voice system implementation summary
- [VOICE_VERIFICATION.md](../VOICE_VERIFICATION.md) - Voice verification process and guidelines
- [VOICE_TEST_INSTRUCTIONS.md](../VOICE_TEST_INSTRUCTIONS.md) - Voice system testing instructions
- [VOICE_UI_PREVIEW.md](../VOICE_UI_PREVIEW.md) - Voice UI preview and design
- [client/VOICE_README.md](../client/VOICE_README.md) - Client-side voice functionality
- [documents/en/VOICE_IMPLEMENTATION_SUMMARY.md](en/VOICE_IMPLEMENTATION_SUMMARY.md) - Voice implementation summary (English)
- [documents/zh/VOICE_IMPLEMENTATION_SUMMARY.md](zh/VOICE_IMPLEMENTATION_SUMMARY.md) - Voice implementation summary (Chinese)
- [documents/en/VOICE_CLIENT_EXAMPLE.md](en/VOICE_CLIENT_EXAMPLE.md) - Voice client example (English)
- [documents/zh/VOICE_CLIENT_EXAMPLE.md](zh/VOICE_CLIENT_EXAMPLE.md) - Voice client example (Chinese)
- [documents/en/VOICE_INTEGRATION.md](en/VOICE_INTEGRATION.md) - Voice integration guide (English)
- [documents/zh/VOICE_INTEGRATION.md](zh/VOICE_INTEGRATION.md) - Voice integration guide (Chinese)

### General Implementation
- [documents/en/IMPLEMENTATION_SUMMARY.md](en/IMPLEMENTATION_SUMMARY.md) - General implementation summary (English)
- [documents/zh/IMPLEMENTATION_SUMMARY.md](zh/IMPLEMENTATION_SUMMARY.md) - General implementation summary (Chinese)
- [documents/en/OPENTELEMETRY_TRACING.md](en/OPENTELEMETRY_TRACING.md) - OpenTelemetry tracing documentation (English)
- [documents/zh/OPENTELEMETRY_TRACING.md](zh/OPENTELEMETRY_TRACING.md) - OpenTelemetry tracing documentation (Chinese)
- [documents/en/PERFORMANCE.md](en/PERFORMANCE.md) - Performance optimization guide (English)
- [documents/zh/PERFORMANCE.md](zh/PERFORMANCE.md) - Performance optimization guide (Chinese)
- [documents/en/PROMETHEUS.md](en/PROMETHEUS.md) - Prometheus monitoring setup (English)
- [documents/zh/PROMETHEUS.md](zh/PROMETHEUS.md) - Prometheus monitoring setup (Chinese)
- [documents/en/REDIS_SCALING.md](en/REDIS_SCALING.md) - Redis scaling configuration (English)
- [documents/zh/REDIS_SCALING.md](zh/REDIS_SCALING.md) - Redis scaling configuration (Chinese)
- [documents/en/SECURITY_ANTICHEAT.md](en/SECURITY_ANTICHEAT.md) - Security and anti-cheat measures (English)
- [documents/zh/SECURITY_ANTICHEAT.md](zh/SECURITY_ANTICHEAT.md) - Security and anti-cheat measures (Chinese)
- [documents/en/TICKET_SYSTEM.md](en/TICKET_SYSTEM.md) - Ticket system documentation (English)
- [documents/zh/TICKET_SYSTEM.md](zh/TICKET_SYSTEM.md) - Ticket system documentation (Chinese)

## 3. Configuration & Data

- [config/README.md](../config/README.md) - Configuration files overview
- [config/monsters.json](../config/monsters.json) - Monster configuration data
- [config/skills.json](../config/skills.json) - Skills configuration data

## 4. Client-Side Documentation

- [client/README.md](../client/README.md) - Client application README
- [client/FEATURES.md](../client/FEATURES.md) - Client features overview
- [client/USAGE_EXAMPLES.md](../client/USAGE_EXAMPLES.md) - Client usage examples
- [documents/en/CLIENT_ENHANCEMENT_SUMMARY.md](en/CLIENT_ENHANCEMENT_SUMMARY.md) - Client enhancement summary (English)
- [documents/zh/CLIENT_ENHANCEMENT_SUMMARY.md](zh/CLIENT_ENHANCEMENT_SUMMARY.md) - Client enhancement summary (Chinese)
- [documents/en/CLIENT_FEATURES.md](en/CLIENT_FEATURES.md) - Client features (English)
- [documents/zh/CLIENT_FEATURES.md](zh/CLIENT_FEATURES.md) - Client features (Chinese)
- [documents/en/CLIENT_README.md](en/CLIENT_README.md) - Client README (English)
- [documents/zh/CLIENT_README.md](zh/CLIENT_README.md) - Client README (Chinese)
- [documents/en/CLIENT_USAGE_EXAMPLES.md](en/CLIENT_USAGE_EXAMPLES.md) - Client usage examples (English)
- [documents/zh/CLIENT_USAGE_EXAMPLES.md](zh/CLIENT_USAGE_EXAMPLES.md) - Client usage examples (Chinese)

## 5. Development Guides & Features

- [documents/en/DATA_ANALYTICS.md](en/DATA_ANALYTICS.md) - Data analytics documentation (English)
- [documents/zh/DATA_ANALYTICS.md](zh/DATA_ANALYTICS.md) - Data analytics documentation (Chinese)
- [documents/en/FEATURES.md](en/FEATURES.md) - General features overview (English)
- [documents/zh/FEATURES.md](zh/FEATURES.md) - General features overview (Chinese)
- [documents/en/MONSTER_AI.md](en/MONSTER_AI.md) - Monster AI system documentation (English)
- [documents/zh/MONSTER_AI.md](zh/MONSTER_AI.md) - Monster AI system documentation (Chinese)
- [documents/en/USAGE_EXAMPLES.md](en/USAGE_EXAMPLES.md) - Usage examples (English)
- [documents/zh/USAGE_EXAMPLES.md](zh/USAGE_EXAMPLES.md) - Usage examples (Chinese)
- [documents/en/POWERSHELL_HELP.md](en/POWERSHELL_HELP.md) - PowerShell development help (English)
- [documents/zh/POWERSHELL_HELP.md](zh/POWERSHELL_HELP.md) - PowerShell development help (Chinese)
- [documents/en/ROADMAP.md](en/ROADMAP.md) - Development roadmap (English)
- [documents/zh/ROADMAP.md](zh/ROADMAP.md) - Development roadmap (Chinese)

## 6. Deployment & Operations

- [Dockerfile](../Dockerfile) - Docker container configuration
- [k8s/mmo-server-deployment.yaml](../k8s/mmo-server-deployment.yaml) - Kubernetes deployment for MMO server
- [k8s/redis-deployment.yaml](../k8s/redis-deployment.yaml) - Kubernetes deployment for Redis

## 7. Assets & Resources

- [documents/images/](../images/) - Documentation images and diagrams
- [client/public/assets/](../client/public/assets/) - Client-side assets and resources

## Quick Navigation

### By Language
- **English Documentation**: [documents/en/](en/)
- **Chinese Documentation**: [documents/zh/](zh/)

### By Component
- **Server**: Root directory and `src/` folder
- **Client**: `client/` folder
- **Configuration**: `config/` folder
- **Deployment**: `k8s/` and `Dockerfile`
- **Documentation**: `documents/` folder

---

*This index was auto-generated and organized. Last updated: October 17, 2025*