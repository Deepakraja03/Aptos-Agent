/**
 * Kana Perps Service
 * 
 * Main service class for managing Kana Labs integration
 * Orchestrates all Kana Perps agents and operations
 */

import { EventEmitter } from 'events';
import { KanaLabsClient } from '../integrations/kana-perps/kana-client';
import { FundingRateArbitrageAgent } from '../integrations/kana-perps/agents/funding-rate-arbitrage';

export interface KanaPerpsServiceConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  apiKey?: string;
  secretKey?: string;
  passphrase?: string;
  autoStart?: boolean;
  agents?: {
    fundingRateArbitrage?: {
      enabled: boolean;
      config?: any;
    };
  };
}

export class KanaPerpsService extends EventEmitter {
  private client: KanaLabsClient;
  private config: KanaPerpsServiceConfig;
  private fundingRateAgent?: FundingRateArbitrageAgent;
  private isRunning = false;

  constructor(config: KanaPerpsServiceConfig) {
    super();

    this.config = {
      autoStart: true,
      agents: {
        fundingRateArbitrage: {
          enabled: true,
        },
      },
      ...config,
    };

    // Initialize Kana client
    this.client = new KanaLabsClient({
      network: this.config.network,
      apiKey: this.config.apiKey,
      secretKey: this.config.secretKey,
      passphrase: this.config.passphrase,
    });

    this.setupEventHandlers();
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Kana Perps Service is already running');
      return;
    }

    console.log('🚀 Starting Kana Perps Service...');

    try {
      // Authenticate if credentials are provided
      if (this.config.apiKey && this.config.secretKey) {
        await this.client.authenticate();
        console.log('✅ Kana Labs authentication successful');
      } else {
        console.log('⚠️ No API credentials - running in public mode only');
      }

      // Initialize agents
      await this.initializeAgents();

      // Start agents if auto-start is enabled
      if (this.config.autoStart) {
        await this.startAgents();
      }

      this.isRunning = true;
      this.emit('started');

      console.log('✅ Kana Perps Service started successfully');
    } catch (error) {
      console.error('❌ Failed to start Kana Perps Service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Kana Perps Service...');

    try {
      // Stop all agents
      await this.stopAgents();

      // Disconnect client
      this.client.disconnect();

      this.isRunning = false;
      this.emit('stopped');

      console.log('✅ Kana Perps Service stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping Kana Perps Service:', error);
      throw error;
    }
  }

  // ============================================================================
  // AGENT MANAGEMENT
  // ============================================================================

  async initializeAgents(): Promise<void> {
    console.log('🤖 Initializing agents...');

    // Initialize Funding Rate Arbitrage Agent
    if (this.config.agents?.fundingRateArbitrage?.enabled) {
      this.fundingRateAgent = new FundingRateArbitrageAgent(
        this.client,
        this.config.agents.fundingRateArbitrage.config
      );

      // Set up agent event handlers
      this.setupAgentEventHandlers(this.fundingRateAgent);

      console.log('✅ Funding Rate Arbitrage Agent initialized');
    }

    console.log('✅ All agents initialized');
  }

  async startAgents(): Promise<void> {
    console.log('🚀 Starting agents...');

    if (this.fundingRateAgent) {
      await this.fundingRateAgent.start();
      console.log('✅ Funding Rate Arbitrage Agent started');
    }

    console.log('✅ All agents started');
  }

  async stopAgents(): Promise<void> {
    console.log('🛑 Stopping agents...');

    if (this.fundingRateAgent) {
      await this.fundingRateAgent.stop();
      console.log('✅ Funding Rate Arbitrage Agent stopped');
    }

    console.log('✅ All agents stopped');
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get isActive(): boolean {
    return this.isRunning;
  }

  get kanaClient(): KanaLabsClient {
    return this.client;
  }

  get fundingRateArbitrageAgent(): FundingRateArbitrageAgent | undefined {
    return this.fundingRateAgent;
  }

  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      network: this.config.network,
      authenticated: this.client.authenticated,
      agents: {
        fundingRateArbitrage: {
          enabled: !!this.fundingRateAgent,
          active: this.fundingRateAgent?.isActive || false,
          performance: this.fundingRateAgent?.getPerformance(),
        },
      },
      lastUpdate: Date.now(),
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private setupEventHandlers(): void {
    this.client.on('wsOpen', () => {
      console.log('📡 Kana WebSocket connected');
      this.emit('websocketConnected');
    });

    this.client.on('wsClose', () => {
      console.log('📡 Kana WebSocket disconnected');
      this.emit('websocketDisconnected');
    });

    this.client.on('wsError', (error) => {
      console.error('📡 Kana WebSocket error:', error);
      this.emit('websocketError', error);
    });
  }

  private setupAgentEventHandlers(agent: FundingRateArbitrageAgent): void {
    agent.on('started', () => {
      console.log('🤖 Funding Rate Arbitrage Agent started');
      this.emit('agentStarted', { type: 'funding-rate-arbitrage' });
    });

    agent.on('stopped', () => {
      console.log('🤖 Funding Rate Arbitrage Agent stopped');
      this.emit('agentStopped', { type: 'funding-rate-arbitrage' });
    });

    agent.on('opportunityDetected', (opportunity) => {
      console.log(`🎯 Opportunity detected: ${opportunity.symbol} - $${opportunity.expectedProfit.toFixed(2)}`);
      this.emit('opportunityDetected', opportunity);
    });

    agent.on('executionCompleted', (execution) => {
      console.log(`✅ Execution completed: ${execution.symbol} - ${execution.action}`);
      this.emit('executionCompleted', execution);
    });

    agent.on('scanCompleted', (data) => {
      console.log(`🔍 Scan completed: ${data.opportunities.length} opportunities found`);
      this.emit('scanCompleted', data);
    });

    agent.on('error', (error) => {
      console.error('❌ Agent error:', error);
      this.emit('agentError', { type: 'funding-rate-arbitrage', error });
    });
  }
}