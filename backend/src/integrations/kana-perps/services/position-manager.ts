/**
 * Advanced Position Manager for Kana Perps
 * 
 * Enhanced position management with advanced features for Day 2
 * Includes risk management, portfolio optimization, and automated rebalancing
 */

import { EventEmitter } from 'events';
import { KanaLabsClient, KanaPosition, OrderRequest } from '../kana-client';

export interface PositionConfig {
  maxPositionSize: number;
  maxPortfolioRisk: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent: number;
  maxLeverage: number;
  riskPerTrade: number;
  correlationThreshold: number;
}

export interface PositionMetrics {
  totalValue: number;
  totalPnl: number;
  totalMargin: number;
  freeMargin: number;
  marginRatio: number;
  portfolioRisk: number;
  activePositions: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
}

export interface RiskAssessment {
  symbol: string;
  currentRisk: number;
  portfolioImpact: number;
  correlationRisk: number;
  liquidationRisk: number;
  recommendation: 'INCREASE' | 'DECREASE' | 'CLOSE' | 'HOLD';
  maxSafeSize: number;
  reasoning: string;
}

export interface PositionAlert {
  type: 'STOP_LOSS' | 'TAKE_PROFIT' | 'MARGIN_CALL' | 'HIGH_RISK' | 'CORRELATION_WARNING';
  symbol: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  recommendedAction: string;
  timestamp: number;
}

