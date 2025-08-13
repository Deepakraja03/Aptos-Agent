/**
 * Market Making Bot for Kana Perps
 * 
 * Advanced market making agent for perpetual futures
 * Provides liquidity while capturing spread profits
 */

import { EventEmitter } from 'events';
import { KanaLabsClient, KanaOrderBook, KanaTicker, OrderRequest } from '../kana-client';

export interface MarketMakingConfig {
  symbols: string[];
  targetSpread: number; // Target spread percentage (e.g., 0.001 = 0.1%)
  maxSpread: number; // Maximum spread to maintain (e.g., 0.005 = 0.5%)
  inventoryTarget: number; // Target inventory in USD
  maxInventory: number; // Maximum inventory deviation
  orderSize: number; // Base order size
  maxOrders: number; // Maximum orders per side
  riskLimit: number; // Maximum risk exposure
  rebalanceThreshold: number; // When to rebalance inventory
}

export interface MarketMakingOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  timestamp: number;
  status: 'PENDING' | 'PLACED' | 'FILLED' | 'CANCELLED';
}

export interface InventoryStatus {
  symbol: string;
  currentInventory: number;
  targetInventory: number;
  deviation: number;
  needsRebalancing: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface MarketMakingMetrics {
  totalVolume: number;
  spreadsCaptured: number;
  averageSpread: number;
  inventoryTurnover: number;
  profitFromSpreads: number;
  riskAdjustedReturn: number;
  uptime: number;
  ordersPlaced: number;
  ordersFilled: number;
  fillRate: number;
}

export class MarketMakingBot extends EventEmitter {
  private client: KanaLabsClient;
  private config: MarketMakingConfig;
  private isRunning = false;
  private activeOrders: Map<string, MarketMakingOrder[]> = new Map();
  private inventory: Map<string, number> = new Map();
  private metrics: MarketMakingMetrics;
  private lastUpdate = Date.now();
  private updateInterval?: NodeJS.Timeout;

  constructor(client: KanaLabsClient, config: Partial<MarketMakingConfig> = {}) {
    super();
    
    this.client = client;
    this.config = {
      symbols: ['BTC-PERP', 'ETH-PERP'],
      targetSpread: 0.001, // 0.1%
      maxSpread: 0.005, // 0.5%
      inventoryTarget: 0, // Neutral inventory
      maxInventory: 10000, // $10,000 max deviation
      orderSize: 1000, // $1,000 base order
      maxOrders: 5, // 5 orders per side
      riskLimit: 50000, // $50,000 max risk
      rebalanceThreshold: 0.3, // 30% deviation triggers rebalance
      ...config,
    };

    this.metrics = {
      totalVolume: 0,
      spreadsCaptured: 0,
      averageSpread: 0,
      inventoryTurnover: 0,
      profitFromSpreads: 0,
      riskAdjustedReturn: 0,
      uptime: 0,
      ordersPlaced: 0,
      ordersFilled: 0,
      fillRate: 0,
    };

    // Initialize inventory tracking
    this.config.symbols.forEach(symbol => {
      this.activeOrders.set(symbol, []);
      this.inventory.set(symbol, 0);
    });
  }

  // ============================================================================
  // MAIN CONTROL METHODS
  // ============================================================================

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Market Making Bot is already running');
      return;
    }

    console.log('🚀 Starting Market Making Bot...');
    this.isRunning = true;

    try {
      // Initialize market data
      await this.initializeMarketData();

      // Start market making loop
      this.updateInterval = setInterval(async () => {
        try {
          await this.updateMarketMaking();
        } catch (error) {
          console.error('❌ Error in market making update:', error);
          this.emit('error', error);
        }
      }, 5000); // Update every 5 seconds

      this.emit('started');
      console.log('✅ Market Making Bot started successfully');
    } catch (error) {
      console.error('❌ Failed to start Market Making Bot:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping Market Making Bot...');
    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    // Cancel all active orders
    await this.cancelAllOrders();

    this.emit('stopped');
    console.log('✅ Market Making Bot stopped');
  }

