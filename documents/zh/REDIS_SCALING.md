# Redis集群与水平扩展指南

## 概述

本指南涵盖Redis集成以实现水平扩展，允许MMO服务器通过在多个服务器实例之间分配房间来处理增加的玩家负载。

## 架构

### 单服务器 (开发环境)
```
┌────────┐
│ Client │──┐
└────────┘  │
┌────────┐  │     ┌────────────────┐
│ Client │──┼────▶│ Server :2567   │
└────────┘  │     └────────────────┘
┌────────┐  │
│ Client │──┘
└────────┘
```

### 水平扩展 (生产环境)
```
┌────────┐                ┌──────────────────┐
│ Client │──┐             │ Load Balancer    │
└────────┘  │             │ (nginx/HAProxy)  │
┌────────┐  │             └────────┬─────────┘
│ Client │──┼────────────────────┬─┴─┬────────┬─────────┐
└────────┘  │                    │   │        │         │
┌────────┐  │            ┌───────▼┐ ┌▼──────┐│ ┌──────▼┐
│ Client │──┘            │Server 1││ │Server2││ │Server3│
└────────┘               │ :2567  ││ │ :2568││ │ :2569 │
                         └───┬────┘│ └───┬──┘│ └───┬───┘
                             │     │     │   │     │
                             └─────┴─────┴───┴─────┘
                                       │
                              ┌────────▼─────────┐
                              │  Redis Cluster   │
                              │  Presence/Driver │
                              └──────────────────┘
```

## Redis组件

### 1. Redis Presence

**目的**: 分布式房间注册和发现

**功能特性**:
- 跟踪所有服务器实例中存在的房间
- 使客户端能够在任何服务器上查找和加入房间
- 当服务器宕机时自动清理房间
- 基于负载的房间分配

### 2. Redis Driver

**目的**: 状态同步和服务器间通信

**功能特性**:
- 在实例间同步房间状态变化
- 将状态补丁发布到所有连接的客户端
- 启用服务器间的房间迁移
- 共享匹配队列

## 设置

### 1. 安装Redis

**Docker (推荐用于开发)**:
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

**macOS**:
```bash
brew install redis
brew services start redis
```

**Windows**:
- 使用Docker Desktop或WSL2与Linux Redis

### 2. 配置Colyseus

当设置 `REDIS_URL` 环境变量时，服务器已经配置为使用Redis：

```typescript
// src/app.config.ts (已配置)
import { RedisPresence } from "@colyseus/redis-presence";
import { RedisDriver } from "@colyseus/redis-driver";

const REDIS_URL = process.env.REDIS_URL || undefined;

export default config({
  // ... 其他配置
  
  driver: REDIS_URL ? new RedisDriver({ host: REDIS_URL }) : undefined,
  presence: REDIS_URL ? new RedisPresence({ host: REDIS_URL }) : undefined,
});
```

### 3. 使用Redis启动服务器

**开发环境 (本地Redis)**:
```bash
# Redis运行在localhost:6379
REDIS_URL=redis://localhost:6379 yarn dev
```

**生产环境**:
```bash
# 使用远程Redis集群
REDIS_URL=redis://your-redis-host:6379 yarn start

# 带认证
REDIS_URL=redis://:password@your-redis-host:6379 yarn start

# Redis集群
REDIS_URL=redis://node1:6379,node2:6379,node3:6379 yarn start
```

## 水平扩展部署

### 方法1: PM2 (简单多实例)

**安装PM2**:
```bash
npm install -g pm2
```

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'mmo-server',
    script: 'lib/index.js',
    instances: 4,  // 实例数量
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      REDIS_URL: 'redis://localhost:6379',
      PORT: 2567
    }
  }]
};
```

**启动**:
```bash
yarn build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 方法2: Docker Compose (多容器)

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  server1:
    build: .
    ports:
      - "2567:2567"
    environment:
      - REDIS_URL=redis://redis:6379
      - PORT=2567
    depends_on:
      - redis

  server2:
    build: .
    ports:
      - "2568:2567"
    environment:
      - REDIS_URL=redis://redis:6379
      - PORT=2567
    depends_on:
      - redis

  server3:
    build: .
    ports:
      - "2569:2567"
    environment:
      - REDIS_URL=redis://redis:6379
      - PORT=2567
    depends_on:
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - server1
      - server2
      - server3

