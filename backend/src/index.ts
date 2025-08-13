/**
 * AptosAgents Backend Server
 * 
 * Main entry point for the AptosAgents backend
 * Includes Kana Perps integration for $5,000 bounty
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Load environment variables
dotenv.config();

// Import routes and services
import { kanaPerpsRouter } from './routes/kana-perps';
import enhancedKanaRouter from './routes/enhanced-kana';
import { agentsRouter } from './routes/agents';
import { healthRouter } from './routes/health';
import { KanaPerpsService } from './services/kana-perps-service';

// ============================================================================
// SERVER SETUP
// ============================================================================

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

app.use('/health', healthRouter);
app.use('/api/kana', kanaPerpsRouter);
app.use('/api/enhanced-kana', enhancedKanaRouter);
app.use('/api/agents', agentsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AptosAgents Backend',
    version: '1.0.0',
    description: 'Autonomous DeFi Agent Marketplace - Kana Perps Integration',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      kanaPerps: '/api/kana',
      enhancedKana: '/api/enhanced-kana',
      agents: '/api/agents',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', error);
  
  res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    ...(NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// WEBSOCKET SETUP
// ============================================================================

wss.on('connection', (ws, req) => {
  console.log(`🔌 WebSocket client connected from ${req.socket.remoteAddress}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 WebSocket message received:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'subscribe':
          handleSubscription(ws, data);
          break;
        case 'unsubscribe':
          handleUnsubscription(ws, data);
          break;
        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type',
            timestamp: Date.now(),
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: Date.now(),
      }));
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to AptosAgents WebSocket',
    timestamp: Date.now(),
  }));
});

function handleSubscription(ws: any, data: any) {
  // Handle subscription to real-time data feeds
  console.log(`📡 Client subscribed to: ${data.channel}`);
  
  // Store subscription info on the WebSocket
  ws.subscriptions = ws.subscriptions || new Set();
  ws.subscriptions.add(data.channel);
  
  ws.send(JSON.stringify({
    type: 'subscribed',
    channel: data.channel,
    timestamp: Date.now(),
  }));
}

function handleUnsubscription(ws: any, data: any) {
  console.log(`📡 Client unsubscribed from: ${data.channel}`);
  
  if (ws.subscriptions) {
    ws.subscriptions.delete(data.channel);
  }
  
  ws.send(JSON.stringify({
    type: 'unsubscribed',
    channel: data.channel,
    timestamp: Date.now(),
  }));
}

// ============================================================================
// SERVICES INITIALIZATION
// ============================================================================

let kanaService: KanaPerpsService;

async function initializeServices() {
  try {
    console.log('🚀 Initializing services...');
    
    // Initialize Kana Perps service
    kanaService = new KanaPerpsService({
      network: (process.env.KANA_NETWORK as any) || 'testnet',
      apiKey: process.env.KANA_API_KEY,
      secretKey: process.env.KANA_SECRET_KEY,
      passphrase: process.env.KANA_PASSPHRASE,
    });

    // Set up service event handlers
    kanaService.on('opportunityDetected', (opportunity) => {
      console.log(`🎯 Opportunity detected: ${opportunity.symbol}`);
      
      // Broadcast to WebSocket clients
      broadcastToSubscribers('opportunities', {
        type: 'opportunity',
        data: opportunity,
        timestamp: Date.now(),
      });
    });

    kanaService.on('executionCompleted', (execution) => {
      console.log(`✅ Execution completed: ${execution.symbol}`);
      
      // Broadcast to WebSocket clients
      broadcastToSubscribers('executions', {
        type: 'execution',
        data: execution,
        timestamp: Date.now(),
      });
    });

    // Start the service
    await kanaService.start();
    
    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

function broadcastToSubscribers(channel: string, message: any) {
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1 && client.subscriptions?.has(channel)) {
      client.send(JSON.stringify(message));
    }
  });
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Initialize services first
    await initializeServices();
    
    // Start the server
    server.listen(PORT, () => {
      console.log('🚀 AptosAgents Backend Server Started');
      console.log('=====================================');
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🎯 Kana Network: ${process.env.KANA_NETWORK || 'testnet'}`);
      console.log('=====================================');
      console.log('');
      console.log('🎯 Ready for $5,000 Kana Perps bounty demonstration!');
      console.log('');
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop services
    if (kanaService) {
      await kanaService.stop();
    }
    
    // Close WebSocket server
    wss.close();
    
    // Close HTTP server
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('⚠️ Forcing exit after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Export for testing
export { app, server, wss };

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}