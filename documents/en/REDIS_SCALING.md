# Redis Cluster & Horizontal Scaling Guide

## Overview

This guide covers Redis integration for horizontal scaling, allowing the MMO server to handle increased player load by distributing rooms across multiple server instances.

## Architecture

### Single Server (Development)
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

### Horizontal Scaling (Production)
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

## Redis Components

### 1. Redis Presence

**Purpose**: Distributed room registry and discovery

**Features**:
- Tracks which rooms exist across all server instances
- Enables clients to find and join rooms on any server
- Automatic room cleanup when servers go down
- Load-based room distribution

### 2. Redis Driver

**Purpose**: State synchronization and inter-server communication

**Features**:
- Synchronizes room state changes across instances
- Publishes state patches to all connected clients
- Enables room migration between servers
- Shared matchmaking queues

## Setup

### 1. Install Redis

**Docker (Recommended for Development)**:
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
- Use Docker Desktop or WSL2 with Linux Redis

### 2. Configure Colyseus

The server is already configured to use Redis when the `REDIS_URL` environment variable is set:

```typescript
// src/app.config.ts (already configured)
import { RedisPresence } from "@colyseus/redis-presence";
import { RedisDriver } from "@colyseus/redis-driver";

const REDIS_URL = process.env.REDIS_URL || undefined;

export default config({
  // ... other config
  
  driver: REDIS_URL ? new RedisDriver({ host: REDIS_URL }) : undefined,
  presence: REDIS_URL ? new RedisPresence({ host: REDIS_URL }) : undefined,
});
```

### 3. Start Server with Redis

**Development (Local Redis)**:
```bash
# Redis running on localhost:6379
REDIS_URL=redis://localhost:6379 yarn dev
```

**Production**:
```bash
# Using remote Redis cluster
REDIS_URL=redis://your-redis-host:6379 yarn start

# With authentication
REDIS_URL=redis://:password@your-redis-host:6379 yarn start

# Redis Cluster
REDIS_URL=redis://node1:6379,node2:6379,node3:6379 yarn start
```

## Horizontal Scaling Deployment

### Method 1: PM2 (Simple Multi-Instance)

**Install PM2**:
```bash
npm install -g pm2
```

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'mmo-server',
    script: 'lib/index.js',
    instances: 4,  // Number of instances
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      REDIS_URL: 'redis://localhost:6379',
      PORT: 2567
    }
  }]
};
```

**Start**:
```bash
yarn build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Method 2: Docker Compose (Multi-Container)

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

**Start**:
```bash
docker-compose up -d
```

### Method 3: Kubernetes (Production Scale)

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

## Load Balancing Strategies

### 1. Least Connections (Recommended)

Directs new connections to the server with the fewest active connections.

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

### 2. Round Robin

Distributes connections evenly in rotation.

```nginx
upstream mmo_servers {
    server server1:2567;
    server server2:2567;
}
```

### 3. IP Hash (Sticky Sessions)

Routes clients from the same IP to the same server.

```nginx
upstream mmo_servers {
    ip_hash;
    server server1:2567;
    server server2:2567;
}
```

**Note**: Colyseus with Redis doesn't require sticky sessions, but it can improve cache locality.

## Monitoring

### Health Checks

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

### Prometheus Metrics

Monitor per-instance metrics:

```promql
# Rooms per instance
sum(colyseus_room_count) by (instance)

# Clients per instance
sum(colyseus_room_clients) by (instance)

# Instance health
up{job="mmo-server"}
```

### Redis Metrics

Monitor Redis performance:

```bash
# Redis CLI
redis-cli INFO stats
redis-cli INFO memory
redis-cli SLOWLOG GET 10
```

**Key Metrics**:
- `used_memory` - Redis memory usage
- `connected_clients` - Number of connections
- `ops_per_sec` - Operations per second
- `keyspace_hits` / `keyspace_misses` - Cache efficiency

## Performance Tuning

### Redis Configuration

**redis.conf**:
```
# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence (adjust for your needs)
save 900 1
save 300 10
save 60 10000

# Network
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Performance
# Disable AOF for maximum performance (trade durability)
appendonly no

# Or use AOF with fsync every second (balanced)
# appendonly yes
# appendfsync everysec
```

