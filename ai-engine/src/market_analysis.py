"""
Market Analysis Module - Data ingestion and technical analysis for trading strategies
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

import numpy as np
import pandas as pd
import requests
import websocket
from pydantic import BaseModel

logger = logging.getLogger(__name__)


@dataclass
class PriceData:
    """Price data structure"""
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass
class TechnicalIndicators:
    """Technical indicators for market analysis"""
    sma_20: float
    sma_50: float
    ema_12: float
    ema_26: float
    rsi: float
    macd: float
    macd_signal: float
    bollinger_upper: float
    bollinger_lower: float
    bollinger_middle: float
    atr: float  # Average True Range
    volatility: float


class MarketCondition(Enum):
    """Market condition classification"""
    BULLISH = "bullish"
    BEARISH = "bearish"
    SIDEWAYS = "sideways"
    VOLATILE = "volatile"


class MarketDataProvider:
    """Base class for market data providers"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = ""
    
    async def get_price_data(self, symbol: str, interval: str, limit: int = 100) -> List[PriceData]:
        """Get historical price data"""
        raise NotImplementedError
    
    async def get_current_price(self, symbol: str) -> float:
        """Get current price for symbol"""
        raise NotImplementedError
    
    async def get_funding_rate(self, symbol: str) -> float:
        """Get current funding rate for perpetual futures"""
        raise NotImplementedError