volumes:
  redis-data:
```

**nginx.conf**:
```nginx
events {
    worker_connections 4096;
}

http {
    upstream mmo_servers {
        least_conn;
        server server1:2567;
        server server2:2567;
        server server3:2567;
    }

    server {
        listen 80;

        location / {
            proxy_pass http://mmo_servers;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
        }
    }
}
```

**启动**:
```bash
docker-compose up -d
```

### 方法3: Kubernetes (生产规模)

**deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mmo-server
spec:
  replicas: 5
  selector:
    matchLabels:
      app: mmo-server
  template:
    metadata:
      labels:
        app: mmo-server
    spec:
      containers:
      - name: server
        image: your-registry/mmo-server:latest
        ports:
        - containerPort: 2567
        env:
        - name: REDIS_URL
          value: "redis://redis-cluster:6379"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"

---
apiVersion: v1
kind: Service
metadata:
  name: mmo-server
spec:
  type: LoadBalancer
  selector:
    app: mmo-server
  ports:
  - port: 80
    targetPort: 2567
    protocol: TCP
```

**redis.yaml**:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis-cluster
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## 负载均衡策略

### 1. 最少连接 (推荐)

将新连接引导到活跃连接最少的服务器。

**nginx**:
```nginx
upstream mmo_servers {
    least_conn;
    server server1:2567;
    server server2:2567;
}
```

**HAProxy**:
```
backend mmo_servers
    balance leastconn
    server server1 server1:2567 check
    server server2 server2:2567 check
```

### 2. 轮询

按轮换均匀分配连接。

```nginx
upstream mmo_servers {
    server server1:2567;
    server server2:2567;
}
```

### 3. IP哈希 (粘性会话)

将来自同一IP的客户端路由到同一服务器。

```nginx
upstream mmo_servers {
    ip_hash;
    server server1:2567;
    server server2:2567;
}
```

**注意**: 使用Redis的Colyseus不需要粘性会话，但它可以改善缓存局部性。

## 监控

### 健康检查

**nginx**:
```nginx
upstream mmo_servers {
    least_conn;
    server server1:2567 max_fails=3 fail_timeout=30s;
    server server2:2567 max_fails=3 fail_timeout=30s;
}
```

**HAProxy**:
```
backend mmo_servers
    option httpchk GET /health
    http-check expect status 200
    server server1 server1:2567 check inter 5s
    server server2 server2:2567 check inter 5s
```

### Prometheus指标

监控每个实例的指标：

```promql
# 每个实例的房间
sum(colyseus_room_count) by (instance)

# 每个实例的客户端
sum(colyseus_room_clients) by (instance)

# 实例健康
up{job="mmo-server"}
```

### Redis指标

监控Redis性能：

```bash
# Redis CLI
redis-cli INFO stats
redis-cli INFO memory
redis-cli SLOWLOG GET 10
```

**关键指标**:
- `used_memory` - Redis内存使用
- `connected_clients` - 连接数量
- `ops_per_sec` - 每秒操作数
- `keyspace_hits` / `keyspace_misses` - 缓存效率

## 性能调优

### Redis配置

**redis.conf**:
```
# 内存
maxmemory 2gb
maxmemory-policy allkeys-lru

# 持久化 (根据需要调整)
save 900 1
save 300 10
save 60 10000

# 网络
tcp-backlog 511
timeout 0
tcp-keepalive 300

# 性能
# 为最大性能禁用AOF (牺牲持久性)
appendonly no

# 或使用AOF，每秒fsync (平衡)
# appendonly yes
# appendfsync everysec
```

### 服务器实例配置

**环境变量**:
```bash
# Node.js优化
NODE_ENV=production
UV_THREADPOOL_SIZE=128  # 增加I/O操作

# Colyseus设置
PERF_SLOW_TICK_MS=20
PERF_AUTO_PROFILE_COOLDOWN_MS=60000
```

