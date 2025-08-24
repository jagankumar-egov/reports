# DHR Phase 1 - User Guide

## Overview

The Digit Health Reports (DHR) system provides a web-based interface for querying health data stored in Elasticsearch. This guide is designed for business analysts, data analysts, and end users who need to extract and analyze health data.

## Getting Started

### Accessing the System

1. Open your web browser
2. Navigate to the DHR application URL (provided by your system administrator)
3. You should see the DHR interface with a sidebar navigation

### System Requirements

- **Browser**: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- **Network**: Access to the DHR application server
- **Permissions**: User account with appropriate data access rights

## Interface Overview

### Main Components

1. **Navigation Sidebar** (Left)
   - Direct ES Query option
   - Quick Actions section
   - Phase information

2. **Main Content Area** (Center)
   - Query Configuration panel
   - Query Guidelines (collapsible)
   - Results display area

3. **Action Buttons**
   - Execute Query
   - Clear Results  
   - Export Excel
   - Column Selection

## Core Functionality

### 1. Direct Elasticsearch Querying

#### What is Direct ES Query?
Direct Elasticsearch Query allows you to write and execute queries using Elasticsearch's native JSON syntax. This provides maximum flexibility for data retrieval and analysis.

#### When to Use Direct Queries
- Complex data analysis requirements
- Custom aggregations and statistics
- Advanced filtering and search operations
- When the built-in query builder doesn't meet your needs

### 2. Query Configuration

#### Index Selection
1. Click the "Select Index" dropdown
2. Choose from available health data indexes:
   - `project-index-v1` - Project and program data
   - `household-index-v1` - Household survey data
   - `project-task-index-v1` - Task and activity data
   - `stock-index-v1` - Inventory and supply data

#### Query Parameters
- **From (Offset)**: Starting record number (default: 0)
- **Size (Limit)**: Number of records to return (max: 1000)

#### Query JSON Input
Write your Elasticsearch query in the large text area using JSON syntax.

### 3. Query Guidelines & Examples

#### Accessing Guidelines
1. Look for the "Query Examples & Guidelines" section
2. Click the expand arrow (▼) to show/hide the guidelines
3. Browse through the tabbed examples:
   - **Basic Queries**: Simple search operations
   - **Filters**: Data filtering techniques
   - **Aggregations**: Statistical analysis
   - **Advanced**: Complex query patterns

#### Using Examples
1. Click on any example to view the query
2. Click the copy button (📋) in the top-right of each example
3. Paste into your query input area
4. Modify field names and values to match your data

## Query Examples by Category

### Basic Queries

#### 1. Get All Records
```json
{
  "query": {
    "match_all": {}
  },
  "size": 10
}
```
**Use Case**: Initial data exploration, getting sample records

#### 2. Search by Field
```json
{
  "query": {
    "match": {
      "projectName": "LLIN Distribution"
    }
  },
  "size": 20
}
```
**Use Case**: Find records containing specific text in a field

#### 3. Exact Match
```json
{
  "query": {
    "term": {
      "status.keyword": "completed"
    }
  },
  "size": 50
}
```
**Use Case**: Find records with exact status values

### Filter Queries

#### 1. Date Range Filter
```json
{
  "query": {
    "range": {
      "@timestamp": {
        "gte": "2024-01-01",
        "lte": "2024-12-31"
      }
    }
  },
  "size": 100
}
```
**Use Case**: Get data within specific date ranges

#### 2. Multiple Conditions (AND)
```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "district.keyword": "Kampala" } },
        { "range": { "population": { "gte": 1000 } } }
      ]
    }
  }
}
```
**Use Case**: Records meeting multiple criteria

#### 3. Exclude Records (NOT)
```json
{
  "query": {
    "bool": {
      "must_not": [
        { "term": { "status.keyword": "deleted" } }
      ]
    }
  }
}
```
**Use Case**: Exclude specific types of records

### Aggregation Queries

#### 1. Count by Category
```json
{
  "size": 0,
  "aggs": {
    "status_counts": {
      "terms": {
        "field": "status.keyword",
        "size": 10
      }
    }
  }
}
```
**Use Case**: Count records by status, district, or category

#### 2. Monthly Statistics
```json
{
  "size": 0,
  "aggs": {
    "monthly_data": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "month"
      }
    }
  }
}
```
**Use Case**: Analyze trends over time periods

#### 3. Statistical Summary
```json
{
  "size": 0,
  "aggs": {
    "population_stats": {
      "stats": {
        "field": "population"
      }
    }
  }
}
```
**Use Case**: Get min, max, average, sum of numeric fields

### Advanced Queries

#### 1. Wildcard Search
```json
{
  "query": {
    "wildcard": {
      "beneficiaryName.keyword": "*John*"
    }
  }
}
```
**Use Case**: Partial name matching

#### 2. Multi-Field Search
```json
{
  "query": {
    "multi_match": {
      "query": "malaria prevention",
      "fields": ["projectName", "description", "activities"]
    }
  }
}
```
**Use Case**: Search across multiple fields simultaneously

## Working with Results

### Understanding the Results Table

#### Column Information
- **_id**: Unique document identifier
- **_score**: Relevance score for search queries
- **Data columns**: Actual field values from your data

#### Row Interactions
- **Hover**: View full content in tooltips for long text
- **Scroll**: Navigate through large datasets
- **Sort**: Click column headers (when available)

### Column Management

#### Selecting Columns
1. Click the "Columns" button (shows current selection count)
2. Use the checkbox list to select/deselect fields
3. Use "Select All" or "Clear All" for bulk operations
4. Click "Reset" to restore default selections

