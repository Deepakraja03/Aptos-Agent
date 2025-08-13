/**
 * Enhanced Kana Perps Service - Day 2 Implementation
 * 
 * Advanced service orchestrator with enhanced features:
 * - Enhanced position management
 * - Advanced market analysis
 * - Real-time performance monitoring
 * - Comprehensive risk management
 */

import { EventEmitter } from 'events';
import { KanaLabsClient } from '../integrations/kana-perps/kana-client';
import { FundingRateArbitrageAgent } from '../integrations/kana-perps/agents/funding-rate-arbitrage';
import { AdvancedPositionManager } from '../integrations/kana-perps/services/position-manager';
import { AdvancedMarketAnalyzer } from '../integrations/kana-perps/services/market-analyzer';
import { AdvancedPerformanceMonitor } from '../integrations/kana-perps/services/performance-monitor';

export interface EnhancedKanaServiceConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  apiKey?: string;
  secretKey?: string;
  passphrase?: string;
  autoStart?: boolean;
  positionManager?: {
    maxPositionSize?: number;
    maxPortfolioRisk?: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
    riskPerTrade?: number;
  };
  marketAnalyzer?: {
    symbols?: string[];
    analysisInterval?: number;
  };
  arbitrageAgent?: {
    minFundingRateThreshold?: number;
    maxPositionSize?: number;
    executionMode?: 'paper' | 'live';
    riskPerTrade?: number;
    maxConcurrentPositions?: number;
  };
}

export class EnhancedKanaService extends EventEmitter {
  private _client!: KanaLabsClient;
  private config: EnhancedKanaServiceConfig;
  private _arbitrageAgent!: FundingRateArbitrageAgent;
  private _positionManager!: AdvancedPositionManager;
  private _marketAnalyzer!: AdvancedMarketAnalyzer;
  private _performanceMonitor!: AdvancedPerformanceMonitor;
  private isRunning = false;
  private isInitialized = false;