class BinanceDataProvider(MarketDataProvider):
    """Binance market data provider"""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.base_url = "https://api.binance.com/api/v3"
    
    async def get_price_data(self, symbol: str, interval: str, limit: int = 100) -> List[PriceData]:
        """Get historical price data from Binance"""
        try:
            url = f"{self.base_url}/klines"
            params = {
                "symbol": symbol,
                "interval": interval,
                "limit": limit
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            price_data = []
            
            for candle in data:
                price_data.append(PriceData(
                    timestamp=datetime.fromtimestamp(candle[0] / 1000),
                    open=float(candle[1]),
                    high=float(candle[2]),
                    low=float(candle[3]),
                    close=float(candle[4]),
                    volume=float(candle[5])
                ))
            
            return price_data
            
        except Exception as e:
            logger.error(f"Error fetching price data from Binance: {e}")
            return []
    
    async def get_current_price(self, symbol: str) -> float:
        """Get current price from Binance"""
        try:
            url = f"{self.base_url}/ticker/price"
            params = {"symbol": symbol}
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            return float(data["price"])
            
        except Exception as e:
            logger.error(f"Error fetching current price from Binance: {e}")
            return 0.0
    
    async def get_funding_rate(self, symbol: str) -> float:
        """Get funding rate from Binance"""
        try:
            url = "https://fapi.binance.com/fapi/v1/fundingRate"
            params = {"symbol": symbol, "limit": 1}
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data:
                return float(data[0]["fundingRate"])
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error fetching funding rate from Binance: {e}")
            return 0.0


class TechnicalAnalysis:
    """Technical analysis utilities"""
    
    @staticmethod
    def calculate_sma(prices: List[float], period: int) -> List[float]:
        """Calculate Simple Moving Average"""
        if len(prices) < period:
            return [np.nan] * len(prices)
        
        sma = []
        for i in range(len(prices)):
            if i < period - 1:
                sma.append(np.nan)
            else:
                sma.append(np.mean(prices[i - period + 1:i + 1]))
        
        return sma
    
    @staticmethod
    def calculate_ema(prices: List[float], period: int) -> List[float]:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return [np.nan] * len(prices)
        
        ema = []
        multiplier = 2 / (period + 1)
        
        # First EMA is SMA
        ema.append(np.mean(prices[:period]))
        
        for i in range(1, len(prices)):
            ema_value = (prices[i] * multiplier) + (ema[i-1] * (1 - multiplier))
            ema.append(ema_value)
        
        return [np.nan] * (period - 1) + ema
    
    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> List[float]:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return [np.nan] * len(prices)
        
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gains = []
        avg_losses = []
        
        # First average
        avg_gains.append(np.mean(gains[:period]))
        avg_losses.append(np.mean(losses[:period]))
        
        # Subsequent averages
        for i in range(period, len(gains)):
            avg_gain = (avg_gains[-1] * (period - 1) + gains[i]) / period
            avg_loss = (avg_losses[-1] * (period - 1) + losses[i]) / period
            avg_gains.append(avg_gain)
            avg_losses.append(avg_loss)
        
        rsi = []
        for i in range(len(avg_gains)):
            if avg_losses[i] == 0:
                rsi.append(100)
            else:
                rs = avg_gains[i] / avg_losses[i]
                rsi.append(100 - (100 / (1 + rs)))
        
        return [np.nan] * period + rsi
    
    @staticmethod
    def calculate_macd(prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[List[float], List[float]]:
        """Calculate MACD and signal line"""
        ema_fast = TechnicalAnalysis.calculate_ema(prices, fast)
        ema_slow = TechnicalAnalysis.calculate_ema(prices, slow)
        
        macd_line = []
        for i in range(len(prices)):
            if np.isnan(ema_fast[i]) or np.isnan(ema_slow[i]):
                macd_line.append(np.nan)
            else:
                macd_line.append(ema_fast[i] - ema_slow[i])
        
        # Remove NaN values for signal calculation
        macd_clean = [x for x in macd_line if not np.isnan(x)]
        signal_line = TechnicalAnalysis.calculate_ema(macd_clean, signal)
        
        # Pad signal line with NaN values
        signal_padded = [np.nan] * (len(macd_line) - len(signal_line)) + signal_line
        
        return macd_line, signal_padded
    
    @staticmethod
    def calculate_bollinger_bands(prices: List[float], period: int = 20, std_dev: float = 2) -> Tuple[List[float], List[float], List[float]]:
        """Calculate Bollinger Bands"""
        sma = TechnicalAnalysis.calculate_sma(prices, period)
        
        upper_band = []
        lower_band = []
        
        for i in range(len(prices)):
            if np.isnan(sma[i]):
                upper_band.append(np.nan)
                lower_band.append(np.nan)
            else:
                # Calculate standard deviation
                start_idx = max(0, i - period + 1)
                window = prices[start_idx:i + 1]
                std = np.std(window)
                
                upper_band.append(sma[i] + (std_dev * std))
                lower_band.append(sma[i] - (std_dev * std))
        
        return upper_band, sma, lower_band
    
    @staticmethod
    def calculate_atr(high: List[float], low: List[float], close: List[float], period: int = 14) -> List[float]:
        """Calculate Average True Range"""
        if len(high) < period + 1:
            return [np.nan] * len(high)
        
        true_ranges = []
        for i in range(1, len(high)):
            tr1 = high[i] - low[i]
            tr2 = abs(high[i] - close[i-1])
            tr3 = abs(low[i] - close[i-1])
            true_ranges.append(max(tr1, tr2, tr3))
        
        atr = []
        # First ATR is simple average
        atr.append(np.mean(true_ranges[:period]))
        
        # Subsequent ATR values
        for i in range(period, len(true_ranges)):
            atr_value = (atr[-1] * (period - 1) + true_ranges[i]) / period
            atr.append(atr_value)
        
        return [np.nan] * period + atr


class MarketAnalyzer:
    """Market analysis and condition classification"""
    
    def __init__(self, data_provider: MarketDataProvider):
        self.data_provider = data_provider
        self.ta = TechnicalAnalysis()
    
    async def get_technical_indicators(self, symbol: str, interval: str = "1h") -> TechnicalIndicators:
        """Get technical indicators for a symbol"""
        price_data = await self.data_provider.get_price_data(symbol, interval, 100)
        
        if not price_data:
            return None
        
        closes = [p.close for p in price_data]
        highs = [p.high for p in price_data]
        lows = [p.low for p in price_data]
        
        # Calculate indicators
        sma_20 = self.ta.calculate_sma(closes, 20)[-1]
        sma_50 = self.ta.calculate_sma(closes, 50)[-1]
        ema_12 = self.ta.calculate_ema(closes, 12)[-1]
        ema_26 = self.ta.calculate_ema(closes, 26)[-1]
        rsi = self.ta.calculate_rsi(closes)[-1]
        macd, macd_signal = self.ta.calculate_macd(closes)
        macd_value = macd[-1]
        macd_signal_value = macd_signal[-1]
        
        bb_upper, bb_middle, bb_lower = self.ta.calculate_bollinger_bands(closes)
        bb_upper_value = bb_upper[-1]
        bb_lower_value = bb_lower[-1]
        bb_middle_value = bb_middle[-1]
        
        atr = self.ta.calculate_atr(highs, lows, closes)[-1]
        
        # Calculate volatility (standard deviation of returns)
        returns = np.diff(closes) / closes[:-1]
        volatility = np.std(returns) * np.sqrt(24 * 365)  # Annualized volatility
        
        return TechnicalIndicators(
            sma_20=sma_20,
            sma_50=sma_50,
            ema_12=ema_12,
            ema_26=ema_26,
            rsi=rsi,
            macd=macd_value,
            macd_signal=macd_signal_value,
            bollinger_upper=bb_upper_value,
            bollinger_lower=bb_lower_value,
            bollinger_middle=bb_middle_value,
            atr=atr,
            volatility=volatility
        )
    
    def classify_market_condition(self, indicators: TechnicalIndicators) -> MarketCondition:
        """Classify current market condition based on technical indicators"""
        if indicators is None:
            return MarketCondition.SIDEWAYS
        
        # Bullish conditions
        bullish_signals = 0
        if indicators.sma_20 > indicators.sma_50:
            bullish_signals += 1
        if indicators.ema_12 > indicators.ema_26:
            bullish_signals += 1
        if 30 < indicators.rsi < 70:
            bullish_signals += 1
        if indicators.macd > indicators.macd_signal:
            bullish_signals += 1
        
        # Bearish conditions
        bearish_signals = 0
        if indicators.sma_20 < indicators.sma_50:
            bearish_signals += 1
        if indicators.ema_12 < indicators.ema_26:
            bearish_signals += 1
        if indicators.rsi > 70:
            bearish_signals += 1
        if indicators.macd < indicators.macd_signal:
            bearish_signals += 1
        
        # Volatility check
        is_volatile = indicators.volatility > 0.5  # 50% annualized volatility
        
        if is_volatile:
            return MarketCondition.VOLATILE
        elif bullish_signals > bearish_signals:
            return MarketCondition.BULLISH
        elif bearish_signals > bullish_signals:
            return MarketCondition.BEARISH
        else:
            return MarketCondition.SIDEWAYS