#### Column Preferences
- Your column selections are automatically saved per index
- When you switch back to an index, your previous selections are restored
- Clear preferences using the "Reset" button if needed

### Data Export

#### Excel Export
1. Execute your query to get results
2. Click the "Export Excel" button
3. The file will download with a timestamp
4. Exported data includes all results (not just the current page)

#### Export File Format
- Filename: `{index-name}_query_results_{date}.xlsx`
- Contains: All selected columns and all matching records
- Format: Standard Excel spreadsheet

## Best Practices

### Query Performance

#### 1. Use Appropriate Size Limits
- Start with small sizes (10-50) for testing
- Increase gradually for production queries
- Maximum limit is 1000 records per query

#### 2. Field Filtering
- Select only necessary columns to reduce data transfer
- Use the column selection feature effectively
- Consider network bandwidth limitations

#### 3. Date Range Filtering
- Always use date ranges when querying time-series data
- Avoid queries without time boundaries on large datasets
- Use specific date formats: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`

### Query Development

#### 1. Start Simple
- Begin with basic queries like `match_all`
- Add complexity incrementally
- Test each modification before proceeding

#### 2. Use Guidelines
- Refer to the built-in query examples
- Copy and modify rather than writing from scratch
- Understand the query structure before customizing

#### 3. Field Name Accuracy
- Field names are case-sensitive
- Use `.keyword` suffix for exact matches on text fields
- Check available fields by running a small query first

### Data Analysis Tips

#### 1. Exploratory Analysis
```json
{
  "query": { "match_all": {} },
  "size": 5
}
```
Run this first to understand data structure and field names.

#### 2. Statistical Overview
Use aggregation queries to get data summaries before detailed analysis.

#### 3. Progressive Filtering
- Start broad, then add specific filters
- Save complex queries for reuse
- Document your successful query patterns

## Troubleshooting

### Common Issues

#### 1. No Results Returned
**Possible Causes:**
- Field names misspelled
- Date ranges too restrictive
- Status filters excluding all data

**Solutions:**
- Verify field names with a sample query
- Expand date ranges
- Remove filters one by one to identify issues

#### 2. Query Syntax Errors
**Common Problems:**
- Missing commas or brackets
- Incorrect JSON structure
- Invalid field references

**Solutions:**
- Use the query examples as templates
- Validate JSON syntax using online tools
- Check error messages in the red alert box

#### 3. Slow Query Performance
**Possible Causes:**
- Large result sets without pagination
- Complex aggregations on large datasets
- Missing date range filters

**Solutions:**
- Reduce query size parameter
- Add date range filters
- Use column selection to limit returned fields

#### 4. Column Selection Not Working
**Possible Causes:**
- Page needs refresh
- Browser cache issues
- Field names changed in data

**Solutions:**
- Refresh the page
- Clear browser cache
- Click "Reset" in column selection

### Error Messages

#### "Index not found"
The selected index doesn't exist or you don't have access permissions.

#### "Query parsing error"
Your JSON query has syntax errors. Check brackets, commas, and quotes.

#### "Search timeout"
The query is taking too long. Add date range filters or reduce scope.

#### "Too many results"
The query would return more than the maximum allowed records. Add filters or reduce size.

## Data Understanding

### Health Data Structure

#### Common Field Types
- **@timestamp**: Date/time of record creation
- **id**: Unique identifiers
- **location fields**: district, village, coordinates
- **demographic fields**: age, gender, population
- **program fields**: projectName, activities, status
- **numeric fields**: counts, measurements, scores

#### Field Naming Conventions
- **Nested objects**: Use dot notation (e.g., `address.district`)
- **Keywords**: Exact match fields end with `.keyword`
- **Analyzed text**: Full-text search fields without suffix
- **Dates**: Usually in ISO format or timestamp

### Typical Use Cases

#### 1. Program Monitoring
Query project data to track implementation progress, beneficiary counts, and completion rates.

#### 2. Geographic Analysis
Filter by districts or regions to understand geographic distribution of programs or health outcomes.

#### 3. Trend Analysis
Use date aggregations to identify patterns over time in health indicators or program activities.

#### 4. Beneficiary Analysis
Search and analyze beneficiary data to understand demographics and program participation.

#### 5. Resource Tracking
Query stock and resource data to monitor supplies, distribution, and inventory levels.

## Getting Help

### Built-in Resources
1. **Query Guidelines**: Expandable panel with examples
2. **Copy Examples**: Use the copy button in examples
3. **Column Tooltips**: Hover over data cells for full content

### Support Contacts
- **Technical Issues**: Contact your system administrator
- **Data Questions**: Reach out to your data team
- **Training**: Request additional training sessions if needed

### Additional Resources
- **Elasticsearch Documentation**: For advanced query syntax
- **JSON Validators**: Online tools to check query syntax
- **Excel Training**: For working with exported data

## Appendix

### Quick Reference

#### Essential Query Structure
```json
{
  "query": {
    // Your query logic here
  },
  "size": 10,
  "from": 0
}
```

#### Common Field Suffixes
- `.keyword` - Exact match, aggregation-friendly
- `.text` - Full-text search (usually default)
- `.raw` - Unprocessed field value

#### Date Format Examples
- `2024-01-01` - Simple date
- `2024-01-01T10:30:00` - Date with time
- `now-30d` - 30 days ago
- `2024-01-01||+1M` - First day of next month

### Keyboard Shortcuts
- **Ctrl/Cmd + Enter**: Execute query (when in query text area)
- **Ctrl/Cmd + A**: Select all text in query area
- **Ctrl/Cmd + C**: Copy selected text