  constructor(config: EnhancedKanaServiceConfig) {
    super();
    
    this.config = {
      autoStart: true,
      positionManager: {
        maxPositionSize: 50000,
        maxPortfolioRisk: 0.15,
        stopLossPercent: 0.03,
        takeProfitPercent: 0.08,
        riskPerTrade: 0.02,
      },
      marketAnalyzer: {
        symbols: ['BTC-PERP', 'ETH-PERP', 'APT-PERP', 'SOL-PERP'],
        analysisInterval: 30000,
      },
      arbitrageAgent: {
        minFundingRateThreshold: 0.005,
        maxPositionSize: 10000,
        executionMode: 'paper',
        riskPerTrade: 0.02,
        maxConcurrentPositions: 5,
      },
      ...config,
    };

    this.initializeComponents();
    this.setupEventHandlers();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeComponents(): void {
    // Initialize Kana client
    this._client = new KanaLabsClient({
      network: this.config.network,
      apiKey: this.config.apiKey,
      secretKey: this.config.secretKey,
      passphrase: this.config.passphrase,
    });

    // Initialize arbitrage agent
    this._arbitrageAgent = new FundingRateArbitrageAgent(this._client, {
      minFundingRateThreshold: this.config.arbitrageAgent?.minFundingRateThreshold || 0.005,
      maxPositionSize: this.config.arbitrageAgent?.maxPositionSize || 10000,
      executionMode: this.config.arbitrageAgent?.executionMode || 'paper',
      riskPerTrade: this.config.arbitrageAgent?.riskPerTrade || 0.02,
      maxConcurrentPositions: this.config.arbitrageAgent?.maxConcurrentPositions || 5,
    });

    // Initialize enhanced services
    this._positionManager = new AdvancedPositionManager(this._client, {
      maxPositionSize: this.config.positionManager?.maxPositionSize || 50000,
      maxPortfolioRisk: this.config.positionManager?.maxPortfolioRisk || 0.15,
      stopLossPercent: this.config.positionManager?.stopLossPercent || 0.03,
      takeProfitPercent: this.config.positionManager?.takeProfitPercent || 0.08,
      riskPerTrade: this.config.positionManager?.riskPerTrade || 0.02,
    });

    this._marketAnalyzer = new AdvancedMarketAnalyzer(
      this._client, 
      this.config.marketAnalyzer?.symbols
    );

    this._performanceMonitor = new AdvancedPerformanceMonitor(this._client);
  }

  private setupEventHandlers(): void {
    // Client events
    this._client.on('wsOpen', () => {
      console.log('📡 Kana WebSocket connected');
      this.emit('websocketConnected');
    });

    this._client.on('wsClose', () => {
      console.log('📡 Kana WebSocket disconnected');
      this.emit('websocketDisconnected');
    });

    this._client.on('wsError', (error) => {
      console.error('📡 Kana WebSocket error:', error);
      this.emit('websocketError', error);
    });

    // Position Manager Events
    this._positionManager.on('alert', (alert) => {
      console.log(`🚨 Position Alert: ${alert.message}`);
      this.emit('positionAlert', alert);
    });

    this._positionManager.on('positionOpened', (data) => {
      console.log(`📈 Position opened: ${data.side} ${data.size} ${data.symbol}`);
      
      // Record trade in performance monitor
      this._performanceMonitor.recordTrade({
        symbol: data.symbol,
        side: data.side === 'long' ? 'buy' : 'sell',
        size: data.size,
        entryPrice: parseFloat(data.order.price || '0'),
        entryTime: Date.now(),
        fees: 0,
        status: 'OPEN',
        strategy: 'enhanced_arbitrage',
        confidence: 0.8,
        slippage: 0,
        executionTime: 100,
      });

      this.emit('positionOpened', data);
    });

    this._positionManager.on('positionClosed', (data) => {
      console.log(`📉 Position closed: ${data.symbol} (${data.size})`);
      this.emit('positionClosed', data);
    });

    // Market Analyzer Events
    this._marketAnalyzer.on('signalGenerated', (signal) => {
      console.log(`📊 Market Signal: ${signal.type} ${signal.symbol} (${(signal.confidence * 100).toFixed(1)}%)`);
      this.emit('marketSignal', signal);
    });

    this._marketAnalyzer.on('marketAlert', (alert) => {
      console.log(`🚨 Market Alert: ${alert.message}`);
      this.emit('marketAlert', alert);
    });

    this._marketAnalyzer.on('conditionUpdated', (condition) => {
      this.emit('marketConditionUpdated', condition);
    });

    // Performance Monitor Events
    this._performanceMonitor.on('performanceAlert', (alert) => {
      console.log(`📈 Performance Alert: ${alert.message}`);
      this.emit('performanceAlert', alert);
    });

    this._performanceMonitor.on('metricsUpdated', (metrics) => {
      this.emit('performanceUpdated', metrics);
    });

    // Arbitrage Agent Events
    this._arbitrageAgent.on('opportunityDetected', (opportunity) => {
      console.log(`🎯 Arbitrage Opportunity: ${opportunity.symbol} - ${opportunity.expectedProfit.toFixed(2)}`);
      this.emit('opportunityDetected', opportunity);
    });

    this._arbitrageAgent.on('executionCompleted', (execution) => {
      console.log(`✅ Arbitrage executed: ${execution.symbol} - ${execution.action}`);
      this.emit('arbitrageExecuted', execution);
    });

    this._arbitrageAgent.on('scanCompleted', (data) => {
      console.log(`🔍 Arbitrage scan completed: ${data.opportunities.length} opportunities`);
      this.emit('arbitrageScanCompleted', data);
    });
  }

  // ============================================================================
  // SERVICE CONTROL
  // ============================================================================

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Enhanced Kana Service is already running');
      return;
    }

    console.log('🚀 Starting Enhanced Kana Service...');

    try {
      // Authenticate if credentials are provided
      if (this.config.apiKey && this.config.secretKey) {
        await this._client.authenticate();
        console.log('✅ Kana Labs authentication successful');
      } else {
        console.log('⚠️ No API credentials - running in public mode only');
      }

      // Start enhanced services
      await this._positionManager.startMonitoring();
      console.log('✅ Position Manager started');

      await this._marketAnalyzer.startAnalysis();
      console.log('✅ Market Analyzer started');

      await this._performanceMonitor.startMonitoring();
      console.log('✅ Performance Monitor started');

      // Start arbitrage agent if auto-start is enabled
      if (this.config.autoStart) {
        await this._arbitrageAgent.start();
        console.log('✅ Arbitrage Agent started');
      }

      this.isRunning = true;
      this.isInitialized = true;
      this.emit('started');
      
      console.log('✅ Enhanced Kana Service started successfully');
    } catch (error) {
      console.error('❌ Failed to start Enhanced Kana Service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Enhanced Kana Service...');

    try {
      // Stop all services
      await this._arbitrageAgent.stop();
      await this._positionManager.stopMonitoring();
      await this._marketAnalyzer.stopAnalysis();
      await this._performanceMonitor.stopMonitoring();

      // Disconnect client
      this._client.disconnect();

      this.isRunning = false;
      this.emit('stopped');
      
      console.log('✅ Enhanced Kana Service stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping Enhanced Kana Service:', error);
      throw error;
    }
  }

