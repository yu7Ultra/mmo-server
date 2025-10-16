import { Server } from '@colyseus/core';
import { monitor } from '@colyseus/monitor';
import { playground } from '@colyseus/playground';
import { ConfigOptions } from "@colyseus/tools";
import { uWebSocketsTransport } from '@colyseus/uwebsockets-transport';
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { MyRoom } from './rooms/MyRoom';
import { collectAllMetrics, toPrometheusText } from './instrumentation/metrics';
import { register as prometheusRegister } from './instrumentation/prometheusMetrics';
import { captureCPUProfile, listProfiles, captureHeapSnapshot } from './instrumentation/profiler';
import { getAnalyticsCollector } from './analytics/analyticsCollector';

// Load environment variables from .env file
dotenv.config();

const port = Number(process.env.PORT) || 2567;
const redisUrl = process.env.REDIS_URL;

// const transport = new uWebSocketsTransport();

const config: ConfigOptions = {
    options: {
        // Redis-based horizontal scaling (enabled when REDIS_URL is set)
        presence: redisUrl ? new RedisPresence(redisUrl) : undefined,
        driver: redisUrl ? new RedisDriver(redisUrl) : undefined,
    },
    initializeTransport() {
        return new uWebSocketsTransport();
    },
    initializeGameServer: (gameServer: Server) => {
        gameServer.define('my_room', MyRoom);
    },

    initializeExpress: (app: express.Application) => {
        app.use(express.json());

        // Serve the frontend
        app.use(express.static(path.join(process.cwd(), "client", "dist")));

        // Metrics endpoints
        app.get('/metrics.json', (req, res) => {
            res.json(collectAllMetrics());
        });
        
        // Prometheus metrics endpoint (standard format)
        app.get('/metrics', async (req, res) => {
            res.setHeader('Content-Type', prometheusRegister.contentType);
            res.send(await prometheusRegister.metrics());
        });
        
        // Legacy Prometheus endpoint (for backward compatibility)
        app.get('/metrics/legacy', (req, res) => {
            res.setHeader('Content-Type', 'text/plain');
            res.send(toPrometheusText());
        });

        // CPU profiling endpoint (POST /profile/cpu?durationMs=5000)
        app.post('/profile/cpu', async (req, res) => {
            const durationMs = Number(req.query.durationMs || 5000);
            try {
                const filePath = await captureCPUProfile(durationMs);
                res.json({ status: 'ok', file: filePath });
            } catch (err: any) {
                res.status(500).json({ status: 'error', message: err.message });
            }
        });
        // GET convenience (defaults 5000ms)
        app.get('/profile/cpu', async (req, res) => {
            const durationMs = Number(req.query.durationMs || 5000);
            try {
                const filePath = await captureCPUProfile(durationMs);
                res.json({ status: 'ok', file: filePath });
            } catch (err: any) {
                res.status(500).json({ status: 'error', message: err.message });
            }
        });

        // Heap snapshot endpoint
        app.post('/profile/heap', async (req, res) => {
            try {
                const filePath = await captureHeapSnapshot();
                res.json({ status: 'ok', file: filePath });
            } catch (err: any) {
                res.status(500).json({ status: 'error', message: err.message });
            }
        });
        app.get('/profile/heap', async (req, res) => {
            try {
                const filePath = await captureHeapSnapshot();
                res.json({ status: 'ok', file: filePath });
            } catch (err: any) {
                res.status(500).json({ status: 'error', message: err.message });
            }
        });

        // List collected profiles
        app.get('/profile/list', (req, res) => {
            res.json({ files: listProfiles() });
        });
        
        // Analytics Dashboard endpoint
        app.get('/analytics', (req, res) => {
            const analytics = getAnalyticsCollector();
            res.json({
                userMetrics: analytics.getUserMetrics(),
                retentionMetrics: analytics.getRetentionMetrics(),
                levelDistribution: analytics.getLevelDistribution(),
                combatStats: analytics.getCombatStats(),
                economyMetrics: analytics.getEconomyMetrics(),
                questMetrics: analytics.getQuestMetrics(),
                skillMetrics: analytics.getSkillMetrics(),
                churnMetrics: analytics.getChurnMetrics(),
                averageSessionDuration: analytics.getAverageSessionDuration(),
                timestamp: Date.now(),
            });
        });
        
        // Analytics event log
        app.get('/analytics/events', (req, res) => {
            const limit = Number(req.query.limit) || 100;
            const analytics = getAnalyticsCollector();
            res.json({
                events: analytics.getEventLog(limit),
                timestamp: Date.now(),
            });
        });

        // Register the monitoring panel only in development
        if (process.env.NODE_ENV === 'development') {
            app.use('/colyseus', monitor());
            app.use('/playground', playground());
            console.log(`Monitoring panel is available at http://localhost:${port}/colyseus`);
            console.log(`Playground is available at http://localhost:${port}/playground`);
            console.log(`Metrics JSON available at http://localhost:${port}/metrics.json`);
            console.log(`Metrics Prometheus available at http://localhost:${port}/metrics`);
            console.log(`Analytics Dashboard available at http://localhost:${port}/analytics`);
        }
    },

    beforeListen: () => {
        console.log(`Colyseus server starting on port ${port}`);
        if (redisUrl) {
            console.log(`Redis scaling enabled: ${redisUrl}`);
            console.log(`Server instance ready for horizontal scaling`);
        } else {
            console.log(`Running in single-server mode (set REDIS_URL for horizontal scaling)`);
        }
    }
};

export default config;
