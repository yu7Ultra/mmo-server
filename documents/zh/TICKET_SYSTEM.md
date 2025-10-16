# 客服工单系统

具有FAQ和模板支持的完整玩家支持工单管理系统。

## 功能特性

- **工单管理**: 创建、分配、更新和解决工单
- **优先级系统**: 低、一般、高、紧急优先级
- **状态工作流**: 开放 → 待处理 → 处理中 → 已解决 → 已关闭
- **类别系统**: 8个预定义类别用于工单组织
- **FAQ系统**: 带有投票的自助服务知识库
- **快速回复模板**: 常见问题的预写回复
- **指标集成**: Prometheus指标用于工单跟踪
- **完整审计跟踪**: 跟踪所有工单活动

## 工单类别

1. **bug_report** - 游戏漏洞和技术问题
2. **account_issue** - 账户相关问题
3. **payment_issue** - 支付和购买问题
4. **gameplay_question** - 关于游戏机制的问题
5. **report_player** - 玩家行为报告
6. **feature_request** - 新功能建议
7. **technical_support** - 技术支持
8. **other** - 未分类问题

## API端点

### 创建工单

```http
POST /tickets
Content-Type: application/json

{
  "playerId": "player123",
  "playerName": "John Doe",
  "category": "bug_report",
  "subject": "无法登录",
  "description": "尝试登录时收到404错误",
  "priority": "high",
  "attachments": ["https://example.com/screenshot.png"]
}
```

**响应:**
```json
{
  "status": "ok",
  "ticket": {
    "id": "TICKET-1234567890-1",
    "playerId": "player123",
    "playerName": "John Doe",
    "category": "bug_report",
    "priority": "high",
    "status": "open",
    "subject": "无法登录",
    "description": "尝试登录时收到404错误",
    "createdAt": 1234567890,
    "updatedAt": 1234567890,
    "responses": [],
    "tags": []
  }
}
```

### 获取工单

```http
# 获取开放工单
GET /tickets

# 按状态获取工单
GET /tickets?status=open

# 获取玩家工单
GET /tickets?playerId=player123
```

### 获取特定工单

```http
GET /tickets/TICKET-1234567890-1
```

### 向工单添加回复

```http
POST /tickets/TICKET-1234567890-1/responses
Content-Type: application/json

{
  "authorId": "gm001",
  "authorName": "GM Support",
  "isStaff": true,
  "message": "我们正在调查此问题。感谢您的耐心等待。",
  "internal": false
}
```

### 获取工单统计

```http
GET /tickets/stats
```

**响应:**
```json
{
  "stats": {
    "total": 150,
    "open": 25,
    "in_progress": 30,
    "resolved": 60,
    "closed": 35,
    "by_category": {
      "bug_report": 40,
      "account_issue": 30,
      "payment_issue": 20,
      "gameplay_question": 35,
      "technical_support": 25
    },
    "by_priority": {
      "low": 30,
      "normal": 80,
      "high": 30,
      "urgent": 10
    },
    "avg_resolution_time": 3600000,
    "oldest_open_ticket": {...}
  }
}
```

### FAQ系统

```http
# 获取所有FAQ
GET /faqs

# 按类别获取FAQ
GET /faqs?category=gameplay_question

# 搜索FAQ
GET /faqs?q=password
```

### 快速回复模板

```http
# 获取所有模板
GET /templates

# 按类别获取模板
GET /templates?category=bug_report
```

## 使用示例

### 创建工单

```typescript
import { getTicketSystem } from './tickets/ticketSystem';

const ticketSystem = getTicketSystem();

const ticket = ticketSystem.createTicket(
  'player123',
  'John Doe',
  'bug_report',
  '无法完成任务',
  '"击败龙"任务在杀死龙后无法完成。',
  'normal',
  ['https://example.com/screenshot.png']
);

console.log(`工单已创建: ${ticket.id}`);
```

### 添加回复

```typescript
const response = ticketSystem.addResponse(
  ticket.id,
  'gm001',
  'GM Support',
  true, // 是工作人员
  '我们在最新补丁中修复了此问题。请重试。',
  undefined,
  false // 非内部
);
```

### 分配工单

```typescript
ticketSystem.assignTicket(ticket.id, 'gm001', 'GM Support');
```

### 更新工单状态

```typescript
// 标记为已解决
ticketSystem.updateTicketStatus(ticket.id, 'resolved');

// 关闭工单
ticketSystem.updateTicketStatus(ticket.id, 'closed');
```

### 搜索工单

```typescript
// 按文本搜索
const results = ticketSystem.searchTickets('登录错误');

// 按类别搜索
const bugReports = ticketSystem.searchTickets('', 'bug_report');
```

### 获取工作人员工作量

