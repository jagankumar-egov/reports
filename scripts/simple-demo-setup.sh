#!/bin/bash

# Simple Demo Data Setup - Creates minimal but comprehensive demo data
set -e

ES_HOST=${ES_HOST:-"https://localhost:9200"}
ES_USER=${ES_USERNAME:-"elastic"}
ES_PASS=${ES_PASSWORD:-"ZDRlODI0MTA3MWZiMTFlZmFk"}
SERVER_URL=${SERVER_URL:-"http://localhost:4000"}

echo "🚀 Setting up demo data (simple version)..."

# Test connections
echo "Testing connections..."
curl -k -s -u "$ES_USER:$ES_PASS" "$ES_HOST/_cluster/health" > /dev/null && echo "✅ Elasticsearch connected"
curl -s "$SERVER_URL/api/v1/indices" > /dev/null && echo "✅ Server connected"

# Clean up
echo "Cleaning demo indices..."
curl -k -s -X DELETE "$ES_HOST/demo-sales" -u "$ES_USER:$ES_PASS" > /dev/null 2>&1 || true
curl -k -s -X DELETE "$ES_HOST/demo-analytics" -u "$ES_USER:$ES_PASS" > /dev/null 2>&1 || true

echo "📊 Creating sample data..."

# Create sample sales data (20 records)
echo "Creating sales data..."
for i in {1..20}; do
    revenue=$((RANDOM % 5000 + 1000))
    curl -k -s -X POST "$ES_HOST/demo-sales/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d"{
        \"@timestamp\": \"$(date -d "$((RANDOM % 30)) days ago" -Iseconds)\",
        \"order_id\": \"ORD-$(printf "%06d" $i)\",
        \"product_name\": \"$([ $((i % 4)) -eq 0 ] && echo "Laptop Pro" || [ $((i % 4)) -eq 1 ] && echo "Smartphone X" || [ $((i % 4)) -eq 2 ] && echo "Tablet Air" || echo "Smart Watch")\",
        \"category\": \"$([ $((i % 3)) -eq 0 ] && echo "Electronics" || [ $((i % 3)) -eq 1 ] && echo "Computers" || echo "Mobile")\",
        \"region\": \"$([ $((i % 4)) -eq 0 ] && echo "North America" || [ $((i % 4)) -eq 1 ] && echo "Europe" || [ $((i % 4)) -eq 2 ] && echo "Asia Pacific" || echo "Latin America")\",
        \"sales_rep\": \"$([ $((i % 3)) -eq 0 ] && echo "Alice Johnson" || [ $((i % 3)) -eq 1 ] && echo "Bob Smith" || echo "Carol Davis")\",
        \"customer_name\": \"TechCorp Inc\",
        \"quantity\": $((RANDOM % 10 + 1)),
        \"unit_price\": $((RANDOM % 1000 + 500)),
        \"final_amount\": $revenue,
        \"status\": \"completed\",
        \"payment_method\": \"credit_card\"
    }" > /dev/null
done

# Create sample analytics data (30 records)
echo "Creating analytics data..."
for i in {1..30}; do
    curl -k -s -X POST "$ES_HOST/demo-analytics/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d"{
        \"@timestamp\": \"$(date -d "$((RANDOM % 7)) days ago" -Iseconds)\",
        \"session_id\": \"sess_$(printf "%08d" $i)\",
        \"user_id\": \"user_$((RANDOM % 20 + 1))\",
        \"page_url\": \"$([ $((i % 4)) -eq 0 ] && echo "/home" || [ $((i % 4)) -eq 1 ] && echo "/products" || [ $((i % 4)) -eq 2 ] && echo "/checkout" || echo "/profile")\",
        \"browser\": \"$([ $((i % 3)) -eq 0 ] && echo "Chrome" || [ $((i % 3)) -eq 1 ] && echo "Firefox" || echo "Safari")\",
        \"device_type\": \"$([ $((i % 3)) -eq 0 ] && echo "Desktop" || [ $((i % 3)) -eq 1 ] && echo "Mobile" || echo "Tablet")\",
        \"traffic_source\": \"$([ $((i % 4)) -eq 0 ] && echo "organic" || [ $((i % 4)) -eq 1 ] && echo "paid_search" || [ $((i % 4)) -eq 2 ] && echo "social" || echo "direct")\",
        \"country\": \"$([ $((i % 4)) -eq 0 ] && echo "USA" || [ $((i % 4)) -eq 1 ] && echo "UK" || [ $((i % 4)) -eq 2 ] && echo "Germany" || echo "France")\",
        \"session_duration\": $((RANDOM % 1200 + 30)),
        \"page_views\": $((RANDOM % 8 + 1)),
        \"is_bounce\": false,
        \"converted\": $([ $((RANDOM % 10)) -eq 0 ] && echo true || echo false),
        \"load_time\": $((RANDOM % 3000 + 500))
    }" > /dev/null
