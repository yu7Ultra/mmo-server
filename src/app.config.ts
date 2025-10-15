import { Server } from '@colyseus/core';
import { monitor } from '@colyseus/monitor';
import { playground } from '@colyseus/playground';
import { ConfigOptions } from "@colyseus/tools";
import { uWebSocketsTransport } from '@colyseus/uwebsockets-transport';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { MyRoom } from './rooms/MyRoom';
import { collectAllMetrics, toPrometheusText } from './instrumentation/metrics';
import { register as prometheusRegister } from './instrumentation/prometheusMetrics';
import { captureCPUProfile, listProfiles, captureHeapSnapshot } from './instrumentation/profiler';

// Load environment variables from .env file
dotenv.config();

const port = Number(process.env.PORT) || 2567;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// const transport = new uWebSocketsTransport();

const config: ConfigOptions = {
    options: {
        // presence: new RedisPresence(redisUrl),
        // driver: new RedisDriver(redisUrl),
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

        // Register the monitoring panel only in development
        if (process.env.NODE_ENV === 'development') {
            app.use('/colyseus', monitor());
            app.use('/playground', playground());
            console.log(`Monitoring panel is available at http://localhost:${port}/colyseus`);
            console.log(`Playground is available at http://localhost:${port}/playground`);
            console.log(`Metrics JSON available at http://localhost:${port}/metrics.json`);
            console.log(`Metrics Prometheus available at http://localhost:${port}/metrics`);
        }
    },

    beforeListen: () => {
        console.log(`Colyseus server starting on port ${port}`);
    }
};

export default config;
