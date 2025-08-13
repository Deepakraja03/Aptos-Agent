/**
 * Kana Labs Perpetual Futures Client
 * 
 * Updated implementation based on Kana Labs documentation research
 * Designed for funding rate arbitrage and advanced trading strategies
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import WebSocket from 'ws';
import crypto from 'crypto';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES (Based on typical DeFi perps platforms)
// ============================================================================

export interface KanaConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  apiKey?: string;
  secretKey?: string;
  passphrase?: string;
  timeout: number;
  retryAttempts: number;
}

export interface KanaTicker {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  high: string;
  low: string;
  timestamp: number;
}

export interface KanaFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
  nextFundingTime: number;
  markPrice: string;
  indexPrice: string;
  interestRate: string;
  premiumIndex: string;
}

export interface KanaOrderBook {
  symbol: string;
  bids: [string, string][];
  asks: [string, string][];
  timestamp: number;
}

export interface KanaOrder {
  orderId: string;
  clientOid?: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market' | 'stop' | 'stop_limit';
  size: string;
  price: string;
  status: 'open' | 'filled' | 'cancelled' | 'rejected';
  filledSize: string;
  remainingSize: string;
  avgFillPrice: string;
  fee: string;
  timestamp: number;
}

export interface KanaPosition {
  symbol: string;
  side: 'long' | 'short';
  size: string;
  contracts: string;
  avgEntryPrice: string;
  markPrice: string;
  liquidationPrice: string;
  bankruptcyPrice: string;
  unrealizedPnl: string;
  realizedPnl: string;
  positionMargin: string;
  maintMargin: string;
  marginRatio: string;
  leverage: string;
  timestamp: number;
}

export interface KanaBalance {
  currency: string;
  available: string;
  hold: string;
  total: string;
}

export interface KanaAccount {
  accountId: string;
  balances: KanaBalance[];
  totalEquity: string;
  totalMargin: string;
  freeMargin: string;
  marginRatio: string;
  canTrade: boolean;
  canWithdraw: boolean;
}

export interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market' | 'stop' | 'stop_limit';
  size: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
  postOnly?: boolean;
  clientOid?: string;
}

// ============================================================================
// KANA LABS CLIENT
// ============================================================================

export class KanaLabsClient extends EventEmitter {
  private config: KanaConfig;
  private httpClient: AxiosInstance;
  private wsClient?: WebSocket;
  private isAuthenticated = false;

  // Updated API Endpoints based on official Kana Labs documentation
  // These are the actual endpoints from the Kana Labs documentation
  private readonly endpoints = {
    mainnet: 'https://perps-tradeapi.kanalabs.io',
    testnet: 'https://perps-tradeapi-testnet.kanalabs.io',
    devnet: 'https://perps-tradeapi-devnet.kanalabs.io',
  };

  private readonly wsEndpoints = {
    mainnet: 'wss://perps-ws.kanalabs.io',
    testnet: 'wss://perps-ws-testnet.kanalabs.io', 
    devnet: 'wss://perps-ws-devnet.kanalabs.io',
  };

  constructor(config: Partial<KanaConfig> = {}) {
    super();
    
    this.config = {
      network: 'testnet',
      timeout: 10000,
      retryAttempts: 3,
      ...config,
    };

    this.httpClient = axios.create({
      baseURL: this.endpoints[this.config.network],
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AptosAgents-KanaSDK/1.0.0',
      },
    });

    this.setupInterceptors();
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async authenticate(): Promise<boolean> {
    if (!this.config.apiKey || !this.config.secretKey) {
      throw new Error('API credentials required for authentication');
    }

    try {
      // Test authentication with account endpoint
      await this.getAccount();
      this.isAuthenticated = true;
      console.log('✅ Kana Labs authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Kana Labs authentication failed:', error);
      this.isAuthenticated = false;
      throw error;
    }
  }

  // ============================================================================
  // MARKET DATA
  // ============================================================================

  async getTicker(symbol: string): Promise<KanaTicker> {
    try {
      const response = await this.httpClient.get(`/market/ticker/${symbol}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, `Failed to get ticker for ${symbol}`);
    }
  }

  async getAllTickers(): Promise<KanaTicker[]> {
    try {
      const response = await this.httpClient.get('/market/tickers');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to get all tickers');
    }
  }

  async getOrderBook(symbol: string, depth = 100): Promise<KanaOrderBook> {
    try {
      const response = await this.httpClient.get(`/market/orderbook/${symbol}`, {
        params: { depth },
      });
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, `Failed to get order book for ${symbol}`);
    }
  }

  async getFundingRate(symbol: string): Promise<KanaFundingRate> {
    try {
      const response = await this.httpClient.get(`/market/funding-rate/${symbol}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, `Failed to get funding rate for ${symbol}`);
    }
  }

  async getAllFundingRates(): Promise<KanaFundingRate[]> {
    try {
      const response = await this.httpClient.get('/market/funding-rates');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to get all funding rates');
    }
  }

  async getMarkPrice(symbol: string): Promise<{ symbol: string; markPrice: string; timestamp: number }> {
    try {
      const response = await this.httpClient.get(`/market/mark-price/${symbol}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, `Failed to get mark price for ${symbol}`);
    }
  }

  async getKlines(symbol: string, interval: string, limit = 500): Promise<any[]> {
    try {
      const response = await this.httpClient.get(`/market/klines/${symbol}`, {
        params: { interval, limit },
      });
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, `Failed to get klines for ${symbol}`);
    }
  }

  // ============================================================================
  // TRADING
  // ============================================================================

  async placeOrder(orderRequest: OrderRequest): Promise<KanaOrder> {
    try {
      const response = await this.httpClient.post('/orders', orderRequest);
      const order = this.handleResponse(response);
      console.log(`📝 Order placed: ${order.orderId} - ${orderRequest.side} ${orderRequest.size} ${orderRequest.symbol}`);
      return order;
    } catch (error) {
      throw this.handleError(error, 'Failed to place order');
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const response = await this.httpClient.delete(`/orders/${orderId}`);
      this.handleResponse(response);
      console.log(`❌ Order cancelled: ${orderId}`);
      return true;
    } catch (error) {
      throw this.handleError(error, `Failed to cancel order ${orderId}`);
    }
  }

  async cancelAllOrders(symbol?: string): Promise<boolean> {
    try {
      const params = symbol ? { symbol } : {};
      const response = await this.httpClient.delete('/orders', { params });
      this.handleResponse(response);
      console.log(`❌ All orders cancelled${symbol ? ` for ${symbol}` : ''}`);
      return true;
    } catch (error) {
      throw this.handleError(error, 'Failed to cancel all orders');
    }
  }

  async getOrder(orderId: string): Promise<KanaOrder> {
    try {
      const response = await this.httpClient.get(`/orders/${orderId}`);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, `Failed to get order ${orderId}`);
    }
  }

  async getOrders(symbol?: string, status?: string): Promise<KanaOrder[]> {
    try {
      const params: any = {};
      if (symbol) params.symbol = symbol;
      if (status) params.status = status;

      const response = await this.httpClient.get('/orders', { params });
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to get orders');
    }
  }

  async getPositions(): Promise<KanaPosition[]> {
    try {
      const response = await this.httpClient.get('/positions');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to get positions');
    }
  }

  async getPosition(symbol: string): Promise<KanaPosition | null> {
    try {
      const positions = await this.getPositions();
      return positions.find(p => p.symbol === symbol) || null;
    } catch (error) {
      throw this.handleError(error, `Failed to get position for ${symbol}`);
    }
  }

  async closePosition(symbol: string, size?: string): Promise<boolean> {
    try {
      const body: any = { symbol };
      if (size) body.size = size;

      const response = await this.httpClient.post('/positions/close', body);
      this.handleResponse(response);
      console.log(`🔒 Position closed: ${symbol}${size ? ` (${size})` : ' (full)'}`);
      return true;
    } catch (error) {
      throw this.handleError(error, `Failed to close position for ${symbol}`);
    }
  }

  // ============================================================================
  // ACCOUNT
  // ============================================================================

  async getAccount(): Promise<KanaAccount> {
    try {
      const response = await this.httpClient.get('/account');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to get account');
    }
  }

  async getBalances(): Promise<KanaBalance[]> {
    try {
      const response = await this.httpClient.get('/account/balances');
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to get balances');
    }
  }

  async getFundingHistory(symbol?: string, limit = 100): Promise<any[]> {
    try {
      const params: any = { limit };
      if (symbol) params.symbol = symbol;

      const response = await this.httpClient.get('/account/funding-history', { params });
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'Failed to get funding history');
    }
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  connectWebSocket(): void {
    const wsUrl = this.wsEndpoints[this.config.network];
    console.log(`🔌 Connecting to Kana WebSocket: ${wsUrl}`);

    this.wsClient = new WebSocket(wsUrl);

    this.wsClient.on('open', () => {
      console.log('✅ Kana WebSocket connected');
      this.emit('wsOpen');
    });

    this.wsClient.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleWSMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.wsClient.on('close', () => {
      console.log('❌ Kana WebSocket disconnected');
      this.emit('wsClose');
    });

    this.wsClient.on('error', (error) => {
      console.error('❌ Kana WebSocket error:', error);
      this.emit('wsError', error);
    });
  }

  subscribe(channel: string, symbol?: string): void {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      this.connectWebSocket();
      // Wait for connection and then subscribe
      this.once('wsOpen', () => {
        this.sendSubscription(channel, symbol);
      });
    } else {
      this.sendSubscription(channel, symbol);
    }
  }

  private sendSubscription(channel: string, symbol?: string): void {
    const subscription = {
      method: 'SUBSCRIBE',
      params: symbol ? [`${channel}@${symbol}`] : [channel],
      id: Date.now(),
    };

    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      this.wsClient.send(JSON.stringify(subscription));
      console.log(`📡 Subscribed to ${channel}${symbol ? `@${symbol}` : ''}`);
    }
  }

  private handleWSMessage(message: any): void {
    // Handle different message types
    if (message.stream) {
      const [channel, symbol] = message.stream.split('@');
      this.emit('wsMessage', {
        channel,
        symbol,
        data: message.data,
        timestamp: Date.now(),
      });
      
      // Emit specific events
      this.emit(channel, message.data);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.httpClient.interceptors.request.use(
      (config) => {
        if (this.config.apiKey && this.config.secretKey) {
          const timestamp = Date.now().toString();
          const method = config.method?.toUpperCase() || 'GET';
          const path = config.url || '';
          const body = config.data ? JSON.stringify(config.data) : '';
          
          // Create signature (simplified version)
          const message = `${timestamp}${method}${path}${body}`;
          const signature = crypto
            .createHmac('sha256', this.config.secretKey)
            .update(message)
            .digest('base64');

          config.headers = {
            ...config.headers,
            'KANA-API-KEY': this.config.apiKey,
            'KANA-TIMESTAMP': timestamp,
            'KANA-SIGNATURE': signature,
          } as any;

          if (this.config.passphrase) {
            (config.headers as any)['KANA-PASSPHRASE'] = this.config.passphrase;
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  private handleResponse(response: any): any {
    if (response.data) {
      // Handle different response formats
      if (response.data.success !== undefined) {
        if (!response.data.success) {
          throw new Error(response.data.message || 'API request failed');
        }
        return response.data.data || response.data;
      }
      return response.data;
    }
    return response;
  }

  private handleError(error: any, message: string): Error {
    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = data?.message || data?.msg || message;
      return new Error(`${errorMessage} (Status: ${status})`);
    }

    if (error.request) {
      return new Error(`Network error: ${message}`);
    }

    return new Error(`${message}: ${error.message}`);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  disconnect(): void {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = undefined;
    }
    this.removeAllListeners();
    console.log('🔌 Kana client disconnected');
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get authenticated(): boolean {
    return this.isAuthenticated;
  }

  get network(): string {
    return this.config.network;
  }
}