/**
 * Copy Trading Bot for Kana Perps
 * 
 * Advanced copy trading agent that identifies and replicates
 * successful trading strategies from top performers
 */

import { EventEmitter } from 'events';
import { KanaLabsClient, KanaPosition, OrderRequest } from '../kana-client';

export interface CopyTradingConfig {
  followedTraders: string[]; // Trader IDs to follow
  maxCopySize: number; // Maximum size to copy per trade
  copyRatio: number; // Ratio of original trade size to copy (e.g., 0.1 = 10%)
  minTraderScore: number; // Minimum performance score to follow
  maxDrawdown: number; // Maximum acceptable drawdown
  stopLossMultiplier: number; // Multiplier for stop loss (e.g., 1.5x original)
  profitTarget: number; // Profit target as percentage
  maxConcurrentCopies: number; // Maximum concurrent copied trades
  performanceWindow: number; // Performance evaluation window in days
}

export interface TraderPerformance {
  traderId: string;
  totalTrades: number;
  winRate: number;
  averageReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  score: number; // Composite performance score
  lastUpdated: number;
  isActive: boolean;
}

export interface CopiedTrade {
  id: string;
  originalTrader: string;
  originalTradeId: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: number;
  exitTime?: number;
  status: 'OPEN' | 'CLOSED' | 'STOPPED';
  pnl?: number;
  stopLoss?: number;
  takeProfit?: number;
  copyRatio: number;
}

export interface CopyTradingMetrics {
  totalCopiedTrades: number;
  activeCopiedTrades: number;
  successfulCopies: number;
  totalPnl: number;
  averageCopySize: number;
  bestPerformingTrader: string;
  worstPerformingTrader: string;
  copySuccessRate: number;
  averageHoldTime: number;
}

export class CopyTradingBot extends EventEmitter {
  private client: KanaLabsClient;
  private config: CopyTradingConfig;
  private isRunning = false;
  private traderPerformances: Map<string, TraderPerformance> = new Map();
  private copiedTrades: Map<string, CopiedTrade> = new Map();
  private metrics: CopyTradingMetrics;
  private monitoringInterval?: NodeJS.Timeout;
  private performanceUpdateInterval?: NodeJS.Timeout;

  constructor(client: KanaLabsClient, config: Partial<CopyTradingConfig> = {}) {
    super();
    
    this.client = client;
    this.config = {
      followedTraders: [], // Will be populated dynamically
      maxCopySize: 5000, // $5,000 max copy size
      copyRatio: 0.1, // Copy 10% of original trade size
      minTraderScore: 0.7, // Minimum 70% performance score
      maxDrawdown: 0.15, // Maximum 15% drawdown
      stopLossMultiplier: 1.5, // 1.5x original stop loss
      profitTarget: 0.05, // 5% profit target
      maxConcurrentCopies: 10, // Maximum 10 concurrent copies
      performanceWindow: 30, // 30-day performance window
      ...config,
    };

    this.metrics = {
      totalCopiedTrades: 0,
      activeCopiedTrades: 0,
      successfulCopies: 0,
      totalPnl: 0,
      averageCopySize: 0,
      bestPerformingTrader: '',
      worstPerformingTrader: '',
      copySuccessRate: 0,
      averageHoldTime: 0,
    };
  }