## 扩展指南

### 何时进行水平扩展

当以下情况时进行扩展：
- 实例间平均CPU使用率 > 70%
- 平均tick时间 > 10ms
- 玩家数量接近容量
- 内存使用率 > 80%

### 实例大小

**小型实例** (100-200并发玩家):
- 2 CPU核心
- 2 GB RAM
- 适用于: 开发、小型社区

**中型实例** (200-500并发玩家):
- 4 CPU核心
- 4 GB RAM
- 适用于: 成长中的游戏、区域服务器

**大型实例** (500-1000并发玩家):
- 8 CPU核心
- 8 GB RAM
- 适用于: 热门游戏、高峰时间

**Redis实例**:
- 从2 GB RAM开始
- 大型部署扩展到4-8 GB
- 对于> 10 GB数据集使用Redis集群

### 自动扩展

**Kubernetes HPA (水平Pod自动扩展)**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mmo-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mmo-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 生产部署检查清单

- [ ] Redis集群已部署并测试
- [ ] 负载均衡器配置了健康检查
- [ ] 多个服务器实例正在运行
- [ ] Prometheus监控已激活
- [ ] Grafana仪表板已创建
- [ ] 已配置自动扩展 (如果使用K8s)
- [ ] Redis数据备份策略
- [ ] 已安装SSL/TLS证书
- [ ] 已启用DDoS保护
- [ ] 已配置日志聚合
- [ ] 已定义警报规则
- [ ] 已记录灾难恢复计划
- [ ] 已完成性能测试
- [ ] 已审核容量规划

## 故障排除

### 连接问题

**问题**: 启用Redis后客户端无法连接

**解决方案**:
```bash
# 检查Redis连接
redis-cli ping

# 检查服务器日志
pm2 logs mmo-server

# 验证环境变量
echo $REDIS_URL
```

### 找不到房间

**问题**: 客户端无法找到在其他实例上创建的房间

**解决方案**:
- 验证Redis Presence已启用
- 检查所有实例的Redis连接性
- 确保所有实例使用相同的Redis URL

### 内存泄漏

**问题**: Redis内存无限增长

**解决方案**:
```bash
# 设置最大内存策略
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 清除特定键
redis-cli KEYS "colyseus:*" | xargs redis-cli DEL
```

### 性能下降

**问题**: 多实例时响应时间变慢

**解决方案**:
- 检查Redis延迟: `redis-cli --latency`
- 监控服务器和Redis之间的网络
- 启用Redis持久化调优
- 考虑Redis集群以获得更好的分布

## 安全性

### Redis安全性

```bash
# 需要密码
requirepass your-strong-password

# 绑定到特定接口
bind 127.0.0.1 ::1

# 禁用危险命令
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

### 网络安全性

- 使用VPC/私有网络进行服务器到Redis通信
- 在生产环境中为Redis连接启用TLS
- 使用防火墙规则限制Redis访问
- 在负载均衡器级别实现速率限制

## 成本优化

### 开发环境
- 最小层级的单个Redis实例
- 1-2个服务器实例
- 本地开发无需Redis

### 暂存环境
- 托管Redis服务 (AWS ElastiCache等)
- 2-3个服务器实例
- 较小的实例大小

### 生产环境
- 带HA的Redis集群或托管服务
- 自动扩展服务器实例 (3-10个)
- 基线容量的预留实例
- 突发容量的竞价实例

## 参考资料

- [Colyseus可扩展性](https://docs.colyseus.io/scalability/)
- [Redis文档](https://redis.io/documentation)
- [Redis集群教程](https://redis.io/topics/cluster-tutorial)
- [PM2文档](https://pm2.keymetrics.io/)
- [Kubernetes文档](https://kubernetes.io/docs/)

## 总结

基于Redis的水平扩展使MMO服务器能够：
- 处理数千并发玩家
- 提供高可用性和冗余
- 根据需求动态扩展
- 在多个实例间分配负载
- 支持全球玩家分布

通过适当的配置和监控，系统可以无缝地从开发扩展到生产。