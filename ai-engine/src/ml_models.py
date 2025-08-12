"""
Machine Learning Models - Price prediction and strategy optimization models
"""

import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    """Result from price prediction model"""
    predicted_price: float
    confidence: float
    prediction_horizon: int  # minutes
    feature_importance: Dict[str, float]
    timestamp: datetime


@dataclass 
class ModelPerformance:
    """Model performance metrics"""
    mse: float
    rmse: float
    mae: float
    r2_score: float
    accuracy: float  # Directional accuracy
    training_samples: int
    last_updated: datetime


class FeatureEngineer:
    """Feature engineering for time series data"""
    
    @staticmethod
    def create_features(price_data: pd.DataFrame) -> pd.DataFrame:
        """Create technical and statistical features from price data"""
        df = price_data.copy()
        
        # Technical indicators
        df['sma_5'] = df['close'].rolling(window=5).mean()
        df['sma_10'] = df['close'].rolling(window=10).mean()
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['ema_12'] = df['close'].ewm(span=12).mean()
        df['ema_26'] = df['close'].ewm(span=26).mean()
        
        # Price ratios
        df['price_sma_ratio'] = df['close'] / df['sma_20']
        df['ema_ratio'] = df['ema_12'] / df['ema_26']
        
        # Volatility features
        df['volatility'] = df['close'].pct_change().rolling(window=20).std()
        df['high_low_ratio'] = df['high'] / df['low']
        
        # Volume features
        df['volume_sma'] = df['volume'].rolling(window=10).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        
        # Price momentum
        df['return_1'] = df['close'].pct_change(1)
        df['return_5'] = df['close'].pct_change(5)
        df['return_10'] = df['close'].pct_change(10)
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # MACD
        df['macd'] = df['ema_12'] - df['ema_26']
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # Time-based features
        df['hour'] = pd.to_datetime(df.index).hour
        df['day_of_week'] = pd.to_datetime(df.index).dayofweek
        
        return df
    
    @staticmethod
    def create_target(price_data: pd.DataFrame, horizon: int = 1) -> pd.Series:
        """Create target variable (future price movement)"""
        # Predict price change direction (up/down)
        future_price = price_data['close'].shift(-horizon)
        target = (future_price > price_data['close']).astype(int)
        return target
    
    @staticmethod
    def select_features(df: pd.DataFrame) -> List[str]:
        """Select relevant features for modeling"""
        feature_cols = [
            'sma_5', 'sma_10', 'sma_20', 'ema_12', 'ema_26',
            'price_sma_ratio', 'ema_ratio', 'volatility', 'high_low_ratio',
            'volume_ratio', 'return_1', 'return_5', 'return_10',
            'rsi', 'macd', 'macd_signal', 'macd_histogram',
            'bb_position', 'hour', 'day_of_week'
        ]
        
        # Filter out columns that don't exist
        available_features = [col for col in feature_cols if col in df.columns]
        return available_features


class PricePredictionModel:
    """Machine learning model for price prediction"""
    
    def __init__(self, model_type: str = "random_forest"):
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.feature_engineer = FeatureEngineer()
        self.performance = None
        self.feature_importance = {}
        self.is_trained = False
        
        # Initialize model
        if model_type == "random_forest":
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
        elif model_type == "gradient_boosting":
            self.model = GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                random_state=42
            )
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
    
    def train(self, price_data: pd.DataFrame, prediction_horizon: int = 1) -> ModelPerformance:
        """Train the prediction model"""
        logger.info(f"Training {self.model_type} model with {len(price_data)} samples")
        
        # Feature engineering
        df = self.feature_engineer.create_features(price_data)
        target = self.feature_engineer.create_target(price_data, prediction_horizon)
        
        # Select features
        feature_cols = self.feature_engineer.select_features(df)
        X = df[feature_cols].copy()
        y = target.copy()
        
        # Remove NaN values
        mask = ~(X.isna().any(axis=1) | y.isna())
        X = X[mask]
        y = y[mask]
        
        if len(X) < 50:
            raise ValueError("Insufficient data for training (need at least 50 samples)")
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Time series split for validation
        tscv = TimeSeriesSplit(n_splits=3)
        mse_scores = []
        r2_scores = []
        
        for train_idx, val_idx in tscv.split(X_scaled):
            X_train, X_val = X_scaled[train_idx], X_scaled[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
            
            # Train model
            self.model.fit(X_train, y_train)
            
            # Validate
            y_pred = self.model.predict(X_val)
            mse_scores.append(mean_squared_error(y_val, y_pred))
            r2_scores.append(r2_score(y_val, y_pred))
        
        # Final training on all data
        self.model.fit(X_scaled, y)
        
        # Calculate feature importance
        if hasattr(self.model, 'feature_importances_'):
            self.feature_importance = dict(zip(feature_cols, self.model.feature_importances_))
        
        # Calculate performance metrics
        y_pred_train = self.model.predict(X_scaled)
        mse = mean_squared_error(y, y_pred_train)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y, y_pred_train)
        r2 = r2_score(y, y_pred_train)
        
        # Directional accuracy
        direction_pred = (y_pred_train > 0.5).astype(int)
        accuracy = (direction_pred == y).mean()
        
        self.performance = ModelPerformance(
            mse=mse,
            rmse=rmse,
            mae=mae,
            r2_score=r2,
            accuracy=accuracy,
            training_samples=len(X),
            last_updated=datetime.now()
        )
        
        self.is_trained = True
        logger.info(f"Model training complete. Accuracy: {accuracy:.3f}, R2: {r2:.3f}")
        
        return self.performance
    
    def predict(self, price_data: pd.DataFrame, prediction_horizon: int = 1) -> PredictionResult:
        """Make price prediction"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Feature engineering
        df = self.feature_engineer.create_features(price_data)
        feature_cols = self.feature_engineer.select_features(df)
        
        # Get latest features
        X = df[feature_cols].iloc[-1:].copy()
        
        # Handle NaN values
        if X.isna().any().any():
            logger.warning("NaN values in features, using forward fill")
            X = X.fillna(method='ffill').fillna(0)
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Make prediction
        prediction = self.model.predict(X_scaled)[0]
        
        # Calculate confidence based on recent performance
        confidence = min(0.95, max(0.1, self.performance.accuracy)) if self.performance else 0.5
        
        # Get current price for prediction
        current_price = price_data['close'].iloc[-1]
        predicted_price = current_price * (1 + prediction * 0.01)  # Convert to price
        
        return PredictionResult(
            predicted_price=predicted_price,
            confidence=confidence,
            prediction_horizon=prediction_horizon,
            feature_importance=self.feature_importance.copy(),
            timestamp=datetime.now()
        )
    
    def save_model(self, filepath: str):
        """Save trained model to disk"""
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'performance': self.performance,
            'feature_importance': self.feature_importance,
            'model_type': self.model_type
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model from disk"""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        model_data = joblib.load(filepath)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.performance = model_data['performance']
        self.feature_importance = model_data['feature_importance']
        self.model_type = model_data['model_type']
        self.is_trained = True
        
        logger.info(f"Model loaded from {filepath}")