```typescript
const assignedTickets = ticketSystem.getAssignedTickets('gm001');
console.log(`GM有 ${assignedTickets.length} 个分配的工单`);
```

## FAQ管理

### 创建FAQ

```typescript
const faq = ticketSystem.createFAQ(
  'gameplay_question',
  '如何重置我的技能？',
  '访问主城中的技能大师，从菜单中选择"重置技能"。',
  ['skills', 'reset']
);
```

### 搜索FAQ

```typescript
const results = ticketSystem.searchFAQs('password');
```

### 记录FAQ交互

```typescript
// 记录查看
ticketSystem.recordFAQView(faq.id);

// 投票有用
ticketSystem.voteFAQHelpful(faq.id, true);

// 投票无用
ticketSystem.voteFAQHelpful(faq.id, false);
```

## 快速回复模板

### 创建模板

```typescript
const template = ticketSystem.createTemplate(
  '密码重置说明',
  'account_issue',
  '要重置密码，请访问登录页面并点击"忘记密码"。输入您的电子邮件地址并按照发送到您收件箱的说明操作。',
  ['password', 'reset']
);
```

### 使用模板

```typescript
const template = ticketSystem.useTemplate(templateId);
if (template) {
  // 模板使用计数已增加
  // 在回复中使用template.message
}
```

## Prometheus指标

工单系统与Prometheus指标集成：

### 公开的指标

1. **tickets_created_total** - 创建的总工单数
   - 标签: `category`, `priority`

2. **tickets_open** - 当前开放工单数 (仪表盘)

3. **ticket_responses_total** - 工单回复总数
   - 标签: `is_staff` (true/false)

4. **tickets_resolved_total** - 已解决工单总数
   - 标签: `category`

5. **tickets_closed_total** - 已关闭工单总数
   - 标签: `category`

### 示例查询

```promql
# 开放工单
tickets_open

# 工单创建率 (最近5分钟)
rate(tickets_created_total[5m])

# 按类别解决率
rate(tickets_resolved_total[5m])

# 平均解决时间 (从统计端点计算)
# 使用 /tickets/stats API获取此指标
```

## 工单工作流

### 标准流程

1. **玩家创建工单** → 状态: `open`
2. **工作人员分配工单** → 状态: `in_progress`
3. **工作人员调查并回复** → 状态: `in_progress`
4. **问题解决** → 状态: `resolved`
5. **玩家确认或自动关闭** → 状态: `closed`

### 优先级处理

工单按以下排序：
1. **优先级** (紧急 → 高 → 一般 → 低)
2. **年龄** (相同优先级内较旧工单优先)

### 自动管理

系统跟踪：
- 平均解决时间
- 最旧开放工单
- 工作人员工作量 (分配的工单)
- 回复时间

## 集成

### 与GM后端集成

工单与GM后端集成用于：
- 工作人员认证
- 权限检查
- 操作日志记录

### 与分析集成

工单指标输入分析仪表板用于：
- 支持效率跟踪
- 常见问题识别
- 工作人员绩效监控

## 默认FAQ

系统包含4个默认FAQ：
1. 密码重置说明
2. 升级提示
3. 延迟故障排除
4. 购买处理时间

## 默认模板

系统包含4个默认模板：
1. 漏洞报告确认
2. 账户验证请求
3. 问题解决确认
4. 支付确认

## 最佳实践

### 针对玩家

1. **先搜索FAQ** - 许多常见问题已有答案
2. **提供详细信息** - 包括截图、错误消息和重现步骤
3. **选择正确类别** - 帮助路由到正确的支持团队
4. **保持耐心** - 工作人员会尽快回复

### 针对支持工作人员

1. **优先处理紧急工单** - 分配时检查优先级
2. **使用模板** - 为常见问题使用快速回复节省时间
3. **添加内部备注** - 使用内部回复进行工作人员沟通
4. **更新状态** - 保持工单状态最新
5. **添加标签** - 为更好的组织添加标签

### 针对管理员

1. **监控指标** - 跟踪解决时间和工作人员工作量
2. **更新FAQ** - 为重复问题添加新FAQ
3. **创建模板** - 为常见回复构建模板
4. **审核旧工单** - 跟进长期开放的工单

## 性能

- **内存**: 每个工单约500字节，每个回复约200字节
- **CPU**: 最小开销 (典型负载<0.1%)
- **可扩展性**: 高效处理数千工单
- **响应时间**: 大多数操作<10ms

## 未来增强功能

潜在改进：
- 工单更新邮件通知
- 工单升级规则
- SLA (服务水平协议)跟踪
- 客户满意度评分
- 带过滤器的先进搜索
- 工单合并/拆分
- 附件存储集成
- 多语言支持