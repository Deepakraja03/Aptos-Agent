"""
Model Training and Evaluation Infrastructure
"""

import asyncio
import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import schedule
import threading
import time

from .ml_models import ModelManager, PredictionResult, ModelPerformance
from .market_analysis import BinanceDataProvider, MarketAnalyzer

logger = logging.getLogger(__name__)


@dataclass
class TrainingConfig:
    """Configuration for model training"""
    symbols: List[str]
    timeframes: List[str]  # e.g., ["1h", "4h", "1d"]
    lookback_days: int = 30
    retrain_frequency_hours: int = 24
    min_samples: int = 100
    performance_threshold: float = 0.55  # Minimum accuracy to keep model


@dataclass
class TrainingJob:
    """Training job details"""
    symbol: str
    timeframe: str
    status: str  # "pending", "running", "completed", "failed"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    performance: Optional[ModelPerformance] = None
    error_message: Optional[str] = None


class DataCollector:
    """Collect and prepare training data"""
    
    def __init__(self, data_provider):
        self.data_provider = data_provider
        
    async def collect_training_data(self, 
                                  symbol: str, 
                                  timeframe: str, 
                                  lookback_days: int) -> pd.DataFrame:
        """Collect historical price data for training"""
        try:
            # Calculate required number of candles
            timeframe_minutes = self._timeframe_to_minutes(timeframe)
            total_minutes = lookback_days * 24 * 60
            limit = min(1000, total_minutes // timeframe_minutes)  # Binance API limit
            
            logger.info(f"Collecting {limit} {timeframe} candles for {symbol}")
            
            # Get price data
            price_data = await self.data_provider.get_price_data(symbol, timeframe, limit)
            
            if not price_data:
                raise ValueError(f"No data received for {symbol} {timeframe}")
            
            # Convert to DataFrame
            df = pd.DataFrame([
                {
                    'timestamp': p.timestamp,
                    'open': p.open,
                    'high': p.high,
                    'low': p.low,
                    'close': p.close,
                    'volume': p.volume
                }
                for p in price_data
            ])
            
            # Set timestamp as index
            df.set_index('timestamp', inplace=True)
            df.sort_index(inplace=True)
            
            logger.info(f"Collected {len(df)} samples for {symbol} {timeframe}")
            
            return df
            
        except Exception as e:
            logger.error(f"Error collecting data for {symbol} {timeframe}: {e}")
            raise
    
    def _timeframe_to_minutes(self, timeframe: str) -> int:
        """Convert timeframe string to minutes"""
        if timeframe.endswith('m'):
            return int(timeframe[:-1])
        elif timeframe.endswith('h'):
            return int(timeframe[:-1]) * 60
        elif timeframe.endswith('d'):
            return int(timeframe[:-1]) * 60 * 24
        else:
            raise ValueError(f"Unsupported timeframe: {timeframe}")


class ModelTrainer:
    """Train and manage ML models"""
    
    def __init__(self, model_manager: ModelManager, data_collector: DataCollector):
        self.model_manager = model_manager
        self.data_collector = data_collector
        self.training_jobs: List[TrainingJob] = []
        self.is_training = False
        
    async def train_model(self, symbol: str, timeframe: str, config: TrainingConfig) -> TrainingJob:
        """Train a single model"""
        job = TrainingJob(
            symbol=symbol,
            timeframe=timeframe,
            status="pending",
            started_at=datetime.now()
        )
        
        self.training_jobs.append(job)
        
        try:
            job.status = "running"
            logger.info(f"Starting training for {symbol} {timeframe}")
            
            # Collect training data
            price_data = await self.data_collector.collect_training_data(
                symbol, timeframe, config.lookback_days
            )
            
            if len(price_data) < config.min_samples:
                raise ValueError(f"Insufficient data: {len(price_data)} < {config.min_samples}")
            
            # Train model
            performance = self.model_manager.train_model(symbol, timeframe, price_data)
            
            # Check performance threshold
            if performance.accuracy < config.performance_threshold:
                logger.warning(f"Model performance below threshold: {performance.accuracy:.3f} < {config.performance_threshold}")
            
            job.performance = performance
            job.status = "completed"
            job.completed_at = datetime.now()
            
            logger.info(f"Training completed for {symbol} {timeframe}: Accuracy={performance.accuracy:.3f}")
            
        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now()
            logger.error(f"Training failed for {symbol} {timeframe}: {e}")
        
        return job
    
    async def batch_train(self, config: TrainingConfig) -> List[TrainingJob]:
        """Train multiple models in batch"""
        if self.is_training:
            logger.warning("Training already in progress")
            return []
        
        self.is_training = True
        jobs = []
        
        try:
            logger.info(f"Starting batch training for {len(config.symbols)} symbols, {len(config.timeframes)} timeframes")
            
            for symbol in config.symbols:
                for timeframe in config.timeframes:
                    job = await self.train_model(symbol, timeframe, config)
                    jobs.append(job)
                    
                    # Brief pause between training jobs
                    await asyncio.sleep(1)
            
            logger.info(f"Batch training completed. {len(jobs)} jobs processed.")
            
        finally:
            self.is_training = False
        
        return jobs
    
    def get_training_status(self) -> Dict[str, Any]:
        """Get current training status"""
        total_jobs = len(self.training_jobs)
        completed_jobs = len([j for j in self.training_jobs if j.status == "completed"])
        failed_jobs = len([j for j in self.training_jobs if j.status == "failed"])
        running_jobs = len([j for j in self.training_jobs if j.status == "running"])
        
        return {
            "is_training": self.is_training,
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs,
            "failed_jobs": failed_jobs,
            "running_jobs": running_jobs,
            "success_rate": completed_jobs / max(1, total_jobs - running_jobs),
            "recent_jobs": self.training_jobs[-10:]  # Last 10 jobs
        }


class ModelEvaluator:
    """Evaluate model performance and quality"""
    
    def __init__(self, model_manager: ModelManager, data_collector: DataCollector):
        self.model_manager = model_manager
        self.data_collector = data_collector
    
    async def evaluate_model(self, symbol: str, timeframe: str) -> Optional[Dict[str, Any]]:
        """Evaluate a trained model"""
        model = self.model_manager.get_model(symbol, timeframe)
        if not model:
            logger.warning(f"No model found for {symbol} {timeframe}")
            return None
        
        try:
            # Get recent data for evaluation
            recent_data = await self.data_collector.collect_training_data(symbol, timeframe, 7)  # 7 days
            
            if len(recent_data) < 20:
                logger.warning(f"Insufficient recent data for evaluation: {len(recent_data)}")
                return None
            
            # Make predictions on recent data
            predictions = []
            actual_movements = []
            
            for i in range(10, len(recent_data) - 1):  # Leave room for features and target
                # Use data up to point i for prediction
                train_data = recent_data.iloc[:i+1]
                prediction = model.predict(train_data)
                
                # Get actual movement
                current_price = recent_data.iloc[i]['close']
                future_price = recent_data.iloc[i+1]['close']
                actual_movement = 1 if future_price > current_price else 0
                
                predictions.append(1 if prediction.predicted_price > current_price else 0)
                actual_movements.append(actual_movement)
            
            if not predictions:
                return None
            
            # Calculate metrics
            accuracy = np.mean(np.array(predictions) == np.array(actual_movements))
            total_predictions = len(predictions)
            
            evaluation = {
                "symbol": symbol,
                "timeframe": timeframe,
                "accuracy": accuracy,
                "total_predictions": total_predictions,
                "model_performance": model.performance.__dict__ if model.performance else None,
                "evaluated_at": datetime.now(),
                "is_performing_well": accuracy > 0.5
            }
            
            logger.info(f"Model evaluation for {symbol} {timeframe}: Accuracy={accuracy:.3f}")
            
            return evaluation
            
        except Exception as e:
            logger.error(f"Error evaluating model for {symbol} {timeframe}: {e}")
            return None
    
    async def evaluate_all_models(self) -> List[Dict[str, Any]]:
        """Evaluate all trained models"""
        model_list = self.model_manager.list_trained_models()
        evaluations = []
        
        for model_info in model_list:
            evaluation = await self.evaluate_model(model_info['symbol'], model_info['timeframe'])
            if evaluation:
                evaluations.append(evaluation)
        
        logger.info(f"Evaluated {len(evaluations)} models")
        return evaluations


class TrainingScheduler:
    """Schedule automatic model retraining"""
    
    def __init__(self, trainer: ModelTrainer, evaluator: ModelEvaluator):
        self.trainer = trainer
        self.evaluator = evaluator
        self.scheduler_thread = None
        self.is_running = False
        self.training_config = None
    
    def start_scheduler(self, config: TrainingConfig):
        """Start the training scheduler"""
        if self.is_running:
            logger.warning("Scheduler already running")
            return
        
        self.training_config = config
        self.is_running = True
        
        # Schedule retraining
        schedule.every(config.retrain_frequency_hours).hours.do(self._scheduled_training)
        
        # Start scheduler thread
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        logger.info(f"Training scheduler started. Retraining every {config.retrain_frequency_hours} hours")
    
    def stop_scheduler(self):
        """Stop the training scheduler"""
        if not self.is_running:
            return
        
        self.is_running = False
        schedule.clear()
        
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        
        logger.info("Training scheduler stopped")
    
    def _run_scheduler(self):
        """Run the scheduler in a separate thread"""
        while self.is_running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
    
    def _scheduled_training(self):
        """Execute scheduled training"""
        if not self.training_config:
            logger.error("No training configuration set")
            return
        
        logger.info("Starting scheduled model retraining")
        
        # Run training in background
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Evaluate current models first
            evaluations = loop.run_until_complete(self.evaluator.evaluate_all_models())
            
            # Identify models that need retraining
            models_to_retrain = []
            for eval_result in evaluations:
                if not eval_result.get('is_performing_well', False):
                    models_to_retrain.append((eval_result['symbol'], eval_result['timeframe']))
            
            logger.info(f"Identified {len(models_to_retrain)} models for retraining")
            
            # Retrain underperforming models
            for symbol, timeframe in models_to_retrain:
                loop.run_until_complete(self.trainer.train_model(symbol, timeframe, self.training_config))
            
            logger.info("Scheduled retraining completed")
            
        except Exception as e:
            logger.error(f"Error in scheduled training: {e}")
        finally:
            loop.close()


class TrainingOrchestrator:
    """Main orchestrator for ML model training and evaluation"""
    
    def __init__(self, data_provider=None):
        self.data_provider = data_provider or BinanceDataProvider()
        self.model_manager = ModelManager()
        self.data_collector = DataCollector(self.data_provider)
        self.trainer = ModelTrainer(self.model_manager, self.data_collector)
        self.evaluator = ModelEvaluator(self.model_manager, self.data_collector)
        self.scheduler = TrainingScheduler(self.trainer, self.evaluator)
    
    async def initialize_models(self, config: TrainingConfig) -> List[TrainingJob]:
        """Initialize models for the first time"""
        logger.info("Initializing ML models for the first time")
        
        jobs = await self.trainer.batch_train(config)
        
        # Start automatic retraining scheduler
        self.scheduler.start_scheduler(config)
        
        return jobs
    
    async def get_prediction(self, symbol: str, timeframe: str, price_data: pd.DataFrame) -> Optional[PredictionResult]:
        """Get prediction from trained model"""
        return self.model_manager.predict(symbol, timeframe, price_data)
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status"""
        training_status = self.trainer.get_training_status()
        models_list = self.model_manager.list_trained_models()
        
        return {
            "training_status": training_status,
            "total_models": len(models_list),
            "models": models_list,
            "scheduler_running": self.scheduler.is_running,
            "last_updated": datetime.now()
        }
    
    def shutdown(self):
        """Shutdown the training system"""
        logger.info("Shutting down training orchestrator")
        self.scheduler.stop_scheduler()


# Example usage and testing
async def main():
    """Example usage of the training system"""
    # Initialize orchestrator
    orchestrator = TrainingOrchestrator()
    
    # Configuration for training
    config = TrainingConfig(
        symbols=["BTCUSDT", "ETHUSDT"],
        timeframes=["1h", "4h"],
        lookback_days=30,
        retrain_frequency_hours=24,
        min_samples=100,
        performance_threshold=0.55
    )
    
    try:
        # Initialize models
        logger.info("Starting model initialization")
        jobs = await orchestrator.initialize_models(config)
        
        # Print results
        for job in jobs:
            print(f"{job.symbol} {job.timeframe}: {job.status}")
            if job.performance:
                print(f"  Accuracy: {job.performance.accuracy:.3f}")
        
        # Get system status
        status = orchestrator.get_system_status()
        print(f"\nSystem Status:")
        print(f"Total Models: {status['total_models']}")
        print(f"Training Status: {status['training_status']['is_training']}")
        
        # Keep running for a bit to test scheduler
        print("Training system running. Press Ctrl+C to stop.")
        await asyncio.sleep(60)
        
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        orchestrator.shutdown()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
