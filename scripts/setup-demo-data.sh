#!/bin/bash

# Elasticsearch Reports Tool - Demo Data Setup Script
# This script creates rich sample data and demo dashboards for demonstration

set -e

# Configuration
ES_HOST=${ES_HOST:-"https://localhost:9200"}
ES_USER=${ES_USERNAME:-"elastic"}
ES_PASS=${ES_PASSWORD:-"ZDRlODI0MTA3MWZiMTFlZmFk"}
SERVER_URL=${SERVER_URL:-"http://localhost:4000"}

echo "🚀 Setting up demo data for Elasticsearch Reports Tool..."
echo "Elasticsearch Host: $ES_HOST"
echo "Reports Server: $SERVER_URL"

# Test connection
echo "Testing Elasticsearch connection..."
if ! curl -k -s -u "$ES_USER:$ES_PASS" "$ES_HOST/_cluster/health" > /dev/null; then
    echo "❌ Error: Cannot connect to Elasticsearch at $ES_HOST"
    echo "Please ensure Elasticsearch is running and credentials are correct"
    exit 1
fi

echo "✅ Connected to Elasticsearch"

# Test server connection
echo "Testing Reports Server connection..."
if ! curl -s "$SERVER_URL/api/v1/indices" > /dev/null; then
    echo "❌ Error: Cannot connect to Reports Server at $SERVER_URL"
    echo "Please ensure the server is running"
    exit 1
fi

echo "✅ Connected to Reports Server"

# Delete existing demo indices
echo "Cleaning up existing demo indices..."
curl -k -s -X DELETE "$ES_HOST/demo-sales" -u "$ES_USER:$ES_PASS" > /dev/null 2>&1 || true
curl -k -s -X DELETE "$ES_HOST/demo-analytics" -u "$ES_USER:$ES_PASS" > /dev/null 2>&1 || true

echo "📊 Creating rich sample data..."

# Generate dates for the last 90 days
generate_date() {
    local days_ago=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        date -j -v-${days_ago}d +"%Y-%m-%dT%H:%M:%S.%3NZ"
    else
        # Linux
        date -d "${days_ago} days ago" +"%Y-%m-%dT%H:%M:%S.%3NZ"
    fi
}

# Create demo-sales index with comprehensive e-commerce data
echo "Creating demo sales data..."

# Products array
products=("Laptop Pro" "Smartphone X" "Tablet Air" "Headphones Elite" "Smart Watch" "Gaming Console" "Camera Pro" "Speaker System")
categories=("Electronics" "Computers" "Mobile" "Audio" "Gaming" "Photography")
regions=("North America" "Europe" "Asia Pacific" "Latin America" "Middle East" "Africa")
sales_reps=("Alice Johnson" "Bob Smith" "Carol Davis" "David Wilson" "Emma Brown" "Frank Miller")
customers=("TechCorp Inc" "Global Solutions" "Innovation Labs" "Digital Dynamics" "Future Systems" "Smart Enterprises")

