#!/bin/bash

# Health check script for AptosAgents services

echo "🏥 AptosAgents Health Check"
echo "=========================="

# Check API health
echo "🔍 Checking API health..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API is healthy"
else
    echo "❌ API is not responding"
fi

# Check AI Engine health
echo "🔍 Checking AI Engine health..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ AI Engine is healthy"
else
    echo "❌ AI Engine is not responding"
fi

# Check Prometheus
echo "🔍 Checking Prometheus..."
if curl -s http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Prometheus is healthy"
else
    echo "❌ Prometheus is not responding"
fi

# Check Grafana
echo "🔍 Checking Grafana..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Grafana is healthy"
else
    echo "❌ Grafana is not responding"
fi

echo ""
echo "🚀 Health check complete!"
