/**
 * Advanced Market Data Analyzer for Kana Perps
 * 
 * Enhanced market analysis with technical indicators and pattern recognition
 * Provides real-time market insights for trading decisions
 */

import { EventEmitter } from 'events';
import { KanaLabsClient, KanaTicker, KanaFundingRate, KanaOrderBook } from '../kana-client';

export interface MarketSignal {
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0-1
  confidence: number; // 0-1
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  indicators: {
    rsi: number;
    macd: { macd: number; signal: number; histogram: number };
    bollinger: { upper: number; middle: number; lower: number };
    volume: number;
    volatility: number;
  };
  reasoning: string;
  timestamp: number;
}

export interface MarketCondition {
  symbol: string;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  volume: 'LOW' | 'MEDIUM' | 'HIGH';
  momentum: 'STRONG_UP' | 'WEAK_UP' | 'NEUTRAL' | 'WEAK_DOWN' | 'STRONG_DOWN';
  support: number;
  resistance: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  timestamp: number;
}

export interface PriceLevel {
  price: number;
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number; // 0-1
  touches: number;
  lastTouch: number;
}

export interface MarketAlert {
  type: 'BREAKOUT' | 'BREAKDOWN' | 'VOLUME_SPIKE' | 'VOLATILITY_SPIKE' | 'FUNDING_ANOMALY';
  symbol: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  data: any;
  timestamp: number;
}

export class AdvancedMarketAnalyzer extends EventEmitter {
  private client: KanaLabsClient;
  private priceHistory: Map<string, Array<{ price: number; volume: number; timestamp: number }>> = new Map();
  private fundingHistory: Map<string, Array<{ rate: number; timestamp: number }>> = new Map();
  private orderBookHistory: Map<string, Array<{ spread: number; depth: number; timestamp: number }>> = new Map();
  private signals: Map<string, MarketSignal[]> = new Map();
  private conditions: Map<string, MarketCondition> = new Map();
  private priceLevels: Map<string, PriceLevel[]> = new Map();
  private alerts: MarketAlert[] = [];
  private _isAnalyzing = false;
  private analysisInterval?: NodeJS.Timeout;
  private symbols: string[] = ['BTC-PERP', 'ETH-PERP', 'APT-PERP', 'SOL-PERP'];

  constructor(client: KanaLabsClient, symbols?: string[]) {
    super();
    this.client = client;
    if (symbols) this.symbols = symbols;
  }

  // ============================================================================
  // ANALYSIS CONTROL
  // ============================================================================

  async startAnalysis(): Promise<void> {
    if (this._isAnalyzing) return;

    console.log('📊 Starting advanced market analysis...');
    this._isAnalyzing = true;

    // Initialize data collection
    await this.initializeData();

    // Set up analysis interval (every 30 seconds)
    this.analysisInterval = setInterval(async () => {
      try {
        await this.performAnalysis();
      } catch (error) {
        console.error('❌ Error in market analysis:', error);
        this.emit('analysisError', error);
      }
    }, 30000);

    this.emit('analysisStarted');
    console.log('✅ Market analysis started');
  }

  async stopAnalysis(): Promise<void> {
    if (!this._isAnalyzing) return;

    console.log('🛑 Stopping market analysis...');
    this._isAnalyzing = false;

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }

