#!/bin/bash

echo "🛑 Stopping AptosAgents Monitoring Stack..."

cd monitoring
docker-compose down

echo "✅ Monitoring services stopped!"
