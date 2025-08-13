/**
 * Kana Perps API Routes
 * 
 * REST API endpoints for Kana Labs perpetual futures integration
 * Primary focus: $5,000 bounty demonstration
 */

import { Router } from 'express';
import { KanaLabsClient } from '../integrations/kana-perps/kana-client';
import { FundingRateArbitrageAgent } from '../integrations/kana-perps/agents/funding-rate-arbitrage';

const router = Router();

// Initialize Kana client (will be replaced with service injection)
let kanaClient: KanaLabsClient;
let arbitrageAgent: FundingRateArbitrageAgent;

// Initialize client and agent
function initializeKanaIntegration() {
  if (!kanaClient) {
    kanaClient = new KanaLabsClient({
      network: (process.env.KANA_NETWORK as any) || 'devnet',
      apiKey: process.env.KANA_API_KEY,
      secretKey: process.env.KANA_SECRET_KEY,
      passphrase: process.env.KANA_PASSPHRASE,
    });

    arbitrageAgent = new FundingRateArbitrageAgent(kanaClient, {
      minFundingRateThreshold: parseFloat(process.env.MIN_FUNDING_RATE || '0.005'),
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '10000'),
      executionMode: (process.env.EXECUTION_MODE as any) || 'paper',
    });
  }
}

// ============================================================================
// MARKET DATA ENDPOINTS
// ============================================================================

/**
 * GET /api/kana/tickers
 * Get all perpetual futures tickers
 */
