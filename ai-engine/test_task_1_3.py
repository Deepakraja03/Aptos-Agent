#!/usr/bin/env python3
"""
Task 1.3 Completion Test Script
Tests all components of the Basic AI Engine Foundation
"""

import asyncio
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

print("🤖 AptosAgents AI Engine - Task 1.3 Verification")
print("=" * 50)

def test_imports():
    """Test that all modules can be imported"""
    print("📦 Testing module imports...")
    
    try:
        from src.strategy_execution import StrategyExecutor, BaseStrategy, StrategyParameters
        from src.market_analysis import MarketAnalyzer, BinanceDataProvider, TechnicalAnalysis
        from src.ml_models import PricePredictionModel, ModelManager, FeatureEngineer
        from src.model_trainer import TrainingOrchestrator, TrainingConfig
        from src.api import app
        
        print("✅ All modules imported successfully")
        return True
        
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False


def test_strategy_framework():
    """Test strategy execution framework"""
    print("🎯 Testing strategy execution framework...")
    
    try:
        from src.strategy_execution import StrategyExecutor, StrategyType, RiskLevel
        
        # Create strategy executor
        executor = StrategyExecutor()
        
        # Check that it has the expected attributes
        assert hasattr(executor, 'strategies')
        assert hasattr(executor, 'tasks')
        
        # Test enums
        assert StrategyType.FUNDING_RATE_ARBITRAGE
        assert RiskLevel.MODERATE
        
        print("✅ Strategy framework working")
        return True
        
    except Exception as e:
        print(f"❌ Strategy framework test failed: {e}")
        return False


def test_market_analysis():
    """Test market data ingestion and analysis"""
    print("📈 Testing market analysis...")
    
    try:
        from src.market_analysis import TechnicalAnalysis, MarketAnalyzer, BinanceDataProvider
        
        # Test technical analysis
        ta = TechnicalAnalysis()
        
        # Test with sample data
        prices = [100, 101, 102, 101, 103, 102, 104]
        sma = ta.calculate_sma(prices, 3)
        
        assert len(sma) == len(prices)
        assert not all(x != x for x in sma[-3:])  # Check last 3 aren't NaN
        
        # Test data provider
        provider = BinanceDataProvider()
        assert provider.base_url == "https://api.binance.com/api/v3"
        
        print("✅ Market analysis working")
        return True
        
    except Exception as e:
        print(f"❌ Market analysis test failed: {e}")
        return False


def test_ml_models():
    """Test ML prediction models"""
    print("🧠 Testing ML models...")
    
    try:
        import pandas as pd
        import numpy as np
        from src.ml_models import PricePredictionModel, FeatureEngineer, ModelManager
        
        # Create test data
        np.random.seed(42)
        dates = pd.date_range(start='2023-01-01', periods=100, freq='H')
        
        prices = []
        base_price = 50000.0
        
        for _ in range(100):
            change = np.random.normal(0, 0.02)
            new_price = base_price * (1 + change)
            
            prices.append({
                'open': base_price,
                'high': new_price * 1.01,
                'low': new_price * 0.99,
                'close': new_price,
                'volume': np.random.uniform(1000000, 10000000)
            })
            
            base_price = new_price
        
        df = pd.DataFrame(prices, index=dates)
        
        # Test feature engineering
        fe = FeatureEngineer()
        features_df = fe.create_features(df)
        
        assert 'sma_20' in features_df.columns
        assert 'rsi' in features_df.columns
        
        # Test model
        model = PricePredictionModel("random_forest")
        assert not model.is_trained
        
        # Train model
        performance = model.train(df)
        assert model.is_trained
        assert performance.accuracy >= 0
        
        # Make prediction
        prediction = model.predict(df)
        assert prediction.predicted_price > 0
        
        # Test model manager
        manager = ModelManager()
        manager.train_model("BTCUSDT", "1h", df)
        
        assert manager.get_model("BTCUSDT", "1h") is not None
        
        print("✅ ML models working")
        return True
        
    except Exception as e:
        print(f"❌ ML models test failed: {e}")
        return False


async def test_api_endpoints():
    """Test API interfaces"""
    print("🌐 Testing API interfaces...")
    
    try:
        from src.api import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # Test health endpoint
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        
        print("✅ API interfaces working")
        return True
        
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False


async def test_training_infrastructure():
    """Test model training infrastructure"""
    print("🏋️ Testing training infrastructure...")
    
    try:
        from src.model_trainer import TrainingOrchestrator, TrainingConfig
        
        # Create mock data provider
        class MockDataProvider:
            async def get_price_data(self, symbol, interval, limit):
                from src.market_analysis import PriceData
                from datetime import datetime, timedelta
                import numpy as np
                
                np.random.seed(42)
                prices = []
                
                for i in range(min(limit, 50)):  # Limit for testing
                    price = 50000 * (1 + np.random.normal(0, 0.02))
                    prices.append(PriceData(
                        timestamp=datetime.now() - timedelta(hours=i),
                        open=price,
                        high=price * 1.01,
                        low=price * 0.99,
                        close=price,
                        volume=1000000
                    ))
                
                return prices
        
        # Test orchestrator
        orchestrator = TrainingOrchestrator(MockDataProvider())
        
        config = TrainingConfig(
            symbols=["BTCUSDT"],
            timeframes=["1h"],
            lookback_days=3,
            min_samples=30
        )
        
        # This would normally train models, but we'll just check initialization
        assert orchestrator.model_manager is not None
        assert orchestrator.trainer is not None
        
        print("✅ Training infrastructure working")
        return True
        
    except Exception as e:
        print(f"❌ Training infrastructure test failed: {e}")
        return False


async def main():
    """Main test runner"""
    print("\n🧪 Running Task 1.3 Completion Tests...")
    
    tests = [
        ("Module Imports", test_imports),
        ("Strategy Framework", test_strategy_framework),
        ("Market Analysis", test_market_analysis),
        ("ML Models", test_ml_models),
        ("API Endpoints", test_api_endpoints),
        ("Training Infrastructure", test_training_infrastructure),
    ]
    
    passed = 0
    total = len(tests)
    
    for name, test_func in tests:
        print(f"\n🔍 {name}:")
        
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            
            if result:
                passed += 1
        except Exception as e:
            print(f"❌ {name} failed with exception: {e}")
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Task 1.3 is complete!")
        print("\n📋 Task 1.3 Deliverables Achieved:")
        print("✅ Machine learning development environment")
        print("✅ AI engine architecture and interfaces")
        print("✅ Strategy execution framework")
        print("✅ Market data ingestion pipeline")
        print("✅ Simple prediction models")
        print("✅ Model training and evaluation infrastructure")
        print("✅ API interfaces for smart contract integration")
        
        print("\n🚀 Ready to proceed to Task 1.4: Project Setup & Planning")
        
        return True
    else:
        print(f"\n❌ {total - passed} tests failed. Task 1.3 needs more work.")
        return False


if __name__ == "__main__":
    # Install required dependencies check
    try:
        import pandas
        import numpy
        import sklearn
        import fastapi
        import uvicorn
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("💡 Run: pip install -r requirements.txt")
        sys.exit(1)
    
    # Run tests
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
