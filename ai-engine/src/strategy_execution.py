"""
Strategy Execution Engine - Core framework for executing AI-powered trading strategies
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

import numpy as np
import pandas as pd
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class StrategyType(Enum):
    """Supported strategy types"""
    FUNDING_RATE_ARBITRAGE = "funding_rate_arbitrage"
    MARKET_MAKING = "market_making"
    COPY_TRADING = "copy_trading"
    PORTFOLIO_REBALANCING = "portfolio_rebalancing"
    YIELD_FARMING = "yield_farming"


class RiskLevel(Enum):
    """Risk tolerance levels"""
    CONSERVATIVE = 1
    MODERATE = 5
    AGGRESSIVE = 10


@dataclass
class StrategyParameters:
    """Configuration parameters for strategy execution"""
    strategy_type: StrategyType
    risk_level: RiskLevel
    max_position_size: float
    stop_loss_pct: float
    take_profit_pct: float
    max_drawdown_pct: float
    execution_frequency_seconds: int
    enabled_protocols: List[str]


@dataclass
class MarketData:
    """Market data structure"""
    timestamp: datetime
    price: float
    volume: float
    funding_rate: Optional[float] = None
    volatility: Optional[float] = None
    market_cap: Optional[float] = None


@dataclass
class TradeSignal:
    """Trading signal from strategy"""
    action: str  # "BUY", "SELL", "HOLD"
    asset: str
    amount: float
    price: float
    confidence: float
    reasoning: str
    risk_score: float
    stop_loss_price: Optional[float] = None
    take_profit_price: Optional[float] = None


@dataclass
class Position:
    """Open position tracking"""
    asset: str
    side: str  # "LONG" or "SHORT"
    entry_price: float
    amount: float
    stop_loss_price: Optional[float] = None
    take_profit_price: Optional[float] = None
    entry_time: datetime = None
    unrealized_pnl: float = 0.0

    def __post_init__(self):
        if self.entry_time is None:
            self.entry_time = datetime.now()


@dataclass
class PerformanceMetrics:
    """Strategy performance tracking"""
    total_trades: int = 0
    successful_trades: int = 0
    total_pnl: float = 0.0
    win_rate: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    current_drawdown: float = 0.0
    open_positions: int = 0
    total_volume: float = 0.0


class RiskManager:
    """Risk management system"""
    
    def __init__(self, max_drawdown_pct: float = 0.1):
        self.max_drawdown_pct = max_drawdown_pct
        self.peak_balance = 0.0
        self.current_balance = 0.0
        self.current_drawdown = 0.0
    
    def assess_risk(self, signal: TradeSignal, current_positions: Dict) -> bool:
        """Assess if trade signal meets risk criteria"""
        # Check position size limits
        if signal.amount > self._calculate_position_limit(signal.asset):
            logger.warning(f"Position size {signal.amount} exceeds limit for {signal.asset}")
            return False
        
        # Check drawdown limits
        if self.current_drawdown > self.max_drawdown_pct:
            logger.warning(f"Current drawdown {self.current_drawdown:.2%} exceeds limit {self.max_drawdown_pct:.2%}")
            return False
        
        # Check risk score
        if signal.risk_score > 0.8:  # High risk threshold
            logger.warning(f"Risk score {signal.risk_score} too high")
            return False
        
        # Check if we already have a position in this asset (avoid overexposure)
        if signal.asset in current_positions and signal.action in ["BUY", "SELL"]:
            existing_position = current_positions[signal.asset]
            # Allow closing positions but prevent opening new ones in same direction
            signal_side = "LONG" if signal.action == "BUY" else "SHORT"
            if existing_position.side == signal_side:
                logger.warning(f"Already have {signal_side} position in {signal.asset}")
                return False
        
        # Check maximum number of open positions
        max_positions = 10  # Configurable limit
        if len(current_positions) >= max_positions and signal.action in ["BUY", "SELL"]:
            logger.warning(f"Maximum positions ({max_positions}) reached")
            return False
        
        return True
    
    def _calculate_position_limit(self, asset: str) -> float:
        """Calculate maximum position size for asset based on volatility and risk"""
        # Base position size (could be from strategy parameters)
        base_position = 10000.0
        
        # Get asset volatility (simplified - in production would fetch from market data)
        volatility = self._get_asset_volatility(asset)
        
        # Adjust position size based on volatility (higher volatility = smaller position)
        volatility_adjustment = max(0.1, 1.0 - (volatility * 2))  # Cap at 10% of base
        
        # Adjust based on current drawdown (reduce position size as drawdown increases)
        drawdown_adjustment = max(0.5, 1.0 - (self.current_drawdown * 2))
        
        # Calculate final position limit
        position_limit = base_position * volatility_adjustment * drawdown_adjustment
        
        logger.debug(f"Position limit for {asset}: {position_limit:.2f} "
                    f"(volatility: {volatility:.3f}, drawdown: {self.current_drawdown:.3f})")
        
        return position_limit
    
    def _get_asset_volatility(self, asset: str) -> float:
        """Get asset volatility (simplified implementation)"""
        # In production, this would fetch real volatility data
        # For now, return estimated volatility based on asset type
        volatility_map = {
            "BTC": 0.15,    # 15% volatility
            "ETH": 0.20,    # 20% volatility  
            "APT": 0.25,    # 25% volatility
            "USDT": 0.01,   # 1% volatility (stablecoin)
            "USDC": 0.01,   # 1% volatility (stablecoin)
        }
        
        # Extract base asset from trading pair
        for base_asset in volatility_map:
            if base_asset in asset.upper():
                return volatility_map[base_asset]
        
        # Default volatility for unknown assets
        return 0.30
    
    def update_balance(self, new_balance: float):
        """Update balance tracking for drawdown calculation"""
        self.current_balance = new_balance
        if new_balance > self.peak_balance:
            self.peak_balance = new_balance
        
        if self.peak_balance > 0:
            self.current_drawdown = (self.peak_balance - new_balance) / self.peak_balance


class BaseStrategy(ABC):
    """Abstract base class for all trading strategies"""
    
    def __init__(self, params: StrategyParameters):
        self.params = params
        self.risk_manager = RiskManager(params.max_drawdown_pct)
        self.performance = PerformanceMetrics()
        self.positions: Dict[str, Position] = {}  # asset -> position
        self.is_running = False
    
    @abstractmethod
    async def analyze_market(self, market_data: MarketData) -> TradeSignal:
        """Analyze market data and generate trading signal"""
        pass
    
    @abstractmethod
    async def execute_signal(self, signal: TradeSignal) -> bool:
        """Execute trading signal"""
        pass
    
    async def run(self):
        """Main strategy execution loop"""
        self.is_running = True
        logger.info(f"Starting strategy: {self.params.strategy_type.value}")
        
        while self.is_running:
            try:
                # Get market data
                market_data = await self._get_market_data()
                
                # Check stop-loss and take-profit for existing positions
                await self._check_position_exits(market_data)
                
                # Generate new signal
                signal = await self.analyze_market(market_data)
                
                # Risk assessment
                if self.risk_manager.assess_risk(signal, self.positions):
                    # Execute signal
                    success = await self.execute_signal(signal)
                    self._update_performance(success, signal)
                else:
                    logger.info("Signal rejected by risk manager")
                
                # Update position PnL
                self._update_position_pnl(market_data)
                
                # Wait for next execution
                await asyncio.sleep(self.params.execution_frequency_seconds)
                
            except Exception as e:
                logger.error(f"Error in strategy execution: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def _get_market_data(self) -> MarketData:
        """Get current market data"""
        # TODO: Implement market data fetching
        return MarketData(
            timestamp=datetime.now(),
            price=100.0,
            volume=1000000.0
        )
    
    def _update_performance(self, success: bool, signal: TradeSignal):
        """Update performance metrics"""
        if success:
            # If this is an opening trade (BUY/SELL), create position
            if signal.action in ["BUY", "SELL"] and signal.asset not in self.positions:
                self._open_position(signal)
            
            # Update win rate calculation only happens when positions are closed
            if self.performance.total_trades > 0:
                self.performance.win_rate = (
                    self.performance.successful_trades / self.performance.total_trades
                )
    
    async def _check_position_exits(self, market_data: MarketData):
        """Check if any positions should be closed due to stop-loss or take-profit"""
        positions_to_close = []
        
        for asset, position in self.positions.items():
            current_price = market_data.price  # In production, get price for specific asset
            
            should_close = False
            close_reason = ""
            
            if position.side == "LONG":
                # Check stop-loss for long position
                if position.stop_loss_price and current_price <= position.stop_loss_price:
                    should_close = True
                    close_reason = "stop-loss"
                # Check take-profit for long position
                elif position.take_profit_price and current_price >= position.take_profit_price:
                    should_close = True
                    close_reason = "take-profit"
                    
            elif position.side == "SHORT":
                # Check stop-loss for short position
                if position.stop_loss_price and current_price >= position.stop_loss_price:
                    should_close = True
                    close_reason = "stop-loss"
                # Check take-profit for short position
                elif position.take_profit_price and current_price <= position.take_profit_price:
                    should_close = True
                    close_reason = "take-profit"
            
            if should_close:
                positions_to_close.append((asset, position, close_reason))
        
        # Close positions that hit stop-loss or take-profit
        for asset, position, reason in positions_to_close:
            await self._close_position(asset, position, reason)
    
    async def _close_position(self, asset: str, position: Position, reason: str):
        """Close a position"""
        logger.info(f"Closing {position.side} position in {asset} due to {reason}")
        
        # Create close signal
        close_signal = TradeSignal(
            action="SELL" if position.side == "LONG" else "BUY",
            asset=asset,
            amount=position.amount,
            price=0.0,  # Market price
            confidence=1.0,
            reasoning=f"Position close: {reason}",
            risk_score=0.0
        )
        
        # Execute close
        success = await self.execute_signal(close_signal)
        
        if success:
            # Calculate PnL
            current_price = await self._get_current_price(asset)
            if position.side == "LONG":
                pnl = (current_price - position.entry_price) * position.amount
            else:
                pnl = (position.entry_price - current_price) * position.amount
            
            # Update performance
            self.performance.total_pnl += pnl
            self.performance.total_trades += 1
            if pnl > 0:
                self.performance.successful_trades += 1
            
            # Remove position
            del self.positions[asset]
            self.performance.open_positions = len(self.positions)
            
            logger.info(f"Position closed. PnL: {pnl:.2f}")
    
    def _update_position_pnl(self, market_data: MarketData):
        """Update unrealized PnL for open positions"""
        for asset, position in self.positions.items():
            current_price = market_data.price  # In production, get price for specific asset
            
            if position.side == "LONG":
                position.unrealized_pnl = (current_price - position.entry_price) * position.amount
            else:
                position.unrealized_pnl = (position.entry_price - current_price) * position.amount
    
    def _calculate_stop_loss_price(self, entry_price: float, side: str) -> float:
        """Calculate stop-loss price based on strategy parameters"""
        stop_loss_pct = self.params.stop_loss_pct / 100.0
        
        if side == "LONG":
            return entry_price * (1 - stop_loss_pct)
        else:  # SHORT
            return entry_price * (1 + stop_loss_pct)
    
    def _calculate_take_profit_price(self, entry_price: float, side: str) -> float:
        """Calculate take-profit price based on strategy parameters"""
        take_profit_pct = self.params.take_profit_pct / 100.0
        
        if side == "LONG":
            return entry_price * (1 + take_profit_pct)
        else:  # SHORT
            return entry_price * (1 - take_profit_pct)
    
    async def _get_current_price(self, asset: str) -> float:
        """Get current market price for asset"""
        # In production, this would fetch real price data
        # For now, return a mock price
        return 100.0
    
    def _open_position(self, signal: TradeSignal):
        """Open a new position based on signal"""
        side = "LONG" if signal.action == "BUY" else "SHORT"
        
        # Calculate stop-loss and take-profit if not provided
        stop_loss_price = signal.stop_loss_price
        if not stop_loss_price and self.params.stop_loss_pct > 0:
            stop_loss_price = self._calculate_stop_loss_price(signal.price, side)
        
        take_profit_price = signal.take_profit_price
        if not take_profit_price and self.params.take_profit_pct > 0:
            take_profit_price = self._calculate_take_profit_price(signal.price, side)
        
        # Create position
        position = Position(
            asset=signal.asset,
            side=side,
            entry_price=signal.price,
            amount=signal.amount,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price
        )
        
        # Store position
        self.positions[signal.asset] = position
        self.performance.open_positions = len(self.positions)
        self.performance.total_volume += signal.amount * signal.price
        
        logger.info(f"Opened {side} position in {signal.asset}: "
                   f"Amount: {signal.amount}, Entry: {signal.price:.2f}, "
                   f"Stop-Loss: {stop_loss_price:.2f}, Take-Profit: {take_profit_price:.2f}")
    
    def stop(self):
        """Stop strategy execution"""
        self.is_running = False
        logger.info(f"Stopping strategy: {self.params.strategy_type.value}")


class StrategyExecutor:
    """Main strategy execution orchestrator"""
    
    def __init__(self):
        self.strategies: Dict[str, BaseStrategy] = {}
        self.tasks: Dict[str, asyncio.Task] = {}
    
    async def add_strategy(self, strategy_id: str, strategy: BaseStrategy):
        """Add and start a new strategy"""
        self.strategies[strategy_id] = strategy
        task = asyncio.create_task(strategy.run())
        self.tasks[strategy_id] = task
        logger.info(f"Added strategy: {strategy_id}")
    
    async def remove_strategy(self, strategy_id: str):
        """Remove and stop a strategy"""
        if strategy_id in self.strategies:
            strategy = self.strategies[strategy_id]
            strategy.stop()
            
            if strategy_id in self.tasks:
                self.tasks[strategy_id].cancel()
                del self.tasks[strategy_id]
            
            del self.strategies[strategy_id]
            logger.info(f"Removed strategy: {strategy_id}")
    
    async def get_performance(self, strategy_id: str) -> Optional[PerformanceMetrics]:
        """Get performance metrics for a strategy"""
        if strategy_id in self.strategies:
            return self.strategies[strategy_id].performance
        return None
    
    async def get_all_performance(self) -> Dict[str, PerformanceMetrics]:
        """Get performance metrics for all strategies"""
        return {
            strategy_id: strategy.performance
            for strategy_id, strategy in self.strategies.items()
        }