  // ============================================================================
  // ENHANCED API METHODS
  // ============================================================================

  // Market Data & Analysis
  async getMarketData(symbol?: string) {
    if (symbol) {
      const [ticker, fundingRate, orderBook, analysis] = await Promise.all([
        this._client.getTicker(symbol),
        this._client.getFundingRate(symbol),
        this._client.getOrderBook(symbol, 10),
        this.getMarketAnalysis(symbol),
      ]);

      return {
        ticker,
        fundingRate,
        orderBook,
        analysis,
        timestamp: Date.now(),
      };
    }

    const [tickers, fundingRates, analysis] = await Promise.all([
      this._client.getAllTickers(),
      this._client.getAllFundingRates(),
      this.getMarketAnalysis(),
    ]);

    return {
      tickers,
      fundingRates,
      analysis,
      timestamp: Date.now(),
    };
  }

  async getMarketAnalysis(symbol?: string) {
    if (symbol) {
      return {
        signals: this._marketAnalyzer.getSignals(symbol),
        latestSignal: this._marketAnalyzer.getLatestSignal(symbol),
        condition: this._marketAnalyzer.getMarketCondition(symbol),
        priceLevels: this._marketAnalyzer.getPriceLevels(symbol),
        priceHistory: this._marketAnalyzer.getPriceHistory(symbol).slice(-100), // Last 100 points
      };
    }

    return {
      allSignals: this._marketAnalyzer.getSignals().slice(-50), // Last 50 signals
      alerts: this._marketAnalyzer.getAlerts(),
      isAnalyzing: this._marketAnalyzer.isAnalyzing(),
    };
  }

  // Enhanced Position Management
  async getPositionData() {
    const [positions, metrics, alerts] = await Promise.all([
      this.positionManager.getPositions(),
      this.positionManager.getPortfolioMetrics(),
      this.positionManager.getAlerts(),
    ]);

    return {
      positions,
      metrics,
      alerts,
      isMonitoring: this.positionManager.isMonitoringActive(),
      timestamp: Date.now(),
    };
  }

  async openEnhancedPosition(
    symbol: string,
    side: 'long' | 'short',
    size: number,
    options?: {
      stopLoss?: number;
      takeProfit?: number;
      leverage?: number;
    }
  ) {
    // Perform risk assessment first
    const riskAssessment = await this.positionManager.assessPositionRisk(symbol, size);
    
    if (riskAssessment.recommendation === 'CLOSE') {
      throw new Error(`Risk assessment prevents position: ${riskAssessment.reasoning}`);
    }

    // Adjust size based on risk assessment
    const adjustedSize = Math.min(size, riskAssessment.maxSafeSize);
    
    return await this.positionManager.openPosition(symbol, side, adjustedSize, options);
  }

  async closeEnhancedPosition(symbol: string, size?: number) {
    return await this.positionManager.closePosition(symbol, size);
  }

  // Performance & Analytics
  async getPerformanceData() {
    const [metrics, history, trades, report] = await Promise.all([
      this.performanceMonitor.getCurrentMetrics(),
      this.performanceMonitor.getMetricsHistory(100),
      this.performanceMonitor.getTrades(),
      this.performanceMonitor.generateReport(),
    ]);

    return {
      current: metrics,
      history,
      trades: trades.slice(-50), // Last 50 trades
      report,
      isMonitoring: this.performanceMonitor.isMonitoringActive(),
      timestamp: Date.now(),
    };
  }

  async getBenchmarkComparison(benchmark: 'BTC' | 'ETH' | 'MARKET', period: '1d' | '7d' | '30d' | '90d' | '1y') {
    return await this.performanceMonitor.compareToBenchmark(benchmark, period);
  }

