import { World } from "miniplex";
import { MonsterUnit, LeaderUnit } from "../../schemas/sync/CellRoomSyncStates";
import { Vec2 } from "../../schemas/commands/Vec2";
import { CircleBoundsUnit } from "../../rooms/CellRoomTiny"; // reuse bounds type
import { Quadtree } from "@timohausmann/quadtree-ts";
import { RoleType } from "../../schemas/commands/CellRoomCommands";

// Simple random wandering + respawn system for monsters.
// Keeps logic lightweight. Can be expanded later.

export interface MonsterConfig {
	maxMonsters?: number;
	spawnRadius?: number; // initial spawn area from center (0,0)
	worldWidth: number;
	worldHeight: number;
}

const DEFAULT_CONFIG: Required<Omit<MonsterConfig, 'worldWidth'|'worldHeight'>> = {
	maxMonsters: 50,
	spawnRadius: 500,
};

// Internal utility for random float in range
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

// Local augmentation type to avoid changing schema right now.
type MutableMonster = MonsterUnit & { velocity: Vec2; circleBounds?: CircleBoundsUnit<string>; radius: number };

// Spawn missing monsters up to target count
export function monsterSpawnSystem(world: World<MonsterUnit>, quadtree: Quadtree<CircleBoundsUnit<string>>, cfg: MonsterConfig) {
	const { maxMonsters, spawnRadius } = { ...DEFAULT_CONFIG, ...cfg };
	const need = maxMonsters - world.entities.length;
	for (let i = 0; i < need; i++) {
		const m = new MonsterUnit() as MutableMonster;
		m.id = Date.now() + Math.floor(Math.random() * 100000);
		// Ensure position exists
		if (!m.position) { (m as any).position = { x: 0, y: 0 }; }
		m.position.x = rand(-spawnRadius, spawnRadius);
		m.position.y = rand(-spawnRadius, spawnRadius);
		// Provide default radius if not present
		m.radius = (m as any).radius || 10;
		m.velocity = new Vec2();
		m.velocity.x = rand(-20, 20) / 10;
		m.velocity.y = rand(-20, 20) / 10;
		m.circleBounds = new CircleBoundsUnit(m.position.x, m.position.y, m.radius, RoleType.Monster, String(m.id));
		quadtree.insert(m.circleBounds);
		world.add(m as MonsterUnit);
	}
}

// Random wandering with boundary clamping
export function monsterMovementSystem(world: World<MonsterUnit>, quadtree: Quadtree<CircleBoundsUnit<string>>, deltaTime: number, cfg: MonsterConfig) {
	const { worldWidth, worldHeight } = cfg;
	for (const m of world.entities) {
		const mm = m as MutableMonster;
		if (!mm.velocity) { mm.velocity = new Vec2(); }
		// Small random change to direction
		mm.velocity.x += rand(-0.5, 0.5) * deltaTime;
		mm.velocity.y += rand(-0.5, 0.5) * deltaTime;
		// Clamp velocity
		const maxSpeed = 5;
		if (mm.velocity.x > maxSpeed) mm.velocity.x = maxSpeed; else if (mm.velocity.x < -maxSpeed) mm.velocity.x = -maxSpeed;
		if (mm.velocity.y > maxSpeed) mm.velocity.y = maxSpeed; else if (mm.velocity.y < -maxSpeed) mm.velocity.y = -maxSpeed;
		// Integrate position
		mm.position.x += mm.velocity.x;
		mm.position.y += mm.velocity.y;
		// Bounds wrap / clamp
		if (mm.position.x < 0) mm.position.x = worldWidth; else if (mm.position.x > worldWidth) mm.position.x = 0;
		if (mm.position.y < 0) mm.position.y = worldHeight; else if (mm.position.y > worldHeight) mm.position.y = 0;
		// Update circle bounds in quadtree (remove + reinsert for simplicity)
		if (mm.circleBounds) {
			quadtree.remove(mm.circleBounds);
			mm.circleBounds.x = mm.position.x;
			mm.circleBounds.y = mm.position.y;
			quadtree.insert(mm.circleBounds);
		}
	}
}

// Cleanup removed monsters if needed (placeholder for future despawn rules)
export function monsterCleanupSystem(world: World<MonsterUnit>, quadtree: Quadtree<CircleBoundsUnit<string>>) {
	// Currently no periodic cleanup rules; hook point for future logic.
}

// Behavior: chase nearest leader within aggroRadius, else wander.
export interface MonsterBehaviorConfig {
	aggroRadius?: number;
}

const DEFAULT_BEHAVIOR: Required<MonsterBehaviorConfig> = {
	aggroRadius: 200,
};

export function monsterBehaviorSystem(monsters: World<MonsterUnit>, leaders: World<LeaderUnit>, deltaTime: number, cfg?: MonsterBehaviorConfig) {
	const { aggroRadius } = { ...DEFAULT_BEHAVIOR, ...(cfg || {}) };
	const aggroSq = aggroRadius * aggroRadius;
	for (const m of monsters.entities) {
		const mm = m as MutableMonster;
		if (!mm.velocity) mm.velocity = new Vec2();
		// Find nearest leader
		let target: LeaderUnit | undefined;
		let best = Number.MAX_SAFE_INTEGER;
		for (const l of leaders.entities) {
			const dx = l.position.x - mm.position.x;
			const dy = l.position.y - mm.position.y;
			const d2 = dx * dx + dy * dy;
			if (d2 < best) { best = d2; target = l; }
		}
		if (target && best <= aggroSq) {
			const dx = target.position.x - mm.position.x;
			const dy = target.position.y - mm.position.y;
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			const speed = 6; // monsters move a bit faster when chasing
			mm.velocity.x += (dx / len) * speed * deltaTime;
			mm.velocity.y += (dy / len) * speed * deltaTime;
		}
		// else keep movement handled by monsterMovementSystem (wander)
	}
}

