/**
 * Enhanced Kana Perps API Routes - Day 2 Implementation (Fixed)
 * 
 * Comprehensive REST API endpoints with advanced features:
 * - Enhanced market analysis
 * - Advanced position management
 * - Real-time performance monitoring
 * - Comprehensive risk assessment
 */

import { Router } from 'express';
import { EnhancedKanaService } from '../services/enhanced-kana-service';

// Helper function for error handling
const handleError = (error: unknown): string => {
  return error instanceof Error ? error.message : 'Unknown error';
};

const router = Router();

// Initialize enhanced service
const enhancedKanaService = new EnhancedKanaService({
  network: (process.env.KANA_NETWORK as 'mainnet' | 'testnet' | 'devnet') || 'testnet',
  apiKey: process.env.KANA_API_KEY,
  secretKey: process.env.KANA_SECRET_KEY,
  passphrase: process.env.KANA_PASSPHRASE,
  autoStart: true,
});

// Start service
enhancedKanaService.start().catch(console.error);

// ============================================================================
// ENHANCED MARKET DATA ENDPOINTS
// ============================================================================

/**
 * GET /api/enhanced-kana/market-data
 * Get comprehensive market data with analysis
 */
router.get('/market-data', async (req, res) => {
  try {
    const { symbol } = req.query;
    const marketData = await enhancedKanaService.getMarketData(symbol as string);
    
    res.json({
      success: true,
      data: marketData,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/enhanced-kana/market-analysis
 * Get advanced market analysis
 */
router.get('/market-analysis', async (req, res) => {
  try {
    const { symbol } = req.query;
    const analysis = await enhancedKanaService.getMarketAnalysis(symbol as string);
    
    res.json({
      success: true,
      data: analysis,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/enhanced-kana/funding-rates
 * Get all funding rates with analysis
 */
router.get('/funding-rates', async (req, res) => {
  try {
    const fundingRates = await enhancedKanaService.kanaClient.getAllFundingRates();
    
    // Add analysis
    const analysis = {
      totalSymbols: fundingRates.length,
      avgFundingRate: fundingRates.reduce((sum, rate) => 
        sum + parseFloat(rate.fundingRate), 0) / fundingRates.length,
      highestPositive: Math.max(...fundingRates.map(rate => parseFloat(rate.fundingRate))),
      lowestNegative: Math.min(...fundingRates.map(rate => parseFloat(rate.fundingRate))),
      extremeRates: fundingRates.filter(rate => Math.abs(parseFloat(rate.fundingRate)) > 0.01),
    };
    
    res.json({
      success: true,
      data: {
        rates: fundingRates,
        analysis,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// ENHANCED POSITION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/enhanced-kana/positions
 * Get comprehensive position data
 */
router.get('/positions', async (req, res) => {
  try {
    const positionData = await enhancedKanaService.getPositionData();
    
    res.json({
      success: true,
      data: positionData,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

/**
 * POST /api/enhanced-kana/positions/open
 * Open a new position with enhanced risk management
 */
router.post('/positions/open', async (req, res) => {
  try {
    const { symbol, side, size, stopLoss, takeProfit, leverage } = req.body;
    
    if (!symbol || !side || !size) {
      return res.status(400).json({
        success: false,
        error: 'Symbol, side, and size are required',
        timestamp: Date.now(),
      });
    }

    const result = await enhancedKanaService.openEnhancedPosition(symbol, side, size, {
      stopLoss,
      takeProfit,
      leverage,
    });
    
    return res.json({
      success: true,
      data: result,
      timestamp: Date.now(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

/**
 * POST /api/enhanced-kana/positions/assess-risk
 * Assess risk for a potential position
 */
router.post('/positions/assess-risk', async (req, res) => {
  try {
    const { symbol, size } = req.body;
    
    if (!symbol || !size) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and size are required',
        timestamp: Date.now(),
      });
    }

    const riskAssessment = await enhancedKanaService.positionManager.assessPositionRisk(symbol, size);
    
    return res.json({
      success: true,
      data: riskAssessment,
      timestamp: Date.now(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// ENHANCED PERFORMANCE ENDPOINTS
// ============================================================================

/**
 * GET /api/enhanced-kana/performance
 * Get comprehensive performance data
 */
router.get('/performance', async (req, res) => {
  try {
    const performanceData = await enhancedKanaService.getPerformanceData();
    
    res.json({
      success: true,
      data: performanceData,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/enhanced-kana/performance/benchmark
 * Compare performance to benchmark
 */
router.get('/performance/benchmark', async (req, res) => {
  try {
    const { benchmark = 'BTC', period = '30d' } = req.query;
    
    const comparison = await enhancedKanaService.getBenchmarkComparison(
      benchmark as 'BTC' | 'ETH' | 'MARKET',
      period as '1d' | '7d' | '30d' | '90d' | '1y'
    );
    
    res.json({
      success: true,
      data: comparison,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// ENHANCED ARBITRAGE ENDPOINTS
// ============================================================================

/**
 * GET /api/enhanced-kana/arbitrage
 * Get comprehensive arbitrage data
 */
router.get('/arbitrage', async (req, res) => {
  try {
    const arbitrageData = await enhancedKanaService.getArbitrageData();
    
    res.json({
      success: true,
      data: arbitrageData,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

/**
 * POST /api/enhanced-kana/arbitrage/execute
 * Execute enhanced arbitrage with risk management
 */
router.post('/arbitrage/execute', async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
        timestamp: Date.now(),
      });
    }

    const execution = await enhancedKanaService.executeEnhancedArbitrage(symbol);
    
    return res.json({
      success: true,
      data: execution,
      timestamp: Date.now(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// COMPREHENSIVE DASHBOARD ENDPOINT
// ============================================================================

/**
 * GET /api/enhanced-kana/dashboard
 * Get comprehensive dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const dashboardData = await enhancedKanaService.getDashboardData();
    
    res.json({
      success: true,
      data: dashboardData,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// SYSTEM STATUS & HEALTH ENDPOINTS
// ============================================================================

/**
 * GET /api/enhanced-kana/system/status
 * Get system status
 */
router.get('/system/status', async (req, res) => {
  try {
    const status = enhancedKanaService.getSystemStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/enhanced-kana/system/health
 * Get system health check
 */
router.get('/system/health', async (req, res) => {
  try {
    const health = await enhancedKanaService.getHealthCheck();
    
    res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      data: health,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

// ============================================================================
// ENHANCED DEMO ENDPOINTS
// ============================================================================

/**
 * GET /api/enhanced-kana/demo/live-opportunities
 * Get enhanced live opportunities for demo
 */
router.get('/demo/live-opportunities', async (req, res) => {
  try {
    const dashboardData = await enhancedKanaService.getDashboardData();
    
    // Format for demo presentation
    const demoData = {
      opportunities: dashboardData.arbitrage.opportunities,
      marketSignals: dashboardData.market.analysis?.allSignals?.slice(0, 5) || [],
      performance: {
        arbitrage: dashboardData.arbitrage.performance,
        overall: dashboardData.performance.current,
        positions: dashboardData.positions.metrics,
      },
      activeExecutions: dashboardData.arbitrage.activeExecutions,
      alerts: {
        position: dashboardData.positions.alerts?.filter(a => a.severity === 'HIGH') || [],
        market: dashboardData.market.analysis?.alerts?.slice(0, 3) || [],
        performance: dashboardData.performance.report?.recentAlerts || [],
      },
      systemHealth: dashboardData.system,
      marketContext: {
        totalSymbols: dashboardData.market.fundingRates?.length || 0,
        avgFundingRate: dashboardData.market.fundingRates 
          ? dashboardData.market.fundingRates.reduce((sum, rate) => 
              sum + Math.abs(parseFloat(rate.fundingRate)), 0) / dashboardData.market.fundingRates.length
          : 0,
        activePositions: dashboardData.positions.positions?.length || 0,
        totalPnl: dashboardData.performance.current?.totalPnl || 0,
      },
    };

    res.json({
      success: true,
      data: demoData,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/enhanced-kana/demo/performance-showcase
 * Get performance data formatted for showcase
 */
router.get('/demo/performance-showcase', async (req, res) => {
  try {
    const performanceData = await enhancedKanaService.getPerformanceData();
    const benchmarkComparison = await enhancedKanaService.getBenchmarkComparison('BTC', '30d');
    
    const showcaseData = {
      summary: performanceData.report?.summary || {},
      metrics: performanceData.current,
      benchmark: benchmarkComparison,
      topTrades: performanceData.report?.topTrades || [],
      recentAlerts: performanceData.report?.recentAlerts || [],
      chartData: {
        performance: performanceData.history?.slice(-50) || [],
        trades: performanceData.trades?.slice(-20) || [],
      },
    };

    res.json({
      success: true,
      data: showcaseData,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: handleError(error),
      timestamp: Date.now(),
    });
  }
});

export default router;