    this.emit('analysisStopped');
    console.log('✅ Market analysis stopped');
  }

  private async initializeData(): Promise<void> {
    console.log('🔄 Initializing market data...');
    
    for (const symbol of this.symbols) {
      // Initialize empty arrays
      this.priceHistory.set(symbol, []);
      this.fundingHistory.set(symbol, []);
      this.orderBookHistory.set(symbol, []);
      this.signals.set(symbol, []);
      this.priceLevels.set(symbol, []);
      
      // Collect initial data
      await this.collectMarketData(symbol);
    }
    
    console.log(`✅ Initialized data for ${this.symbols.length} symbols`);
  }

  private async performAnalysis(): Promise<void> {
    for (const symbol of this.symbols) {
      await this.collectMarketData(symbol);
      await this.analyzeSymbol(symbol);
    }
    
    this.emit('analysisCompleted', {
      timestamp: Date.now(),
      symbolsAnalyzed: this.symbols.length,
      signalsGenerated: Array.from(this.signals.values()).flat().length,
    });
  }

  // ============================================================================
  // DATA COLLECTION
  // ============================================================================

  private async collectMarketData(symbol: string): Promise<void> {
    try {
      // Collect ticker data
      const ticker = await this.client.getTicker(symbol);
      const priceData = {
        price: parseFloat(ticker.price),
        volume: parseFloat(ticker.volume),
        timestamp: Date.now(),
      };
      
      const priceHistory = this.priceHistory.get(symbol) || [];
      priceHistory.push(priceData);
      
      // Keep only last 1000 data points
      if (priceHistory.length > 1000) {
        priceHistory.shift();
      }
      this.priceHistory.set(symbol, priceHistory);

      // Collect funding rate data
      const fundingRate = await this.client.getFundingRate(symbol);
      const fundingData = {
        rate: parseFloat(fundingRate.fundingRate),
        timestamp: Date.now(),
      };
      
      const fundingHistory = this.fundingHistory.get(symbol) || [];
      fundingHistory.push(fundingData);
      
      if (fundingHistory.length > 100) {
        fundingHistory.shift();
      }
      this.fundingHistory.set(symbol, fundingHistory);

      // Collect order book data
      const orderBook = await this.client.getOrderBook(symbol, 10);
      const spread = parseFloat(orderBook.asks[0][0]) - parseFloat(orderBook.bids[0][0]);
      const depth = orderBook.bids.slice(0, 5).reduce((sum, bid) => sum + parseFloat(bid[1]), 0) +
                   orderBook.asks.slice(0, 5).reduce((sum, ask) => sum + parseFloat(ask[1]), 0);
      
      const orderBookData = {
        spread,
        depth,
        timestamp: Date.now(),
      };
      
      const orderBookHistory = this.orderBookHistory.get(symbol) || [];
      orderBookHistory.push(orderBookData);
      
      if (orderBookHistory.length > 100) {
        orderBookHistory.shift();
      }
      this.orderBookHistory.set(symbol, orderBookHistory);

    } catch (error) {
      console.warn(`⚠️ Error collecting data for ${symbol}:`, error);
    }
  }

  // ============================================================================
  // TECHNICAL ANALYSIS
  // ============================================================================

  private async analyzeSymbol(symbol: string): Promise<void> {
    const priceHistory = this.priceHistory.get(symbol) || [];
    if (priceHistory.length < 20) return; // Need minimum data

    // Calculate technical indicators
    const rsi = this.calculateRSI(priceHistory);
    const macd = this.calculateMACD(priceHistory);
    const bollinger = this.calculateBollingerBands(priceHistory);
    const volume = this.calculateVolumeIndicator(priceHistory);
    const volatility = this.calculateVolatility(priceHistory);

    // Generate signals
    const signal = this.generateSignal(symbol, {
      rsi,
      macd,
      bollinger,
      volume,
      volatility,
      priceHistory,
    });

    if (signal) {
      const signals = this.signals.get(symbol) || [];
      signals.push(signal);
      
      // Keep only last 50 signals
      if (signals.length > 50) {
        signals.shift();
      }
      this.signals.set(symbol, signals);
      
      this.emit('signalGenerated', signal);
    }

    // Analyze market conditions
    const condition = this.analyzeMarketCondition(symbol, priceHistory);
    this.conditions.set(symbol, condition);
    this.emit('conditionUpdated', condition);

    // Update support/resistance levels
    const levels = this.identifyPriceLevels(priceHistory);
    this.priceLevels.set(symbol, levels);

    // Check for alerts
    await this.checkMarketAlerts(symbol, priceHistory);
  }

  private calculateRSI(priceHistory: Array<{ price: number; timestamp: number }>, period = 14): number {
    if (priceHistory.length < period + 1) return 50;

    const prices = priceHistory.slice(-period - 1).map(p => p.price);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(
    priceHistory: Array<{ price: number; timestamp: number }>
  ): { macd: number; signal: number; histogram: number } {
    if (priceHistory.length < 26) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    const prices = priceHistory.map(p => p.price);
    
    // Calculate EMAs
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // Calculate signal line (9-period EMA of MACD)
    const macdHistory = [macd]; // Simplified - would need historical MACD values
    const signal = this.calculateEMA(macdHistory, 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private calculateBollingerBands(
    priceHistory: Array<{ price: number; timestamp: number }>,
    period = 20,
    stdDev = 2
  ): { upper: number; middle: number; lower: number } {
    if (priceHistory.length < period) {
      const currentPrice = priceHistory[priceHistory.length - 1]?.price || 0;
      return { upper: currentPrice, middle: currentPrice, lower: currentPrice };
    }

    const prices = priceHistory.slice(-period).map(p => p.price);
    const sma = prices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev),
    };
  }

  private calculateVolumeIndicator(priceHistory: Array<{ volume: number; timestamp: number }>): number {
    if (priceHistory.length < 20) return 0;
    
    const volumes = priceHistory.slice(-20).map(p => p.volume);
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];
    
    return currentVolume / avgVolume; // Volume ratio
  }

  private calculateVolatility(priceHistory: Array<{ price: number; timestamp: number }>): number {
    if (priceHistory.length < 20) return 0;
    
    const prices = priceHistory.slice(-20).map(p => p.price);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365); // Annualized volatility
  }

  // ============================================================================
  // SIGNAL GENERATION
  // ============================================================================

  private generateSignal(
    symbol: string,
    indicators: {
      rsi: number;
      macd: { macd: number; signal: number; histogram: number };
      bollinger: { upper: number; middle: number; lower: number };
      volume: number;
      volatility: number;
      priceHistory: Array<{ price: number; timestamp: number }>;
    }
  ): MarketSignal | null {
    const currentPrice = indicators.priceHistory[indicators.priceHistory.length - 1].price;
    
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    const reasons: string[] = [];

    // RSI signals
    if (indicators.rsi < 30) {
      signalType = 'BUY';
      strength += 0.3;
      reasons.push('RSI oversold');
    } else if (indicators.rsi > 70) {
      signalType = 'SELL';
      strength += 0.3;
      reasons.push('RSI overbought');
    }

    // MACD signals
    if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
      if (signalType === 'HOLD' || signalType === 'BUY') {
        signalType = 'BUY';
        strength += 0.25;
        reasons.push('MACD bullish');
      }
    } else if (indicators.macd.histogram < 0 && indicators.macd.macd < indicators.macd.signal) {
      if (signalType === 'HOLD' || signalType === 'SELL') {
        signalType = 'SELL';
        strength += 0.25;
        reasons.push('MACD bearish');
      }
    }

    // Bollinger Band signals
    if (currentPrice < indicators.bollinger.lower) {
      if (signalType === 'HOLD' || signalType === 'BUY') {
        signalType = 'BUY';
        strength += 0.2;
        reasons.push('Price below lower Bollinger Band');
      }
    } else if (currentPrice > indicators.bollinger.upper) {
      if (signalType === 'HOLD' || signalType === 'SELL') {
        signalType = 'SELL';
        strength += 0.2;
        reasons.push('Price above upper Bollinger Band');
      }
    }

    // Volume confirmation
    if (indicators.volume > 1.5) {
      strength += 0.15;
      confidence += 0.2;
      reasons.push('High volume confirmation');
    }

    // Volatility adjustment
    if (indicators.volatility > 0.5) {
      confidence -= 0.1; // High volatility reduces confidence
      reasons.push('High volatility detected');
    }

    // Calculate final confidence
    confidence += Math.min(strength, 0.8);
    confidence = Math.max(0, Math.min(1, confidence));

    // Only generate signal if strength is significant
    if (strength < 0.3) {
      signalType = 'HOLD';
    }

    return {
      symbol,
      type: signalType,
      strength: Math.min(strength, 1),
      confidence,
      timeframe: '1h', // Based on our analysis interval
      indicators: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        bollinger: indicators.bollinger,
        volume: indicators.volume,
        volatility: indicators.volatility,
      },
      reasoning: reasons.join(', '),
      timestamp: Date.now(),
    };
  }

  private analyzeMarketCondition(
    symbol: string,
    priceHistory: Array<{ price: number; timestamp: number }>
  ): MarketCondition {
    if (priceHistory.length < 20) {
      return {
        symbol,
        trend: 'SIDEWAYS',
        volatility: 'MEDIUM',
        volume: 'MEDIUM',
        momentum: 'NEUTRAL',
        support: 0,
        resistance: 0,
        riskLevel: 'MEDIUM',
        timestamp: Date.now(),
      };
    }

    const prices = priceHistory.slice(-20).map(p => p.price);
    const currentPrice = prices[prices.length - 1];
    const startPrice = prices[0];
    
    // Trend analysis
    const priceChange = (currentPrice - startPrice) / startPrice;
    let trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS';
    
    if (priceChange > 0.02) trend = 'BULLISH';
    else if (priceChange < -0.02) trend = 'BEARISH';

    // Volatility analysis
    const volatility = this.calculateVolatility(priceHistory);
    let volatilityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';
    
    if (volatility < 0.2) volatilityLevel = 'LOW';
    else if (volatility > 0.5) volatilityLevel = 'HIGH';
    else if (volatility > 1.0) volatilityLevel = 'EXTREME';

    // Support and resistance
    const support = Math.min(...prices.slice(-10));
    const resistance = Math.max(...prices.slice(-10));

    // Risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';
    if (volatilityLevel === 'EXTREME') riskLevel = 'EXTREME';
    else if (volatilityLevel === 'HIGH') riskLevel = 'HIGH';
    else if (volatilityLevel === 'LOW') riskLevel = 'LOW';

    return {
      symbol,
      trend,
      volatility: volatilityLevel,
      volume: 'MEDIUM', // Simplified
      momentum: trend === 'BULLISH' ? 'STRONG_UP' : trend === 'BEARISH' ? 'STRONG_DOWN' : 'NEUTRAL',
      support,
      resistance,
      riskLevel,
      timestamp: Date.now(),
    };
  }

  private identifyPriceLevels(
    priceHistory: Array<{ price: number; timestamp: number }>
  ): PriceLevel[] {
    if (priceHistory.length < 50) return [];

    const prices = priceHistory.map(p => p.price);
    const levels: PriceLevel[] = [];

    // Find local maxima and minima
    for (let i = 2; i < prices.length - 2; i++) {
      const current = prices[i];
      const isLocalMax = current > prices[i - 1] && current > prices[i + 1] &&
                        current > prices[i - 2] && current > prices[i + 2];
      const isLocalMin = current < prices[i - 1] && current < prices[i + 1] &&
                        current < prices[i - 2] && current < prices[i + 2];

      if (isLocalMax) {
        levels.push({
          price: current,
          type: 'RESISTANCE',
          strength: 0.5,
          touches: 1,
          lastTouch: priceHistory[i].timestamp,
        });
      } else if (isLocalMin) {
        levels.push({
          price: current,
          type: 'SUPPORT',
          strength: 0.5,
          touches: 1,
          lastTouch: priceHistory[i].timestamp,
        });
      }
    }

    // Merge nearby levels and calculate strength
    return this.mergePriceLevels(levels);
  }

  private mergePriceLevels(levels: PriceLevel[]): PriceLevel[] {
    const merged: PriceLevel[] = [];
    const threshold = 0.01; // 1% threshold for merging

    for (const level of levels) {
      const existing = merged.find(m => 
        Math.abs(m.price - level.price) / level.price < threshold &&
        m.type === level.type
      );

      if (existing) {
        existing.touches++;
        existing.strength = Math.min(1, existing.strength + 0.1);
        existing.lastTouch = Math.max(existing.lastTouch, level.lastTouch);
      } else {
        merged.push({ ...level });
      }
    }

    return merged.sort((a, b) => b.strength - a.strength).slice(0, 10);
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  private async checkMarketAlerts(
    symbol: string,
    priceHistory: Array<{ price: number; volume: number; timestamp: number }>
  ): Promise<void> {
    if (priceHistory.length < 10) return;

    const currentPrice = priceHistory[priceHistory.length - 1].price;
    const currentVolume = priceHistory[priceHistory.length - 1].volume;
    const avgVolume = priceHistory.slice(-10).reduce((sum, p) => sum + p.volume, 0) / 10;

    // Volume spike alert
    if (currentVolume > avgVolume * 3) {
      this.addAlert({
        type: 'VOLUME_SPIKE',
        symbol,
        severity: 'HIGH',
        message: `Volume spike: ${(currentVolume / avgVolume).toFixed(1)}x average`,
        data: { currentVolume, avgVolume },
        timestamp: Date.now(),
      });
    }

    // Price breakout/breakdown alerts
    const levels = this.priceLevels.get(symbol) || [];
    for (const level of levels) {
      const priceDistance = Math.abs(currentPrice - level.price) / level.price;
      
      if (priceDistance < 0.005) { // Within 0.5% of level
        const alertType = level.type === 'RESISTANCE' ? 'BREAKOUT' : 'BREAKDOWN';
        this.addAlert({
          type: alertType,
          symbol,
          severity: 'MEDIUM',
          message: `Price approaching ${level.type.toLowerCase()} at ${level.price}`,
          data: { level, currentPrice },
          timestamp: Date.now(),
        });
      }
    }

    // Volatility spike alert
    const volatility = this.calculateVolatility(priceHistory);
    if (volatility > 1.0) {
      this.addAlert({
        type: 'VOLATILITY_SPIKE',
        symbol,
        severity: 'HIGH',
        message: `High volatility detected: ${(volatility * 100).toFixed(1)}%`,
        data: { volatility },
        timestamp: Date.now(),
      });
    }
  }

  private addAlert(alert: MarketAlert): void {
    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }
    
    console.log(`🚨 Market Alert: ${alert.message}`);
    this.emit('marketAlert', alert);
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getSignals(symbol?: string): MarketSignal[] {
    if (symbol) {
      return this.signals.get(symbol) || [];
    }
    return Array.from(this.signals.values()).flat();
  }

  getLatestSignal(symbol: string): MarketSignal | null {
    const signals = this.signals.get(symbol) || [];
    return signals.length > 0 ? signals[signals.length - 1] : null;
  }

  getMarketCondition(symbol: string): MarketCondition | null {
    return this.conditions.get(symbol) || null;
  }

  getPriceLevels(symbol: string): PriceLevel[] {
    return this.priceLevels.get(symbol) || [];
  }

  getAlerts(type?: MarketAlert['type']): MarketAlert[] {
    if (!type) return [...this.alerts];
    return this.alerts.filter(alert => alert.type === type);
  }

  getPriceHistory(symbol: string): Array<{ price: number; volume: number; timestamp: number }> {
    return this.priceHistory.get(symbol) || [];
  }

  isAnalyzing(): boolean {
    return this._isAnalyzing;
  }
}