# Generate 500 sales records over last 90 days
for i in $(seq 1 500); do
    days_ago=$((RANDOM % 90))
    timestamp=$(generate_date $days_ago)
    
    product=${products[$((RANDOM % ${#products[@]}))]}
    category=${categories[$((RANDOM % ${#categories[@]}))]}
    region=${regions[$((RANDOM % ${#regions[@]}))]}
    sales_rep=${sales_reps[$((RANDOM % ${#sales_reps[@]}))]}
    customer=${customers[$((RANDOM % ${#customers[@]}))]}
    
    quantity=$((RANDOM % 20 + 1))
    unit_price=$((RANDOM % 2000 + 100))
    total_amount=$((quantity * unit_price))
    discount_pct=$((RANDOM % 20))
    final_amount=$((total_amount * (100 - discount_pct) / 100))
    
    curl -k -s -X POST "$ES_HOST/demo-sales/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d"{
        \"@timestamp\": \"$timestamp\",
        \"order_id\": \"ORD-$(printf "%06d" $i)\",
        \"product_name\": \"$product\",
        \"category\": \"$category\",
        \"region\": \"$region\",
        \"sales_rep\": \"$sales_rep\",
        \"customer_name\": \"$customer\",
        \"quantity\": $quantity,
        \"unit_price\": $unit_price,
        \"total_amount\": $total_amount,
        \"discount_percentage\": $discount_pct,
        \"final_amount\": $final_amount,
        \"status\": \"$( [[ $((RANDOM % 10)) -eq 0 ]] && echo "cancelled" || echo "completed" )\",
        \"payment_method\": \"$( [[ $((RANDOM % 3)) -eq 0 ]] && echo "credit_card" || [[ $((RANDOM % 3)) -eq 1 ]] && echo "bank_transfer" || echo "paypal" )\",
        \"shipping_cost\": $((RANDOM % 100 + 10)),
        \"is_new_customer\": $( [[ $((RANDOM % 4)) -eq 0 ]] && echo "true" || echo "false" )
    }" > /dev/null

    if [ $((i % 50)) -eq 0 ]; then
        echo "  📦 Created $i sales records..."
    fi
done

# Create demo-analytics index with website/app analytics data
echo "Creating demo analytics data..."

pages=("/home" "/products" "/checkout" "/profile" "/support" "/about" "/blog" "/login")
browsers=("Chrome" "Firefox" "Safari" "Edge" "Opera")
devices=("Desktop" "Mobile" "Tablet")
traffic_sources=("organic" "paid_search" "social" "direct" "referral" "email")
countries=("USA" "UK" "Germany" "France" "Japan" "Canada" "Australia" "Brazil")

# Generate 1000 analytics events over last 30 days
for i in $(seq 1 1000); do
    days_ago=$((RANDOM % 30))
    timestamp=$(generate_date $days_ago)
    
    page=${pages[$((RANDOM % ${#pages[@]}))]}
    browser=${browsers[$((RANDOM % ${#browsers[@]}))]}
    device=${devices[$((RANDOM % ${#devices[@]}))]}
    source=${traffic_sources[$((RANDOM % ${#traffic_sources[@]}))]}
    country=${countries[$((RANDOM % ${#countries[@]}))]}
    
    session_duration=$((RANDOM % 1800 + 30))  # 30 seconds to 30 minutes
    page_views=$((RANDOM % 10 + 1))
    bounce_rate=$( [[ $page_views -eq 1 ]] && echo "true" || echo "false" )
    conversion=$( [[ $((RANDOM % 20)) -eq 0 ]] && echo "true" || echo "false" )
    
    curl -k -s -X POST "$ES_HOST/demo-analytics/_doc" -u "$ES_USER:$ES_PASS" -H 'Content-Type: application/json' -d"{
        \"@timestamp\": \"$timestamp\",
        \"session_id\": \"sess_$(printf "%08d" $i)\",
        \"user_id\": \"user_$((RANDOM % 500 + 1))\",
        \"page_url\": \"$page\",
        \"browser\": \"$browser\",
        \"device_type\": \"$device\",
        \"traffic_source\": \"$source\",
        \"country\": \"$country\",
        \"session_duration\": $session_duration,
        \"page_views\": $page_views,
        \"is_bounce\": $bounce_rate,
        \"converted\": $conversion,
        \"load_time\": $((RANDOM % 5000 + 500)),
        \"screen_resolution\": \"$( [[ $device == "Desktop" ]] && echo "1920x1080" || [[ $device == "Mobile" ]] && echo "375x667" || echo "768x1024" )\",
        \"utm_campaign\": \"$( [[ $source == "paid_search" ]] && echo "summer_sale" || [[ $source == "social" ]] && echo "social_promo" || echo "none" )\"
    }" > /dev/null

    if [ $((i % 100)) -eq 0 ]; then
        echo "  📈 Created $i analytics events..."
    fi
done

# Refresh indices
echo "Refreshing indices..."
curl -k -s -X POST "$ES_HOST/demo-*/_refresh" -u "$ES_USER:$ES_PASS" > /dev/null

echo "✅ Sample data created successfully!"

# Now create data points via the API
echo "🔧 Creating demo data points..."

# Sales data points
echo "Creating sales data points..."

curl -s -X POST "$SERVER_URL/api/v1/datapoints" -H 'Content-Type: application/json' -d'{
    "name": "Sales Overview",
    "slug": "sales-overview",
    "description": "Key sales metrics and performance indicators",
    "source": {
        "indices": ["demo-sales"],
        "timeField": "@timestamp",
        "defaultTimeRange": "now-30d"
    },
    "query": {
        "bool": {
            "must": [
                {"term": {"status": "completed"}}
            ]
        }
    },
    "aggs": {
        "total_revenue": {
            "sum": {"field": "final_amount"}
        },
        "total_orders": {
            "value_count": {"field": "order_id.keyword"}
        },
        "avg_order_value": {
            "avg": {"field": "final_amount"}
        },
        "revenue_by_region": {
            "terms": {
                "field": "region.keyword",
                "size": 10
            },
            "aggs": {
                "revenue": {"sum": {"field": "final_amount"}}
            }
        }
    },
    "projections": ["order_id", "product_name", "final_amount", "region"],
    "tags": ["sales", "revenue", "overview"]
}' > /dev/null

curl -s -X POST "$SERVER_URL/api/v1/datapoints" -H 'Content-Type: application/json' -d'{
    "name": "Product Performance",
    "slug": "product-performance",
    "description": "Sales performance by product and category",
    "source": {
        "indices": ["demo-sales"],
        "timeField": "@timestamp",
        "defaultTimeRange": "now-30d"
    },
    "query": {
        "bool": {
            "must": [
                {"term": {"status": "completed"}}
            ]
        }
    },
    "aggs": {
        "by_category": {
            "terms": {
                "field": "category.keyword",
                "size": 10
            },
            "aggs": {
                "revenue": {"sum": {"field": "final_amount"}},
                "orders": {"value_count": {"field": "order_id.keyword"}}
            }
        },
        "top_products": {
            "terms": {
                "field": "product_name.keyword",
                "size": 10,
                "order": {"revenue": "desc"}
            },
            "aggs": {
                "revenue": {"sum": {"field": "final_amount"}}
            }
        }
    },
    "projections": ["product_name", "category", "final_amount"],
    "tags": ["sales", "products", "performance"]
}' > /dev/null

curl -s -X POST "$SERVER_URL/api/v1/datapoints" -H 'Content-Type: application/json' -d'{
    "name": "Sales Trends",
    "slug": "sales-trends",
    "description": "Daily and weekly sales trends over time",
    "source": {
        "indices": ["demo-sales"],
        "timeField": "@timestamp",
        "defaultTimeRange": "now-90d"
    },
    "query": {
        "bool": {
            "must": [
                {"term": {"status": "completed"}}
            ]
        }
    },
    "aggs": {
        "daily_sales": {
            "date_histogram": {
                "field": "@timestamp",
                "calendar_interval": "day"
            },
            "aggs": {
                "revenue": {"sum": {"field": "final_amount"}},
                "orders": {"value_count": {"field": "order_id.keyword"}}
            }
        },
        "weekly_sales": {
            "date_histogram": {
                "field": "@timestamp",
                "calendar_interval": "week"
            },
            "aggs": {
                "revenue": {"sum": {"field": "final_amount"}}
            }
        }
    },
    "projections": ["@timestamp", "final_amount"],
    "tags": ["sales", "trends", "time-series"]
}' > /dev/null

# Analytics data points
echo "Creating analytics data points..."

curl -s -X POST "$SERVER_URL/api/v1/datapoints" -H 'Content-Type: application/json' -d'{
    "name": "Website Traffic",
    "slug": "website-traffic",
    "description": "Website traffic metrics and user behavior",
    "source": {
        "indices": ["demo-analytics"],
        "timeField": "@timestamp",
        "defaultTimeRange": "now-7d"
    },
    "aggs": {
        "total_sessions": {
            "cardinality": {"field": "session_id.keyword"}
        },
        "total_users": {
            "cardinality": {"field": "user_id.keyword"}
        },
        "avg_session_duration": {
            "avg": {"field": "session_duration"}
        },
        "bounce_rate": {
            "filter": {"term": {"is_bounce": true}},
            "aggs": {
                "bounced_sessions": {"cardinality": {"field": "session_id.keyword"}}
            }
        },
        "traffic_by_source": {
            "terms": {
                "field": "traffic_source.keyword",
                "size": 10
            }
        },
        "device_breakdown": {
            "terms": {
                "field": "device_type.keyword",
                "size": 5
            }
        }
    },
    "projections": ["session_id", "page_url", "device_type", "traffic_source"],
    "tags": ["analytics", "traffic", "users"]
}' > /dev/null

curl -s -X POST "$SERVER_URL/api/v1/datapoints" -H 'Content-Type: application/json' -d'{
    "name": "Page Performance",
    "slug": "page-performance",
    "description": "Page views, load times, and user engagement",
    "source": {
        "indices": ["demo-analytics"],
        "timeField": "@timestamp",
        "defaultTimeRange": "now-7d"
    },
    "aggs": {
        "page_views": {
            "terms": {
                "field": "page_url.keyword",
                "size": 10
            },
            "aggs": {
                "avg_load_time": {"avg": {"field": "load_time"}},
                "sessions": {"cardinality": {"field": "session_id.keyword"}}
            }
        },
        "avg_load_time_all": {
            "avg": {"field": "load_time"}
        },
        "conversion_rate": {
            "filter": {"term": {"converted": true}},
            "aggs": {
                "conversions": {"cardinality": {"field": "session_id.keyword"}}
            }
        }
    },
    "projections": ["page_url", "load_time", "converted"],
    "tags": ["analytics", "performance", "pages"]
}' > /dev/null

curl -s -X POST "$SERVER_URL/api/v1/datapoints" -H 'Content-Type: application/json' -d'{
    "name": "Geographic Analytics",
    "slug": "geographic-analytics",
    "description": "User traffic and engagement by geographic location",
    "source": {
        "indices": ["demo-analytics"],
        "timeField": "@timestamp",
        "defaultTimeRange": "now-30d"
    },
    "aggs": {
        "by_country": {
            "terms": {
                "field": "country.keyword",
                "size": 15
            },
            "aggs": {
                "sessions": {"cardinality": {"field": "session_id.keyword"}},
                "avg_duration": {"avg": {"field": "session_duration"}},
                "conversions": {
                    "filter": {"term": {"converted": true}},
                    "aggs": {
                        "count": {"cardinality": {"field": "session_id.keyword"}}
                    }
                }
            }
        }
    },
    "projections": ["country", "session_duration", "converted"],
    "tags": ["analytics", "geographic", "international"]
}' > /dev/null

echo "✅ Data points created successfully!"

# Create demo dashboards
echo "🎨 Creating demo dashboards..."

# Executive Sales Dashboard
curl -s -X POST "$SERVER_URL/api/v1/dashboards" -H 'Content-Type: application/json' -d'{
    "name": "Executive Sales Dashboard",
    "slug": "executive-sales-dashboard",
    "description": "High-level sales performance overview for executives and managers",
    "tags": ["sales", "executive", "revenue"],
    "layout": {
        "columns": 12,
        "rows": 8,
        "gap": 16
    },
    "widgets": [
        {
            "id": "revenue-metrics",
            "type": "metric",
            "title": "Revenue Overview",
            "dataPointSlug": "sales-overview",
            "position": {"x": 0, "y": 0, "w": 4, "h": 2},
            "config": {
                "showTrend": true,
                "format": "currency"
            }
        },
        {
            "id": "regional-performance",
            "type": "bar",
            "title": "Revenue by Region",
            "dataPointSlug": "sales-overview",
            "position": {"x": 4, "y": 0, "w": 4, "h": 3},
            "config": {
                "orientation": "horizontal",
                "showValues": true
            }
        },
        {
            "id": "category-breakdown",
            "type": "pie",
            "title": "Sales by Category",
            "dataPointSlug": "product-performance",
            "position": {"x": 8, "y": 0, "w": 4, "h": 3},
            "config": {
                "showPercentage": true,
                "legendPosition": "bottom"
            }
        },
        {
            "id": "sales-trends",
            "type": "line",
            "title": "Daily Sales Trend",
            "dataPointSlug": "sales-trends",
            "position": {"x": 0, "y": 3, "w": 8, "h": 4},
            "config": {
                "xAxis": "date",
                "yAxis": "revenue",
                "showDataLabels": false
            }
        },
        {
            "id": "top-products",
            "type": "table",
            "title": "Top Products",
            "dataPointSlug": "product-performance",
            "position": {"x": 8, "y": 3, "w": 4, "h": 4},
            "config": {
                "columns": ["product_name", "revenue"],
                "sortable": true,
                "pageSize": 10
            }
        }
    ]
}' > /dev/null

# Digital Analytics Dashboard
curl -s -X POST "$SERVER_URL/api/v1/dashboards" -H 'Content-Type: application/json' -d'{
    "name": "Digital Analytics Dashboard",
    "slug": "digital-analytics-dashboard",
    "description": "Comprehensive website and user analytics for digital marketing teams",
    "tags": ["analytics", "digital", "marketing"],
    "layout": {
        "columns": 12,
        "rows": 10,
        "gap": 16
    },
    "widgets": [
        {
            "id": "traffic-overview",
            "type": "metric",
            "title": "Traffic Overview",
            "dataPointSlug": "website-traffic",
            "position": {"x": 0, "y": 0, "w": 3, "h": 2},
            "config": {
                "showTrend": true,
                "format": "number"
            }
        },
        {
            "id": "traffic-sources",
            "type": "pie",
            "title": "Traffic Sources",
            "dataPointSlug": "website-traffic",
            "position": {"x": 3, "y": 0, "w": 3, "h": 3},
            "config": {
                "showPercentage": true,
                "legendPosition": "right"
            }
        },
        {
            "id": "device-breakdown",
            "type": "donut",
            "title": "Device Types",
            "dataPointSlug": "website-traffic",
            "position": {"x": 6, "y": 0, "w": 3, "h": 3},
            "config": {
                "showPercentage": true,
                "innerRadius": "40%"
            }
        },
        {
            "id": "geographic-map",
            "type": "map",
            "title": "Geographic Distribution",
            "dataPointSlug": "geographic-analytics",
            "position": {"x": 9, "y": 0, "w": 3, "h": 4},
            "config": {
                "colorField": "sessions",
                "tooltipFields": ["country", "sessions", "avg_duration"]
            }
        },
        {
            "id": "page-performance",
            "type": "table",
            "title": "Page Performance",
            "dataPointSlug": "page-performance",
            "position": {"x": 0, "y": 3, "w": 6, "h": 4},
            "config": {
                "columns": ["page_url", "sessions", "avg_load_time"],
                "sortable": true,
                "filterable": true
            }
        },
        {
            "id": "user-engagement",
            "type": "gauge",
            "title": "Engagement Metrics",
            "dataPointSlug": "website-traffic",
            "position": {"x": 6, "y": 3, "w": 3, "h": 2},
            "config": {
                "min": 0,
                "max": 100,
                "unit": "%",
                "ranges": [
                    {"min": 0, "max": 30, "color": "red"},
                    {"min": 30, "max": 70, "color": "yellow"},
                    {"min": 70, "max": 100, "color": "green"}
                ]
            }
        }
    ]
}' > /dev/null

echo "✅ Demo dashboards created successfully!"

# Update server environment to use demo indices
echo "📝 Updating server configuration..."

# Create a demo environment file
cat > /tmp/demo.env << EOF
# Demo Environment Configuration
NODE_ENV=development
PORT=4000

# Elasticsearch Configuration
ES_HOST=https://localhost:9200
ES_USERNAME=elastic
ES_PASSWORD=ZDRlODI0MTA3MWZiMTFlZmFk
ES_API_KEY=

# Demo Allowed Indices
ES_ALLOWED_INDICES=demo-sales,demo-analytics

# User Role Configuration
DEFAULT_USER_ROLE=reports-admin

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
EOF

echo "💡 Demo setup complete!"
echo ""
echo "📋 Summary:"
echo "  • Created 500 sales records in 'demo-sales' index"
echo "  • Created 1000 analytics events in 'demo-analytics' index"
echo "  • Created 6 demo data points"
echo "  • Created 2 demo dashboards"
echo ""
echo "🎯 Next steps:"
echo "  1. Copy demo configuration:"
echo "     cp /tmp/demo.env server/.env"
echo ""
echo "  2. Restart the server to use demo indices:"
echo "     cd server && npm run dev"
echo ""x`
echo "  3. Visit the dashboard at:"
echo "     http://localhost:3000"
echo ""
echo "  4. Try these demo dashboards:"
echo "     • Executive Sales Dashboarcan we d"
echo "     • Digital Analytics Dashboard"
echo ""
echo "🎉 Happy exploring!"