  // Enhanced Arbitrage Operations
  async getArbitrageData() {
    const [opportunities, performance, executions] = await Promise.all([
      this.arbitrageAgent.scanForOpportunities(),
      this.arbitrageAgent.getPerformance(),
      this.arbitrageAgent.getActiveExecutions(),
    ]);

    return {
      opportunities: opportunities.slice(0, 10), // Top 10 opportunities
      performance,
      activeExecutions: executions,
      isActive: this.arbitrageAgent.isActive,
      timestamp: Date.now(),
    };
  }

  async executeEnhancedArbitrage(symbol: string) {
    // Get opportunities
    const opportunities = await this.arbitrageAgent.scanForOpportunities();
    const opportunity = opportunities.find(opp => opp.symbol === symbol);
    
    if (!opportunity) {
      throw new Error(`No arbitrage opportunity found for ${symbol}`);
    }

    // Enhanced risk assessment
    const riskAssessment = await this.positionManager.assessPositionRisk(
      symbol, 
      opportunity.recommendedSize
    );

    if (riskAssessment.recommendation === 'CLOSE') {
      throw new Error(`Risk assessment prevents execution: ${riskAssessment.reasoning}`);
    }

    // Get market signal for additional confirmation
    const marketSignal = this.marketAnalyzer.getLatestSignal(symbol);
    
    // Adjust opportunity based on risk and market conditions
    const enhancedOpportunity = {
      ...opportunity,
      recommendedSize: Math.min(opportunity.recommendedSize, riskAssessment.maxSafeSize),
      confidence: marketSignal 
        ? Math.min(opportunity.confidence, marketSignal.confidence)
        : opportunity.confidence * 0.8, // Reduce confidence if no market signal
    };

    return await this.arbitrageAgent.executeArbitrage(enhancedOpportunity);
  }

  // Comprehensive Dashboard Data
  async getDashboardData() {
    const [marketData, positionData, performanceData, arbitrageData] = await Promise.all([
      this.getMarketData(),
      this.getPositionData(),
      this.getPerformanceData(),
      this.getArbitrageData(),
    ]);

    return {
      market: marketData,
      positions: positionData,
      performance: performanceData,
      arbitrage: arbitrageData,
      system: this.getSystemStatus(),
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // SYSTEM STATUS & HEALTH
  // ============================================================================

  getSystemStatus() {
    return {
      isRunning: this.isRunning,
      isInitialized: this.isInitialized,
      network: this.config.network,
      client: {
        authenticated: this._client.authenticated,
        network: this._client.network,
      },
      services: {
        arbitrageAgent: {
          active: this.arbitrageAgent.isActive,
          lastScan: this.arbitrageAgent.lastScan,
        },
        positionManager: {
          monitoring: this.positionManager.isMonitoringActive(),
        },
        marketAnalyzer: {
          analyzing: this.marketAnalyzer.isAnalyzing(),
        },
        performanceMonitor: {
          monitoring: this.performanceMonitor.isMonitoringActive(),
          uptime: this.performanceMonitor.getUptime(),
        },
      },
      lastUpdate: Date.now(),
    };
  }

  async getHealthCheck() {
    const status = this.getSystemStatus();
    
    // Perform basic health checks
    const healthChecks = {
      clientConnection: this._client.authenticated || !this.config.apiKey,
      servicesRunning: status.services.arbitrageAgent.active && 
                      status.services.positionManager.monitoring &&
                      status.services.marketAnalyzer.analyzing &&
                      status.services.performanceMonitor.monitoring,
      recentActivity: status.services.arbitrageAgent.lastScan > Date.now() - 300000, // Last 5 minutes
    };

    const isHealthy = Object.values(healthChecks).every(check => check);

    return {
      healthy: isHealthy,
      status,
      checks: healthChecks,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get isActive(): boolean {
    return this.isRunning;
  }

  get kanaClient(): KanaLabsClient {
    return this._client;
  }

  get arbitrageAgent(): FundingRateArbitrageAgent {
    return this._arbitrageAgent;
  }

  get positionManager(): AdvancedPositionManager {
    return this._positionManager;
  }

  get marketAnalyzer(): AdvancedMarketAnalyzer {
    return this._marketAnalyzer;
  }

  get performanceMonitor(): AdvancedPerformanceMonitor {
    return this._performanceMonitor;
  }
}