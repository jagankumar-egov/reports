const { Client } = require('@elastic/elasticsearch');
const axios = require('axios');

// Configuration
const ES_HOST = process.env.ES_HOST || 'https://localhost:9200';
const ES_USER = process.env.ES_USERNAME || 'elastic';
const ES_PASS = process.env.ES_PASSWORD || 'ZDRlODI0MTA3MWZiMTFlZmFk';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';

const client = new Client({
  node: ES_HOST,
  auth: {
    username: ES_USER,
    password: ES_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Helper functions
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getDateDaysAgo = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

async function setupDemoData() {
  console.log('🚀 Setting up demo data for Elasticsearch Reports Tool...');
  
  try {
    // Test connections
    console.log('Testing Elasticsearch connection...');
    await client.cluster.health();
    console.log('✅ Connected to Elasticsearch');

    console.log('Testing Reports Server connection...');
    await axios.get(`${SERVER_URL}/api/v1/indices`);
    console.log('✅ Connected to Reports Server');

    // Clean up existing demo indices
    console.log('Cleaning up existing demo indices...');
    try {
      await client.indices.delete({ index: 'demo-sales' });
      await client.indices.delete({ index: 'demo-analytics' });
    } catch (e) {
      // Indices might not exist
    }

    console.log('📊 Creating rich sample data...');

    // Generate sales data
    console.log('Creating demo sales data...');
    const salesData = [];
    const products = ['Laptop Pro', 'Smartphone X', 'Tablet Air', 'Headphones Elite', 'Smart Watch', 'Gaming Console'];
    const categories = ['Electronics', 'Computers', 'Mobile', 'Audio', 'Gaming'];
    const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
    const salesReps = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson'];
    const customers = ['TechCorp Inc', 'Global Solutions', 'Innovation Labs', 'Digital Dynamics'];

    for (let i = 1; i <= 200; i++) {
      const daysAgo = randomInt(0, 90);
      const quantity = randomInt(1, 20);
      const unitPrice = randomInt(100, 2000);
      const totalAmount = quantity * unitPrice;
      const discountPct = randomInt(0, 20);
      const finalAmount = Math.floor(totalAmount * (100 - discountPct) / 100);

      salesData.push({
        '@timestamp': getDateDaysAgo(daysAgo),
        order_id: `ORD-${String(i).padStart(6, '0')}`,
        product_name: randomChoice(products),
        category: randomChoice(categories),
        region: randomChoice(regions),
        sales_rep: randomChoice(salesReps),
        customer_name: randomChoice(customers),
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        discount_percentage: discountPct,
        final_amount: finalAmount,
        status: Math.random() < 0.9 ? 'completed' : 'cancelled',
        payment_method: randomChoice(['credit_card', 'bank_transfer', 'paypal']),
        shipping_cost: randomInt(10, 100),
        is_new_customer: Math.random() < 0.25
      });
    }

    // Bulk insert sales data
    const salesBulk = salesData.flatMap(doc => [
      { index: { _index: 'demo-sales' } },
      doc
    ]);

    await client.bulk({ refresh: true, body: salesBulk });
    console.log(`✅ Created ${salesData.length} sales records`);

    // Generate analytics data
    console.log('Creating demo analytics data...');
    const analyticsData = [];
    const pages = ['/home', '/products', '/checkout', '/profile', '/support', '/about'];
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    const devices = ['Desktop', 'Mobile', 'Tablet'];
    const sources = ['organic', 'paid_search', 'social', 'direct', 'referral'];
    const countries = ['USA', 'UK', 'Germany', 'France', 'Japan', 'Canada'];

    for (let i = 1; i <= 300; i++) {
      const daysAgo = randomInt(0, 30);
      const pageViews = randomInt(1, 10);
      const sessionDuration = randomInt(30, 1800);

      analyticsData.push({
        '@timestamp': getDateDaysAgo(daysAgo),
        session_id: `sess_${String(i).padStart(8, '0')}`,
        user_id: `user_${randomInt(1, 100)}`,
        page_url: randomChoice(pages),
        browser: randomChoice(browsers),
        device_type: randomChoice(devices),
        traffic_source: randomChoice(sources),
        country: randomChoice(countries),
        session_duration: sessionDuration,
        page_views: pageViews,
        is_bounce: pageViews === 1,
        converted: Math.random() < 0.05,
        load_time: randomInt(500, 5000),
        screen_resolution: randomChoice(['1920x1080', '375x667', '768x1024']),
        utm_campaign: Math.random() < 0.3 ? randomChoice(['summer_sale', 'social_promo']) : 'none'
      });
    }

    // Bulk insert analytics data
    const analyticsBulk = analyticsData.flatMap(doc => [
      { index: { _index: 'demo-analytics' } },
      doc
    ]);

    await client.bulk({ refresh: true, body: analyticsBulk });
    console.log(`✅ Created ${analyticsData.length} analytics events`);

    // Create data points
    console.log('🔧 Creating demo data points...');

    const dataPoints = [
      {
        name: 'Sales Overview',
        slug: 'demo-sales-overview',
        description: 'Key sales metrics and performance indicators',
        source: {
          indices: ['demo-sales'],
          timeField: '@timestamp',
          defaultTimeRange: 'now-30d'
        },
        query: {
          bool: {
            must: [{ term: { status: 'completed' } }]
          }
        },
        aggs: {
          total_revenue: { sum: { field: 'final_amount' } },
          total_orders: { value_count: { field: 'order_id.keyword' } },
          avg_order_value: { avg: { field: 'final_amount' } },
          revenue_by_region: {
            terms: { field: 'region.keyword', size: 10 },
            aggs: { revenue: { sum: { field: 'final_amount' } } }
          }
        },
        projections: ['order_id', 'product_name', 'final_amount', 'region'],
        tags: ['sales', 'revenue', 'overview']
      },
      {
        name: 'Product Performance',
        slug: 'demo-product-performance',
        description: 'Sales performance by product and category',
        source: {
          indices: ['demo-sales'],
          timeField: '@timestamp',
          defaultTimeRange: 'now-30d'
        },
        query: {
          bool: {
            must: [{ term: { status: 'completed' } }]
          }
        },
        aggs: {
          by_category: {
            terms: { field: 'category.keyword', size: 10 },
            aggs: {
              revenue: { sum: { field: 'final_amount' } },
              orders: { value_count: { field: 'order_id.keyword' } }
            }
          },
          top_products: {
            terms: { field: 'product_name.keyword', size: 10 },
            aggs: { revenue: { sum: { field: 'final_amount' } } }
          }
        },
        projections: ['product_name', 'category', 'final_amount'],
        tags: ['sales', 'products', 'performance']
      },
      {
        name: 'Website Traffic',
        slug: 'demo-website-traffic',
        description: 'Website traffic metrics and user behavior',
        source: {
          indices: ['demo-analytics'],
          timeField: '@timestamp',
          defaultTimeRange: 'now-7d'
        },
        aggs: {
          total_sessions: { cardinality: { field: 'session_id.keyword' } },
          total_users: { cardinality: { field: 'user_id.keyword' } },
          avg_session_duration: { avg: { field: 'session_duration' } },
          traffic_by_source: { terms: { field: 'traffic_source.keyword', size: 10 } },
          device_breakdown: { terms: { field: 'device_type.keyword', size: 5 } }
        },
        projections: ['session_id', 'page_url', 'device_type', 'traffic_source'],
        tags: ['analytics', 'traffic', 'users']
      }
    ];

    for (const dataPoint of dataPoints) {
      await axios.post(`${SERVER_URL}/api/v1/datapoints`, dataPoint);
    }
    console.log('✅ Data points created successfully!');

    // Create dashboards
    console.log('🎨 Creating demo dashboards...');

    const dashboards = [
      {
        name: 'Demo Sales Dashboard',
        slug: 'demo-sales-dashboard',
        description: 'Comprehensive sales performance overview with key metrics and trends',
        tags: ['sales', 'demo', 'revenue'],
        layout: { columns: 12, rows: 8, gap: 16 },
        widgets: [
          {
            id: 'revenue-metrics',
            type: 'metric',
            title: 'Revenue Overview',
            dataPointSlug: 'demo-sales-overview',
            position: { x: 0, y: 0, w: 4, h: 2 },
            config: { showTrend: true, format: 'currency' }
          },
          {
            id: 'regional-performance',
            type: 'bar',
            title: 'Revenue by Region',
            dataPointSlug: 'demo-sales-overview',
            position: { x: 4, y: 0, w: 4, h: 3 },
            config: { orientation: 'horizontal', showValues: true }
          },
          {
            id: 'category-breakdown',
            type: 'pie',
            title: 'Sales by Category',
            dataPointSlug: 'demo-product-performance',
            position: { x: 8, y: 0, w: 4, h: 3 },
            config: { showPercentage: true, legendPosition: 'bottom' }
          },
          {
            id: 'product-table',
            type: 'table',
            title: 'Top Products',
            dataPointSlug: 'demo-product-performance',
            position: { x: 0, y: 3, w: 12, h: 4 },
            config: { columns: ['product_name', 'revenue'], sortable: true }
          }
        ]
      },
      {
        name: 'Demo Analytics Dashboard',
        slug: 'demo-analytics-dashboard',
        description: 'Digital analytics overview with traffic sources, devices, and user behavior',
        tags: ['analytics', 'demo', 'digital'],
        layout: { columns: 12, rows: 8, gap: 16 },
        widgets: [
          {
            id: 'traffic-overview',
            type: 'metric',
            title: 'Traffic Overview',
            dataPointSlug: 'demo-website-traffic',
            position: { x: 0, y: 0, w: 3, h: 2 },
            config: { showTrend: true, format: 'number' }
          },
          {
            id: 'traffic-sources',
            type: 'pie',
            title: 'Traffic Sources',
            dataPointSlug: 'demo-website-traffic',
            position: { x: 3, y: 0, w: 4, h: 3 },
            config: { showPercentage: true, legendPosition: 'right' }
          },
          {
            id: 'device-breakdown',
            type: 'donut',
            title: 'Device Types',
            dataPointSlug: 'demo-website-traffic',
            position: { x: 7, y: 0, w: 5, h: 3 },
            config: { showPercentage: true, innerRadius: '40%' }
          },
          {
            id: 'traffic-table',
            type: 'table',
            title: 'Session Details',
            dataPointSlug: 'demo-website-traffic',
            position: { x: 0, y: 3, w: 12, h: 4 },
            config: { columns: ['session_id', 'page_url', 'device_type'], sortable: true }
          }
        ]
      }
    ];

    for (const dashboard of dashboards) {
      await axios.post(`${SERVER_URL}/api/v1/dashboards`, dashboard);
    }
    console.log('✅ Demo dashboards created successfully!');

    console.log('');
    console.log('💡 Demo setup complete!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`  • Created ${salesData.length} sales records in 'demo-sales' index`);
    console.log(`  • Created ${analyticsData.length} analytics events in 'demo-analytics' index`);
    console.log(`  • Created ${dataPoints.length} demo data points`);
    console.log(`  • Created ${dashboards.length} demo dashboards`);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('  1. Update server configuration to use demo indices:');
    console.log('     ES_ALLOWED_INDICES=demo-sales,demo-analytics');
    console.log('');
    console.log('  2. Visit the dashboard at:');
    console.log('     http://localhost:3000');
    console.log('');
    console.log('  3. Try these demo dashboards:');
    console.log('     • Demo Sales Dashboard');
    console.log('     • Demo Analytics Dashboard');
    console.log('');
    console.log('🎉 Happy exploring!');

  } catch (error) {
    console.error('❌ Error setting up demo data:', error.message);
    process.exit(1);
  }
}

setupDemoData();