### Server Instance Configuration

**Environment Variables**:
```bash
# Node.js optimization
NODE_ENV=production
UV_THREADPOOL_SIZE=128  # Increase for I/O operations

# Colyseus settings
PERF_SLOW_TICK_MS=20
PERF_AUTO_PROFILE_COOLDOWN_MS=60000
```

## Scaling Guidelines

### When to Scale Horizontally

Scale up when:
- Average CPU usage > 70% across instances
- Average tick time > 10ms
- Player count approaching capacity
- Memory usage > 80%

### Instance Sizing

**Small Instance** (100-200 concurrent players):
- 2 CPU cores
- 2 GB RAM
- Suitable for: Development, small communities

**Medium Instance** (200-500 concurrent players):
- 4 CPU cores
- 4 GB RAM
- Suitable for: Growing games, regional servers

**Large Instance** (500-1000 concurrent players):
- 8 CPU cores
- 8 GB RAM
- Suitable for: Popular games, peak times

**Redis Instance**:
- Start with 2 GB RAM
- Scale to 4-8 GB for large deployments
- Use Redis Cluster for > 10 GB datasets

### Auto-Scaling

**Kubernetes HPA (Horizontal Pod Autoscaler)**:
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

## Production Deployment Checklist

- [ ] Redis cluster deployed and tested
- [ ] Load balancer configured with health checks
- [ ] Multiple server instances running
- [ ] Prometheus monitoring active
- [ ] Grafana dashboards created
- [ ] Auto-scaling configured (if using K8s)
- [ ] Backup strategy for Redis data
- [ ] SSL/TLS certificates installed
- [ ] DDoS protection enabled
- [ ] Log aggregation configured
- [ ] Alert rules defined
- [ ] Disaster recovery plan documented
- [ ] Performance testing completed
- [ ] Capacity planning reviewed

## Troubleshooting

### Connection Issues

**Problem**: Clients can't connect after enabling Redis

**Solution**:
```bash
# Check Redis connection
redis-cli ping

# Check server logs
pm2 logs mmo-server

# Verify environment variable
echo $REDIS_URL
```

### Room Not Found

**Problem**: Clients can't find rooms created on other instances

**Solution**:
- Verify Redis Presence is enabled
- Check Redis connectivity from all instances
- Ensure all instances use the same Redis URL

### Memory Leaks

**Problem**: Redis memory growing indefinitely

**Solution**:
```bash
# Set max memory policy
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Clear specific keys
redis-cli KEYS "colyseus:*" | xargs redis-cli DEL
```

### Performance Degradation

**Problem**: Slow response times with multiple instances

**Solution**:
- Check Redis latency: `redis-cli --latency`
- Monitor network between servers and Redis
- Enable Redis persistence tuning
- Consider Redis Cluster for better distribution

## Security

### Redis Security

```bash
# Require password
requirepass your-strong-password

# Bind to specific interface
bind 127.0.0.1 ::1

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

### Network Security

- Use VPC/private network for server-to-Redis communication
- Enable TLS for Redis connections in production
- Use firewall rules to restrict Redis access
- Implement rate limiting at load balancer level

## Cost Optimization

### Development
- Single Redis instance on smallest tier
- 1-2 server instances
- Local development without Redis

### Staging
- Managed Redis service (AWS ElastiCache, etc.)
- 2-3 server instances
- Smaller instance sizes

### Production
- Redis Cluster or managed service with HA
- Auto-scaling server instances (3-10)
- Reserved instances for baseline capacity
- Spot instances for burst capacity

## References

- [Colyseus Scalability](https://docs.colyseus.io/scalability/)
- [Redis Documentation](https://redis.io/documentation)
- [Redis Cluster Tutorial](https://redis.io/topics/cluster-tutorial)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## Summary

Redis-based horizontal scaling enables the MMO server to:
- Handle thousands of concurrent players
- Provide high availability and redundancy
- Scale dynamically based on demand
- Distribute load across multiple instances
- Support global player distribution

With proper configuration and monitoring, the system can scale from development to production seamlessly.
