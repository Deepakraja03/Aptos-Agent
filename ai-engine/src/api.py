"""
API Interfaces - FastAPI endpoints for smart contract integration and agent management
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .strategy_execution import (
    StrategyExecutor, StrategyParameters, StrategyType, RiskLevel,
    PerformanceMetrics, TradeSignal
)
from .market_analysis import MarketAnalyzer, BinanceDataProvider

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AptosAgents AI Engine API",
    description="AI-powered autonomous DeFi agent management system",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
strategy_executor = StrategyExecutor()
market_analyzer = MarketAnalyzer(BinanceDataProvider())


# Pydantic models for API
class CreateAgentRequest(BaseModel):
    """Request model for creating a new agent"""
    strategy_type: StrategyType
    risk_level: RiskLevel = RiskLevel.MODERATE
    max_position_size: float = Field(gt=0, description="Maximum position size in USD")
    stop_loss_pct: float = Field(ge=0, le=100, description="Stop loss percentage")
    take_profit_pct: float = Field(ge=0, le=100, description="Take profit percentage")
    max_drawdown_pct: float = Field(ge=0, le=100, description="Maximum drawdown percentage")
    execution_frequency_seconds: int = Field(gt=0, description="Execution frequency in seconds")
    enabled_protocols: List[str] = Field(default_factory=list, description="List of enabled protocols")
    owner_address: str = Field(description="Owner's Aptos address")


class AgentResponse(BaseModel):
    """Response model for agent information"""
    agent_id: str
    strategy_type: StrategyType
    risk_level: RiskLevel
    status: str
    performance: PerformanceMetrics
    created_at: datetime
    owner_address: str


class TradeSignalRequest(BaseModel):
    """Request model for trade signal execution"""
    agent_id: str
    action: str  # "BUY", "SELL", "HOLD"
    asset: str
    amount: float
    price: float
    confidence: float
    reasoning: str
    risk_score: float


class MarketDataRequest(BaseModel):
    """Request model for market data"""
    symbol: str
    interval: str = "1h"
    limit: int = 100


class MarketDataResponse(BaseModel):
    """Response model for market data"""
    symbol: str
    current_price: float
    technical_indicators: Dict[str, float]
    market_condition: str
    timestamp: datetime


# API Endpoints
@app.post("/agents", response_model=AgentResponse)
async def create_agent(request: CreateAgentRequest, background_tasks: BackgroundTasks):
    """Create a new AI trading agent"""
    try:
        agent_id = str(uuid4())
        
        # Create strategy parameters
        params = StrategyParameters(
            strategy_type=request.strategy_type,
            risk_level=request.risk_level,
            max_position_size=request.max_position_size,
            stop_loss_pct=request.stop_loss_pct,
            take_profit_pct=request.take_profit_pct,
            max_drawdown_pct=request.max_drawdown_pct,
            execution_frequency_seconds=request.execution_frequency_seconds,
            enabled_protocols=request.enabled_protocols
        )
        
        # TODO: Create actual strategy instance based on type
        # For now, we'll just store the parameters
        
        # Add to background tasks for initialization
        background_tasks.add_task(initialize_agent, agent_id, params)
        
        return AgentResponse(
            agent_id=agent_id,
            strategy_type=request.strategy_type,
            risk_level=request.risk_level,
            status="initializing",
            performance=PerformanceMetrics(),
            created_at=datetime.now(),
            owner_address=request.owner_address
        )
        
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    """Get agent information and performance"""
    try:
        # TODO: Retrieve actual agent data
        # For now, return mock data
        performance = await strategy_executor.get_performance(agent_id)
        
        if performance is None:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return AgentResponse(
            agent_id=agent_id,
            strategy_type=StrategyType.FUNDING_RATE_ARBITRAGE,  # Mock
            risk_level=RiskLevel.MODERATE,  # Mock
            status="running",
            performance=performance,
            created_at=datetime.now(),
            owner_address="0x123..."  # Mock
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agents", response_model=List[AgentResponse])
async def list_agents():
    """List all agents"""
    try:
        # TODO: Retrieve actual agent list
        # For now, return mock data
        performances = await strategy_executor.get_all_performance()
        
        agents = []
        for agent_id, performance in performances.items():
            agents.append(AgentResponse(
                agent_id=agent_id,
                strategy_type=StrategyType.FUNDING_RATE_ARBITRAGE,  # Mock
                risk_level=RiskLevel.MODERATE,  # Mock
                status="running",
                performance=performance,
                created_at=datetime.now(),
                owner_address="0x123..."  # Mock
            ))
        
        return agents
        
    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent"""
    try:
        await strategy_executor.remove_strategy(agent_id)
        return {"message": f"Agent {agent_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/{agent_id}/execute")
async def execute_trade_signal(agent_id: str, request: TradeSignalRequest):
    """Execute a trade signal for an agent"""
    try:
        # Create trade signal
        signal = TradeSignal(
            action=request.action,
            asset=request.asset,
            amount=request.amount,
            price=request.price,
            confidence=request.confidence,
            reasoning=request.reasoning,
            risk_score=request.risk_score
        )
        
        # TODO: Execute the signal through the agent
        # For now, just log it
        logger.info(f"Executing trade signal for agent {agent_id}: {signal}")
        
        return {
            "message": "Trade signal executed",
            "agent_id": agent_id,
            "signal": {
                "action": signal.action,
                "asset": signal.asset,
                "amount": signal.amount,
                "price": signal.price
            }
        }
        
    except Exception as e:
        logger.error(f"Error executing trade signal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/market-data/{symbol}", response_model=MarketDataResponse)
async def get_market_data(symbol: str, interval: str = "1h"):
    """Get market data and technical indicators for a symbol"""
    try:
        # Get technical indicators
        indicators = await market_analyzer.get_technical_indicators(symbol, interval)
        
        if indicators is None:
            raise HTTPException(status_code=404, detail="Market data not available")
        
        # Get current price
        current_price = await market_analyzer.data_provider.get_current_price(symbol)
        
        # Classify market condition
        market_condition = market_analyzer.classify_market_condition(indicators)
        
        # Convert indicators to dict
        indicators_dict = {
            "sma_20": indicators.sma_20,
            "sma_50": indicators.sma_50,
            "ema_12": indicators.ema_12,
            "ema_26": indicators.ema_26,
            "rsi": indicators.rsi,
            "macd": indicators.macd,
            "macd_signal": indicators.macd_signal,
            "bollinger_upper": indicators.bollinger_upper,
            "bollinger_lower": indicators.bollinger_lower,
            "bollinger_middle": indicators.bollinger_middle,
            "atr": indicators.atr,
            "volatility": indicators.volatility
        }
        
        return MarketDataResponse(
            symbol=symbol,
            current_price=current_price,
            technical_indicators=indicators_dict,
            market_condition=market_condition.value,
            timestamp=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting market data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "version": "0.1.0"
    }


# Background tasks
async def initialize_agent(agent_id: str, params: StrategyParameters):
    """Initialize agent in background"""
    try:
        logger.info(f"Initializing agent {agent_id}")
        
        # TODO: Create actual strategy instance
        # For now, just simulate initialization
        await asyncio.sleep(5)
        
        logger.info(f"Agent {agent_id} initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing agent {agent_id}: {e}")


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting AptosAgents AI Engine API")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down AptosAgents AI Engine API")
    
    # Stop all running strategies
    for agent_id in list(strategy_executor.strategies.keys()):
        await strategy_executor.remove_strategy(agent_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
