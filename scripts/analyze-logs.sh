#!/bin/bash

# Simple log analysis script

echo "📝 AptosAgents Log Analysis"
echo "=========================="

LOG_DIR="monitoring/logs"
mkdir -p $LOG_DIR

echo "🔍 Recent errors:"
if [ -f "$LOG_DIR/app.log" ]; then
    grep -i "error" $LOG_DIR/app.log | tail -10
else
    echo "No log file found at $LOG_DIR/app.log"
fi

echo ""
echo "⚠️  Recent warnings:"
if [ -f "$LOG_DIR/app.log" ]; then
    grep -i "warn" $LOG_DIR/app.log | tail -10
else
    echo "No log file found"
fi

echo ""
echo "📊 Log summary for today:"
if [ -f "$LOG_DIR/app.log" ]; then
    TODAY=$(date +%Y-%m-%d)
    grep "$TODAY" $LOG_DIR/app.log | wc -l | xargs echo "Total log entries:"
    grep "$TODAY" $LOG_DIR/app.log | grep -i "error" | wc -l | xargs echo "Error entries:"
    grep "$TODAY" $LOG_DIR/app.log | grep -i "warn" | wc -l | xargs echo "Warning entries:"
else
    echo "No log file found"
fi
