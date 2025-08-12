"""
Enhanced Funding Rate Arbitrage Strategy - Complete implementation with stop-loss/take-profit
"""

import logging
from datetime import datetime
from typing import Optional

from ..strategy_execution import BaseStrategy, StrategyParameters, TradeSignal, MarketData
from ..market_analysis import MarketAnalyzer, TechnicalIndicators

logger = logging.getLogger(__name__)


class EnhancedFundingRateArbitrageStrategy(BaseStrategy):
    """
    Enhanced funding rate arbitrage strategy with complete risk management
    """
    
    def __init__(self, params: StrategyParameters, market_analyzer: MarketAnalyzer):
        super().__init__(params)
        self.market_analyzer = market_analyzer
        self.min_funding_rate = 0.01  # 1% minimum funding rate to trade
        self.max_position_hold_hours = 8  # Maximum hours to hold position
    
    async def analyze_market(self, market_data: MarketData) -> TradeSignal:
        """Analyze funding rates and generate trading signals"""
        
        # Get technical indicators for additional confirmation
        indicators = await self.market_analyzer.get_technical_indicators(
            "BTCUSDT", "1h"
        )
        
        # Check funding rate
        funding_rate = market_data.funding_rate or 0.0
        
        # Determine if funding rate arbitrage opportunity exists
        if abs(funding_rate) < self.min_funding_rate:
            return TradeSignal(
                action="HOLD",
                asset="BTCUSDT",
                amount=0.0,
                price=market_data.price,
                confidence=0.0,
                reasoning="Funding rate too low for arbitrage",
                risk_score=0.0
            )
        
        # Calculate position size based on funding rate magnitude
        base_amount = min(
            self.params.max_position_size,
            self.risk_manager._calculate_position_limit("BTCUSDT")
        )
        
        # Adjust position size based on funding rate strength
        funding_strength = min(abs(funding_rate) / 0.05, 1.0)  # Cap at 5% funding rate
        position_amount = base_amount * funding_strength
        
        # Determine trade direction
        if funding_rate > self.min_funding_rate:
            # Positive funding rate: longs pay shorts, so go short
            action = "SELL"
            reasoning = f"High positive funding rate: {funding_rate:.4f}. Going short to collect funding."
            confidence = min(0.9, funding_strength + 0.3)
        elif funding_rate < -self.min_funding_rate:
            # Negative funding rate: shorts pay longs, so go long
            action = "BUY"
            reasoning = f"High negative funding rate: {funding_rate:.4f}. Going long to collect funding."
            confidence = min(0.9, funding_strength + 0.3)
        else:
            action = "HOLD"
            reasoning = "No significant funding rate opportunity"
            confidence = 0.0
        
        # Calculate risk score based on market conditions
        risk_score = self._calculate_risk_score(indicators, funding_rate)
        
        # Calculate custom stop-loss and take-profit for funding rate strategy
        stop_loss_price = None
        take_profit_price = None
        
        if action != "HOLD":
            # For funding rate arbitrage, we use tighter stops since we're collecting funding
            stop_loss_pct = min(self.params.stop_loss_pct, 2.0)  # Max 2% stop loss
            take_profit_pct = abs(funding_rate) * 100 * 0.8  # 80% of funding rate as profit target
            
            if action == "BUY":
                stop_loss_price = market_data.price * (1 - stop_loss_pct / 100)
                take_profit_price = market_data.price * (1 + take_profit_pct / 100)
            else:  # SELL
                stop_loss_price = market_data.price * (1 + stop_loss_pct / 100)
                take_profit_price = market_data.price * (1 - take_profit_pct / 100)
        
        return TradeSignal(
            action=action,
            asset="BTCUSDT",
            amount=position_amount,
            price=market_data.price,
            confidence=confidence,
            reasoning=reasoning,
            risk_score=risk_score,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price
        )
    
    def _calculate_risk_score(self, indicators: Optional[TechnicalIndicators], funding_rate: float) -> float:
        """Calculate risk score based on market conditions"""
        risk_score = 0.0
        
        if indicators:
            # Higher volatility increases risk
            if indicators.volatility > 0.5:
                risk_score += 0.3
            elif indicators.volatility > 0.3:
                risk_score += 0.1
            
            # Extreme RSI values increase risk
            if indicators.rsi > 80 or indicators.rsi < 20:
                risk_score += 0.2
            
            # MACD divergence increases risk
            if indicators.macd * indicators.macd_signal < 0:  # Different signs
                risk_score += 0.1
        
        # Very high funding rates might indicate extreme market conditions
        if abs(funding_rate) > 0.1:  # 10% funding rate
            risk_score += 0.3
        
        return min(risk_score, 1.0)  # Cap at 1.0
    
    async def execute_signal(self, signal: TradeSignal) -> bool:
        """Execute the trading signal"""
        if signal.action == "HOLD":
            return True
        
        try:
            # In production, this would execute actual trades
            logger.info(f"Executing {signal.action} signal:")
            logger.info(f"  Asset: {signal.asset}")
            logger.info(f"  Amount: {signal.amount:.2f}")
            logger.info(f"  Price: {signal.price:.2f}")
            logger.info(f"  Stop Loss: {signal.stop_loss_price:.2f}")
            logger.info(f"  Take Profit: {signal.take_profit_price:.2f}")
            logger.info(f"  Reasoning: {signal.reasoning}")
            
            # Simulate successful execution
            return True
            
        except Exception as e:
            logger.error(f"Failed to execute signal: {e}")
            return False
    
    async def _get_market_data(self) -> MarketData:
        """Get current market data including funding rate"""
        # In production, this would fetch real data
        # For demo, return mock data with funding rate
        return MarketData(
            timestamp=datetime.now(),
            price=50000.0,  # Mock BTC price
            volume=1000000.0,
            funding_rate=0.015,  # 1.5% funding rate (high)
            volatility=0.25
        )