class StrategyOptimizer:
    """Optimize strategy parameters using machine learning"""
    
    def __init__(self):
        self.optimization_history = []
    
    def optimize_parameters(self, 
                          historical_data: pd.DataFrame,
                          parameter_bounds: Dict[str, Tuple[float, float]],
                          n_iterations: int = 50) -> Dict[str, float]:
        """Optimize strategy parameters using Bayesian optimization"""
        # TODO: Implement Bayesian optimization
        # For now, return default parameters
        logger.info("Parameter optimization not yet implemented, returning defaults")
        
        defaults = {}
        for param, (min_val, max_val) in parameter_bounds.items():
            defaults[param] = (min_val + max_val) / 2
        
        return defaults
    
    def backtest_parameters(self, 
                          parameters: Dict[str, float],
                          historical_data: pd.DataFrame) -> float:
        """Backtest strategy with given parameters"""
        # TODO: Implement backtesting
        # For now, return random performance
        return np.random.uniform(0.1, 0.8)


class ModelManager:
    """Manage multiple ML models for different assets and timeframes"""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.models: Dict[str, PricePredictionModel] = {}
        self.ensure_models_dir()
    
    def ensure_models_dir(self):
        """Create models directory if it doesn't exist"""
        os.makedirs(self.models_dir, exist_ok=True)
    
    def get_model_key(self, symbol: str, timeframe: str) -> str:
        """Generate unique key for model"""
        return f"{symbol}_{timeframe}"
    
    def get_model_path(self, symbol: str, timeframe: str) -> str:
        """Get file path for model"""
        key = self.get_model_key(symbol, timeframe)
        return os.path.join(self.models_dir, f"{key}_model.joblib")
    
    def train_model(self, symbol: str, timeframe: str, price_data: pd.DataFrame) -> ModelPerformance:
        """Train model for specific symbol and timeframe"""
        key = self.get_model_key(symbol, timeframe)
        
        # Create new model
        model = PricePredictionModel(model_type="random_forest")
        
        # Train model
        performance = model.train(price_data)
        
        # Save model
        model_path = self.get_model_path(symbol, timeframe)
        model.save_model(model_path)
        
        # Store in memory
        self.models[key] = model
        
        logger.info(f"Trained model for {symbol} {timeframe}: Accuracy={performance.accuracy:.3f}")
        
        return performance
    
    def get_model(self, symbol: str, timeframe: str) -> Optional[PricePredictionModel]:
        """Get trained model for symbol and timeframe"""
        key = self.get_model_key(symbol, timeframe)
        
        # Check if model is in memory
        if key in self.models:
            return self.models[key]
        
        # Try to load from disk
        model_path = self.get_model_path(symbol, timeframe)
        if os.path.exists(model_path):
            model = PricePredictionModel()
            model.load_model(model_path)
            self.models[key] = model
            return model
        
        return None
    
    def predict(self, symbol: str, timeframe: str, price_data: pd.DataFrame) -> Optional[PredictionResult]:
        """Make prediction using trained model"""
        model = self.get_model(symbol, timeframe)
        if model is None:
            logger.warning(f"No trained model found for {symbol} {timeframe}")
            return None
        
        return model.predict(price_data)
    
    def update_model(self, symbol: str, timeframe: str, new_data: pd.DataFrame):
        """Update existing model with new data"""
        # TODO: Implement incremental learning
        # For now, retrain the entire model
        self.train_model(symbol, timeframe, new_data)
    
    def list_trained_models(self) -> List[Dict[str, Any]]:
        """List all trained models with their performance"""
        models_info = []
        
        for key, model in self.models.items():
            symbol, timeframe = key.split('_')
            if model.performance:
                models_info.append({
                    'symbol': symbol,
                    'timeframe': timeframe,
                    'accuracy': model.performance.accuracy,
                    'r2_score': model.performance.r2_score,
                    'training_samples': model.performance.training_samples,
                    'last_updated': model.performance.last_updated
                })
        
        return models_info
