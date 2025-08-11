# AptosAgents AI Engine 🤖

AI-powered autonomous DeFi agent management system for the Aptos blockchain.

## Overview

The AptosAgents AI Engine provides a comprehensive framework for creating, managing, and executing AI-powered trading strategies. It includes market analysis, risk management, strategy execution, and API interfaces for smart contract integration.

## Features

- **Strategy Execution Framework**: Base classes and utilities for implementing trading strategies
- **Market Analysis**: Real-time market data ingestion and technical analysis
- **Risk Management**: Position sizing, stop-loss, and drawdown protection
- **API Interfaces**: FastAPI endpoints for agent management and smart contract integration
- **Performance Tracking**: Comprehensive metrics and analytics
- **Modular Architecture**: Extensible design for adding new strategies

## Architecture

```
ai-engine/
├── src/
│   ├── __init__.py
│   ├── strategy_execution.py    # Core strategy framework
│   ├── market_analysis.py       # Market data and technical analysis
│   ├── api.py                   # FastAPI interfaces
│   └── strategies/
│       ├── __init__.py
│       └── funding_rate_arbitrage.py  # Sample strategy
├── tests/
│   └── test_strategy_execution.py
├── requirements.txt
└── README.md
```

## Installation

1. **Clone the repository**:
   ```bash
   cd ai-engine
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Running the API Server

Start the FastAPI server:

```bash
cd src
python api.py
```

The API will be available at `http://localhost:8000`

### API Endpoints

#### Create Agent
```bash
curl -X POST "http://localhost:8000/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy_type": "funding_rate_arbitrage",
    "risk_level": "moderate",
    "max_position_size": 10000.0,
    "stop_loss_pct": 5.0,
    "take_profit_pct": 10.0,
    "max_drawdown_pct": 15.0,
    "execution_frequency_seconds": 3600,
    "enabled_protocols": ["binance"],
    "owner_address": "0x123..."
  }'
```

#### Get Agent Information
```bash
curl "http://localhost:8000/agents/{agent_id}"
```

#### Get Market Data
```bash
curl "http://localhost:8000/market-data/BTCUSDT"
```

#### Health Check
```bash
curl "http://localhost:8000/health"
```

### Strategy Development

#### Creating a New Strategy

1. **Create strategy class**:
   ```python
   from src.strategy_execution import BaseStrategy, StrategyParameters, TradeSignal, MarketData
   
   class MyStrategy(BaseStrategy):
       def __init__(self, params: StrategyParameters):
           super().__init__(params)
       
       async def analyze_market(self, market_data: MarketData) -> TradeSignal:
           # Implement your market analysis logic
           # Return TradeSignal with action, asset, amount, etc.
           pass
       
       async def execute_signal(self, signal: TradeSignal) -> bool:
           # Implement your trade execution logic
           # Return True if successful, False otherwise
           pass
   ```

2. **Register strategy**:
   ```python
   from src.strategy_execution import StrategyExecutor, StrategyType, RiskLevel
   
   executor = StrategyExecutor()
   params = StrategyParameters(
       strategy_type=StrategyType.CUSTOM,
       risk_level=RiskLevel.MODERATE,
       max_position_size=10000.0,
       # ... other parameters
   )
   
   strategy = MyStrategy(params)
   await executor.add_strategy("my_strategy", strategy)
   ```

### Market Analysis

#### Technical Indicators

The engine provides comprehensive technical analysis:

```python
from src.market_analysis import MarketAnalyzer, BinanceDataProvider

# Initialize market analyzer
data_provider = BinanceDataProvider()
analyzer = MarketAnalyzer(data_provider)

# Get technical indicators
indicators = await analyzer.get_technical_indicators("BTCUSDT", "1h")

# Classify market condition
condition = analyzer.classify_market_condition(indicators)
print(f"Market condition: {condition.value}")
```

Available indicators:
- Simple Moving Averages (SMA)
- Exponential Moving Averages (EMA)
- Relative Strength Index (RSI)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- Average True Range (ATR)
- Volatility

### Risk Management

The engine includes built-in risk management:

```python
from src.strategy_execution import RiskManager, TradeSignal

risk_manager = RiskManager(max_drawdown_pct=0.1)

signal = TradeSignal(
    action="BUY",
    asset="BTCUSDT",
    amount=1000.0,
    price=50000.0,
    confidence=0.8,
    reasoning="Strong bullish momentum",
    risk_score=0.3
)

# Assess risk
is_acceptable = risk_manager.assess_risk(signal, {})
if is_acceptable:
    # Execute trade
    pass
```

## Testing

Run the test suite:

```bash
pytest tests/
```

Run specific tests:

```bash
pytest tests/test_strategy_execution.py -v
```

## Configuration

### Environment Variables

Create a `.env` file in the `ai-engine` directory:

```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost/aptosagents

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Exchange API Keys (optional)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# Logging
LOG_LEVEL=INFO
```

### Strategy Parameters

Each strategy can be configured with:

- **Risk Level**: Conservative, Moderate, Aggressive
- **Position Limits**: Maximum position size and drawdown
- **Execution Frequency**: How often to analyze and trade
- **Protocol Selection**: Which DeFi protocols to use
- **Stop Loss/Take Profit**: Risk management parameters

## Performance Metrics

The engine tracks comprehensive performance metrics:

- Total trades and success rate
- Profit and loss tracking
- Sharpe ratio calculation
- Maximum and current drawdown
- Risk-adjusted returns

## Integration with Smart Contracts

The AI engine integrates with Aptos smart contracts through:

1. **Event Listening**: Monitor smart contract events for agent actions
2. **Transaction Execution**: Execute trades through smart contract calls
3. **Performance Updates**: Update on-chain performance metrics
4. **Permission Management**: Respect agent permissions and limits

## Development

### Code Style

The project uses:
- **Black** for code formatting
- **Flake8** for linting
- **MyPy** for type checking

Run formatting:
```bash
black src/ tests/
```

Run linting:
```bash
flake8 src/ tests/
```

Run type checking:
```bash
mypy src/
```

### Adding New Features

1. **Market Data Providers**: Implement `MarketDataProvider` interface
2. **Trading Strategies**: Extend `BaseStrategy` class
3. **Risk Models**: Extend `RiskManager` class
4. **API Endpoints**: Add new FastAPI routes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation

## Roadmap

- [ ] Additional trading strategies
- [ ] Machine learning model integration
- [ ] Advanced risk management
- [ ] Multi-chain support
- [ ] Real-time monitoring dashboard
- [ ] Backtesting framework
- [ ] Paper trading mode
