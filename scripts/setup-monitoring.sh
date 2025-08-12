#!/bin/bash

# AptosAgents Monitoring Setup Script
# Sets up basic monitoring infrastructure for development

set -e

echo "🚀 Setting up AptosAgents Monitoring Infrastructure..."

# Create monitoring directory structure
echo "📁 Creating monitoring directories..."
mkdir -p monitoring/{prometheus,grafana,logs}
mkdir -p monitoring/grafana/{dashboards,provisioning}
mkdir -p monitoring/prometheus/rules

# Create Prometheus configuration
echo "⚙️ Creating Prometheus configuration..."
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'aptos-agents-api'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'ai-engine'
    static_configs:
      - targets: ['host.docker.internal:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF

# Create alert rules
echo "🚨 Creating alert rules..."
cat > monitoring/prometheus/rules/alerts.yml << 'EOF'
groups:
  - name: aptos-agents-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.02
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      - alert: AgentFailureRate
        expr: rate(agent_execution_failures_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High agent failure rate"
          description: "Agent failure rate is {{ $value }} failures per second"
EOF

# Create Grafana provisioning
echo "📊 Creating Grafana configuration..."
cat > monitoring/grafana/provisioning/datasources.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

cat > monitoring/grafana/provisioning/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Create basic dashboard
echo "📈 Creating system overview dashboard..."
cat > monitoring/grafana/dashboards/system-overview.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "AptosAgents System Overview",
    "tags": ["aptos-agents"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "API Response Time",
        "type": "graph",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile",
            "refId": "A"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile",
            "refId": "B"
          }
        ],
        "yAxes": [
          {
            "label": "Response Time (seconds)",
            "min": 0
          }
        ]
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec",
            "refId": "A"
          }
        ]
      },
      {
        "id": 3,
        "title": "Active Agents",
        "type": "stat",
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 8},
        "targets": [
          {
            "expr": "sum(active_agents_total)",
            "legendFormat": "Active Agents",
            "refId": "A"
          }
        ]
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "stat",
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 8},
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "Errors/sec",
            "refId": "A"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

# Create Docker Compose for monitoring stack
echo "🐳 Creating Docker Compose configuration..."
cat > monitoring/docker-compose.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: aptos-agents-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: aptos-agents-grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: aptos-agents-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager:/etc/alertmanager
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
EOF

# Create alertmanager configuration
echo "📢 Creating Alertmanager configuration..."
mkdir -p monitoring/alertmanager
cat > monitoring/alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@aptosagents.io'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/webhook'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

# Create health check script
echo "🏥 Creating health check script..."
cat > scripts/health-check.sh << 'EOF'
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
EOF

chmod +x scripts/health-check.sh

# Create monitoring start script
echo "🚀 Creating monitoring start script..."
cat > scripts/start-monitoring.sh << 'EOF'
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
EOF

chmod +x scripts/start-monitoring.sh

# Create monitoring stop script
echo "🛑 Creating monitoring stop script..."
cat > scripts/stop-monitoring.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping AptosAgents Monitoring Stack..."

cd monitoring
docker-compose down

echo "✅ Monitoring services stopped!"
EOF

chmod +x scripts/stop-monitoring.sh

# Create log analysis script
echo "📝 Creating log analysis script..."
cat > scripts/analyze-logs.sh << 'EOF'
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
EOF

chmod +x scripts/analyze-logs.sh

echo ""
echo "✅ Monitoring infrastructure setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start monitoring stack: ./scripts/start-monitoring.sh"
echo "2. Check service health: ./scripts/health-check.sh"
echo "3. Access Grafana: http://localhost:3001 (admin/admin123)"
echo "4. Access Prometheus: http://localhost:9090"
echo ""
echo "🚀 Ready to monitor AptosAgents!"