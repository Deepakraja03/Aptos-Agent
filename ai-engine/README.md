# AptosAgents AI Engine 🤖

**Advanced AI-powered autonomous DeFi agent management system for the Aptos blockchain.**

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.103+-green.svg)](https://fastapi.tiangolo.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3+-orange.svg)](https://scikit-learn.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Overview

The AptosAgents AI Engine is a sophisticated, production-ready framework for creating, training, and executing AI-powered trading strategies on the Aptos blockchain. It combines traditional technical analysis with modern machine learning techniques to provide autonomous DeFi agents capable of making intelligent trading decisions.

## ✨ Key Features

### 🧠 **Machine Learning & AI**
- **Price Prediction Models**: Random Forest and Gradient Boosting models for price forecasting
- **Feature Engineering**: Automated technical indicator generation and feature selection
- **Model Training Pipeline**: Automated training, evaluation, and retraining infrastructure
- **Performance Analytics**: Comprehensive model performance tracking and optimization

### 📈 **Market Analysis & Data**
- **Real-time Data Ingestion**: Multi-source market data collection (Binance, etc.)
- **Technical Indicators**: 15+ indicators including SMA, EMA, RSI, MACD, Bollinger Bands
- **Market Condition Classification**: AI-powered market regime detection
- **Data Pipeline**: Robust, scalable data processing and storage

### 🎯 **Strategy Framework**
- **Modular Architecture**: Extensible base classes for custom strategy development
- **Risk Management**: Advanced position sizing, stop-loss, and drawdown protection
- **Performance Tracking**: Real-time metrics and analytics
- **Multi-Strategy Support**: Run multiple strategies simultaneously

### 🌐 **API & Integration**
- **FastAPI Backend**: High-performance RESTful API with automatic documentation
- **Smart Contract Integration**: Seamless integration with Aptos Move contracts
- **Real-time Predictions**: ML model inference endpoints
- **Training Management**: Model training and deployment APIs

### 🔄 **Training Infrastructure**
- **Automated Training**: Scheduled model retraining and optimization
- **Model Management**: Version control, persistence, and deployment
- **Performance Monitoring**: Continuous model performance evaluation
- **Data Collection**: Automated historical data collection and preprocessing

### 🛡️ **Advanced Risk Management**
- **Dynamic Position Sizing**: Volatility and drawdown-based position limits
- **Stop-Loss & Take-Profit**: Automatic calculation and execution
- **Position Tracking**: Real-time PnL monitoring and position management
- **Drawdown Protection**: Maximum drawdown limits with automatic trade rejection
- **Multi-Position Management**: Prevents overexposure and manages position limits

## 🏗️ Architecture

```
ai-engine/
├── src/
│   ├── __init__.py
│   ├── strategy_execution.py    # Core strategy framework
│   ├── market_analysis.py       # Market data and technical analysis
│   ├── ml_models.py            # ML prediction models and feature engineering
│   ├── model_trainer.py        # Training infrastructure and orchestration
│   ├── api.py                  # FastAPI interfaces with ML endpoints
│   └── strategies/
│       ├── __init__.py
│       └── funding_rate_arbitrage.py  # Sample strategy
├── tests/
│   ├── test_strategy_execution.py
│   └── test_ml_models.py       # ML component tests
├── models/                     # Trained ML models storage
├── requirements.txt
├── test_task_1_3.py           # Integration verification test
└── README.md
```

### 🧩 Core Components

#### **Machine Learning Layer**
- **`ml_models.py`**: Price prediction models, feature engineering, model management
- **`model_trainer.py`**: Automated training pipeline, evaluation, and scheduling
- **Models Storage**: Persistent model storage with version control

#### **Strategy Layer**
- **`strategy_execution.py`**: Base strategy framework with risk management
- **`strategies/`**: Implementable strategy templates and examples

#### **Data Layer**
- **`market_analysis.py`**: Market data ingestion and technical analysis
- **Data Pipeline**: Real-time and historical data processing

#### **API Layer**
- **`api.py`**: RESTful API with agent management and ML endpoints
- **WebSocket Support**: Real-time data streaming (planned)

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

### 🧠 Machine Learning Models

#### Price Prediction

The engine includes sophisticated ML models for price prediction:

```python
from src.ml_models import PricePredictionModel, FeatureEngineer
import pandas as pd

# Create and train a model
model = PricePredictionModel("random_forest")
performance = model.train(price_data_df)

print(f"Model accuracy: {performance.accuracy:.3f}")
print(f"Training samples: {performance.training_samples}")

# Make predictions
prediction = model.predict(recent_price_data)
print(f"Predicted price: ${prediction.predicted_price:.2f}")
print(f"Confidence: {prediction.confidence:.2f}")
```

#### Feature Engineering

Automatic technical indicator generation:

```python
from src.ml_models import FeatureEngineer

fe = FeatureEngineer()

# Create features from price data
features_df = fe.create_features(price_data)

# Available features include:
# - Moving averages (SMA, EMA)
# - Momentum indicators (RSI, MACD)
# - Volatility measures
# - Price ratios and patterns
# - Time-based features

print(f"Generated {len(features_df.columns)} features")
```

#### Model Management

Manage multiple models across different assets and timeframes:

```python
from src.ml_models import ModelManager

manager = ModelManager()

# Train models for different assets
manager.train_model("BTCUSDT", "1h", btc_data)
manager.train_model("ETHUSDT", "4h", eth_data)

# Make predictions
btc_prediction = manager.predict("BTCUSDT", "1h", recent_btc_data)
eth_prediction = manager.predict("ETHUSDT", "4h", recent_eth_data)

# List all trained models
models = manager.list_trained_models()
for model_info in models:
    print(f"Model: {model_info['symbol']} {model_info['timeframe']}")
    print(f"Accuracy: {model_info['accuracy']:.3f}")
```

### 🏋️ Training Infrastructure

#### Automated Training

Set up automated model training and retraining:

```python
from src.model_trainer import TrainingOrchestrator, TrainingConfig

# Configure training
config = TrainingConfig(
    symbols=["BTCUSDT", "ETHUSDT", "ADAUSDT"],
    timeframes=["1h", "4h", "1d"],
    lookback_days=30,
    retrain_frequency_hours=24,
    performance_threshold=0.55
)

# Initialize training system
orchestrator = TrainingOrchestrator()

# Start automated training
jobs = await orchestrator.initialize_models(config)

# Monitor training progress
status = orchestrator.get_system_status()
print(f"Total models: {status['total_models']}")
print(f"Training active: {status['training_status']['is_training']}")
```

#### Model Evaluation

Continuous model performance monitoring:

```python
# Get model evaluations
evaluations = await orchestrator.evaluator.evaluate_all_models()

for eval_result in evaluations:
    print(f"Model: {eval_result['symbol']} {eval_result['timeframe']}")
    print(f"Recent accuracy: {eval_result['accuracy']:.3f}")
    print(f"Performing well: {eval_result['is_performing_well']}")
```

### 🌐 ML API Endpoints

#### Price Prediction API

```bash
# Get AI price prediction
curl -X POST "http://localhost:8000/ml/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "prediction_horizon": 1
  }'
```

Response:
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "predicted_price": 52750.25,
  "confidence": 0.78,
  "current_price": 52100.00,
  "prediction_horizon": 1,
  "feature_importance": {
    "rsi": 0.23,
    "macd": 0.19,
    "sma_20": 0.15
  },
  "timestamp": "2025-01-12T10:30:00Z"
}
```

#### Model Training API

```bash
# Train models for specific symbols
curl -X POST "http://localhost:8000/ml/train" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["BTCUSDT", "ETHUSDT"],
    "timeframes": ["1h", "4h"],
    "lookback_days": 30
  }'
```

#### List Trained Models

```bash
# Get all trained models
curl "http://localhost:8000/ml/models"
```

#### Training Status

```bash
# Get training system status
curl "http://localhost:8000/ml/status"
```

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