done

# Refresh indices
curl -k -s -X POST "$ES_HOST/demo-*/_refresh" -u "$ES_USER:$ES_PASS" > /dev/null

echo "✅ Sample data created!"

echo "🔧 Creating data points..."

# Sales Overview Data Point
curl -s -X POST "$SERVER_URL/api/v1/datapoints" -H 'Content-Type: application/json' -d'{
    "name": "Demo Sales Overview",
    "slug": "demo-sales-overview",
    "description": "Key sales metrics and performance indicators",
    "source": {
        "indices": ["demo-sales"],
        "timeField": "@timestamp",
        "defaultTimeRange": "now-30d"
    },
    "query": {
        "bool": {
            "must": [{"term": {"status": "completed"}}]
        }
    },
    "aggs": {
        "total_revenue": {"sum": {"field": "final_amount"}},
        "total_orders": {"value_count": {"field": "order_id.keyword"}},
        "avg_order_value": {"avg": {"field": "final_amount"}},
        "revenue_by_region": {
            "terms": {"field": "region.keyword", "size": 10},
            "aggs": {"revenue": {"sum": {"field": "final_amount"}}}
        }
    },
    "projections": ["order_id", "product_name", "final_amount", "region"],
    "tags": ["sales", "revenue", "demo"]
}' > /dev/null

# Product Performance Data Point
curl -s -X POST "$SERVER_URL/api/v1/datapoints" -H 'Content-Type: application/json' -d'{
    "name": "Demo Product Performance",
    "slug": "demo-product-performance",
    "description": "Sales performance by product and category",
    "source": {
        "indices": ["demo-sales"],
        "timeField": "@timestamp",
        "defaultTimeRange": "now-30d"
    },
    "query": {
        "bool": {
            "must": [{"term": {"status": "completed"}}]
        }
    },
    "aggs": {
        "by_category": {
            "terms": {"field": "category.keyword", "size": 10},
            "aggs": {
                "revenue": {"sum": {"field": "final_amount"}},
                "orders": {"value_count": {"field": "order_id.keyword"}}
            }
        },
        "top_products": {
            "terms": {"field": "product_name.keyword", "size": 10},
            "aggs": {"revenue": {"sum": {"field": "final_amount"}}}
        }
    },
    "projections": ["product_name", "category", "final_amount"],
    "tags": ["sales", "products", "demo"]
}' > /dev/null

# Website Traffic Data Point
curl -s -X POST "$SERVER_URL/api/v1/datapoints" -H 'Content-Type: application/json' -d'{
    "name": "Demo Website Traffic",
    "slug": "demo-website-traffic",
    "description": "Website traffic metrics and user behavior",
    "source": {
        "indices": ["demo-analytics"],
        "timeField": "@timestamp",
        "defaultTimeRange": "now-7d"
    },
    "aggs": {
        "total_sessions": {"cardinality": {"field": "session_id.keyword"}},
        "total_users": {"cardinality": {"field": "user_id.keyword"}},
        "avg_session_duration": {"avg": {"field": "session_duration"}},
        "traffic_by_source": {"terms": {"field": "traffic_source.keyword", "size": 10}},
        "device_breakdown": {"terms": {"field": "device_type.keyword", "size": 5}}
    },
    "projections": ["session_id", "page_url", "device_type", "traffic_source"],
    "tags": ["analytics", "traffic", "demo"]
}' > /dev/null

echo "✅ Data points created!"

echo "🎨 Creating dashboards..."