export class AdvancedPositionManager extends EventEmitter {
  private client: KanaLabsClient;
  private config: PositionConfig;
  private positions: Map<string, KanaPosition> = new Map();
  private historicalPnl: Array<{ timestamp: number; pnl: number }> = [];
  private alerts: PositionAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(client: KanaLabsClient, config: Partial<PositionConfig> = {}) {
    super();
    
    this.client = client;
    this.config = {
      maxPositionSize: 50000, // $50,000
      maxPortfolioRisk: 0.15, // 15%
      stopLossPercent: 0.03, // 3%
      takeProfitPercent: 0.08, // 8%
      trailingStopPercent: 0.02, // 2%
      maxLeverage: 10,
      riskPerTrade: 0.02, // 2%
      correlationThreshold: 0.7, // 70%
      ...config,
    };
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    console.log('🔍 Starting advanced position monitoring...');
    this.isMonitoring = true;

    // Initial position sync
    await this.syncPositions();

    // Set up monitoring interval (every 10 seconds)
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorPositions();
      } catch (error) {
        console.error('❌ Error in position monitoring:', error);
        this.emit('monitoringError', error);
      }
    }, 10000);

    this.emit('monitoringStarted');
    console.log('✅ Advanced position monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    console.log('🛑 Stopping position monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoringStopped');
    console.log('✅ Position monitoring stopped');
  }

  async syncPositions(): Promise<void> {
    try {
      const positions = await this.client.getPositions();
      
      // Update position map
      this.positions.clear();
      positions.forEach(position => {
        this.positions.set(position.symbol, position);
      });

      console.log(`📊 Synced ${positions.length} positions`);
      this.emit('positionsUpdated', positions);
    } catch (error) {
      console.error('❌ Error syncing positions:', error);
      throw error;
    }
  }

  async openPosition(
    symbol: string,
    side: 'long' | 'short',
    size: number,
    options: {
      stopLoss?: number;
      takeProfit?: number;
      leverage?: number;
      reduceOnly?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      // Risk assessment
      const riskAssessment = await this.assessPositionRisk(symbol, size);
      
      if (riskAssessment.recommendation === 'CLOSE') {
        console.log(`⚠️ Risk assessment recommends against opening ${symbol}: ${riskAssessment.reasoning}`);
        return false;
      }

      // Adjust size based on risk assessment
      const adjustedSize = Math.min(size, riskAssessment.maxSafeSize);
      
      if (adjustedSize < size * 0.5) {
        console.log(`⚠️ Position size reduced significantly for ${symbol}: ${size} -> ${adjustedSize}`);
      }

      // Place order
      const orderRequest: OrderRequest = {
        symbol,
        side: side === 'long' ? 'buy' : 'sell',
        type: 'market',
        size: adjustedSize.toString(),
        reduceOnly: options.reduceOnly || false,
      };

      const order = await this.client.placeOrder(orderRequest);
      
      // Set up stop loss and take profit if specified
      if (options.stopLoss || options.takeProfit) {
        await this.setPositionProtection(symbol, {
          stopLoss: options.stopLoss,
          takeProfit: options.takeProfit,
        });
      }

      console.log(`✅ Position opened: ${side.toUpperCase()} ${adjustedSize} ${symbol}`);
      this.emit('positionOpened', { symbol, side, size: adjustedSize, order });
      
      return true;
    } catch (error) {
      console.error(`❌ Error opening position for ${symbol}:`, error);
      this.emit('positionError', { symbol, action: 'open', error });
      return false;
    }
  }

  async closePosition(symbol: string, size?: number): Promise<boolean> {
    try {
      const position = this.positions.get(symbol);
      if (!position) {
        console.log(`⚠️ No position found for ${symbol}`);
        return false;
      }

      const closeSize = size || Math.abs(parseFloat(position.size));
      
      await this.client.closePosition(symbol, closeSize.toString());
      
      console.log(`🔒 Position closed: ${symbol} (${closeSize})`);
      this.emit('positionClosed', { symbol, size: closeSize });
      
      return true;
    } catch (error) {
      console.error(`❌ Error closing position for ${symbol}:`, error);
      this.emit('positionError', { symbol, action: 'close', error });
      return false;
    }
  }

  async setPositionProtection(
    symbol: string,
    protection: {
      stopLoss?: number;
      takeProfit?: number;
      trailingStop?: number;
    }
  ): Promise<void> {
    try {
      const position = this.positions.get(symbol);
      if (!position) {
        throw new Error(`No position found for ${symbol}`);
      }

      const entryPrice = parseFloat(position.avgEntryPrice);
      const positionSize = Math.abs(parseFloat(position.size));
      const isLong = position.side === 'long';

      // Set stop loss
      if (protection.stopLoss) {
        const stopPrice = isLong 
          ? entryPrice * (1 - protection.stopLoss)
          : entryPrice * (1 + protection.stopLoss);

        await this.client.placeOrder({
          symbol,
          side: isLong ? 'sell' : 'buy',
          type: 'stop',
          size: positionSize.toString(),
          stopPrice: stopPrice.toString(),
          reduceOnly: true,
        });

        console.log(`🛡️ Stop loss set for ${symbol} at ${stopPrice}`);
      }

      // Set take profit
      if (protection.takeProfit) {
        const takeProfitPrice = isLong
          ? entryPrice * (1 + protection.takeProfit)
          : entryPrice * (1 - protection.takeProfit);

        await this.client.placeOrder({
          symbol,
          side: isLong ? 'sell' : 'buy',
          type: 'limit',
          size: positionSize.toString(),
          price: takeProfitPrice.toString(),
          reduceOnly: true,
        });

        console.log(`🎯 Take profit set for ${symbol} at ${takeProfitPrice}`);
      }

      this.emit('protectionSet', { symbol, protection });
    } catch (error) {
      console.error(`❌ Error setting protection for ${symbol}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // RISK MANAGEMENT
  // ============================================================================

  async assessPositionRisk(symbol: string, size: number): Promise<RiskAssessment> {
    try {
      const currentPosition = this.positions.get(symbol);
      const metrics = await this.getPortfolioMetrics();
      
      // Calculate position value
      const ticker = await this.client.getTicker(symbol);
      const price = parseFloat(ticker.price);
      const positionValue = size * price;
      
      // Risk calculations
      const portfolioValue = metrics.totalValue;
      const positionRisk = positionValue / portfolioValue;
      const newPortfolioRisk = metrics.portfolioRisk + positionRisk;
      
      // Correlation risk (simplified)
      const correlationRisk = await this.calculateCorrelationRisk(symbol);
      
      // Liquidation risk
      const liquidationRisk = await this.calculateLiquidationRisk(symbol, size);
      
      // Overall risk score
      const currentRisk = Math.max(positionRisk, correlationRisk, liquidationRisk);
      
      // Determine recommendation
      let recommendation: 'INCREASE' | 'DECREASE' | 'CLOSE' | 'HOLD' = 'HOLD';
      let maxSafeSize = size;
      let reasoning = '';
      
      if (newPortfolioRisk > this.config.maxPortfolioRisk) {
        recommendation = 'DECREASE';
        maxSafeSize = (portfolioValue * this.config.maxPortfolioRisk) / price;
        reasoning = `Portfolio risk would exceed ${(this.config.maxPortfolioRisk * 100).toFixed(1)}%`;
      } else if (positionValue > this.config.maxPositionSize) {
        recommendation = 'DECREASE';
        maxSafeSize = this.config.maxPositionSize / price;
        reasoning = `Position size exceeds maximum of $${this.config.maxPositionSize.toLocaleString()}`;
      } else if (correlationRisk > 0.8) {
        recommendation = 'CLOSE';
        maxSafeSize = 0;
        reasoning = 'High correlation risk with existing positions';
      } else if (liquidationRisk > 0.7) {
        recommendation = 'DECREASE';
        maxSafeSize = size * 0.5;
        reasoning = 'High liquidation risk detected';
      } else if (currentRisk < 0.3) {
        recommendation = 'INCREASE';
        reasoning = 'Low risk, position can be increased';
      }

      return {
        symbol,
        currentRisk,
        portfolioImpact: positionRisk,
        correlationRisk,
        liquidationRisk,
        recommendation,
        maxSafeSize,
        reasoning,
      };
    } catch (error) {
      console.error(`❌ Error assessing risk for ${symbol}:`, error);
      throw error;
    }
  }

  private async calculateCorrelationRisk(symbol: string): Promise<number> {
    // Simplified correlation calculation
    // In production, this would use historical price data
    const correlatedSymbols = ['BTC-PERP', 'ETH-PERP'];
    const hasCorrelatedPositions = Array.from(this.positions.keys())
      .some(pos => correlatedSymbols.includes(pos) && pos !== symbol);
    
    return hasCorrelatedPositions ? 0.6 : 0.2;
  }

  private async calculateLiquidationRisk(symbol: string, size: number): Promise<number> {
    try {
      const account = await this.client.getAccount();
      const marginRatio = parseFloat(account.marginRatio);
      
      // Higher margin ratio = higher liquidation risk
      return Math.min(marginRatio / 0.8, 1); // Normalize to 0-1
    } catch (error) {
      console.warn('Could not calculate liquidation risk:', error);
      return 0.3; // Default moderate risk
    }
  }

  // ============================================================================
  // MONITORING & ALERTS
  // ============================================================================

  private async monitorPositions(): Promise<void> {
    await this.syncPositions();
    
    for (const [symbol, position] of this.positions) {
      await this.checkPositionAlerts(position);
    }
    
    // Check portfolio-level risks
    await this.checkPortfolioAlerts();
  }

  private async checkPositionAlerts(position: KanaPosition): Promise<void> {
    const unrealizedPnl = parseFloat(position.unrealizedPnl);
    const entryPrice = parseFloat(position.avgEntryPrice);
    const markPrice = parseFloat(position.markPrice);
    const size = parseFloat(position.size);
    
    // Calculate percentage change
    const pnlPercent = unrealizedPnl / (Math.abs(size) * entryPrice);
    
    // Stop loss alert
    if (pnlPercent <= -this.config.stopLossPercent) {
      this.addAlert({
        type: 'STOP_LOSS',
        symbol: position.symbol,
        severity: 'HIGH',
        message: `Position down ${(pnlPercent * 100).toFixed(2)}%`,
        recommendedAction: 'Consider closing position',
        timestamp: Date.now(),
      });
    }
    
    // Take profit alert
    if (pnlPercent >= this.config.takeProfitPercent) {
      this.addAlert({
        type: 'TAKE_PROFIT',
        symbol: position.symbol,
        severity: 'MEDIUM',
        message: `Position up ${(pnlPercent * 100).toFixed(2)}%`,
        recommendedAction: 'Consider taking profits',
        timestamp: Date.now(),
      });
    }
    
    // Margin call alert
    const marginRatio = parseFloat(position.marginRatio);
    if (marginRatio > 0.8) {
      this.addAlert({
        type: 'MARGIN_CALL',
        symbol: position.symbol,
        severity: 'CRITICAL',
        message: `Margin ratio at ${(marginRatio * 100).toFixed(1)}%`,
        recommendedAction: 'Add margin or reduce position immediately',
        timestamp: Date.now(),
      });
    }
  }

  private async checkPortfolioAlerts(): Promise<void> {
    const metrics = await this.getPortfolioMetrics();
    
    // High portfolio risk
    if (metrics.portfolioRisk > this.config.maxPortfolioRisk) {
      this.addAlert({
        type: 'HIGH_RISK',
        symbol: 'PORTFOLIO',
        severity: 'HIGH',
        message: `Portfolio risk at ${(metrics.portfolioRisk * 100).toFixed(1)}%`,
        recommendedAction: 'Reduce position sizes',
        timestamp: Date.now(),
      });
    }
    
    // High drawdown
    if (metrics.maxDrawdown > 0.15) {
      this.addAlert({
        type: 'HIGH_RISK',
        symbol: 'PORTFOLIO',
        severity: 'HIGH',
        message: `Maximum drawdown at ${(metrics.maxDrawdown * 100).toFixed(1)}%`,
        recommendedAction: 'Review risk management strategy',
        timestamp: Date.now(),
      });
    }
  }

  private addAlert(alert: PositionAlert): void {
    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }
    
    console.log(`🚨 ${alert.severity} Alert: ${alert.message}`);
    this.emit('alert', alert);
  }

  // ============================================================================
  // ANALYTICS & METRICS
  // ============================================================================

  async getPortfolioMetrics(): Promise<PositionMetrics> {
    try {
      const account = await this.client.getAccount();
      const positions = Array.from(this.positions.values());
      
      // Calculate metrics
      const totalValue = parseFloat(account.totalEquity);
      const totalMargin = parseFloat(account.totalMargin);
      const freeMargin = parseFloat(account.freeMargin);
      const marginRatio = parseFloat(account.marginRatio);
      
      const totalPnl = positions.reduce((sum, pos) => 
        sum + parseFloat(pos.unrealizedPnl), 0);
      
      const portfolioRisk = totalMargin / totalValue;
      const activePositions = positions.length;
      
      // Calculate time-based PnL (simplified)
      const dailyPnl = this.calculateTimePnl(24 * 60 * 60 * 1000); // 24 hours
      const weeklyPnl = this.calculateTimePnl(7 * 24 * 60 * 60 * 1000); // 7 days
      const monthlyPnl = this.calculateTimePnl(30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Calculate performance metrics
      const sharpeRatio = this.calculateSharpeRatio();
      const maxDrawdown = this.calculateMaxDrawdown();
      const winRate = this.calculateWinRate();
      
      return {
        totalValue,
        totalPnl,
        totalMargin,
        freeMargin,
        marginRatio,
        portfolioRisk,
        activePositions,
        dailyPnl,
        weeklyPnl,
        monthlyPnl,
        sharpeRatio,
        maxDrawdown,
        winRate,
      };
    } catch (error) {
      console.error('❌ Error calculating portfolio metrics:', error);
      throw error;
    }
  }

  private calculateTimePnl(timeWindow: number): number {
    const cutoff = Date.now() - timeWindow;
    const relevantPnl = this.historicalPnl.filter(entry => entry.timestamp >= cutoff);
    
    if (relevantPnl.length === 0) return 0;
    
    const startPnl = relevantPnl[0].pnl;
    const endPnl = relevantPnl[relevantPnl.length - 1].pnl;
    
    return endPnl - startPnl;
  }

  private calculateSharpeRatio(): number {
    if (this.historicalPnl.length < 2) return 0;
    
    const returns = this.historicalPnl.slice(1).map((entry, index) => 
      entry.pnl - this.historicalPnl[index].pnl);
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : avgReturn / stdDev;
  }

  private calculateMaxDrawdown(): number {
    if (this.historicalPnl.length === 0) return 0;
    
    let maxDrawdown = 0;
    let peak = this.historicalPnl[0].pnl;
    
    for (const entry of this.historicalPnl) {
      if (entry.pnl > peak) {
        peak = entry.pnl;
      }
      
      const drawdown = (peak - entry.pnl) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  private calculateWinRate(): number {
    // Simplified win rate calculation
    // In production, this would track completed trades
    return 0.65; // 65% placeholder
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getPositions(): KanaPosition[] {
    return Array.from(this.positions.values());
  }

  getPosition(symbol: string): KanaPosition | undefined {
    return this.positions.get(symbol);
  }

  getAlerts(severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): PositionAlert[] {
    if (!severity) return [...this.alerts];
    return this.alerts.filter(alert => alert.severity === severity);
  }

  getConfiguration(): PositionConfig {
    return { ...this.config };
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}