  // ============================================================================
  // MARKET MAKING LOGIC
  // ============================================================================

  private async updateMarketMaking(): Promise<void> {
    for (const symbol of this.config.symbols) {
      await this.updateSymbolMarketMaking(symbol);
    }
    
    this.lastUpdate = Date.now();
    this.emit('updated', { timestamp: this.lastUpdate });
  }

  private async updateSymbolMarketMaking(symbol: string): Promise<void> {
    try {
      // Get current market data
      const [ticker, orderBook] = await Promise.all([
        this.client.getTicker(symbol),
        this.client.getOrderBook(symbol, 10)
      ]);

      // Calculate optimal quotes
      const quotes = this.calculateOptimalQuotes(symbol, ticker, orderBook);
      
      // Check inventory status
      const inventoryStatus = this.getInventoryStatus(symbol);
      
      // Adjust quotes based on inventory
      const adjustedQuotes = this.adjustQuotesForInventory(quotes, inventoryStatus);
      
      // Update orders
      await this.updateOrders(symbol, adjustedQuotes);
      
      // Check for rebalancing needs
      if (inventoryStatus.needsRebalancing) {
        await this.rebalanceInventory(symbol, inventoryStatus);
      }

    } catch (error) {
      console.error(`❌ Error updating market making for ${symbol}:`, error);
    }
  }

  private calculateOptimalQuotes(
    symbol: string,
    ticker: KanaTicker,
    orderBook: KanaOrderBook
  ): { bidPrice: number; askPrice: number; bidSize: number; askSize: number } {
    const midPrice = parseFloat(ticker.price);
    const bestBid = parseFloat(orderBook.bids[0][0]);
    const bestAsk = parseFloat(orderBook.asks[0][0]);
    
    // Calculate current spread
    const currentSpread = (bestAsk - bestBid) / midPrice;
    
    // Determine our target spread
    let targetSpread = this.config.targetSpread;
    
    // Widen spread in volatile conditions
    const volatility = Math.abs(parseFloat(ticker.priceChangePercent)) / 100;
    if (volatility > 0.05) { // 5% volatility
      targetSpread *= (1 + volatility);
    }
    
    // Ensure we don't exceed max spread
    targetSpread = Math.min(targetSpread, this.config.maxSpread);
    
    // Calculate our quotes
    const halfSpread = targetSpread / 2;
    const bidPrice = midPrice * (1 - halfSpread);
    const askPrice = midPrice * (1 + halfSpread);
    
    // Calculate order sizes
    const baseSize = this.config.orderSize / midPrice;
    const bidSize = baseSize;
    const askSize = baseSize;
    
    return { bidPrice, askPrice, bidSize, askSize };
  }

  private adjustQuotesForInventory(
    quotes: { bidPrice: number; askPrice: number; bidSize: number; askSize: number },
    inventoryStatus: InventoryStatus
  ): { bidPrice: number; askPrice: number; bidSize: number; askSize: number } {
    const { bidPrice, askPrice, bidSize, askSize } = quotes;
    
    // Adjust based on inventory deviation
    const inventoryRatio = inventoryStatus.deviation;
    
    let adjustedBidPrice = bidPrice;
    let adjustedAskPrice = askPrice;
    let adjustedBidSize = bidSize;
    let adjustedAskSize = askSize;
    
    if (inventoryRatio > 0.2) { // Long inventory - favor selling
      adjustedAskPrice *= 0.999; // Slightly more aggressive ask
      adjustedBidPrice *= 1.001; // Slightly less aggressive bid
      adjustedAskSize *= 1.2; // Larger ask size
      adjustedBidSize *= 0.8; // Smaller bid size
    } else if (inventoryRatio < -0.2) { // Short inventory - favor buying
      adjustedBidPrice *= 1.001; // Slightly more aggressive bid
      adjustedAskPrice *= 0.999; // Slightly less aggressive ask
      adjustedBidSize *= 1.2; // Larger bid size
      adjustedAskSize *= 0.8; // Smaller ask size
    }
    
    return {
      bidPrice: adjustedBidPrice,
      askPrice: adjustedAskPrice,
      bidSize: adjustedBidSize,
      askSize: adjustedAskSize,
    };
  }

