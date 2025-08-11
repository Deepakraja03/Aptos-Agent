"""
Unit tests for strategy execution framework
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock

from src.strategy_execution import (
    StrategyType, RiskLevel, StrategyParameters, MarketData, 
    TradeSignal, PerformanceMetrics, RiskManager, StrategyExecutor
)


class TestStrategyParameters:
    """Test StrategyParameters dataclass"""
    
    def test_strategy_parameters_creation(self):
        """Test creating strategy parameters"""
        params = StrategyParameters(
            strategy_type=StrategyType.FUNDING_RATE_ARBITRAGE,
            risk_level=RiskLevel.MODERATE,
            max_position_size=10000.0,
            stop_loss_pct=5.0,
            take_profit_pct=10.0,
            max_drawdown_pct=15.0,
            execution_frequency_seconds=3600,
            enabled_protocols=["binance", "kucoin"]
        )
        
        assert params.strategy_type == StrategyType.FUNDING_RATE_ARBITRAGE
        assert params.risk_level == RiskLevel.MODERATE
        assert params.max_position_size == 10000.0
        assert params.stop_loss_pct == 5.0
        assert params.take_profit_pct == 10.0
        assert params.max_drawdown_pct == 15.0
        assert params.execution_frequency_seconds == 3600
        assert params.enabled_protocols == ["binance", "kucoin"]


class TestMarketData:
    """Test MarketData dataclass"""
    
    def test_market_data_creation(self):
        """Test creating market data"""
        timestamp = datetime.now()
        market_data = MarketData(
            timestamp=timestamp,
            price=50000.0,
            volume=1000000.0,
            funding_rate=0.01,
            volatility=0.3,
            market_cap=1000000000.0
        )
        
        assert market_data.timestamp == timestamp
        assert market_data.price == 50000.0
        assert market_data.volume == 1000000.0
        assert market_data.funding_rate == 0.01
        assert market_data.volatility == 0.3
        assert market_data.market_cap == 1000000000.0


class TestTradeSignal:
    """Test TradeSignal dataclass"""
    
    def test_trade_signal_creation(self):
        """Test creating trade signal"""
        signal = TradeSignal(
            action="BUY",
            asset="BTCUSDT",
            amount=1000.0,
            price=50000.0,
            confidence=0.8,
            reasoning="Strong bullish momentum",
            risk_score=0.3
        )
        
        assert signal.action == "BUY"
        assert signal.asset == "BTCUSDT"
        assert signal.amount == 1000.0
        assert signal.price == 50000.0
        assert signal.confidence == 0.8
        assert signal.reasoning == "Strong bullish momentum"
        assert signal.risk_score == 0.3


class TestPerformanceMetrics:
    """Test PerformanceMetrics dataclass"""
    
    def test_performance_metrics_defaults(self):
        """Test performance metrics default values"""
        metrics = PerformanceMetrics()
        
        assert metrics.total_trades == 0
        assert metrics.successful_trades == 0
        assert metrics.total_pnl == 0.0
        assert metrics.win_rate == 0.0
        assert metrics.sharpe_ratio == 0.0
        assert metrics.max_drawdown == 0.0
        assert metrics.current_drawdown == 0.0
    
    def test_performance_metrics_custom_values(self):
        """Test performance metrics with custom values"""
        metrics = PerformanceMetrics(
            total_trades=100,
            successful_trades=70,
            total_pnl=5000.0,
            win_rate=0.7,
            sharpe_ratio=1.5,
            max_drawdown=0.1,
            current_drawdown=0.05
        )
        
        assert metrics.total_trades == 100
        assert metrics.successful_trades == 70
        assert metrics.total_pnl == 5000.0
        assert metrics.win_rate == 0.7
        assert metrics.sharpe_ratio == 1.5
        assert metrics.max_drawdown == 0.1
        assert metrics.current_drawdown == 0.05


class TestRiskManager:
    """Test RiskManager class"""
    
    def test_risk_manager_creation(self):
        """Test creating risk manager"""
        risk_manager = RiskManager(max_drawdown_pct=0.1)
        
        assert risk_manager.max_drawdown_pct == 0.1
        assert risk_manager.peak_balance == 0.0
        assert risk_manager.current_balance == 0.0
    
    def test_assess_risk_position_size_limit(self):
        """Test risk assessment with position size limit"""
        risk_manager = RiskManager()
        signal = TradeSignal(
            action="BUY",
            asset="BTCUSDT",
            amount=15000.0,  # Exceeds default limit
            price=50000.0,
            confidence=0.8,
            reasoning="Test",
            risk_score=0.3
        )
        
        result = risk_manager.assess_risk(signal, {})
        assert result is False
    
    def test_assess_risk_drawdown_limit(self):
        """Test risk assessment with drawdown limit"""
        risk_manager = RiskManager(max_drawdown_pct=0.1)
        risk_manager.peak_balance = 10000.0
        risk_manager.current_balance = 8800.0  # 12% drawdown
        
        signal = TradeSignal(
            action="BUY",
            asset="BTCUSDT",
            amount=1000.0,
            price=50000.0,
            confidence=0.8,
            reasoning="Test",
            risk_score=0.3
        )
        
        result = risk_manager.assess_risk(signal, {})
        assert result is False
    
    def test_assess_risk_high_risk_score(self):
        """Test risk assessment with high risk score"""
        risk_manager = RiskManager()
        signal = TradeSignal(
            action="BUY",
            asset="BTCUSDT",
            amount=1000.0,
            price=50000.0,
            confidence=0.8,
            reasoning="Test",
            risk_score=0.9  # High risk
        )
        
        result = risk_manager.assess_risk(signal, {})
        assert result is False
    
    def test_assess_risk_acceptable(self):
        """Test risk assessment with acceptable parameters"""
        risk_manager = RiskManager()
        signal = TradeSignal(
            action="BUY",
            asset="BTCUSDT",
            amount=1000.0,
            price=50000.0,
            confidence=0.8,
            reasoning="Test",
            risk_score=0.3
        )
        
        result = risk_manager.assess_risk(signal, {})
        assert result is True
    
    def test_update_balance(self):
        """Test balance update and drawdown calculation"""
        risk_manager = RiskManager()
        
        # Initial balance
        risk_manager.update_balance(10000.0)
        assert risk_manager.current_balance == 10000.0
        assert risk_manager.peak_balance == 10000.0
        assert risk_manager.current_drawdown == 0.0
        
        # Increase balance
        risk_manager.update_balance(12000.0)
        assert risk_manager.current_balance == 12000.0
        assert risk_manager.peak_balance == 12000.0
        assert risk_manager.current_drawdown == 0.0
        
        # Decrease balance (drawdown)
        risk_manager.update_balance(10800.0)
        assert risk_manager.current_balance == 10800.0
        assert risk_manager.peak_balance == 12000.0
        assert risk_manager.current_drawdown == 0.1  # 10% drawdown


class TestStrategyExecutor:
    """Test StrategyExecutor class"""
    
    @pytest.fixture
    def executor(self):
        """Create strategy executor for testing"""
        return StrategyExecutor()
    
    @pytest.fixture
    def mock_strategy(self):
        """Create mock strategy for testing"""
        strategy = Mock()
        strategy.run = AsyncMock()
        strategy.stop = Mock()
        return strategy
    
    @pytest.mark.asyncio
    async def test_add_strategy(self, executor, mock_strategy):
        """Test adding a strategy"""
        await executor.add_strategy("test_strategy", mock_strategy)
        
        assert "test_strategy" in executor.strategies
        assert executor.strategies["test_strategy"] == mock_strategy
        assert "test_strategy" in executor.tasks
    
    @pytest.mark.asyncio
    async def test_remove_strategy(self, executor, mock_strategy):
        """Test removing a strategy"""
        await executor.add_strategy("test_strategy", mock_strategy)
        await executor.remove_strategy("test_strategy")
        
        assert "test_strategy" not in executor.strategies
        assert "test_strategy" not in executor.tasks
        mock_strategy.stop.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_performance_existing(self, executor, mock_strategy):
        """Test getting performance for existing strategy"""
        mock_strategy.performance = PerformanceMetrics(total_trades=10)
        await executor.add_strategy("test_strategy", mock_strategy)
        
        performance = await executor.get_performance("test_strategy")
        assert performance.total_trades == 10
    
    @pytest.mark.asyncio
    async def test_get_performance_nonexistent(self, executor):
        """Test getting performance for non-existent strategy"""
        performance = await executor.get_performance("nonexistent")
        assert performance is None
    
    @pytest.mark.asyncio
    async def test_get_all_performance(self, executor, mock_strategy):
        """Test getting performance for all strategies"""
        mock_strategy.performance = PerformanceMetrics(total_trades=10)
        await executor.add_strategy("test_strategy", mock_strategy)
        
        performances = await executor.get_all_performance()
        assert "test_strategy" in performances
        assert performances["test_strategy"].total_trades == 10


class TestEnums:
    """Test enum classes"""
    
    def test_strategy_type_enum(self):
        """Test StrategyType enum values"""
        assert StrategyType.FUNDING_RATE_ARBITRAGE.value == "funding_rate_arbitrage"
        assert StrategyType.MARKET_MAKING.value == "market_making"
        assert StrategyType.COPY_TRADING.value == "copy_trading"
        assert StrategyType.PORTFOLIO_REBALANCING.value == "portfolio_rebalancing"
        assert StrategyType.YIELD_FARMING.value == "yield_farming"
    
    def test_risk_level_enum(self):
        """Test RiskLevel enum values"""
        assert RiskLevel.CONSERVATIVE.value == 1
        assert RiskLevel.MODERATE.value == 5
        assert RiskLevel.AGGRESSIVE.value == 10


if __name__ == "__main__":
    pytest.main([__file__])
