#!/usr/bin/env node
/**
 * Cleanup stale nodes from Redis
 * Usage: node scripts/cleanup-redis-nodes.js
 */

require('dotenv').config();
const Redis = require('ioredis');

async function cleanup() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.error('❌ REDIS_URL not configured');
        process.exit(1);
    }

    const redis = new Redis(redisUrl);
    
    try {
        console.log('🔍 Checking colyseus:nodes...');
        const nodes = await redis.smembers('colyseus:nodes');
        
        if (nodes.length === 0) {
            console.log('✅ No nodes found in Redis');
            return;
        }

        console.log(`📋 Found ${nodes.length} nodes:`);
        nodes.forEach((node, i) => console.log(`   ${i + 1}. ${node}`));
        
        console.log('\n🗑️  Clearing all nodes...');
        await redis.del('colyseus:nodes');
        
        console.log('✅ All nodes cleared from Redis');
        console.log('💡 Restart your Colyseus servers to re-register');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        await redis.quit();
    }
}

cleanup();