  private async updateOrders(
    symbol: string,
    quotes: { bidPrice: number; askPrice: number; bidSize: number; askSize: number }
  ): Promise<void> {
    // Cancel existing orders that are no longer optimal
    await this.cancelSuboptimalOrders(symbol, quotes);
    
    // Place new orders if needed
    await this.placeOptimalOrders(symbol, quotes);
  }

  private async cancelSuboptimalOrders(
    symbol: string,
    quotes: { bidPrice: number; askPrice: number; bidSize: number; askSize: number }
  ): Promise<void> {
    const activeOrders = this.activeOrders.get(symbol) || [];
    const priceTolerance = 0.001; // 0.1% price tolerance
    
    for (const order of activeOrders) {
      let shouldCancel = false;
      
      if (order.side === 'buy' && Math.abs(order.price - quotes.bidPrice) / quotes.bidPrice > priceTolerance) {
        shouldCancel = true;
      } else if (order.side === 'sell' && Math.abs(order.price - quotes.askPrice) / quotes.askPrice > priceTolerance) {
        shouldCancel = true;
      }
      
      if (shouldCancel && order.status === 'PLACED') {
        try {
          await this.client.cancelOrder(order.id);
          order.status = 'CANCELLED';
          console.log(`❌ Cancelled suboptimal order: ${order.id}`);
        } catch (error) {
          console.error(`Failed to cancel order ${order.id}:`, error);
        }
      }
    }
  }

  private async placeOptimalOrders(
    symbol: string,
    quotes: { bidPrice: number; askPrice: number; bidSize: number; askSize: number }
  ): Promise<void> {
    const activeOrders = this.activeOrders.get(symbol) || [];
    
    // Count active orders by side
    const activeBids = activeOrders.filter(o => o.side === 'buy' && o.status === 'PLACED').length;
    const activeAsks = activeOrders.filter(o => o.side === 'sell' && o.status === 'PLACED').length;
    
    // Place bid orders if needed
    if (activeBids < this.config.maxOrders) {
      await this.placeBidOrder(symbol, quotes.bidPrice, quotes.bidSize);
    }
    
    // Place ask orders if needed
    if (activeAsks < this.config.maxOrders) {
      await this.placeAskOrder(symbol, quotes.askPrice, quotes.askSize);
    }
  }

  private async placeBidOrder(symbol: string, price: number, size: number): Promise<void> {
    try {
      const orderRequest: OrderRequest = {
        symbol,
        side: 'buy',
        type: 'limit',
        size: size.toString(),
        price: price.toString(),
        postOnly: true, // Only place if it adds liquidity
      };

      const order = await this.client.placeOrder(orderRequest);
      
      const marketMakingOrder: MarketMakingOrder = {
        id: order.orderId,
        symbol,
        side: 'buy',
        price,
        size,
        timestamp: Date.now(),
        status: 'PLACED',
      };

      const activeOrders = this.activeOrders.get(symbol) || [];
      activeOrders.push(marketMakingOrder);
      this.activeOrders.set(symbol, activeOrders);
      
      this.metrics.ordersPlaced++;
      console.log(`📝 Placed bid order: ${price.toFixed(4)} x ${size.toFixed(4)}`);
      
    } catch (error) {
      console.error(`Failed to place bid order for ${symbol}:`, error);
    }
  }

