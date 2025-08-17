#!/bin/bash

# Elasticsearch Reports Tool - Test Data Setup Script
# This script creates sample test data in Elasticsearch for development

set -e

# Configuration
ES_HOST=${ES_HOST:-"http://localhost:9200"}
ES_USER=${ES_USERNAME:-"elastic"}
ES_PASS=${ES_PASSWORD:-"changeme"}

echo "Setting up test data for Elasticsearch Reports Tool..."
echo "Elasticsearch Host: $ES_HOST"

# Test connection
echo "Testing Elasticsearch connection..."
if ! curl -s -u "$ES_USER:$ES_PASS" "$ES_HOST/_cluster/health" > /dev/null; then
    echo "Error: Cannot connect to Elasticsearch at $ES_HOST"
    echo "Please ensure Elasticsearch is running and credentials are correct"
    exit 1
fi

echo "✓ Connected to Elasticsearch"

# Create sample events index
echo "Creating sample events data..."
curl -s -X POST "$ES_HOST/test-events/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:00:00Z",
  "event_type": "login",
  "user_id": "user001",
  "user_name": "Alice Johnson",
  "location": "New York",
  "ip_address": "192.168.1.100",
  "status": "success",
  "response_time": 125,
  "department": "Engineering",
  "browser": "Chrome"
}' > /dev/null

curl -s -X POST "$ES_HOST/test-events/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:15:00Z",
  "event_type": "page_view",
  "user_id": "user002",
  "user_name": "Bob Smith",
  "location": "California",
  "ip_address": "192.168.1.101",
  "status": "success",
  "response_time": 89,
  "page": "/dashboard",
  "department": "Marketing",
  "browser": "Firefox"
}' > /dev/null

curl -s -X POST "$ES_HOST/test-events/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:30:00Z",
  "event_type": "logout",
  "user_id": "user001",
  "user_name": "Alice Johnson",
  "location": "New York",
  "ip_address": "192.168.1.100",
  "status": "success",
  "response_time": 45,
  "session_duration": 1800,
  "department": "Engineering",
  "browser": "Chrome"
}' > /dev/null

curl -s -X POST "$ES_HOST/test-events/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T09:00:00Z",
  "event_type": "login",
  "user_id": "user003",
  "user_name": "Carol Davis",
  "location": "Texas",
  "ip_address": "192.168.1.102",
  "status": "failed",
  "response_time": 2000,
  "error_message": "Invalid credentials",
  "department": "Sales",
  "browser": "Safari"
}' > /dev/null

echo "✓ Created sample events"

# Create sample metrics index
echo "Creating sample metrics data..."
curl -s -X POST "$ES_HOST/test-metrics/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:00:00Z",
  "metric_name": "cpu_usage",
  "value": 75.5,
  "host": "server-01",
  "environment": "production",
  "datacenter": "us-east-1",
  "service": "web-app"
}' > /dev/null

curl -s -X POST "$ES_HOST/test-metrics/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:01:00Z",
  "metric_name": "memory_usage",
  "value": 85.2,
  "host": "server-01",
  "environment": "production",
  "datacenter": "us-east-1",
  "service": "web-app"
}' > /dev/null

curl -s -X POST "$ES_HOST/test-metrics/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:02:00Z",
  "metric_name": "disk_usage",
  "value": 45.8,
  "host": "server-02",
  "environment": "production",
  "datacenter": "us-west-1",
  "service": "database"
}' > /dev/null

curl -s -X POST "$ES_HOST/test-metrics/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:03:00Z",
  "metric_name": "network_throughput",
  "value": 1250.7,
  "host": "server-03",
  "environment": "staging",
  "datacenter": "us-east-1",
  "service": "api-gateway"
}' > /dev/null

echo "✓ Created sample metrics"

# Create sample application logs
echo "Creating sample logs data..."
curl -s -X POST "$ES_HOST/test-logs/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:00:15Z",
  "level": "INFO",
  "message": "User authentication successful",
  "service": "auth-service",
  "host": "auth-01",
  "user_id": "user001",
  "request_id": "req_12345",
  "response_code": 200
}' > /dev/null

curl -s -X POST "$ES_HOST/test-logs/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:01:30Z",
  "level": "ERROR",
  "message": "Database connection timeout",
  "service": "user-service",
  "host": "user-01",
  "error_code": "DB_TIMEOUT",
  "request_id": "req_12346",
  "response_code": 500
}' > /dev/null

curl -s -X POST "$ES_HOST/test-logs/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T08:02:45Z",
  "level": "WARN",
  "message": "High memory usage detected",
  "service": "monitoring",
  "host": "monitor-01",
  "memory_usage": 92.5,
  "threshold": 85.0,
  "request_id": "req_12347"
}' > /dev/null

echo "✓ Created sample logs"

# Refresh indices to make data searchable
echo "Refreshing indices..."
curl -s -X POST "$ES_HOST/test-*/_refresh" -u "$ES_USER:$ES_PASS" > /dev/null

echo "✓ Refreshed indices"

# Show index information
echo ""
echo "Test data setup complete! Created indices:"
echo "• test-events: User activity events"
echo "• test-metrics: System performance metrics"  
echo "• test-logs: Application logs"
echo ""
echo "To use this data in the Reports Tool:"
echo "1. Set ES_ALLOWED_INDICES=test-* in server/.env"
echo "2. Restart the server"
echo "3. Create data points using these indices"
echo ""
echo "Sample queries you can try:"
echo "• Count events by type"
echo "• Average response time by location"
echo "• CPU usage over time"
echo "• Error logs by service"

# Check index stats
echo ""
echo "Index statistics:"
curl -s -u "$ES_USER:$ES_PASS" "$ES_HOST/test-*/_stats/docs" | \
  grep -o '"docs":{"count":[0-9]*' | \
  sed 's/"docs":{"count":/Documents: /' || echo "Could not retrieve stats"