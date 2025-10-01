import { ConfigOptions, listen } from "@colyseus/tools";
import { Server } from '@colyseus/core';
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';
import { uWebSocketsTransport } from '@colyseus/uwebsockets-transport';
import { MyRoom } from './rooms/MyRoom';
import { monitor } from '@colyseus/monitor';
import { playground } from '@colyseus/playground';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const port = Number(process.env.PORT) || 2567;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// const transport = new uWebSocketsTransport();

const config: ConfigOptions = {
    options: {
        presence: new RedisPresence(redisUrl),
        driver: new RedisDriver(redisUrl),
    },
    initializeTransport(){
        return new uWebSocketsTransport();
    },
    initializeGameServer: (gameServer: Server) => {
        gameServer.define('my_room', MyRoom);
    },

    initializeExpress: (app: express.Application) => {
        app.use(express.json());

        // Serve the frontend
        app.use(express.static(path.join(process.cwd(), "client", "dist")));

        // Register the monitoring panel only in development
        if (process.env.NODE_ENV === 'development') {
            app.use('/colyseus', monitor());
            app.use('/playground', playground());
            console.log(`Monitoring panel is available at http://localhost:${port}/colyseus`);
            console.log(`Playground is available at http://localhost:${port}/playground`);
        }
    },

    beforeListen: () => {
        console.log(`Colyseus server starting on port ${port}`);
    }
};

export default config;
