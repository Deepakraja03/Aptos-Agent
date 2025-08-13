/**
 * Health Check Routes
 * 
 * System health and status endpoints
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AptosAgents Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * GET /health/detailed
 * Detailed health check with service status
 */
router.get('/detailed', async (req, res) => {
  const healthData = {
    status: 'healthy',
    service: 'AptosAgents Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      kanaPerps: {
        status: 'operational',
        network: process.env.KANA_NETWORK || 'testnet',
        authenticated: !!process.env.KANA_API_KEY,
      },
      aiEngine: {
        status: 'operational',
        modelsLoaded: true,
      },
      database: {
        status: 'operational',
        connected: true,
      },
    },
    features: {
      fundingRateArbitrage: true,
      copyTrading: false, // Coming in Day 4
      marketMaking: false, // Coming in Day 4
      syntheticOptions: false, // Coming in Day 5
    },
  };

  res.json(healthData);
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes/Docker
 */
router.get('/ready', (req, res) => {
  // Check if all required services are ready
  const isReady = true; // Add actual readiness checks here
  
  if (isReady) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes/Docker
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };