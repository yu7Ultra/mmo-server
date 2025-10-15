### Miniplex - 轻柔的游戏实体管理器

`Miniplex` 是一个为游戏和类似高要求应用设计的实体管理系统。它采用了**实体-组件-系统（Entity-Component-System, ECS）** 的设计模式。

🚀 **核心理念**: 您不再需要为不同类型的实体（如：小行星、敌人、道具、玩家等）创建各自独立的列表或管理器。相反，您可以将所有实体放入一个统一的“世界（World）”中，通过“组件（Components）”来描述它们的属性和特征，然后编写“系统（Systems）”来处理具有特定组件组合的实体。

🍳 **易于使用**: 专注于简单性和优秀的开发者体验。
💪 **功能强大**: 可以作为您整个项目的核心，也可以仅用于项目的部分功能。
🧩 **为 TypeScript 而生**: 但在纯 JavaScript 中同样表现出色。
⚛️ **支持 React**: 提供了优秀的 React 绑定库。
📦 **轻量级**: 极小的包体积和最少的依赖。

---

### 快速上手示例

```typescript
/* 1. 定义你的实体类型 */
type Entity = {
  position: { x: number; y: number };
  velocity?: { x: number; y: number };
  health?: {
    current: number;
    max: number;
  };
  poisoned?: true; // 标签组件
};

/* 2. 创建一个世界来容纳这些实体 */
const world = new World<Entity>();

/* 3. 创建实体 */
const player = world.add({
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  health: { current: 100, max: 100 }
});

/* 4. 创建查询（Queries）以高效地获取实体 */
const queries = {
  // 获取所有同时拥有 position 和 velocity 组件的实体
  moving: world.with("position", "velocity"),
  // 获取所有拥有 health 组件的实体
  health: world.with("health"),
  // 在已有查询的基础上，进一步筛选出中毒的实体
  poisoned: queries.health.with("poisoned")
};

/* 5. 创建系统（Systems）来处理游戏逻辑 */

// 移动系统：遍历所有“移动中”的实体，并更新它们的位置
function moveSystem() {
  for (const { position, velocity } of queries.moving) {
    position.x += velocity.x;
    position.y += velocity.y;
  }
}

// 中毒系统：遍历所有“中毒”的实体，并扣减它们的生命值
function poisonSystem() {
  for (const entity of queries.poisoned) {
    entity.health.current -= 1;
  }
}

// 健康系统：遍历所有带有“health”组件的实体，如果生命值耗尽，则将其移除
function healthSystem() {
  for (const entity of queries.health) {
    if (entity.health.current <= 0) {
      world.remove(entity);
    }
  }
}

/* 6. 在你的游戏循环中运行这些系统 */
function gameLoop() {
  moveSystem();
  poisonSystem();
  healthSystem();
  requestAnimationFrame(gameLoop);
}

gameLoop();
```

---

### 核心概念与用法

#### 1. 世界（World）
`World` 是所有实体的容器。您可以为整个游戏创建一个大的世界，也可以为不同的场景或功能创建多个小世界。

```typescript
import { World } from "miniplex";

// 推荐：为你的实体定义一个 TypeScript 类型
type Entity = {
  position: { x: number; y: number };
  // ... 其他组件
};

// 创建世界，并传入实体类型以获得完整的类型支持
const world = new World<Entity>();
```

#### 2. 实体（Entities）与组件（Components）
*   **实体** 就是普通的 JavaScript 对象。
*   **组件** 就是实体对象上的属性。组件的数据可以是任何东西：基本类型、对象，甚至是类的实例。

**创建实体**:
```typescript
const entity = world.add({ position: { x: 0, y: 0 } });
```

**添加/移除组件**:
**重要**: 请务必使用 `addComponent` 和 `removeComponent` 方法来操作组件，而不是直接修改对象属性。这样才能确保 Miniplex 的内部索引（查询）能够正确更新。

```typescript
// ✅ 正确：添加组件
world.addComponent(entity, "velocity", { x: 10, y: 0 });

// ✅ 正确：移除组件
world.removeComponent(entity, "velocity");

// ⛔️ 错误：直接添加属性会绕过 Miniplex 的索引
// entity.velocity = { x: 10, y: 0 };
```

**修改组件数据**:
直接修改组件的内部数据是完全可以的。

```typescript
// ✅ 正确：直接修改组件的属性
entity.position.x = 100;
```

#### 3. 查询（Queries）
查询是 ECS 架构性能的关键。它允许你高效地获取具有特定组件组合的实体集合。

*   `world.with(...)`: 获取 **包含** 所有指定组件的实体。
*   `world.without(...)`: 获取 **不包含** 任何指定组件的实体。
*   查询可以链式调用。

```typescript
// 获取所有可移动但未暂停的实体
const movingEntities = world.with("position", "velocity").without("paused");
```

**最佳实践**: 尽可能重用查询。在系统外部定义好查询，而不是在游戏循环的每一帧都重新创建它。

#### 4. 系统（Systems）
系统就是一个普通的函数，它执行游戏的具体逻辑。Miniplex 本身没有内置的系统或调度概念，这给了您极大的灵活性。您只需编写函数，并在您项目的游戏循环（如 `requestAnimationFrame`, `setInterval` 或 `useFrame`）中调用它们。

```typescript
// 在外部定义好查询
const movingEntities = world.with("position", "velocity");

// 编写系统函数
function movementSystem() {
  // 在循环中直接使用查询
  for (const { position, velocity } of movingEntities) {
    position.x += velocity.x;
    position.y += velocity.y;
  }
}
```

#### 5. 响应实体的增减
`World` 和 `Query` 实例都提供了 `onEntityAdded` 和 `onEntityRemoved` 事件，您可以订阅这些事件来响应实体的变化。

```typescript
const poisonedEntities = world.with("poisoned");

// 当一个实体首次获得 "poisoned" 组件时触发
poisonedEntities.onEntityAdded.subscribe((entity) => {
  console.log("一个实体中毒了:", entity);
  // 在这里可以应用一些初始视觉效果
});
```

这份中文文档涵盖了 `Miniplex` 的核心用法和最佳实践，希望能帮助您更好地在 MMO 服务器中使用它。
