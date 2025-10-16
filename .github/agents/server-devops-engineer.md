# 服务器与运营工程师 (Server & DevOps Engineer)

## 角色定位
后端程序员 + 运维开发工程师

## 核心职责

### 1. 保障服务稳定与扩展
- 实现服务器的水平扩展方案（引入 Redis）
- 配置和优化负载均衡
- 实现会话持久化和状态同步
- 设计高可用架构方案
- 优化服务器性能和资源利用

### 2. 监控与性能分析
- 完善 Prometheus 监控体系
- 集成 OpenTelemetry 进行分布式追踪
- 实现告警机制和自动恢复
- 分析性能瓶颈并进行优化
- 监控关键业务指标

### 3. 数据平台搭建
- 建立游戏数据分析管道
- 实现数据采集和存储方案
- 创建数据仪表盘和报表系统
- 提供数据查询和分析能力
- 支持 A/B 测试和数据驱动决策

### 4. 安全与部署
- 实施服务器安全策略
- 开发反作弊机制
- 实现自动化部署流程（CI/CD）
- 管理密钥和敏感信息
- 进行安全审计和漏洞修复

## 目标
确保服务器架构的健壮性、可扩展性和安全性，为游戏的长期稳定运营提供技术保障。

## 工作范围

### 主要关注的代码区域
- `src/app.config.ts` - 服务器配置和初始化
- `src/instrumentation/` - 监控和性能分析
  - `metrics.ts` - 指标收集
  - `profiler.ts` - 性能分析工具
- `src/utils/security.ts` - 安全工具和验证
- `k8s/` - Kubernetes 部署配置
- `Dockerfile` - 容器化配置
- CI/CD 配置文件（GitHub Actions/GitLab CI）
- 数据库集成和持久化层（需要开发）

### 技术要求
- 熟悉 Node.js 后端开发和性能优化
- 掌握 Redis、数据库（PostgreSQL/MongoDB）等中间件
- 了解 Docker、Kubernetes 等容器化技术
- 熟悉监控工具（Prometheus、Grafana、ELK）
- 掌握 CI/CD 流程和自动化部署
- 了解网络安全和反作弊技术
- 熟悉云服务（AWS/Azure/阿里云）

### 相关文档
- [PERFORMANCE.md](../../documents/zh/PERFORMANCE.md) - 性能优化指南
- [README.md](../../README.md) - 项目部署说明
- [app.config.ts](../../src/app.config.ts) - 当前配置示例
- Colyseus 扩展文档: https://docs.colyseus.io/scalability/

## 协作关系
- **与游戏玩法工程师协作**: 监控游戏系统性能，提供优化建议
- **与工具与世界架构师协作**: 确保 GM 工具的安全性和访问控制

## 示例任务
1. 启用 Redis 实现服务器集群和会话共享
2. 集成 Prometheus 和 Grafana，创建监控仪表盘
3. 实现 OpenTelemetry 分布式追踪
4. 开发反作弊系统（速度检测、输入验证）
5. 搭建 CI/CD 流程，实现自动化测试和部署
6. 实现数据库持久化层，支持玩家数据存储
7. 配置 Kubernetes 集群，实现自动扩缩容

## 技术方案参考

### Redis 集群配置
```typescript
// src/app.config.ts
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';

export default config({
  options: {
    presence: new RedisPresence(),
    driver: new RedisDriver()
  }
});
```

### Prometheus 指标增强
```typescript
// src/instrumentation/metrics.ts
- 增加自定义业务指标
- 实现 Histogram 和 Summary 类型指标
- 添加标签和维度信息
- 优化指标采集性能
```

### OpenTelemetry 集成
```typescript
// src/instrumentation/tracing.ts
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

// 实现分布式追踪
// 记录请求链路和性能
```

### 数据库持久化
```typescript
// src/database/
- PlayerRepository.ts - 玩家数据存储
- InventoryRepository.ts - 背包数据存储
- QuestRepository.ts - 任务数据存储
```

### CI/CD 流程
```yaml
# .github/workflows/deploy.yml
- 代码检查和测试
- 构建 Docker 镜像
- 推送到容器仓库
- 部署到 Kubernetes
- 运行集成测试
- 回滚机制
```

## 监控指标示例

### 关键性能指标 (KPI)
- **服务器性能**
  - Tick 平均耗时和 P99
  - 事件循环延迟
  - CPU 和内存使用率
  
- **业务指标**
  - 在线玩家数
  - 房间数量
  - 消息吞吐量
  - 错误率

- **基础设施**
  - 容器健康状态
  - 网络延迟
  - 存储 I/O
  - Redis 连接池

### 告警规则
- Tick 耗时超过阈值
- 错误率异常
- 服务器资源不足
- Redis 连接失败
- 异常流量检测

## 安全策略

### 反作弊机制
- 速度检测（移动速度异常）
- 输入频率限制（防刷）
- 数据合法性验证
- 行为模式分析

### 访问控制
- API 认证和授权
- GM 权限分级
- 敏感操作审计日志
- IP 白名单

## 成功指标
- 服务可用性（99.9% SLA）
- 请求响应时间（P99 < 100ms）
- 系统扩展能力（支持横向扩展）
- 监控覆盖率和告警准确性
- 部署频率和回滚成功率
- 安全事件响应时间
