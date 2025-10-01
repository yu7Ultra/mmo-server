import config from './app.config';
import { listen } from '@colyseus/tools';

// Create and listen on 2567
listen(config);
