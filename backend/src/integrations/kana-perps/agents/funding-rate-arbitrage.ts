/**
 * Funding Rate Arbitrage Agent
 * 
 * Core agent for the $5,000 Kana Perps bounty
 * Detects and executes funding rate arbitrage opportunities
 */

import { EventEmitter } from 'events';
import { KanaLabsClient, KanaFundingRate, KanaPosition, OrderRequest } from '../kana-client';
import { mockDataService } from '../mock-data-service';

export interface ArbitrageConfig {
  minFundingRateThreshold: number; // Minimum funding rate to consider (e.g., 0.01 = 1%)
  maxPositionSize: number; // Maximum position size in USD
  riskPerTrade: number; // Risk per trade as percentage of portfolio (e.g., 0.02 = 2%)
  stopLossPercent: number; // Stop loss percentage (e.g., 0.02 = 2%)
  takeProfitPercent: number; // Take profit percentage (e.g., 0.05 = 5%)
  maxConcurrentPositions: number; // Maximum concurrent positions
  symbols: string[]; // Symbols to monitor
  executionMode: 'paper' | 'live'; // Paper trading or live execution
}

export interface ArbitrageOpportunity {
  symbol: string;
  fundingRate: number;
  expectedProfit: number;
  riskScore: number;
  recommendedAction: 'LONG' | 'SHORT' | 'CLOSE' | 'HOLD';
  recommendedSize: number;
  timeToFunding: number;
  confidence: number;
  reasoning: string;
}

export interface ArbitrageExecution {
  id: string;
  symbol: string;
  action: 'OPEN_LONG' | 'OPEN_SHORT' | 'CLOSE_POSITION';
  size: number;
  entryPrice: number;
  fundingRate: number;
  expectedProfit: number;
  timestamp: number;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CLOSED';
  actualProfit?: number;
  exitPrice?: number;
  exitTimestamp?: number;
}

export interface ArbitragePerformance {
  totalTrades: number;
  successfulTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  avgReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  currentDrawdown: number;
  activeTrades: number;
}

export class FundingRateArbitrageAgent extends EventEmitter {
  private client: KanaLabsClient;
  private config: ArbitrageConfig;
  private isRunning = false;
  private scanTimer?: NodeJS.Timeout;
  private activeExecutions: Map<string, ArbitrageExecution> = new Map();
  private performance: ArbitragePerformance;
  private lastScanTime = 0;

  constructor(client: KanaLabsClient, config: Partial<ArbitrageConfig> = {}) {
    super();
    
    this.client = client;
    this.config = {
      minFundingRateThreshold: 0.01, // 1%
      maxPositionSize: 10000, // $10,000
      riskPerTrade: 0.02, // 2%
      stopLossPercent: 0.02, // 2%
      takeProfitPercent: 0.05, // 5%
      maxConcurrentPositions: 5,
      symbols: ['BTC-PERP', 'ETH-PERP', 'APT-PERP', 'SOL-PERP'],
      executionMode: 'paper',
      ...config,
    };

    this.performance = {
      totalTrades: 0,
      successfulTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      winRate: 0,
      avgReturn: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      currentDrawdown: 0,
      activeTrades: 0,
    };

    this.setupEventHandlers();
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Funding Rate Arbitrage Agent is already running');
      return;
    }

    console.log('🚀 Starting Funding Rate Arbitrage Agent...');
    
    // Verify client authentication
    if (!this.client.authenticated) {
      await this.client.authenticate();
    }

    this.isRunning = true;

    // Initial scan
    await this.scanForOpportunities();

    // Set up periodic scanning (every 30 seconds)
    this.scanTimer = setInterval(() => {
      this.scanForOpportunities().catch(error => {
        console.error('❌ Error in opportunity scan:', error);
        this.emit('error', error);
      });
    }, 30000);

    // Set up real-time funding rate updates
    this.setupRealTimeUpdates();