  // ============================================================================
  // MAIN CONTROL METHODS
  // ============================================================================

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Copy Trading Bot is already running');
      return;
    }

    console.log('🚀 Starting Copy Trading Bot...');
    this.isRunning = true;

    try {
      // Discover top traders
      await this.discoverTopTraders();

      // Start monitoring for new trades
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.monitorTraderActivity();
        } catch (error) {
          console.error('❌ Error monitoring trader activity:', error);
          this.emit('error', error);
        }
      }, 10000); // Check every 10 seconds

      // Start performance updates
      this.performanceUpdateInterval = setInterval(async () => {
        try {
          await this.updateTraderPerformances();
        } catch (error) {
          console.error('❌ Error updating trader performances:', error);
        }
      }, 300000); // Update every 5 minutes

      this.emit('started');
      console.log('✅ Copy Trading Bot started successfully');
    } catch (error) {
      console.error('❌ Failed to start Copy Trading Bot:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping Copy Trading Bot...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.performanceUpdateInterval) {
      clearInterval(this.performanceUpdateInterval);
      this.performanceUpdateInterval = undefined;
    }

    // Close all copied trades
    await this.closeAllCopiedTrades();

    this.emit('stopped');
    console.log('✅ Copy Trading Bot stopped');
  }

  // ============================================================================
  // TRADER DISCOVERY AND ANALYSIS
  // ============================================================================

  private async discoverTopTraders(): Promise<void> {
    console.log('🔍 Discovering top traders...');
    
    try {
      // In a real implementation, this would query the platform's leaderboard
      // For now, we'll simulate with some example traders
      const simulatedTopTraders = [
        'trader_001',
        'trader_002',
        'trader_003',
        'trader_004',
        'trader_005',
      ];

      for (const traderId of simulatedTopTraders) {
        const performance = await this.analyzeTraderPerformance(traderId);
        if (performance.score >= this.config.minTraderScore) {
          this.traderPerformances.set(traderId, performance);
          this.config.followedTraders.push(traderId);
          console.log(`✅ Following trader ${traderId} (Score: ${performance.score.toFixed(2)})`);
        }
      }

      console.log(`📊 Following ${this.config.followedTraders.length} top traders`);
    } catch (error) {
      console.error('❌ Error discovering top traders:', error);
    }
  }

  private async analyzeTraderPerformance(traderId: string): Promise<TraderPerformance> {
    // Simulate trader performance analysis
    // In a real implementation, this would analyze historical trades
    
    const simulatedPerformance = {
      traderId,
      totalTrades: Math.floor(Math.random() * 500) + 100,
      winRate: 0.4 + Math.random() * 0.4, // 40-80% win rate
      averageReturn: (Math.random() - 0.5) * 0.1, // -5% to +5% average return
      maxDrawdown: Math.random() * 0.3, // 0-30% max drawdown
      sharpeRatio: Math.random() * 3, // 0-3 Sharpe ratio
      profitFactor: 0.5 + Math.random() * 2, // 0.5-2.5 profit factor
      score: 0,
      lastUpdated: Date.now(),
      isActive: Math.random() > 0.2, // 80% chance of being active
    };

    // Calculate composite score
    simulatedPerformance.score = this.calculateTraderScore(simulatedPerformance);

    return simulatedPerformance;
  }

  private calculateTraderScore(performance: TraderPerformance): number {
    // Weighted scoring system
    const winRateScore = performance.winRate * 0.3;
    const returnScore = Math.max(0, performance.averageReturn * 10) * 0.25;
    const drawdownScore = (1 - performance.maxDrawdown) * 0.2;
    const sharpeScore = Math.min(performance.sharpeRatio / 3, 1) * 0.15;
    const profitFactorScore = Math.min(performance.profitFactor / 2, 1) * 0.1;

    return winRateScore + returnScore + drawdownScore + sharpeScore + profitFactorScore;
  }

  // ============================================================================
  // TRADE MONITORING AND COPYING
  // ============================================================================

  private async monitorTraderActivity(): Promise<void> {
    for (const traderId of this.config.followedTraders) {
      await this.checkTraderNewTrades(traderId);
    }
    
    // Also monitor existing copied trades
    await this.monitorCopiedTrades();
  }

  private async checkTraderNewTrades(traderId: string): Promise<void> {
    try {
      // In a real implementation, this would query the trader's recent trades
      // For simulation, we'll randomly generate new trades
      
      if (Math.random() < 0.05) { // 5% chance of new trade per check
        const newTrade = this.simulateTraderTrade(traderId);
        await this.evaluateAndCopyTrade(newTrade);
      }
    } catch (error) {
      console.error(`❌ Error checking trades for ${traderId}:`, error);
    }
  }

  private simulateTraderTrade(traderId: string): any {
    const symbols = ['BTC-PERP', 'ETH-PERP', 'APT-PERP'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    return {
      tradeId: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      traderId,
      symbol,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      size: 1000 + Math.random() * 9000, // $1,000 - $10,000
      price: 50000 + Math.random() * 10000, // Simulated price
      timestamp: Date.now(),
      stopLoss: Math.random() > 0.3 ? 0.02 : undefined, // 70% chance of stop loss
      takeProfit: Math.random() > 0.4 ? 0.05 : undefined, // 60% chance of take profit
    };
  }

  private async evaluateAndCopyTrade(originalTrade: any): Promise<void> {
    try {
      // Check if we should copy this trade
      const shouldCopy = await this.shouldCopyTrade(originalTrade);
      if (!shouldCopy) return;

      // Check position limits
      if (this.copiedTrades.size >= this.config.maxConcurrentCopies) {
        console.log('⚠️ Maximum concurrent copies reached, skipping trade');
        return;
      }

      // Calculate copy size
      const copySize = Math.min(
        originalTrade.size * this.config.copyRatio,
        this.config.maxCopySize
      );

      // Create copied trade
      const copiedTrade: CopiedTrade = {
        id: `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalTrader: originalTrade.traderId,
        originalTradeId: originalTrade.tradeId,
        symbol: originalTrade.symbol,
        side: originalTrade.side,
        size: copySize,
        entryPrice: originalTrade.price,
        entryTime: Date.now(),
        status: 'OPEN',
        copyRatio: this.config.copyRatio,
        stopLoss: originalTrade.stopLoss ? originalTrade.price * (1 - originalTrade.stopLoss * this.config.stopLossMultiplier) : undefined,
        takeProfit: originalTrade.takeProfit ? originalTrade.price * (1 + this.config.profitTarget) : undefined,
      };

      // Execute the copy trade
      await this.executeCopyTrade(copiedTrade);

    } catch (error) {
      console.error('❌ Error evaluating and copying trade:', error);
    }
  }

  private async shouldCopyTrade(originalTrade: any): Promise<boolean> {
    // Check trader performance
    const traderPerformance = this.traderPerformances.get(originalTrade.traderId);
    if (!traderPerformance || traderPerformance.score < this.config.minTraderScore) {
      return false;
    }

    // Check if trader is still active
    if (!traderPerformance.isActive) {
      return false;
    }

    // Check drawdown limits
    if (traderPerformance.maxDrawdown > this.config.maxDrawdown) {
      return false;
    }

    // Check if we're already copying too many trades from this trader
    const traderCopies = Array.from(this.copiedTrades.values())
      .filter(trade => trade.originalTrader === originalTrade.traderId && trade.status === 'OPEN');
    
    if (traderCopies.length >= 3) { // Max 3 concurrent copies per trader
      return false;
    }

    return true;
  }

  private async executeCopyTrade(copiedTrade: CopiedTrade): Promise<void> {
    try {
      // Place the copy order
      const orderRequest: OrderRequest = {
        symbol: copiedTrade.symbol,
        side: copiedTrade.side,
        type: 'market',
        size: copiedTrade.size.toString(),
      };

      const order = await this.client.placeOrder(orderRequest);
      
      // Store the copied trade
      this.copiedTrades.set(copiedTrade.id, copiedTrade);
      
      // Set up stop loss and take profit if specified
      if (copiedTrade.stopLoss || copiedTrade.takeProfit) {
        await this.setTradeProtection(copiedTrade);
      }

      this.metrics.totalCopiedTrades++;
      this.metrics.activeCopiedTrades++;
      
      console.log(`📋 Copied trade: ${copiedTrade.side.toUpperCase()} ${copiedTrade.size} ${copiedTrade.symbol} from ${copiedTrade.originalTrader}`);
      this.emit('tradeCopied', copiedTrade);

    } catch (error) {
      console.error(`❌ Failed to execute copy trade:`, error);
      this.emit('copyError', { trade: copiedTrade, error });
    }
  }

  private async setTradeProtection(copiedTrade: CopiedTrade): Promise<void> {
    try {
      // Set stop loss
      if (copiedTrade.stopLoss) {
        await this.client.placeOrder({
          symbol: copiedTrade.symbol,
          side: copiedTrade.side === 'buy' ? 'sell' : 'buy',
          type: 'stop',
          size: copiedTrade.size.toString(),
          stopPrice: copiedTrade.stopLoss.toString(),
          reduceOnly: true,
        });
      }

      // Set take profit
      if (copiedTrade.takeProfit) {
        await this.client.placeOrder({
          symbol: copiedTrade.symbol,
          side: copiedTrade.side === 'buy' ? 'sell' : 'buy',
          type: 'limit',
          size: copiedTrade.size.toString(),
          price: copiedTrade.takeProfit.toString(),
          reduceOnly: true,
        });
      }

    } catch (error) {
      console.error(`❌ Failed to set trade protection:`, error);
    }
  }

  // ============================================================================
  // TRADE MONITORING
  // ============================================================================

  private async monitorCopiedTrades(): Promise<void> {
    for (const [tradeId, copiedTrade] of this.copiedTrades) {
      if (copiedTrade.status === 'OPEN') {
        await this.checkTradeStatus(copiedTrade);
      }
    }
  }

  private async checkTradeStatus(copiedTrade: CopiedTrade): Promise<void> {
    try {
      // Get current position
      const position = await this.client.getPosition(copiedTrade.symbol);
      
      if (!position || parseFloat(position.size) === 0) {
        // Position is closed
        await this.closeCopiedTrade(copiedTrade.id, 'Position closed');
      } else {
        // Check for profit/loss thresholds
        const currentPnl = parseFloat(position.unrealizedPnl);
        const pnlPercent = currentPnl / (copiedTrade.size * copiedTrade.entryPrice);
        
        // Check if we should close based on performance
        if (pnlPercent < -0.1) { // -10% loss
          await this.closeCopiedTrade(copiedTrade.id, 'Stop loss triggered');
        } else if (pnlPercent > this.config.profitTarget) {
          await this.closeCopiedTrade(copiedTrade.id, 'Profit target reached');
        }
      }

    } catch (error) {
      console.error(`❌ Error checking trade status for ${copiedTrade.id}:`, error);
    }
  }

  private async closeCopiedTrade(tradeId: string, reason: string): Promise<void> {
    const copiedTrade = this.copiedTrades.get(tradeId);
    if (!copiedTrade || copiedTrade.status !== 'OPEN') return;

    try {
      // Close the position
      await this.client.closePosition(copiedTrade.symbol, copiedTrade.size.toString());
      
      // Update trade status
      copiedTrade.status = 'CLOSED';
      copiedTrade.exitTime = Date.now();
      
      // Calculate PnL (simplified)
      const position = await this.client.getPosition(copiedTrade.symbol);
      if (position) {
        copiedTrade.pnl = parseFloat(position.realizedPnl);
        this.metrics.totalPnl += copiedTrade.pnl;
        
        if (copiedTrade.pnl > 0) {
          this.metrics.successfulCopies++;
        }
      }

      this.metrics.activeCopiedTrades--;
      
      console.log(`🔒 Closed copied trade: ${tradeId} - ${reason}`);
      this.emit('tradeClosed', { trade: copiedTrade, reason });

    } catch (error) {
      console.error(`❌ Failed to close copied trade ${tradeId}:`, error);
    }
  }

  // ============================================================================
  // PERFORMANCE UPDATES
  // ============================================================================

  private async updateTraderPerformances(): Promise<void> {
    console.log('📊 Updating trader performances...');
    
    for (const traderId of this.config.followedTraders) {
      try {
        const updatedPerformance = await this.analyzeTraderPerformance(traderId);
        this.traderPerformances.set(traderId, updatedPerformance);
        
        // Remove traders that no longer meet criteria
        if (updatedPerformance.score < this.config.minTraderScore) {
          this.unfollowTrader(traderId);
        }
      } catch (error) {
        console.error(`❌ Error updating performance for ${traderId}:`, error);
      }
    }
    
    this.updateMetrics();
  }

  private unfollowTrader(traderId: string): void {
    console.log(`❌ Unfollowing trader ${traderId} due to poor performance`);
    
    this.config.followedTraders = this.config.followedTraders.filter(id => id !== traderId);
    this.traderPerformances.delete(traderId);
    
    // Close all trades from this trader
    for (const [tradeId, copiedTrade] of this.copiedTrades) {
      if (copiedTrade.originalTrader === traderId && copiedTrade.status === 'OPEN') {
        this.closeCopiedTrade(tradeId, 'Trader unfollowed');
      }
    }
    
    this.emit('traderUnfollowed', traderId);
  }

  private updateMetrics(): void {
    const allTrades = Array.from(this.copiedTrades.values());
    const closedTrades = allTrades.filter(t => t.status === 'CLOSED');
    
    this.metrics.copySuccessRate = closedTrades.length > 0 
      ? this.metrics.successfulCopies / closedTrades.length 
      : 0;
    
    this.metrics.averageCopySize = allTrades.length > 0
      ? allTrades.reduce((sum, t) => sum + t.size, 0) / allTrades.length
      : 0;
    
    this.metrics.averageHoldTime = closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + ((t.exitTime || 0) - t.entryTime), 0) / closedTrades.length
      : 0;

    // Find best and worst performing traders
    const performances = Array.from(this.traderPerformances.values());
    if (performances.length > 0) {
      performances.sort((a, b) => b.score - a.score);
      this.metrics.bestPerformingTrader = performances[0].traderId;
      this.metrics.worstPerformingTrader = performances[performances.length - 1].traderId;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async closeAllCopiedTrades(): Promise<void> {
    console.log('🔒 Closing all copied trades...');
    
    for (const [tradeId, copiedTrade] of this.copiedTrades) {
      if (copiedTrade.status === 'OPEN') {
        await this.closeCopiedTrade(tradeId, 'Bot stopped');
      }
    }
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get isActive(): boolean {
    return this.isRunning;
  }

  get configuration(): CopyTradingConfig {
    return { ...this.config };
  }

  getMetrics(): CopyTradingMetrics {
    return { ...this.metrics };
  }

  getFollowedTraders(): TraderPerformance[] {
    return Array.from(this.traderPerformances.values());
  }

  getCopiedTrades(status?: 'OPEN' | 'CLOSED' | 'STOPPED'): CopiedTrade[] {
    const trades = Array.from(this.copiedTrades.values());
    return status ? trades.filter(t => t.status === status) : trades;
  }

  getTraderPerformance(traderId: string): TraderPerformance | null {
    return this.traderPerformances.get(traderId) || null;
  }
}