import { Server } from '@colyseus/core';
import { monitor } from '@colyseus/monitor';
import { playground } from '@colyseus/playground';
import { RedisDriver } from '@colyseus/redis-driver';
import { RedisPresence } from '@colyseus/redis-presence';
import { ConfigOptions } from "@colyseus/tools";
import { uWebSocketsTransport } from '@colyseus/uwebsockets-transport';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { getAnalyticsCollector } from './analytics/analyticsCollector';
import { collectAllMetrics, toPrometheusText } from './instrumentation/metrics';
import { captureCPUProfile, captureHeapSnapshot, listProfiles } from './instrumentation/profiler';
import { register as prometheusRegister } from './instrumentation/prometheusMetrics';
import { CellRoom } from './rooms/CellRoom';
import { CellRoomTiny } from './rooms/CellRoomTiny';
import { ChatRoom } from './rooms/ChatRoom';
import { MyRoom } from './rooms/MyRoom';
import { loggerService, stream } from './services/loggerService';

// Load environment variables from .env file
dotenv.config();

const port = Number(process.env.PORT) || 2567;
const instanceIndex = Number(process.env.NODE_APP_INSTANCE) || 0;
const announcedPort = port + instanceIndex;
const redisUrl = process.env.REDIS_URL;
const publicAddressEnv = process.env.PUBLIC_ADDRESS || 'localhost';

// Avoid advertising malformed addresses like "host:port/port" by normalizing here
const resolvePublicAddress = (address: string, targetPort: number) => {
    // If a port is already present ("host:1234"), respect it as-is
    if (address.includes(':')) {
        return address;
    }
    return `${address}:${targetPort}`;
};

const publicAddress = resolvePublicAddress(publicAddressEnv, announcedPort);

console.log('Configuration:', {
    port,
    redisUrl,
    publicAddress,
    NODE_APP_INSTANCE: process.env.NODE_APP_INSTANCE
});