router.get('/tickers', async (req, res) => {
  try {
    initializeKanaIntegration();
    const tickers = await kanaClient.getAllTickers();

    return res.json({
      success: true,
      data: tickers,
      count: tickers.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/kana/ticker/:symbol
 * Get ticker for specific symbol
 */
router.get('/ticker/:symbol', async (req, res) => {
  try {
    initializeKanaIntegration();
    const { symbol } = req.params;
    const ticker = await kanaClient.getTicker(symbol);

    return res.json({
      success: true,
      data: ticker,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/kana/funding-rates
 * Get all funding rates
 */
router.get('/funding-rates', async (req, res) => {
  try {
    initializeKanaIntegration();
    const fundingRates = await kanaClient.getAllFundingRates();

    // Sort by absolute funding rate (highest first)
    const sortedRates = fundingRates.sort((a, b) =>
      Math.abs(parseFloat(b.fundingRate)) - Math.abs(parseFloat(a.fundingRate))
    );

    return res.json({
      success: true,
      data: sortedRates,
      count: sortedRates.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/kana/funding-rate/:symbol
 * Get funding rate for specific symbol
 */
router.get('/funding-rate/:symbol', async (req, res) => {
  try {
    initializeKanaIntegration();
    const { symbol } = req.params;
    const fundingRate = await kanaClient.getFundingRate(symbol);

    return res.json({
      success: true,
      data: fundingRate,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/kana/orderbook/:symbol
 * Get order book for specific symbol
 */
router.get('/orderbook/:symbol', async (req, res) => {
  try {
    initializeKanaIntegration();
    const { symbol } = req.params;
    const depth = parseInt(req.query.depth as string) || 100;

    const orderBook = await kanaClient.getOrderBook(symbol, depth);

    return res.json({
      success: true,
      data: orderBook,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// ARBITRAGE ENDPOINTS
// ============================================================================

/**
 * GET /api/kana/opportunities
 * Get current funding rate arbitrage opportunities
 */
router.get('/opportunities', async (req, res) => {
  try {
    initializeKanaIntegration();
    const opportunities = await arbitrageAgent.scanForOpportunities();

    return res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/kana/opportunities/top
 * Get top 5 arbitrage opportunities
 */
router.get('/opportunities/top', async (req, res) => {
  try {
    initializeKanaIntegration();
    const limit = parseInt(req.query.limit as string) || 5;
    const opportunities = await arbitrageAgent.scanForOpportunities();
    const topOpportunities = opportunities.slice(0, limit);

    return res.json({
      success: true,
      data: topOpportunities,
      count: topOpportunities.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * POST /api/kana/execute-arbitrage
 * Execute arbitrage opportunity
 */
router.post('/execute-arbitrage', async (req, res) => {
  try {
    initializeKanaIntegration();
    const { symbol, action, size } = req.body;

    if (!symbol || !action) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and action are required',
        timestamp: Date.now(),
      });
    }

    // Get the opportunity for this symbol
    const opportunities = await arbitrageAgent.scanForOpportunities();
    const opportunity = opportunities.find(opp => opp.symbol === symbol);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'No opportunity found for this symbol',
        timestamp: Date.now(),
      });
    }

    // Execute the arbitrage
    const execution = await arbitrageAgent.executeArbitrage(opportunity);

    if (!execution) {
      return res.status(400).json({
        success: false,
        error: 'Failed to execute arbitrage',
        timestamp: Date.now(),
      });
    }

    return res.json({
      success: true,
      data: execution,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// AGENT MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/kana/agent/status
 * Get arbitrage agent status
 */
router.get('/agent/status', async (req, res) => {
  try {
    initializeKanaIntegration();

    const status = {
      isActive: arbitrageAgent.isActive,
      configuration: arbitrageAgent.configuration,
      performance: arbitrageAgent.getPerformance(),
      activeExecutions: arbitrageAgent.getActiveExecutions(),
      lastScan: arbitrageAgent.lastScan,
    };

    return res.json({
      success: true,
      data: status,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * POST /api/kana/agent/start
 * Start the arbitrage agent
 */
router.post('/agent/start', async (req, res) => {
  try {
    initializeKanaIntegration();

    if (arbitrageAgent.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Agent is already running',
        timestamp: Date.now(),
      });
    }

    await arbitrageAgent.start();

    return res.json({
      success: true,
      message: 'Arbitrage agent started successfully',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * POST /api/kana/agent/stop
 * Stop the arbitrage agent
 */
router.post('/agent/stop', async (req, res) => {
  try {
    initializeKanaIntegration();

    if (!arbitrageAgent.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Agent is not running',
        timestamp: Date.now(),
      });
    }

    await arbitrageAgent.stop();

    return res.json({
      success: true,
      message: 'Arbitrage agent stopped successfully',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/kana/agent/performance
 * Get agent performance metrics
 */
router.get('/agent/performance', async (req, res) => {
  try {
    initializeKanaIntegration();
    const performance = arbitrageAgent.getPerformance();

    return res.json({
      success: true,
      data: performance,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/kana/agent/executions
 * Get active executions
 */
router.get('/agent/executions', async (req, res) => {
  try {
    initializeKanaIntegration();
    const executions = arbitrageAgent.getActiveExecutions();

    return res.json({
      success: true,
      data: executions,
      count: executions.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// ACCOUNT ENDPOINTS (if authenticated)
// ============================================================================

/**
 * GET /api/kana/account
 * Get account information
 */
router.get('/account', async (req, res) => {
  try {
    initializeKanaIntegration();

    if (!kanaClient.authenticated) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: Date.now(),
      });
    }

    const account = await kanaClient.getAccount();

    return res.json({
      success: true,
      data: account,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/kana/positions
 * Get current positions
 */
router.get('/positions', async (req, res) => {
  try {
    initializeKanaIntegration();

    if (!kanaClient.authenticated) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: Date.now(),
      });
    }

    const positions = await kanaClient.getPositions();

    return res.json({
      success: true,
      data: positions,
      count: positions.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// DEMO ENDPOINTS
// ============================================================================

/**
 * GET /api/kana/demo/live-opportunities
 * Live demo endpoint for bounty presentation
 */
router.get('/demo/live-opportunities', async (req, res) => {
  try {
    initializeKanaIntegration();

    console.log('🎬 DEMO: Live opportunities requested');

    const opportunities = await arbitrageAgent.scanForOpportunities();
    const topOpportunities = opportunities.slice(0, 3);

    // Add demo-specific formatting
    const demoData = topOpportunities.map(opp => ({
      ...opp,
      demoFormatted: {
        title: `${opp.symbol} Funding Rate Arbitrage`,
        subtitle: `${opp.recommendedAction} position for ${(opp.fundingRate * 100).toFixed(3)}% funding`,
        profitDisplay: `$${opp.expectedProfit.toFixed(2)} expected profit`,
        confidenceDisplay: `${(opp.confidence * 100).toFixed(1)}% confidence`,
        riskDisplay: `${(opp.riskScore * 100).toFixed(1)}% risk score`,
        timeDisplay: `${Math.floor(opp.timeToFunding / (1000 * 60))} minutes to funding`,
      }
    }));

    return res.json({
      success: true,
      data: demoData,
      meta: {
        totalOpportunities: opportunities.length,
        avgExpectedProfit: opportunities.reduce((sum, opp) => sum + opp.expectedProfit, 0) / opportunities.length,
        highestFundingRate: Math.max(...opportunities.map(opp => Math.abs(opp.fundingRate))),
        demoTimestamp: new Date().toLocaleString(),
      },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

export { router as kanaPerpsRouter };