# Sales Dashboard
curl -s -X POST "$SERVER_URL/api/v1/dashboards" -H 'Content-Type: application/json' -d'{
    "name": "Demo Sales Dashboard",
    "slug": "demo-sales-dashboard",
    "description": "Comprehensive sales performance overview with key metrics and trends",
    "tags": ["sales", "demo", "revenue"],
    "layout": {"columns": 12, "rows": 8, "gap": 16},
    "widgets": [
        {
            "id": "revenue-metrics",
            "type": "metric",
            "title": "Revenue Overview",
            "dataPointSlug": "demo-sales-overview",
            "position": {"x": 0, "y": 0, "w": 4, "h": 2},
            "config": {"showTrend": true, "format": "currency"}
        },
        {
            "id": "regional-performance",
            "type": "bar",
            "title": "Revenue by Region",
            "dataPointSlug": "demo-sales-overview",
            "position": {"x": 4, "y": 0, "w": 4, "h": 3},
            "config": {"orientation": "horizontal", "showValues": true}
        },
        {
            "id": "category-breakdown",
            "type": "pie",
            "title": "Sales by Category",
            "dataPointSlug": "demo-product-performance",
            "position": {"x": 8, "y": 0, "w": 4, "h": 3},
            "config": {"showPercentage": true, "legendPosition": "bottom"}
        },
        {
            "id": "product-table",
            "type": "table",
            "title": "Sales Details",
            "dataPointSlug": "demo-sales-overview",
            "position": {"x": 0, "y": 3, "w": 12, "h": 4},
            "config": {"columns": ["order_id", "product_name", "final_amount", "region"], "sortable": true}
        }
    ]
}' > /dev/null

# Analytics Dashboard
curl -s -X POST "$SERVER_URL/api/v1/dashboards" -H 'Content-Type: application/json' -d'{
    "name": "Demo Analytics Dashboard",
    "slug": "demo-analytics-dashboard",
    "description": "Digital analytics overview with traffic sources, devices, and user behavior",
    "tags": ["analytics", "demo", "digital"],
    "layout": {"columns": 12, "rows": 8, "gap": 16},
    "widgets": [
        {
            "id": "traffic-overview",
            "type": "metric",
            "title": "Traffic Overview",
            "dataPointSlug": "demo-website-traffic",
            "position": {"x": 0, "y": 0, "w": 3, "h": 2},
            "config": {"showTrend": true, "format": "number"}
        },
        {
            "id": "traffic-sources",
            "type": "pie",
            "title": "Traffic Sources",
            "dataPointSlug": "demo-website-traffic",
            "position": {"x": 3, "y": 0, "w": 4, "h": 3},
            "config": {"showPercentage": true, "legendPosition": "right"}
        },
        {
            "id": "device-breakdown",
            "type": "donut",
            "title": "Device Types",
            "dataPointSlug": "demo-website-traffic",
            "position": {"x": 7, "y": 0, "w": 5, "h": 3},
            "config": {"showPercentage": true, "innerRadius": "40%"}
        },
        {
            "id": "traffic-table",
            "type": "table",
            "title": "Session Details",
            "dataPointSlug": "demo-website-traffic",
            "position": {"x": 0, "y": 3, "w": 12, "h": 4},
            "config": {"columns": ["session_id", "page_url", "device_type", "traffic_source"], "sortable": true}
        }
    ]
}' > /dev/null

echo "✅ Dashboards created!"

# Update server config
echo "📝 Updating server configuration..."
cd server
cp .env .env.backup
sed -i.bak 's/ES_ALLOWED_INDICES=.*/ES_ALLOWED_INDICES=demo-sales,demo-analytics/' .env
echo "✅ Server configuration updated!"

echo ""
echo "💡 Demo setup complete!"
echo ""
echo "📋 Summary:"
echo "  • Created 20 sales records in 'demo-sales' index"
echo "  • Created 30 analytics events in 'demo-analytics' index" 
echo "  • Created 3 demo data points"
echo "  • Created 2 demo dashboards"
echo "  • Updated server configuration"
echo ""
echo "🎯 Next steps:"
echo "  1. Restart the server to load new configuration"
echo "  2. Visit http://localhost:3000"
echo "  3. Try the demo dashboards:"
echo "     • Demo Sales Dashboard"
echo "     • Demo Analytics Dashboard"
echo ""
echo "🎉 Happy exploring!"