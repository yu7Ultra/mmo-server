import config from './app.config';
import { listen } from '@colyseus/tools';
import { Encoder } from "@colyseus/schema";

// Dynamic sizing strategy ----------------------------------------------------
// If SCHEMA_BUFFER_SIZE provided, use it directly.
// Else compute: expectedClients * perPlayerBytesEstimate + overhead, round to next power of two.
// Environment variables:
//   EXPECTED_MAX_CLIENTS (default 300)
//   PER_PLAYER_BYTES (default 64) -- rough estimate of serialized bytes/player
//   SCHEMA_BUFFER_SIZE (overrides all)
//   SCHEMA_BUFFER_MAX (default 1048576)

function nextPowerOfTwo(n: number) {
	return 1 << (Math.ceil(Math.log2(n)));
}

const maxAllowed = Number(process.env.SCHEMA_BUFFER_MAX || 1024 * 1024); // 1MB cap
let bufferSize: number;
if (process.env.SCHEMA_BUFFER_SIZE) {
	bufferSize = Number(process.env.SCHEMA_BUFFER_SIZE);
} else {
	const expectedClients = Number(process.env.EXPECTED_MAX_CLIENTS || 300);
	const perPlayer = Number(process.env.PER_PLAYER_BYTES || 64);
	const overhead = 4096; // base structure + maps
	bufferSize = nextPowerOfTwo(expectedClients * perPlayer + overhead);
	if (bufferSize < 16 * 1024) bufferSize = 16 * 1024; // minimum 16KB
	if (bufferSize > maxAllowed) bufferSize = maxAllowed;
}
Encoder.BUFFER_SIZE = bufferSize;
console.log(`[schema] Encoder.BUFFER_SIZE initialized to ${Encoder.BUFFER_SIZE} bytes (max=${maxAllowed})`);

// Auto-scale & near-limit warning patch -------------------------------------
try {
	const proto: any = (Encoder as any).prototype;
	if (proto && !proto.__autoScalePatched && typeof proto.encodeAll === 'function') {
		const original = proto.encodeAll;
		proto.encodeAll = function(...args: any[]) {
			try {
				const result = original.apply(this, args);
				// If internal offset available, warn when > 80% capacity
				const used = (this as any).offset || (this as any).cursor || undefined;
				if (typeof used === 'number' && used > Encoder.BUFFER_SIZE * 0.8) {
					console.warn(`[schema] warning: encoded size ${used}B > 80% (${(100*used/Encoder.BUFFER_SIZE).toFixed(1)}%) of BUFFER_SIZE=${Encoder.BUFFER_SIZE}. Consider increasing.`);
				}
				return result;
			} catch (e: any) {
				if (e && /buffer overflow/i.test(e.message)) {
					const newSize = Math.min(Encoder.BUFFER_SIZE * 2, maxAllowed);
					if (newSize !== Encoder.BUFFER_SIZE) {
						console.warn(`[schema] buffer overflow; increasing BUFFER_SIZE from ${Encoder.BUFFER_SIZE} -> ${newSize}`);
						Encoder.BUFFER_SIZE = newSize;
						return original.apply(this, args); // retry once
					}
				}
				throw e;
			}
		};
		proto.__autoScalePatched = true;
	}
} catch (err) {
	console.warn('[schema] auto-scale patch failed:', err);
}

listen(config);
