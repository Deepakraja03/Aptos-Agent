/**
 * Advanced Performance Monitor for Kana Perps
 * 
 * Real-time performance tracking and optimization for trading agents
 * Provides comprehensive analytics and performance insights
 */

import { EventEmitter } from 'events';
import { KanaLabsClient } from '../kana-client';

export interface PerformanceMetrics {
  // Trading Performance
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  
  // Financial Metrics
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalFees: number;
  netProfit: number;
  
  // Risk Metrics
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  volatility: number;
  
  // Efficiency Metrics
  avgTradeSize: number;
  avgHoldTime: number;
  avgReturn: number;
  profitFactor: number;
  
  // Time-based Performance
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  yearlyReturn: number;
  
  // System Performance
  executionSpeed: number;
  apiLatency: number;
  errorRate: number;
  uptime: number;
  
  timestamp: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: number;
  exitTime?: number;
  pnl?: number;
  fees: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  strategy: string;
  confidence: number;
  slippage: number;
  executionTime: number;
}

export interface PerformanceAlert {
  type: 'DRAWDOWN' | 'LOW_PERFORMANCE' | 'HIGH_RISK' | 'SYSTEM_ISSUE' | 'MILESTONE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  data: any;
  timestamp: number;
}

export interface BenchmarkComparison {
  period: '1d' | '7d' | '30d' | '90d' | '1y';
  agentReturn: number;
  benchmarkReturn: number;
  outperformance: number;
  alpha: number;
  beta: number;
  correlation: number;
}

export class AdvancedPerformanceMonitor extends EventEmitter {
  private client: KanaLabsClient;
  private trades: Map<string, TradeRecord> = new Map();
  private performanceHistory: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private benchmarkData: Map<string, number[]> = new Map();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private startTime = Date.now();
  private lastUpdateTime = Date.now();

  constructor(client: KanaLabsClient) {
    super();
    this.client = client;
  }

  // ============================================================================
  // MONITORING CONTROL
  // ============================================================================

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    console.log('📊 Starting performance monitoring...');
    this.isMonitoring = true;
    this.startTime = Date.now();

    // Initial metrics calculation
    await this.updateMetrics();