  private async placeAskOrder(symbol: string, price: number, size: number): Promise<void> {
    try {
      const orderRequest: OrderRequest = {
        symbol,
        side: 'sell',
        type: 'limit',
        size: size.toString(),
        price: price.toString(),
        postOnly: true, // Only place if it adds liquidity
      };

      const order = await this.client.placeOrder(orderRequest);
      
      const marketMakingOrder: MarketMakingOrder = {
        id: order.orderId,
        symbol,
        side: 'sell',
        price,
        size,
        timestamp: Date.now(),
        status: 'PLACED',
      };

      const activeOrders = this.activeOrders.get(symbol) || [];
      activeOrders.push(marketMakingOrder);
      this.activeOrders.set(symbol, activeOrders);
      
      this.metrics.ordersPlaced++;
      console.log(`📝 Placed ask order: ${price.toFixed(4)} x ${size.toFixed(4)}`);
      
    } catch (error) {
      console.error(`Failed to place ask order for ${symbol}:`, error);
    }
  }

  // ============================================================================
  // INVENTORY MANAGEMENT
  // ============================================================================

  private getInventoryStatus(symbol: string): InventoryStatus {
    const currentInventory = this.inventory.get(symbol) || 0;
    const targetInventory = this.config.inventoryTarget;
    const deviation = Math.abs(currentInventory - targetInventory) / this.config.maxInventory;
    
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (deviation > 0.8) riskLevel = 'CRITICAL';
    else if (deviation > 0.6) riskLevel = 'HIGH';
    else if (deviation > 0.3) riskLevel = 'MEDIUM';
    
    return {
      symbol,
      currentInventory,
      targetInventory,
      deviation,
      needsRebalancing: deviation > this.config.rebalanceThreshold,
      riskLevel,
    };
  }

  private async rebalanceInventory(symbol: string, inventoryStatus: InventoryStatus): Promise<void> {
    console.log(`⚖️ Rebalancing inventory for ${symbol}...`);
    
    const inventoryDifference = inventoryStatus.currentInventory - inventoryStatus.targetInventory;
    
    if (Math.abs(inventoryDifference) < 100) return; // Too small to rebalance
    
    try {
      // Place a market order to rebalance
      const orderRequest: OrderRequest = {
        symbol,
        side: inventoryDifference > 0 ? 'sell' : 'buy',
        type: 'market',
        size: Math.abs(inventoryDifference).toString(),
        reduceOnly: false,
      };

      await this.client.placeOrder(orderRequest);
      
      // Update inventory
      this.inventory.set(symbol, inventoryStatus.targetInventory);
      
      console.log(`✅ Rebalanced ${symbol}: ${inventoryDifference.toFixed(2)}`);
      this.emit('inventoryRebalanced', { symbol, amount: inventoryDifference });
      
    } catch (error) {
      console.error(`❌ Failed to rebalance inventory for ${symbol}:`, error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async initializeMarketData(): Promise<void> {
    console.log('📊 Initializing market data...');
    
    for (const symbol of this.config.symbols) {
      try {
        // Get current position to initialize inventory
        const position = await this.client.getPosition(symbol);
        if (position) {
          this.inventory.set(symbol, parseFloat(position.size));
        }
      } catch (error) {
        console.warn(`Could not get position for ${symbol}:`, error);
      }
    }
  }

  private async cancelAllOrders(): Promise<void> {
    console.log('❌ Cancelling all market making orders...');
    
    for (const [symbol, orders] of this.activeOrders) {
      for (const order of orders) {
        if (order.status === 'PLACED') {
          try {
            await this.client.cancelOrder(order.id);
            order.status = 'CANCELLED';
          } catch (error) {
            console.error(`Failed to cancel order ${order.id}:`, error);
          }
        }
      }
    }
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get isActive(): boolean {
    return this.isRunning;
  }

  get configuration(): MarketMakingConfig {
    return { ...this.config };
  }

  getMetrics(): MarketMakingMetrics {
    return { ...this.metrics };
  }

  getAllInventoryStatus(): InventoryStatus[] {
    return this.config.symbols.map(symbol => this.getInventoryStatus(symbol));
  }

  getActiveOrders(symbol?: string): MarketMakingOrder[] {
    if (symbol) {
      return this.activeOrders.get(symbol) || [];
    }
    return Array.from(this.activeOrders.values()).flat();
  }
}