    this.emit('started');
    console.log('✅ Funding Rate Arbitrage Agent started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Funding Rate Arbitrage Agent...');
    this.isRunning = false;

    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = undefined;
    }

    // Close all active positions if in live mode
    if (this.config.executionMode === 'live') {
      await this.closeAllPositions();
    }

    this.emit('stopped');
    console.log('✅ Funding Rate Arbitrage Agent stopped');
  }

  async scanForOpportunities(): Promise<ArbitrageOpportunity[]> {
    try {
      console.log('🔍 Scanning for funding rate arbitrage opportunities...');
      const startTime = Date.now();

      // Get funding rates for all monitored symbols
      const fundingRates = await this.getFundingRatesForSymbols();
      const opportunities: ArbitrageOpportunity[] = [];

      // Analyze each symbol with enhanced logic
      for (const rate of fundingRates) {
        const opportunity = await this.analyzeOpportunityEnhanced(rate);
        if (opportunity && this.isOpportunityValid(opportunity)) {
          opportunities.push(opportunity);
        }
      }

      // Sort by risk-adjusted expected profit
      opportunities.sort((a, b) => {
        const aScore = b.expectedProfit * b.confidence * (1 - b.riskScore);
        const bScore = a.expectedProfit * a.confidence * (1 - a.riskScore);
        return aScore - bScore;
      });

      this.lastScanTime = Date.now();
      const scanDuration = this.lastScanTime - startTime;

      console.log(`✅ Scan completed in ${scanDuration}ms. Found ${opportunities.length} opportunities.`);

      // Emit events
      this.emit('scanCompleted', {
        timestamp: this.lastScanTime,
        duration: scanDuration,
        opportunities,
      });

      // Execute top opportunities with enhanced selection
      await this.executeOpportunitiesEnhanced(opportunities.slice(0, 3));

      return opportunities;

    } catch (error) {
      console.error('❌ Error scanning for opportunities:', error);
      this.emit('scanError', error);
      throw error;
    }
  }

  async executeArbitrage(opportunity: ArbitrageOpportunity): Promise<ArbitrageExecution | null> {
    try {
      // Check if we can execute (position limits, etc.)
      if (!this.canExecute(opportunity)) {
        console.log(`⚠️ Cannot execute ${opportunity.symbol}: limits reached`);
        return null;
      }

      const execution: ArbitrageExecution = {
        id: `arb_${Date.now()}_${opportunity.symbol}`,
        symbol: opportunity.symbol,
        action: opportunity.recommendedAction === 'LONG' ? 'OPEN_LONG' : 'OPEN_SHORT',
        size: opportunity.recommendedSize,
        entryPrice: 0, // Will be filled after execution
        fundingRate: opportunity.fundingRate,
        expectedProfit: opportunity.expectedProfit,
        timestamp: Date.now(),
        status: 'PENDING',
      };

      console.log(`🎯 Executing arbitrage: ${execution.action} ${execution.size} ${execution.symbol}`);

      if (this.config.executionMode === 'live') {
        // Execute live trade
        const order = await this.placeTrade(opportunity);
        execution.entryPrice = parseFloat(order.avgFillPrice || order.price);
        execution.status = 'EXECUTED';
      } else {
        // Paper trading
        const ticker = await this.client.getTicker(opportunity.symbol);
        execution.entryPrice = parseFloat(ticker.price);
        execution.status = 'EXECUTED';
        console.log(`📝 Paper trade executed: ${execution.action} at ${execution.entryPrice}`);
      }

      // Store execution
      this.activeExecutions.set(execution.id, execution);
      this.updatePerformance();

      this.emit('executionCompleted', execution);
      return execution;

    } catch (error) {
      console.error(`❌ Error executing arbitrage for ${opportunity.symbol}:`, error);
      this.emit('executionError', { opportunity, error });
      return null;
    }
  }

  getActiveExecutions(): ArbitrageExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  getPerformance(): ArbitragePerformance {
    return { ...this.performance };
  }

  getCurrentOpportunities(): Promise<ArbitrageOpportunity[]> {
    return this.scanForOpportunities();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async getFundingRatesForSymbols(): Promise<KanaFundingRate[]> {
    try {
      const promises = this.config.symbols.map(symbol =>
        this.client.getFundingRate(symbol).catch(error => {
          console.warn(`⚠️ Failed to get funding rate for ${symbol}:`, error.message);
          return null;
        })
      );

      const results = await Promise.all(promises);
      const validResults = results.filter((rate): rate is KanaFundingRate => rate !== null);
      
      // If no results from API, fallback to mock data
      if (validResults.length === 0) {
        console.log('📊 Using mock data for funding rates...');
        return await mockDataService.getAllFundingRates();
      }
      
      return validResults;
    } catch (error) {
      console.log('📊 Falling back to mock data for funding rates...');
      return await mockDataService.getAllFundingRates();
    }
  }

  private async analyzeOpportunityEnhanced(rate: KanaFundingRate): Promise<ArbitrageOpportunity | null> {
    // Enhanced analysis with market conditions and volatility
    const basicOpportunity = await this.analyzeOpportunity(rate);
    if (!basicOpportunity) return null;

    // Add enhanced market analysis
    const marketCondition = await this.analyzeMarketCondition(rate.symbol);
    const volatilityAdjustment = await this.calculateVolatilityAdjustment(rate.symbol);
    const liquidityScore = await this.assessLiquidity(rate.symbol);

    // Adjust confidence based on market conditions
    let enhancedConfidence = basicOpportunity.confidence;
    
    if (marketCondition === 'STABLE') {
      enhancedConfidence *= 1.2; // Boost confidence in stable markets
    } else if (marketCondition === 'VOLATILE') {
      enhancedConfidence *= 0.8; // Reduce confidence in volatile markets
    }

    // Adjust for liquidity
    enhancedConfidence *= liquidityScore;

    // Adjust expected profit for volatility
    const adjustedProfit = basicOpportunity.expectedProfit * (1 - volatilityAdjustment);

    return {
      ...basicOpportunity,
      expectedProfit: adjustedProfit,
      confidence: Math.min(enhancedConfidence, 1),
      reasoning: `${basicOpportunity.reasoning} | Market: ${marketCondition} | Liquidity: ${(liquidityScore * 100).toFixed(0)}%`,
    };
  }

  private async analyzeOpportunity(rate: KanaFundingRate): Promise<ArbitrageOpportunity | null> {
    const fundingRate = parseFloat(rate.fundingRate);
    
    // Check minimum threshold
    if (Math.abs(fundingRate) < this.config.minFundingRateThreshold) {
      return null;
    }

    // Get current position for this symbol
    const currentPosition = await this.client.getPosition(rate.symbol);
    
    // Calculate opportunity metrics
    const timeToFunding = rate.nextFundingTime - Date.now();
    const hoursToFunding = timeToFunding / (1000 * 60 * 60);
    
    // Expected profit calculation
    // Funding is typically paid every 8 hours
    const fundingPeriods = 1; // We'll capture at least 1 funding period
    const expectedProfitRate = Math.abs(fundingRate) * fundingPeriods;
    
    // Position size calculation
    const recommendedSize = this.calculatePositionSize(rate, currentPosition);
    const expectedProfit = expectedProfitRate * recommendedSize;
    
    // Risk assessment
    const riskScore = this.calculateRiskScore(rate, timeToFunding);
    
    // Determine action
    let recommendedAction: 'LONG' | 'SHORT' | 'CLOSE' | 'HOLD' = 'HOLD';
    
    if (!currentPosition) {
      // No position - open new one
      if (fundingRate > this.config.minFundingRateThreshold) {
        recommendedAction = 'SHORT'; // Positive funding = shorts receive payment
      } else if (fundingRate < -this.config.minFundingRateThreshold) {
        recommendedAction = 'LONG'; // Negative funding = longs receive payment
      }
    } else {
      // Has position - check if we should close
      const shouldClose = this.shouldClosePosition(fundingRate, currentPosition);
      if (shouldClose) {
        recommendedAction = 'CLOSE';
      }
    }

    // Confidence calculation
    const confidence = this.calculateConfidence(rate, riskScore, timeToFunding);

    // Reasoning
    const reasoning = this.generateReasoning(fundingRate, recommendedAction, timeToFunding, expectedProfit);

    return {
      symbol: rate.symbol,
      fundingRate,
      expectedProfit,
      riskScore,
      recommendedAction,
      recommendedSize,
      timeToFunding,
      confidence,
      reasoning,
    };
  }

  private calculatePositionSize(rate: KanaFundingRate, currentPosition: KanaPosition | null): number {
    // Base size from config
    let baseSize = this.config.maxPositionSize;
    
    // Adjust for risk per trade
    const riskAdjustedSize = baseSize * this.config.riskPerTrade;
    
    // Adjust for funding rate strength
    const fundingStrength = Math.min(Math.abs(parseFloat(rate.fundingRate)) * 10, 2);
    const fundingAdjustedSize = riskAdjustedSize * fundingStrength;
    
    // Consider current position
    if (currentPosition) {
      const currentSize = Math.abs(parseFloat(currentPosition.size));
      return Math.max(0, fundingAdjustedSize - currentSize);
    }
    
    return Math.floor(fundingAdjustedSize);
  }

  private calculateRiskScore(rate: KanaFundingRate, timeToFunding: number): number {
    let riskScore = 0;

    // Time risk - closer to funding = higher risk
    const hoursToFunding = timeToFunding / (1000 * 60 * 60);
    if (hoursToFunding < 0.5) {
      riskScore += 0.4; // Very high risk
    } else if (hoursToFunding < 1) {
      riskScore += 0.2; // High risk
    } else if (hoursToFunding < 2) {
      riskScore += 0.1; // Medium risk
    }

    // Price deviation risk
    const markPrice = parseFloat(rate.markPrice);
    const indexPrice = parseFloat(rate.indexPrice);
    const priceDeviation = Math.abs(markPrice - indexPrice) / indexPrice;
    riskScore += Math.min(priceDeviation * 5, 0.3);

    // Funding rate magnitude risk
    const rateMagnitude = Math.abs(parseFloat(rate.fundingRate));
    if (rateMagnitude > 0.05) { // > 5%
      riskScore += 0.3; // Very high rates can reverse quickly
    }

    return Math.min(riskScore, 1);
  }

  private calculateConfidence(rate: KanaFundingRate, riskScore: number, timeToFunding: number): number {
    let confidence = 0.5; // Base confidence

    // Risk adjustment
    confidence += (1 - riskScore) * 0.3;

    // Time adjustment
    const hoursToFunding = timeToFunding / (1000 * 60 * 60);
    if (hoursToFunding > 2) {
      confidence += 0.2; // More time = higher confidence
    }

    // Funding rate strength
    const rateStrength = Math.min(Math.abs(parseFloat(rate.fundingRate)) * 10, 1);
    confidence += rateStrength * 0.2;

    return Math.min(Math.max(confidence, 0), 1);
  }

  private generateReasoning(
    fundingRate: number,
    action: string,
    timeToFunding: number,
    expectedProfit: number
  ): string {
    const rate = (fundingRate * 100).toFixed(3);
    const hours = (timeToFunding / (1000 * 60 * 60)).toFixed(1);
    const profit = expectedProfit.toFixed(2);

    switch (action) {
      case 'LONG':
        return `Negative funding rate (${rate}%) means longs receive payment. Expected profit: $${profit} in ${hours}h.`;
      case 'SHORT':
        return `Positive funding rate (${rate}%) means shorts receive payment. Expected profit: $${profit} in ${hours}h.`;
      case 'CLOSE':
        return `Funding rate changed direction (${rate}%). Close position to avoid paying funding.`;
      default:
        return `Funding rate (${rate}%) below threshold. No action recommended.`;
    }
  }

  private shouldClosePosition(fundingRate: number, position: KanaPosition): boolean {
    const positionSide = position.side;
    
    if (positionSide === 'long') {
      // Close long if funding becomes significantly positive
      return fundingRate > this.config.minFundingRateThreshold;
    } else if (positionSide === 'short') {
      // Close short if funding becomes significantly negative
      return fundingRate < -this.config.minFundingRateThreshold;
    }
    
    return false;
  }

  private isOpportunityValid(opportunity: ArbitrageOpportunity): boolean {
    return (
      opportunity.confidence > 0.3 &&
      opportunity.riskScore < 0.8 &&
      opportunity.expectedProfit > 10 && // Minimum $10 profit
      opportunity.timeToFunding > 300000 && // At least 5 minutes
      opportunity.recommendedAction !== 'HOLD'
    );
  }

  private canExecute(opportunity: ArbitrageOpportunity): boolean {
    // Check position limits
    if (this.activeExecutions.size >= this.config.maxConcurrentPositions) {
      return false;
    }

    // Check if we already have a position in this symbol
    const hasActivePosition = Array.from(this.activeExecutions.values())
      .some(exec => exec.symbol === opportunity.symbol && exec.status === 'EXECUTED');
    
    return !hasActivePosition;
  }

  private async executeOpportunitiesEnhanced(opportunities: ArbitrageOpportunity[]): Promise<void> {
    // Enhanced execution with better risk management
    for (const opportunity of opportunities) {
      if (this.canExecuteEnhanced(opportunity)) {
        // Pre-execution risk check
        const riskCheck = await this.performPreExecutionRiskCheck(opportunity);
        if (riskCheck.approved) {
          await this.executeArbitrage(opportunity);
          console.log(`✅ Executed ${opportunity.symbol}: ${opportunity.expectedProfit.toFixed(2)} expected profit`);
        } else {
          console.log(`⚠️ Skipped ${opportunity.symbol}: ${riskCheck.reason}`);
        }
        
        // Dynamic delay based on market conditions
        const delay = this.calculateExecutionDelay(opportunity);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async executeOpportunities(opportunities: ArbitrageOpportunity[]): Promise<void> {
    for (const opportunity of opportunities) {
      if (this.canExecute(opportunity)) {
        await this.executeArbitrage(opportunity);
        // Small delay between executions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async placeTrade(opportunity: ArbitrageOpportunity): Promise<any> {
    const orderRequest: OrderRequest = {
      symbol: opportunity.symbol,
      side: opportunity.recommendedAction === 'LONG' ? 'buy' : 'sell',
      type: 'market',
      size: opportunity.recommendedSize.toString(),
      reduceOnly: false,
    };

    return await this.client.placeOrder(orderRequest);
  }

  private async closeAllPositions(): Promise<void> {
    console.log('🔒 Closing all active positions...');
    
    for (const execution of this.activeExecutions.values()) {
      if (execution.status === 'EXECUTED') {
        try {
          await this.client.closePosition(execution.symbol);
          execution.status = 'CLOSED';
          execution.exitTimestamp = Date.now();
          console.log(`✅ Closed position: ${execution.symbol}`);
        } catch (error) {
          console.error(`❌ Failed to close position ${execution.symbol}:`, error);
        }
      }
    }
  }

  private updatePerformance(): void {
    const executions = Array.from(this.activeExecutions.values());
    
    this.performance.totalTrades = executions.length;
    this.performance.activeTrades = executions.filter(e => e.status === 'EXECUTED').length;
    
    // Calculate other metrics...
    // This would include profit/loss calculations, win rate, etc.
  }

  private setupRealTimeUpdates(): void {
    // Subscribe to funding rate updates
    this.client.subscribe('fundingRate');
    
    this.client.on('fundingRate', (data) => {
      console.log(`📊 Real-time funding rate update: ${data.symbol} - ${data.fundingRate}`);
      // Trigger immediate analysis for this symbol
      this.analyzeSingleSymbol(data.symbol).catch(console.error);
    });
  }

  private async analyzeSingleSymbol(symbol: string): Promise<void> {
    try {
      const rate = await this.client.getFundingRate(symbol);
      const opportunity = await this.analyzeOpportunity(rate);
      
      if (opportunity && this.isOpportunityValid(opportunity)) {
        console.log(`🎯 Real-time opportunity detected: ${symbol}`);
        this.emit('opportunityDetected', opportunity);
        
        // Auto-execute if conditions are met
        if (opportunity.confidence > 0.7 && opportunity.expectedProfit > 50) {
          await this.executeArbitrage(opportunity);
        }
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${symbol}:`, error);
    }
  }

  private setupEventHandlers(): void {
    this.on('executionCompleted', (execution: ArbitrageExecution) => {
      console.log(`✅ Arbitrage executed: ${execution.symbol} - Expected profit: $${execution.expectedProfit}`);
    });

    this.on('opportunityDetected', (opportunity: ArbitrageOpportunity) => {
      console.log(`🎯 Opportunity: ${opportunity.symbol} - ${opportunity.reasoning}`);
    });
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get isActive(): boolean {
    return this.isRunning;
  }

  get configuration(): ArbitrageConfig {
    return { ...this.config };
  }

  get lastScan(): number {
    return this.lastScanTime;
  }

  // ============================================================================
  // ENHANCED ANALYSIS METHODS
  // ============================================================================

  private async analyzeMarketCondition(symbol: string): Promise<'STABLE' | 'VOLATILE' | 'TRENDING'> {
    try {
      // Get recent price data to analyze market condition
      const ticker = await this.client.getTicker(symbol);
      const priceChangePercent = Math.abs(parseFloat(ticker.priceChangePercent));
      
      if (priceChangePercent < 1) return 'STABLE';
      if (priceChangePercent > 5) return 'VOLATILE';
      return 'TRENDING';
    } catch (error) {
      console.warn(`Could not analyze market condition for ${symbol}:`, error);
      return 'STABLE'; // Default to stable
    }
  }

  private async calculateVolatilityAdjustment(symbol: string): Promise<number> {
    try {
      const ticker = await this.client.getTicker(symbol);
      const priceChangePercent = Math.abs(parseFloat(ticker.priceChangePercent));
      
      // Higher volatility = higher adjustment (reduces expected profit)
      return Math.min(priceChangePercent / 100, 0.3); // Cap at 30%
    } catch (error) {
      return 0.1; // Default 10% adjustment
    }
  }

  private async assessLiquidity(symbol: string): Promise<number> {
    try {
      const orderBook = await this.client.getOrderBook(symbol, 10);
      
      // Calculate liquidity score based on order book depth
      const bidDepth = orderBook.bids.reduce((sum, bid) => sum + parseFloat(bid[1]), 0);
      const askDepth = orderBook.asks.reduce((sum, ask) => sum + parseFloat(ask[1]), 0);
      const totalDepth = bidDepth + askDepth;
      
      // Normalize liquidity score (higher depth = better liquidity)
      if (totalDepth > 10000) return 1.0;
      if (totalDepth > 5000) return 0.9;
      if (totalDepth > 1000) return 0.8;
      if (totalDepth > 500) return 0.7;
      return 0.6; // Minimum liquidity score
    } catch (error) {
      return 0.8; // Default good liquidity
    }
  }

  private canExecuteEnhanced(opportunity: ArbitrageOpportunity): boolean {
    // Enhanced execution checks
    const basicCheck = this.canExecute(opportunity);
    if (!basicCheck) return false;

    // Additional checks
    const minConfidence = 0.6;
    const maxRisk = 0.7;
    const minProfit = 20;

    return (
      opportunity.confidence >= minConfidence &&
      opportunity.riskScore <= maxRisk &&
      opportunity.expectedProfit >= minProfit
    );
  }

  private async performPreExecutionRiskCheck(opportunity: ArbitrageOpportunity): Promise<{
    approved: boolean;
    reason: string;
  }> {
    try {
      // Check current market conditions
      const ticker = await this.client.getTicker(opportunity.symbol);
      const currentVolatility = Math.abs(parseFloat(ticker.priceChangePercent));
      
      // Don't execute in extremely volatile conditions
      if (currentVolatility > 10) {
        return {
          approved: false,
          reason: `High volatility: ${currentVolatility.toFixed(2)}%`
        };
      }

      // Check if we have too many positions
      if (this.activeExecutions.size >= this.config.maxConcurrentPositions) {
        return {
          approved: false,
          reason: 'Maximum concurrent positions reached'
        };
      }

      // Check funding rate hasn't changed dramatically
      const currentRate = await this.client.getFundingRate(opportunity.symbol);
      const rateDifference = Math.abs(parseFloat(currentRate.fundingRate) - opportunity.fundingRate);
      
      if (rateDifference > 0.005) { // 0.5% difference
        return {
          approved: false,
          reason: `Funding rate changed: ${rateDifference.toFixed(4)}`
        };
      }

      return {
        approved: true,
        reason: 'All checks passed'
      };
    } catch (error) {
      return {
        approved: false,
        reason: `Risk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private calculateExecutionDelay(opportunity: ArbitrageOpportunity): number {
    // Dynamic delay based on opportunity characteristics
    let baseDelay = 1000; // 1 second base
    
    // Longer delay for higher risk opportunities
    baseDelay += opportunity.riskScore * 2000;
    
    // Shorter delay for higher confidence opportunities
    baseDelay -= opportunity.confidence * 500;
    
    // Ensure minimum delay
    return Math.max(baseDelay, 500);
  }
}