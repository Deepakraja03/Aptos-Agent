"""
Tests for ML models and training infrastructure
"""

import asyncio
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from src.ml_models import PricePredictionModel, ModelManager, FeatureEngineer
from src.model_trainer import TrainingOrchestrator, TrainingConfig
from src.market_analysis import BinanceDataProvider


class MockDataProvider:
    """Mock data provider for testing"""
    
    async def get_price_data(self, symbol: str, interval: str, limit: int):
        """Generate mock price data"""
        from src.market_analysis import PriceData
        
        # Generate synthetic price data
        np.random.seed(42)  # For reproducible results
        
        prices = []
        base_price = 50000.0  # Starting price
        
        for i in range(limit):
            # Random walk with slight upward trend
            change = np.random.normal(0, 0.02)  # 2% volatility
            new_price = base_price * (1 + change)
            
            # Create realistic OHLC data
            high = new_price * (1 + abs(np.random.normal(0, 0.01)))
            low = new_price * (1 - abs(np.random.normal(0, 0.01)))
            volume = np.random.uniform(1000000, 10000000)
            
            prices.append(PriceData(
                timestamp=datetime.now() - timedelta(hours=limit-i),
                open=base_price,
                high=high,
                low=low,
                close=new_price,
                volume=volume
            ))
            
            base_price = new_price
        
        return prices


def create_test_dataframe():
    """Create test price DataFrame"""
    np.random.seed(42)
    dates = pd.date_range(start='2023-01-01', periods=100, freq='H')
    
    # Generate synthetic price data
    prices = []
    base_price = 50000.0
    
    for _ in range(100):
        change = np.random.normal(0, 0.02)
        new_price = base_price * (1 + change)
        
        high = new_price * (1 + abs(np.random.normal(0, 0.01)))
        low = new_price * (1 - abs(np.random.normal(0, 0.01)))
        volume = np.random.uniform(1000000, 10000000)
        
        prices.append({
            'open': base_price,
            'high': high,
            'low': low,
            'close': new_price,
            'volume': volume
        })
        
        base_price = new_price
    
    df = pd.DataFrame(prices, index=dates)
    return df


class TestFeatureEngineer:
    """Test feature engineering"""
    
    def test_create_features(self):
        """Test feature creation"""
        df = create_test_dataframe()
        fe = FeatureEngineer()
        
        features_df = fe.create_features(df)
        
        # Check that features were created
        expected_features = [
            'sma_5', 'sma_10', 'sma_20', 'ema_12', 'ema_26',
            'price_sma_ratio', 'ema_ratio', 'volatility',
            'volume_ratio', 'return_1', 'rsi', 'macd'
        ]
        
        for feature in expected_features:
            assert feature in features_df.columns
        
        # Check that features have reasonable values
        assert not features_df['sma_20'].isna().all()
        assert features_df['rsi'].max() <= 100
        assert features_df['rsi'].min() >= 0
    
    def test_select_features(self):
        """Test feature selection"""
        df = create_test_dataframe()
        fe = FeatureEngineer()
        
        features_df = fe.create_features(df)
        selected_features = fe.select_features(features_df)
        
        assert isinstance(selected_features, list)
        assert len(selected_features) > 10
        assert 'sma_20' in selected_features
        assert 'rsi' in selected_features
    
    def test_create_target(self):
        """Test target variable creation"""
        df = create_test_dataframe()
        fe = FeatureEngineer()
        
        target = fe.create_target(df, horizon=1)
        
        assert len(target) == len(df)
        assert target.dtype == int
        assert set(target.dropna().unique()) <= {0, 1}


class TestPricePredictionModel:
    """Test price prediction model"""
    
    def test_model_initialization(self):
        """Test model initialization"""
        model = PricePredictionModel("random_forest")
        
        assert model.model_type == "random_forest"
        assert not model.is_trained
        assert model.model is not None
    
    def test_model_training(self):
        """Test model training"""
        df = create_test_dataframe()
        model = PricePredictionModel("random_forest")
        
        performance = model.train(df)
        
        assert model.is_trained
        assert performance is not None
        assert performance.accuracy >= 0
        assert performance.accuracy <= 1
        assert performance.training_samples > 0
    
    def test_model_prediction(self):
        """Test model prediction"""
        df = create_test_dataframe()
        model = PricePredictionModel("random_forest")
        
        # Train model first
        model.train(df)
        
        # Make prediction
        prediction = model.predict(df)
        
        assert prediction is not None
        assert prediction.predicted_price > 0
        assert 0 <= prediction.confidence <= 1
        assert prediction.prediction_horizon > 0
    
    def test_model_save_load(self, tmp_path):
        """Test model save and load"""
        df = create_test_dataframe()
        model = PricePredictionModel("random_forest")
        
        # Train model
        model.train(df)
        
        # Save model
        model_path = tmp_path / "test_model.joblib"
        model.save_model(str(model_path))
        
        # Load model
        new_model = PricePredictionModel("random_forest")
        new_model.load_model(str(model_path))
        
        assert new_model.is_trained
        assert new_model.model_type == "random_forest"
        assert new_model.performance is not None