    // Set up monitoring interval (every 60 seconds)
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateMetrics();
        await this.checkPerformanceAlerts();
      } catch (error) {
        console.error('❌ Error in performance monitoring:', error);
        this.emit('monitoringError', error);
      }
    }, 60000);

    this.emit('monitoringStarted');
    console.log('✅ Performance monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    console.log('🛑 Stopping performance monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoringStopped');
    console.log('✅ Performance monitoring stopped');
  }

  // ============================================================================
  // TRADE TRACKING
  // ============================================================================

  recordTrade(trade: Omit<TradeRecord, 'id'>): string {
    const id = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tradeRecord: TradeRecord = {
      id,
      ...trade,
    };

    this.trades.set(id, tradeRecord);
    this.emit('tradeRecorded', tradeRecord);
    
    console.log(`📝 Trade recorded: ${trade.side.toUpperCase()} ${trade.size} ${trade.symbol} @ ${trade.entryPrice}`);
    
    return id;
  }

  updateTrade(id: string, updates: Partial<TradeRecord>): boolean {
    const trade = this.trades.get(id);
    if (!trade) return false;

    Object.assign(trade, updates);
    
    // Calculate PnL if trade is closed
    if (updates.exitPrice && updates.exitTime && trade.status === 'CLOSED') {
      const priceDiff = trade.side === 'buy' 
        ? updates.exitPrice - trade.entryPrice
        : trade.entryPrice - updates.exitPrice;
      
      trade.pnl = (priceDiff / trade.entryPrice) * trade.size - trade.fees;
    }

    this.trades.set(id, trade);
    this.emit('tradeUpdated', trade);
    
    return true;
  }

  closeTrade(id: string, exitPrice: number, exitTime: number = Date.now()): boolean {
    return this.updateTrade(id, {
      exitPrice,
      exitTime,
      status: 'CLOSED',
    });
  }

  // ============================================================================
  // METRICS CALCULATION
  // ============================================================================

  private async updateMetrics(): Promise<void> {
    const metrics = await this.calculateMetrics();
    
    this.performanceHistory.push(metrics);
    
    // Keep only last 1000 metrics (about 16 hours at 1-minute intervals)
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }

    this.lastUpdateTime = Date.now();
    this.emit('metricsUpdated', metrics);
  }

  private async calculateMetrics(): Promise<PerformanceMetrics> {
    const trades = Array.from(this.trades.values());
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const openTrades = trades.filter(t => t.status === 'OPEN');

    // Trading Performance
    const totalTrades = closedTrades.length;
    const successfulTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const failedTrades = totalTrades - successfulTrades;
    const winRate = totalTrades > 0 ? successfulTrades / totalTrades : 0;

    // Financial Metrics
    const realizedPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const unrealizedPnl = await this.calculateUnrealizedPnl(openTrades);
    const totalPnl = realizedPnl + unrealizedPnl;
    const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
    const netProfit = totalPnl - totalFees;

    // Risk Metrics
    const returns = this.calculateReturns();
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    const currentDrawdown = this.calculateCurrentDrawdown(returns);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const calmarRatio = this.calculateCalmarRatio(returns, maxDrawdown);
    const volatility = this.calculateVolatility(returns);

    // Efficiency Metrics
    const avgTradeSize = totalTrades > 0 
      ? trades.reduce((sum, t) => sum + t.size, 0) / totalTrades 
      : 0;
    const avgHoldTime = closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + ((t.exitTime || 0) - t.entryTime), 0) / closedTrades.length
      : 0;
    const avgReturn = totalTrades > 0 ? realizedPnl / totalTrades : 0;
    const profitFactor = this.calculateProfitFactor(closedTrades);

    // Time-based Performance
    const timeReturns = this.calculateTimeBasedReturns(returns);

    // System Performance
    const systemMetrics = await this.calculateSystemMetrics();

    return {
      // Trading Performance
      totalTrades,
      successfulTrades,
      failedTrades,
      winRate,
      
      // Financial Metrics
      totalPnl,
      realizedPnl,
      unrealizedPnl,
      totalFees,
      netProfit,
      
      // Risk Metrics
      maxDrawdown,
      currentDrawdown,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      volatility,
      
      // Efficiency Metrics
      avgTradeSize,
      avgHoldTime,
      avgReturn,
      profitFactor,
      
      // Time-based Performance
      dailyReturn: timeReturns.daily,
      weeklyReturn: timeReturns.weekly,
      monthlyReturn: timeReturns.monthly,
      yearlyReturn: timeReturns.yearly,
      
      // System Performance
      executionSpeed: systemMetrics.executionSpeed,
      apiLatency: systemMetrics.apiLatency,
      errorRate: systemMetrics.errorRate,
      uptime: systemMetrics.uptime,
      
      timestamp: Date.now(),
    };
  }

  private async calculateUnrealizedPnl(openTrades: TradeRecord[]): Promise<number> {
    let unrealizedPnl = 0;

    for (const trade of openTrades) {
      try {
        const ticker = await this.client.getTicker(trade.symbol);
        const currentPrice = parseFloat(ticker.price);
        
        const priceDiff = trade.side === 'buy'
          ? currentPrice - trade.entryPrice
          : trade.entryPrice - currentPrice;
        
        const tradePnl = (priceDiff / trade.entryPrice) * trade.size;
        unrealizedPnl += tradePnl;
      } catch (error) {
        console.warn(`Could not calculate unrealized PnL for ${trade.symbol}:`, error);
      }
    }

    return unrealizedPnl;
  }

  private calculateReturns(): number[] {
    if (this.performanceHistory.length < 2) return [];

    const returns: number[] = [];
    for (let i = 1; i < this.performanceHistory.length; i++) {
      const currentPnl = this.performanceHistory[i].totalPnl;
      const previousPnl = this.performanceHistory[i - 1].totalPnl;
      
      if (previousPnl !== 0) {
        returns.push((currentPnl - previousPnl) / Math.abs(previousPnl));
      }
    }

    return returns;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let maxDrawdown = 0;
    let peak = 0;
    let cumReturn = 0;

    for (const ret of returns) {
      cumReturn += ret;
      if (cumReturn > peak) {
        peak = cumReturn;
      }
      const drawdown = (peak - cumReturn) / (1 + peak);
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateCurrentDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let peak = 0;
    let cumReturn = 0;

    for (const ret of returns) {
      cumReturn += ret;
      if (cumReturn > peak) {
        peak = cumReturn;
      }
    }

    return peak > 0 ? (peak - cumReturn) / (1 + peak) : 0;
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate = 0.02): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const annualizedReturn = avgReturn * 365; // Assuming daily returns
    const annualizedStdDev = stdDev * Math.sqrt(365);

    return (annualizedReturn - riskFreeRate) / annualizedStdDev;
  }

  private calculateSortinoRatio(returns: number[], riskFreeRate = 0.02): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const negativeReturns = returns.filter(ret => ret < 0);
    
    if (negativeReturns.length === 0) return Infinity;

    const downwardDeviation = Math.sqrt(
      negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length
    );

    const annualizedReturn = avgReturn * 365;
    const annualizedDownwardDev = downwardDeviation * Math.sqrt(365);

    return (annualizedReturn - riskFreeRate) / annualizedDownwardDev;
  }

  private calculateCalmarRatio(returns: number[], maxDrawdown: number): number {
    if (returns.length === 0 || maxDrawdown === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const annualizedReturn = avgReturn * 365;

    return annualizedReturn / maxDrawdown;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 365); // Annualized volatility
  }

  private calculateProfitFactor(closedTrades: TradeRecord[]): number {
    const profits = closedTrades.filter(t => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const losses = Math.abs(closedTrades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));

    return losses === 0 ? (profits > 0 ? Infinity : 0) : profits / losses;
  }

  private calculateTimeBasedReturns(returns: number[]): {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  } {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    // Simplified calculation - in production would use actual time-based data
    const recentReturns = returns.slice(-24); // Last 24 data points
    const dailyReturn = recentReturns.length > 0 
      ? recentReturns.reduce((sum, ret) => sum + ret, 0) 
      : 0;

    return {
      daily: dailyReturn,
      weekly: dailyReturn * 7,
      monthly: dailyReturn * 30,
      yearly: dailyReturn * 365,
    };
  }

  private async calculateSystemMetrics(): Promise<{
    executionSpeed: number;
    apiLatency: number;
    errorRate: number;
    uptime: number;
  }> {
    const trades = Array.from(this.trades.values());
    
    // Execution speed (average time from signal to execution)
    const executionTimes = trades.map(t => t.executionTime).filter(t => t > 0);
    const executionSpeed = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;

    // API latency (simplified - would measure actual API response times)
    const apiLatency = 150; // Placeholder

    // Error rate (simplified)
    const errorRate = 0.01; // 1% placeholder

    // Uptime
    const uptime = (Date.now() - this.startTime) / (Date.now() - this.startTime);

    return {
      executionSpeed,
      apiLatency,
      errorRate,
      uptime,
    };
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  private async checkPerformanceAlerts(): Promise<void> {
    const latestMetrics = this.performanceHistory[this.performanceHistory.length - 1];
    if (!latestMetrics) return;

    // Drawdown alerts
    if (latestMetrics.currentDrawdown > 0.1) {
      this.addAlert({
        type: 'DRAWDOWN',
        severity: latestMetrics.currentDrawdown > 0.2 ? 'CRITICAL' : 'HIGH',
        message: `Current drawdown: ${(latestMetrics.currentDrawdown * 100).toFixed(1)}%`,
        data: { drawdown: latestMetrics.currentDrawdown },
        timestamp: Date.now(),
      });
    }

    // Low performance alerts
    if (latestMetrics.winRate < 0.4 && latestMetrics.totalTrades > 10) {
      this.addAlert({
        type: 'LOW_PERFORMANCE',
        severity: 'MEDIUM',
        message: `Low win rate: ${(latestMetrics.winRate * 100).toFixed(1)}%`,
        data: { winRate: latestMetrics.winRate },
        timestamp: Date.now(),
      });
    }

    // High risk alerts
    if (latestMetrics.volatility > 0.5) {
      this.addAlert({
        type: 'HIGH_RISK',
        severity: 'HIGH',
        message: `High volatility detected: ${(latestMetrics.volatility * 100).toFixed(1)}%`,
        data: { volatility: latestMetrics.volatility },
        timestamp: Date.now(),
      });
    }

    // Milestone alerts
    if (latestMetrics.totalTrades > 0 && latestMetrics.totalTrades % 100 === 0) {
      this.addAlert({
        type: 'MILESTONE',
        severity: 'LOW',
        message: `Milestone reached: ${latestMetrics.totalTrades} trades completed`,
        data: { totalTrades: latestMetrics.totalTrades },
        timestamp: Date.now(),
      });
    }
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }
    
    console.log(`🚨 Performance Alert: ${alert.message}`);
    this.emit('performanceAlert', alert);
  }

  // ============================================================================
  // BENCHMARKING
  // ============================================================================

  async compareToBenchmark(benchmark: 'BTC' | 'ETH' | 'MARKET', period: '1d' | '7d' | '30d' | '90d' | '1y'): Promise<BenchmarkComparison> {
    // Simplified benchmark comparison
    // In production, this would fetch actual benchmark data
    
    const agentReturn = this.calculatePeriodReturn(period);
    const benchmarkReturn = this.getBenchmarkReturn(benchmark, period);
    const outperformance = agentReturn - benchmarkReturn;
    
    // Simplified alpha and beta calculations
    const alpha = outperformance;
    const beta = 1.0; // Placeholder
    const correlation = 0.7; // Placeholder

    return {
      period,
      agentReturn,
      benchmarkReturn,
      outperformance,
      alpha,
      beta,
      correlation,
    };
  }

  private calculatePeriodReturn(period: '1d' | '7d' | '30d' | '90d' | '1y'): number {
    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    if (!latest) return 0;

    // Simplified - would use actual period-based calculation
    switch (period) {
      case '1d': return latest.dailyReturn;
      case '7d': return latest.weeklyReturn;
      case '30d': return latest.monthlyReturn;
      case '1y': return latest.yearlyReturn;
      default: return 0;
    }
  }

  private getBenchmarkReturn(benchmark: 'BTC' | 'ETH' | 'MARKET', period: string): number {
    // Placeholder benchmark returns
    const benchmarkReturns = {
      'BTC': { '1d': 0.02, '7d': 0.05, '30d': 0.15, '90d': 0.25, '1y': 0.80 },
      'ETH': { '1d': 0.025, '7d': 0.06, '30d': 0.18, '90d': 0.30, '1y': 1.20 },
      'MARKET': { '1d': 0.015, '7d': 0.04, '30d': 0.12, '90d': 0.20, '1y': 0.60 },
    };

    return (benchmarkReturns[benchmark] as any)[period] || 0;
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getCurrentMetrics(): PerformanceMetrics | null {
    return this.performanceHistory.length > 0 
      ? this.performanceHistory[this.performanceHistory.length - 1] 
      : null;
  }

  getMetricsHistory(limit?: number): PerformanceMetrics[] {
    const history = [...this.performanceHistory];
    return limit ? history.slice(-limit) : history;
  }

  getTrades(status?: 'OPEN' | 'CLOSED' | 'CANCELLED'): TradeRecord[] {
    const trades = Array.from(this.trades.values());
    return status ? trades.filter(t => t.status === status) : trades;
  }

  getTrade(id: string): TradeRecord | null {
    return this.trades.get(id) || null;
  }

  getAlerts(type?: PerformanceAlert['type']): PerformanceAlert[] {
    if (!type) return [...this.alerts];
    return this.alerts.filter(alert => alert.type === type);
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  generateReport(): {
    summary: any;
    performance: PerformanceMetrics | null;
    topTrades: TradeRecord[];
    recentAlerts: PerformanceAlert[];
  } {
    const currentMetrics = this.getCurrentMetrics();
    const trades = this.getTrades('CLOSED');
    const topTrades = trades
      .sort((a, b) => (b.pnl || 0) - (a.pnl || 0))
      .slice(0, 10);
    const recentAlerts = this.alerts.slice(0, 5);

    return {
      summary: {
        totalTrades: trades.length,
        winRate: currentMetrics?.winRate || 0,
        totalPnl: currentMetrics?.totalPnl || 0,
        sharpeRatio: currentMetrics?.sharpeRatio || 0,
        maxDrawdown: currentMetrics?.maxDrawdown || 0,
      },
      performance: currentMetrics,
      topTrades,
      recentAlerts,
    };
  }
}