const config: ConfigOptions = {
    options: {
        // Public address for this server instance
        publicAddress,
        // Redis-based horizontal scaling (enabled when REDIS_URL is set)
        // presence: new RedisPresence(redisUrl),
        devMode: process.env.NODE_ENV === 'development',  // Only enable in dev
        // driver: new RedisDriver(redisUrl),
        gracefullyShutdown: true,
    },
    initializeTransport() {
        return new uWebSocketsTransport();
    },
    initializeGameServer: (gameServer: Server) => {
        // gameServer.define('my_room', MyRoom);
        gameServer.define('chat_room', ChatRoom);
        // gameServer.define('mmo_room', CellRoom);
        gameServer.define('mmo_room_tiny', CellRoomTiny).filterBy(['region']);
    },

    initializeExpress: (app: express.Application) => {
        app.use(express.json());

        // Fix HTTP version for uWebSockets compatibility
        app.use((req, res, next) => {
            if (!req.httpVersion) {
                req.httpVersion = '1.1';
            }
            next();
        });

        // Add HTTP request logging middleware (custom format for uWebSockets compatibility)
        app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', { stream }));

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

        // Ticket System endpoints
        app.post('/tickets', (req, res) => {
            const { playerId, playerName, category, subject, description, priority, attachments } = req.body;
            const ticketSystem = require('./tickets/ticketSystem').getTicketSystem();
            const ticket = ticketSystem.createTicket(
                playerId,
                playerName,
                category,
                subject,
                description,
                priority,
                attachments
            );
            res.json({ status: 'ok', ticket });
        });

        app.get('/tickets', (req, res) => {
            const ticketSystem = require('./tickets/ticketSystem').getTicketSystem();
            const status = req.query.status as string | undefined;
            const playerId = req.query.playerId as string | undefined;

            let tickets;
            if (playerId) {
                tickets = ticketSystem.getPlayerTickets(playerId);
            } else if (status) {
                tickets = ticketSystem.getTicketsByStatus(status as any);
            } else {
                tickets = ticketSystem.getOpenTickets();
            }

            res.json({ tickets, timestamp: Date.now() });
        });

        app.get('/tickets/:id', (req, res) => {
            const ticketSystem = require('./tickets/ticketSystem').getTicketSystem();
            const ticket = ticketSystem.getTicket(req.params.id);

            if (!ticket) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }

            res.json({ ticket });
        });

        app.post('/tickets/:id/responses', (req, res) => {
            const { authorId, authorName, isStaff, message, attachments, internal } = req.body;
            const ticketSystem = require('./tickets/ticketSystem').getTicketSystem();
            const response = ticketSystem.addResponse(
                req.params.id,
                authorId,
                authorName,
                isStaff,
                message,
                attachments,
                internal
            );

            if (!response) {
                res.status(404).json({ error: 'Ticket not found' });
                return;
            }

            res.json({ status: 'ok', response });
        });

        app.get('/tickets/stats', (req, res) => {
            const ticketSystem = require('./tickets/ticketSystem').getTicketSystem();
            res.json({ stats: ticketSystem.getTicketStats(), timestamp: Date.now() });
        });

        app.get('/faqs', (req, res) => {
            const ticketSystem = require('./tickets/ticketSystem').getTicketSystem();
            const category = req.query.category as string | undefined;
            const query = req.query.q as string | undefined;

            let faqs;
            if (query) {
                faqs = ticketSystem.searchFAQs(query);
            } else {
                faqs = ticketSystem.getFAQs(category as any);
            }

            res.json({ faqs });
        });

        app.get('/templates', (req, res) => {
            const ticketSystem = require('./tickets/ticketSystem').getTicketSystem();
            const category = req.query.category as string | undefined;
            const templates = ticketSystem.getTemplates(category as any);
            res.json({ templates });
        });

        // RTC token endpoint for Agora and Tencent Cloud
        app.get('/rtc/token', async (req, res) => {
            const channel = (req.query.channel as string) || 'global';
            const userId = (req.query.userId as string) || 'anonymous';
            const provider = (req.query.provider as string) || 'agora';

            try {
                if (provider === 'tencent') {
                    // Generate Tencent Cloud TRTC token
                    const { tencentVoiceService } = await import('./services/tencentVoiceService');
                    const token = await tencentVoiceService.generateVoiceToken(userId, channel);
                    res.json({
                        token,
                        channel,
                        sdkAppId: process.env.TENCENT_TRTC_SDK_APP_ID || '',
                        provider: 'tencent'
                    });
                } else if (provider === 'agora') {
                    // Generate Agora RTC token
                    const { agoraVoiceService } = await import('./services/agoraVoiceService');
                    const token = agoraVoiceService.generateVoiceToken(channel, userId);
                    res.json({
                        token,
                        channel,
                        appId: process.env.AGORA_APP_ID || '',
                        provider: 'agora'
                    });
                } else {
                    // For other providers, return placeholder token
                    const token = Buffer.from(`${userId}:${channel}:${Date.now()}`).toString('base64');
                    res.json({
                        token,
                        channel,
                        provider: 'native'
                    });
                }
            } catch (error) {
                loggerService.error('Token generation error', error as Error, {
                    module: 'rtc',
                    provider,
                    channel,
                    userId
                });
                res.status(500).json({
                    error: 'Failed to generate token',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Register the monitoring panel only in development
        if (process.env.NODE_ENV === 'development') {
            app.use('/colyseus', monitor({ columns: ["roomId", "name", "clients", "maxClients", "locked", "elapsedTime", "publicAddress", "processId"] }));
            app.use('/playground', playground());
            loggerService.info(`Monitoring panel is available at http://localhost:${port}/colyseus`, { module: 'monitoring' });
            loggerService.info(`Playground is available at http://localhost:${port}/playground`, { module: 'monitoring' });
            loggerService.info(`Metrics JSON available at http://localhost:${port}/metrics.json`, { module: 'monitoring' });
            loggerService.info(`Metrics Prometheus available at http://localhost:${port}/metrics`, { module: 'monitoring' });
            loggerService.info(`Analytics Dashboard available at http://localhost:${port}/analytics`, { module: 'monitoring' });
        }
    },

    beforeListen: () => {
        loggerService.info(`Colyseus server starting on port ${port}`, { module: 'server', port });
        if (redisUrl) {
            loggerService.info(`Redis scaling enabled: ${redisUrl}`, { module: 'server', redisUrl });
            loggerService.info(`Server instance ready for horizontal scaling`, { module: 'server' });
        } else {
            loggerService.info(`Running in single-server mode (set REDIS_URL for horizontal scaling)`, { module: 'server' });
        }
    }
};

export default config;
