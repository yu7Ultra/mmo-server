import { World } from "miniplex";
import { LeaderUnit } from "../../schemas/sync/CellRoomSyncStates";
import { CircleBoundsUnit } from "../../rooms/CellRoomTiny";
import { Quadtree } from "@timohausmann/quadtree-ts";
import { RoleType } from "../../schemas/commands/CellRoomCommands";

// Simple NPC behavior: idle + optional follow closest leader within range.

export interface NPCConfig {
	maxNPCs?: number;
	followRadius?: number;
	worldWidth: number;
	worldHeight: number;
}

const DEFAULT_CFG: Required<Omit<NPCConfig, 'worldWidth'|'worldHeight'>> = {
	maxNPCs: 20,
	followRadius: 150,
};

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

export function npcSpawnSystem(npcWorld: World<LeaderUnit>, cfg: NPCConfig, quadtree: Quadtree<CircleBoundsUnit<string>>) {
	const { maxNPCs } = { ...DEFAULT_CFG, ...cfg };
	const count = npcWorld.entities.length;
	for (let i = count; i < maxNPCs; i++) {
		const npc = new LeaderUnit();
		npc.id = Date.now() + Math.floor(Math.random() * 100000);
		npc.position.x = rand(0, cfg.worldWidth);
		npc.position.y = rand(0, cfg.worldHeight);
		npc.sessionId = `npc_${npc.id}`;
		npc.circleBounds = new CircleBoundsUnit(npc.position.x, npc.position.y, npc.radius, RoleType.NPC, npc.sessionId);
		npc.viewCircleBounds = new CircleBoundsUnit(npc.position.x, npc.position.y, npc.viewRadius, RoleType.ViewArea, npc.sessionId);
		quadtree.insert(npc.circleBounds);
		quadtree.insert(npc.viewCircleBounds);
		npcWorld.add(npc);
	}
}

export function npcBehaviorSystem(npcWorld: World<LeaderUnit>, leaderWorld: World<LeaderUnit>, deltaTime: number, cfg: NPCConfig) {
	const { followRadius } = { ...DEFAULT_CFG, ...cfg };
	for (const npc of npcWorld.entities) {
		// Find closest leader
		let closest: LeaderUnit | undefined;
		let closestDist = Number.MAX_SAFE_INTEGER;
		for (const leader of leaderWorld.entities) {
			const dx = leader.position.x - npc.position.x;
			const dy = leader.position.y - npc.position.y;
			const distSq = dx * dx + dy * dy;
			if (distSq < closestDist) {
				closestDist = distSq;
				closest = leader;
			}
		}
		if (closest && closestDist < followRadius * followRadius) {
			// Move toward leader slowly
			const dx = closest.position.x - npc.position.x;
			const dy = closest.position.y - npc.position.y;
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			const speed = 2; // slow follow
			npc.position.x += (dx / len) * speed * deltaTime;
			npc.position.y += (dy / len) * speed * deltaTime;
		}
		// Slight idle jitter if no leader nearby
		else {
			npc.position.x += rand(-5, 5) * deltaTime;
			npc.position.y += rand(-5, 5) * deltaTime;
		}
	}
}

export function npcUpdateSpatialSystem(npcWorld: World<LeaderUnit>, quadtree: Quadtree<CircleBoundsUnit<string>>) {
	for (const npc of npcWorld.entities) {
		if (npc.circleBounds) {
			quadtree.remove(npc.circleBounds);
			npc.circleBounds.x = npc.position.x;
			npc.circleBounds.y = npc.position.y;
			quadtree.insert(npc.circleBounds);
		}
		if (npc.viewCircleBounds) {
			quadtree.remove(npc.viewCircleBounds);
			npc.viewCircleBounds.x = npc.position.x;
			npc.viewCircleBounds.y = npc.position.y;
			quadtree.insert(npc.viewCircleBounds);
		}
	}
}