class TestModelManager:
    """Test model manager"""
    
    def test_model_manager_initialization(self, tmp_path):
        """Test model manager initialization"""
        manager = ModelManager(str(tmp_path))
        
        assert manager.models_dir == str(tmp_path)
        assert len(manager.models) == 0
    
    def test_train_model(self, tmp_path):
        """Test model training through manager"""
        manager = ModelManager(str(tmp_path))
        df = create_test_dataframe()
        
        performance = manager.train_model("BTCUSDT", "1h", df)
        
        assert performance is not None
        assert performance.accuracy >= 0
        assert "BTCUSDT_1h" in manager.models
    
    def test_get_model(self, tmp_path):
        """Test model retrieval"""
        manager = ModelManager(str(tmp_path))
        df = create_test_dataframe()
        
        # Train a model
        manager.train_model("BTCUSDT", "1h", df)
        
        # Retrieve model
        model = manager.get_model("BTCUSDT", "1h")
        
        assert model is not None
        assert model.is_trained
    
    def test_list_trained_models(self, tmp_path):
        """Test listing trained models"""
        manager = ModelManager(str(tmp_path))
        df = create_test_dataframe()
        
        # Train multiple models
        manager.train_model("BTCUSDT", "1h", df)
        manager.train_model("ETHUSDT", "4h", df)
        
        models_list = manager.list_trained_models()
        
        assert len(models_list) == 2
        symbols = [m['symbol'] for m in models_list]
        assert "BTCUSDT" in symbols
        assert "ETHUSDT" in symbols


class TestTrainingOrchestrator:
    """Test training orchestrator"""
    
    @pytest.mark.asyncio
    async def test_orchestrator_initialization(self):
        """Test orchestrator initialization"""
        data_provider = MockDataProvider()
        orchestrator = TrainingOrchestrator(data_provider)
        
        assert orchestrator.data_provider is not None
        assert orchestrator.model_manager is not None
        assert orchestrator.trainer is not None
    
    @pytest.mark.asyncio
    async def test_initialize_models(self):
        """Test model initialization"""
        data_provider = MockDataProvider()
        orchestrator = TrainingOrchestrator(data_provider)
        
        config = TrainingConfig(
            symbols=["BTCUSDT"],
            timeframes=["1h"],
            lookback_days=5,  # Short for testing
            min_samples=50,
            performance_threshold=0.0  # Low threshold for testing
        )
        
        jobs = await orchestrator.initialize_models(config)
        
        assert len(jobs) == 1
        assert jobs[0].symbol == "BTCUSDT"
        assert jobs[0].timeframe == "1h"
        
        # Stop the scheduler to avoid background tasks
        orchestrator.shutdown()
    
    @pytest.mark.asyncio
    async def test_get_prediction(self):
        """Test getting prediction from orchestrator"""
        data_provider = MockDataProvider()
        orchestrator = TrainingOrchestrator(data_provider)
        
        # Create test data
        df = create_test_dataframe()
        
        # Train model manually
        orchestrator.model_manager.train_model("BTCUSDT", "1h", df)
        
        # Get prediction
        prediction = await orchestrator.get_prediction("BTCUSDT", "1h", df)
        
        assert prediction is not None
        assert prediction.predicted_price > 0
        
        orchestrator.shutdown()


def test_integration_flow():
    """Test the complete ML integration flow"""
    
    # 1. Create test data
    df = create_test_dataframe()
    
    # 2. Initialize components
    model_manager = ModelManager()
    
    # 3. Train model
    performance = model_manager.train_model("BTCUSDT", "1h", df)
    assert performance.accuracy > 0
    
    # 4. Make prediction
    prediction = model_manager.predict("BTCUSDT", "1h", df)
    assert prediction is not None
    
    # 5. List models
    models = model_manager.list_trained_models()
    assert len(models) == 1


if __name__ == "__main__":
    # Run a simple test
    print("Running ML models integration test...")
    
    try:
        test_integration_flow()
        print("✅ Integration test passed!")
        
        # Test async components
        async def test_async():
            data_provider = MockDataProvider()
            orchestrator = TrainingOrchestrator(data_provider)
            
            config = TrainingConfig(
                symbols=["BTCUSDT"],
                timeframes=["1h"],
                lookback_days=3,
                min_samples=30,
                performance_threshold=0.0
            )
            
            jobs = await orchestrator.initialize_models(config)
            print(f"✅ Trained {len(jobs)} models")
            
            # Clean up
            orchestrator.shutdown()
        
        asyncio.run(test_async())
        print("✅ Async test passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        raise
