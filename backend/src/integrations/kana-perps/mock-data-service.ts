/**
 * Kana Labs Mock Data Service
 * 
 * Provides realistic mock data for development and testing purposes
 * This allows us to develop and demonstrate the arbitrage functionality
 * while we work on the actual API integration
 */

import { EventEmitter } from 'events';
import { KanaTicker, KanaFundingRate, KanaOrderBook, KanaPosition, KanaAccount, KanaBalance, KanaOrder } from './kana-client';

export class KanaMockDataService extends EventEmitter {
  private symbols = ['BTC-PERP', 'ETH-PERP', 'APT-PERP', 'SOL-PERP', 'AVAX-PERP', 'NEAR-PERP'];
  private currentPrices: Map<string, number> = new Map();
  private fundingRates: Map<string, number> = new Map();
  private priceUpdateInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializePrices();
    this.startPriceUpdates();
  }

  private initializePrices(): void {
    // Initialize realistic prices
    this.currentPrices.set('BTC-PERP', 43250.50);
    this.currentPrices.set('ETH-PERP', 2650.75);
    this.currentPrices.set('APT-PERP', 12.45);
    this.currentPrices.set('SOL-PERP', 102.30);
    this.currentPrices.set('AVAX-PERP', 38.90);
    this.currentPrices.set('NEAR-PERP', 5.25);

    // Initialize funding rates with some realistic values
    this.fundingRates.set('BTC-PERP', 0.0008);   // 0.08%
    this.fundingRates.set('ETH-PERP', -0.0012);  // -0.12%
    this.fundingRates.set('APT-PERP', 0.0025);   // 0.25%
    this.fundingRates.set('SOL-PERP', -0.0003);  // -0.03%
    this.fundingRates.set('AVAX-PERP', 0.0015);  // 0.15%
    this.fundingRates.set('NEAR-PERP', -0.0008); // -0.08%
  }

  private startPriceUpdates(): void {
    // Update prices every 5 seconds with realistic fluctuations
    this.priceUpdateInterval = setInterval(() => {
      this.updatePrices();
    }, 5000);
  }

  private updatePrices(): void {
    for (const [symbol, price] of this.currentPrices) {
      // Random price movement between -1% and +1%
      const change = (Math.random() - 0.5) * 0.02;
      const newPrice = price * (1 + change);
      this.currentPrices.set(symbol, newPrice);

      // Occasionally update funding rates
      if (Math.random() < 0.3) {
        const currentFunding = this.fundingRates.get(symbol) || 0;
        const fundingChange = (Math.random() - 0.5) * 0.001; // ±0.1%
        const newFunding = Math.max(-0.005, Math.min(0.005, currentFunding + fundingChange));
        this.fundingRates.set(symbol, newFunding);
      }
    }

    // Emit price update events
    this.emit('pricesUpdated');
  }

  // ============================================================================
  // MOCK API METHODS
  // ============================================================================

  async getTicker(symbol: string): Promise<KanaTicker> {
    const price = this.currentPrices.get(symbol) || 100;
    const change = (Math.random() - 0.5) * 0.1; // ±10% change for demo
    
    return {
      symbol,
      price: price.toFixed(2),
      priceChange: (price * change).toFixed(2),
      priceChangePercent: (change * 100).toFixed(2),
      volume: (Math.random() * 1000000).toFixed(2),
      high: (price * 1.05).toFixed(2),
      low: (price * 0.95).toFixed(2),
      timestamp: Date.now(),
    };
  }

  async getAllTickers(): Promise<KanaTicker[]> {
    const tickers = [];
    for (const symbol of this.symbols) {
      tickers.push(await this.getTicker(symbol));
    }
    return tickers;
  }

  async getFundingRate(symbol: string): Promise<KanaFundingRate> {
    const fundingRate = this.fundingRates.get(symbol) || 0;
    const price = this.currentPrices.get(symbol) || 100;
    const nextFundingTime = Math.floor(Date.now() / (8 * 60 * 60 * 1000)) * (8 * 60 * 60 * 1000) + (8 * 60 * 60 * 1000);

    return {
      symbol,
      fundingRate: fundingRate.toFixed(6),
      fundingTime: Date.now(),
      nextFundingTime,
      markPrice: price.toFixed(2),
      indexPrice: (price * 0.9998).toFixed(2),
      interestRate: '0.000100',
      premiumIndex: (fundingRate * 0.8).toFixed(6),
    };
  }

  async getAllFundingRates(): Promise<KanaFundingRate[]> {
    const fundingRates = [];
    for (const symbol of this.symbols) {
      fundingRates.push(await this.getFundingRate(symbol));
    }
    return fundingRates;
  }

  async getOrderBook(symbol: string, depth: number = 100): Promise<KanaOrderBook> {
    const price = this.currentPrices.get(symbol) || 100;
    const spread = price * 0.001; // 0.1% spread

    const bids: [string, string][] = [];
    const asks: [string, string][] = [];

    // Generate mock order book
    for (let i = 0; i < Math.min(depth, 20); i++) {
      const bidPrice = price - spread / 2 - (i * spread * 0.1);
      const askPrice = price + spread / 2 + (i * spread * 0.1);
      const bidSize = (Math.random() * 10).toFixed(4);
      const askSize = (Math.random() * 10).toFixed(4);

      bids.push([bidPrice.toFixed(2), bidSize]);
      asks.push([askPrice.toFixed(2), askSize]);
    }

    return {
      symbol,
      bids,
      asks,
      timestamp: Date.now(),
    };
  }

  async getAccount(): Promise<KanaAccount> {
    return {
      accountId: 'demo-account-123',
      balances: [
        { currency: 'USDC', available: '10000.00', hold: '2000.00', total: '12000.00' },
        { currency: 'USDT', available: '5000.00', hold: '1000.00', total: '6000.00' },
      ],
      totalEquity: '18000.00',
      totalMargin: '3000.00',
      freeMargin: '15000.00',
      marginRatio: '0.167',
      canTrade: true,
      canWithdraw: true,
    };
  }

  async getPositions(): Promise<KanaPosition[]> {
    // Return some mock positions for demonstration
    const positions: KanaPosition[] = [];

    // Add a few realistic positions
    if (Math.random() > 0.7) {
      positions.push({
        symbol: 'BTC-PERP',
        side: 'long',
        size: '0.1',
        contracts: '0.1',
        avgEntryPrice: '42500.00',
        markPrice: (this.currentPrices.get('BTC-PERP') || 43250).toFixed(2),
        liquidationPrice: '38000.00',
        bankruptcyPrice: '37500.00',
        unrealizedPnl: '75.00',
        realizedPnl: '0.00',
        positionMargin: '425.00',
        maintMargin: '212.50',
        marginRatio: '0.5',
        leverage: '10',
        timestamp: Date.now(),
      });
    }

    if (Math.random() > 0.8) {
      positions.push({
        symbol: 'ETH-PERP',
        side: 'short',
        size: '2.0',
        contracts: '2.0',
        avgEntryPrice: '2700.00',
        markPrice: (this.currentPrices.get('ETH-PERP') || 2650).toFixed(2),
        liquidationPrice: '3100.00',
        bankruptcyPrice: '3150.00',
        unrealizedPnl: '100.00',
        realizedPnl: '0.00',
        positionMargin: '540.00',
        maintMargin: '270.00',
        marginRatio: '0.5',
        leverage: '10',
        timestamp: Date.now(),
      });
    }

    return positions;
  }

  async getBalances(): Promise<KanaBalance[]> {
    return [
      { currency: 'USDC', available: '10000.00', hold: '2000.00', total: '12000.00' },
      { currency: 'USDT', available: '5000.00', hold: '1000.00', total: '6000.00' },
      { currency: 'APT', available: '100.00', hold: '0.00', total: '100.00' },
    ];
  }

  // ============================================================================
  // ARBITRAGE OPPORTUNITY DETECTION
  // ============================================================================

  async getArbitrageOpportunities(minThreshold: number = 0.01): Promise<Array<{
    symbol: string;
    fundingRate: number;
    expectedProfit: number;
    riskScore: number;
    recommendedAction: 'LONG' | 'SHORT' | 'HOLD';
    recommendedSize: number;
    timeToFunding: number;
    confidence: number;
    reasoning: string;
  }>> {
    const opportunities = [];
    const fundingRates = await this.getAllFundingRates();

    for (const rate of fundingRates) {
      const fundingRate = parseFloat(rate.fundingRate);
      
      // Check if funding rate exceeds threshold
      if (Math.abs(fundingRate) > minThreshold) {
        const price = this.currentPrices.get(rate.symbol) || 100;
        const timeToFunding = rate.nextFundingTime - Date.now();
        
        // Calculate expected profit (simplified)
        const hoursToFunding = timeToFunding / (1000 * 60 * 60);
        const expectedProfit = Math.abs(fundingRate) * price * 0.8; // 80% of funding rate
        
        // Risk score based on volatility and liquidity
        const riskScore = Math.min(1.0, Math.abs(fundingRate) / 0.005 * 0.3 + Math.random() * 0.3);
        
        // Confidence based on funding rate magnitude and time
        const confidence = Math.min(1.0, Math.abs(fundingRate) / 0.002 * 0.7 + (hoursToFunding / 8) * 0.3);

        opportunities.push({
          symbol: rate.symbol,
          fundingRate,
          expectedProfit,
          riskScore,
          recommendedAction: fundingRate > 0 ? 'SHORT' : 'LONG',
          recommendedSize: Math.min(1000, expectedProfit * 20), // Position size based on profit potential
          timeToFunding,
          confidence,
          reasoning: fundingRate > 0 
            ? `High positive funding rate (${(fundingRate * 100).toFixed(3)}%) - short to receive payments`
            : `High negative funding rate (${(fundingRate * 100).toFixed(3)}%) - long to receive payments`,
        });
      }
    }

    // Sort by risk-adjusted profit potential
    return opportunities.sort((a, b) => 
      (b.expectedProfit * b.confidence * (1 - b.riskScore)) - 
      (a.expectedProfit * a.confidence * (1 - a.riskScore))
    );
  }

  // ============================================================================
  // MOCK TRADING OPERATIONS
  // ============================================================================

  async mockPlaceOrder(order: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    size: string;
    price?: string;
  }): Promise<KanaOrder> {
    const orderId = `mock-order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const price = order.price || (this.currentPrices.get(order.symbol) || 100).toFixed(2);

    console.log(`🎭 MOCK ORDER: ${order.side} ${order.size} ${order.symbol} at $${price}`);

    return {
      orderId,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      size: order.size,
      price,
      status: 'filled', // Mock orders are immediately filled
      filledSize: order.size,
      remainingSize: '0',
      avgFillPrice: price,
      fee: (parseFloat(order.size) * parseFloat(price) * 0.001).toFixed(6),
      timestamp: Date.now(),
    };
  }

  async mockExecuteArbitrage(opportunity: {
    symbol: string;
    recommendedAction: 'LONG' | 'SHORT';
    recommendedSize: number;
    fundingRate: number;
    expectedProfit: number;
  }): Promise<{
    id: string;
    symbol: string;
    action: string;
    size: number;
    entryPrice: number;
    fundingRate: number;
    expectedProfit: number;
    timestamp: number;
    status: 'EXECUTED';
  }> {
    const price = this.currentPrices.get(opportunity.symbol) || 100;
    const executionId = `arb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    console.log(`💰 MOCK ARBITRAGE: ${opportunity.recommendedAction} ${opportunity.symbol} for $${opportunity.expectedProfit.toFixed(2)} profit`);

    return {
      id: executionId,
      symbol: opportunity.symbol,
      action: opportunity.recommendedAction === 'LONG' ? 'OPEN_LONG' : 'OPEN_SHORT',
      size: Math.min(opportunity.recommendedSize, 1000), // Cap size for demo
      entryPrice: price,
      fundingRate: opportunity.fundingRate,
      expectedProfit: opportunity.expectedProfit,
      timestamp: Date.now(),
      status: 'EXECUTED',
    };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = undefined;
    }
    this.removeAllListeners();
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getCurrentPrice(symbol: string): number {
    return this.currentPrices.get(symbol) || 100;
  }

  getCurrentFundingRate(symbol: string): number {
    return this.fundingRates.get(symbol) || 0;
  }

  getAllSymbols(): string[] {
    return [...this.symbols];
  }
}

// Export singleton instance
export const mockDataService = new KanaMockDataService();
