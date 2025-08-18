# 🎯 Demo Setup Guide

This guide will help you set up a fully functional demo environment with rich sample data and pre-configured dashboards.

## 🚀 Quick Demo Setup

### Prerequisites
- Elasticsearch cluster running and accessible
- Node.js server running on port 4000
- React client running on port 3000

### 1. Run Demo Setup Script

```bash
# Navigate to the project root
cd /path/to/reports

# Run the demo setup script
./scripts/simple-demo-setup.sh
```

This script will:
- ✅ Create 20 sample sales records in `demo-sales` index
- ✅ Create 30 analytics events in `demo-analytics` index
- ✅ Create 3 demo data points
- ✅ Create 2 demo dashboards
- ✅ Update server configuration to use demo indices

### 2. Restart the Server

The script automatically updates the server configuration. Restart your server to load the new settings:

```bash
cd server
npm run dev
```

### 3. Access Demo Dashboards

Visit [http://localhost:3000](http://localhost:3000) and explore:

## 📊 Demo Content

### Sample Data

#### 🛒 Sales Data (demo-sales)
- **20 sales records** with realistic e-commerce data
- **Products**: Laptop Pro, Smartphone X, Tablet Air, Smart Watch
- **Regions**: North America, Europe, Asia Pacific, Latin America  
- **Sales Reps**: Alice Johnson, Bob Smith, Carol Davis
- **Revenue Range**: $1,000 - $6,000 per order
- **Time Range**: Last 30 days

#### 📈 Analytics Data (demo-analytics)
- **30 website sessions** with user behavior data
- **Pages**: /home, /products, /checkout, /profile
- **Devices**: Desktop, Mobile, Tablet
- **Traffic Sources**: organic, paid_search, social, direct
- **Countries**: USA, UK, Germany, France
- **Time Range**: Last 7 days

### Data Points

#### 1. Demo Sales Overview (`demo-sales-overview`)
- **Total Revenue**: Sum of all completed sales
- **Total Orders**: Count of completed orders
- **Average Order Value**: Mean order amount
- **Revenue by Region**: Breakdown by geographic region

#### 2. Demo Product Performance (`demo-product-performance`)
- **Revenue by Category**: Electronics, Computers, Mobile
- **Top Products**: Best-selling products by revenue
- **Product Details**: Individual product performance

#### 3. Demo Website Traffic (`demo-website-traffic`)
- **Total Sessions**: Unique website sessions
- **Total Users**: Unique visitors
- **Average Session Duration**: Time spent on site
- **Traffic Sources**: Breakdown by acquisition channel
- **Device Types**: Desktop vs Mobile vs Tablet usage

### Dashboards

#### 🎯 Demo Sales Dashboard
**Perfect for: Sales managers, executives, business analysts**

**Widgets:**
- **Revenue Overview** - Key metrics with trends
- **Revenue by Region** - Horizontal bar chart
- **Sales by Category** - Pie chart breakdown  
- **Sales Details** - Sortable data table

**Key Insights:**
- Total revenue: ~$26,590
- Top regions and product categories
- Individual order details

#### 📊 Demo Analytics Dashboard  
**Perfect for: Digital marketers, product managers, UX teams**

**Widgets:**
- **Traffic Overview** - Session and user metrics
- **Traffic Sources** - Acquisition channel breakdown
- **Device Types** - User device preferences
- **Session Details** - Individual session data

**Key Insights:**
- 9 unique sessions tracked
- Traffic source distribution
- Device usage patterns

## 🎨 UI Features Demonstrated

### ✨ Interactive Elements
- **Time Range Dropdown**: Select from 1 hour to "All Time"
- **Real-time Filtering**: Dynamic dashboard updates
- **Sortable Tables**: Click column headers to sort
- **Responsive Charts**: Built with ECharts for rich visualizations
- **Clean Material-UI Design**: Professional, modern interface

### 🔧 Chart Types
- **Metrics Cards**: KPI displays with trend indicators
- **Bar Charts**: Horizontal and vertical comparisons
- **Pie Charts**: Category breakdowns with percentages
- **Data Tables**: Sortable, filterable data grids
- **Donut Charts**: Alternative category visualizations

## 💡 Customization Tips

### Adding More Data
1. **Extend Sample Data**: Modify `scripts/simple-demo-setup.sh` to create more records
2. **Add New Fields**: Include additional properties in the sample data
3. **Create Time Series**: Generate data across longer time periods

### Creating New Dashboards
1. **Clone Existing**: Use demo dashboards as templates
2. **Mix Data Sources**: Combine sales and analytics data
3. **Experiment with Widgets**: Try different chart types and layouts

### Advanced Configurations
1. **Custom Aggregations**: Add complex calculations in data points
2. **Filtering**: Implement dashboard-level filters
3. **Drill-downs**: Create hierarchical navigation between dashboards

## 🔄 Reset Demo Environment

To start fresh:

```bash
# Delete demo indices
curl -k -X DELETE "https://localhost:9200/demo-*" -u "elastic:password"

# Re-run setup script
./scripts/simple-demo-setup.sh
```

## 🎉 Next Steps

1. **Explore the UI**: Navigate through both demo dashboards
2. **Test Time Ranges**: Try different time filters
3. **Examine Data Points**: View individual data point configurations
4. **Create Custom Views**: Build your own dashboards using the demo data
5. **Connect Real Data**: Replace demo indices with your actual data sources

## 💬 Demo Scenarios

### Executive Review Meeting
- Open **Demo Sales Dashboard**
- Set time range to "All Time"
- Present revenue overview and regional performance
- Drill down into product category details

### Marketing Team Analysis  
- Open **Demo Analytics Dashboard**
- Compare traffic sources and device usage
- Analyze session behavior patterns
- Plan optimization strategies

### Technical Demo
- Show time range filtering capabilities
- Demonstrate real-time dashboard updates
- Explain data point configuration
- Showcase responsive design

Enjoy exploring the Elasticsearch Reports Tool! 🚀