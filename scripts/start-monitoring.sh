#!/bin/bash

echo "🚀 Starting AptosAgents Monitoring Stack..."

# Start monitoring services
cd monitoring
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "📊 Monitoring services started!"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3001 (admin/admin123)"
echo "- Alertmanager: http://localhost:9093"
echo ""
echo "🏥 Run './scripts/health-check.sh' to verify all services"
