# URL Parameter Filtering Examples

This document provides practical examples of how to use URL parameter filtering in the DHR Direct Query interface.

## Important: Query Execution Parameters

### Key Parameters for Query Control:
- **`index`**: Specify the Elasticsearch index to query
- **`from`**: Starting position for results (pagination)
- **`size`**: Number of results to return
- **`autoExecute`**: Set to `true` to automatically run the query on page load
- **`query`**: Full Elasticsearch query JSON (URL encoded)

### Example with All Parameters:
```
http://localhost:5173/direct-query?index=project-index-v1&from=0&size=50&status=active&autoExecute=true
```

## Nested Field Filtering

The system automatically handles nested field paths with dots. For text fields, it automatically adds `.keyword` for exact matching.

### Example with Nested Fields:
```
# Filter by nested field (automatically adds .keyword for text fields)
http://localhost:5173/direct-query?index=project-index-v1&Data.boundaryHierarchy.country=Mozambique&autoExecute=true

# Multiple nested fields
http://localhost:5173/direct-query?Data.boundaryHierarchy.country=Mozambique&Data.type=household&autoExecute=true

# Nested field that's already a keyword field
http://localhost:5173/direct-query?Data.status.keyword=active

# Nested numeric field (no .keyword added)
http://localhost:5173/direct-query?Data.metrics.count=100
```

**Generated Query for Nested Field:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "Data.boundaryHierarchy.country.keyword": "Mozambique"
          }
        }
      ]
    }
  }
}
```

## Quick Start Examples

### Basic Status Filter with Auto-Execute
```
http://localhost:5173/direct-query?index=project-index-v1&status=active&autoExecute=true
```
**Generated Query:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "status.keyword": "active"
          }
        }
      ]
    }
  },
  "size": 10,
  "from": 0,
  "sort": [
    { "_score": { "order": "desc" } }
  ]
}
```

### Project and User Filter
```
http://localhost:5173/direct-query?project=health&user_id=123
```
**Generated Query:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "project.keyword": "health"
          }
        },
        {
          "term": {
            "user_id": 123
          }
        }
      ]
    }
  },
  "size": 10,
  "from": 0,
  "sort": [
    { "_score": { "order": "desc" } }
  ]
}
```

### Date Range Filter
```
http://localhost:5173/direct-query?date_from=2024-01-01&date_to=2024-12-31
```
**Generated Query:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "created_at": {
              "gte": "2024-01-01",
              "lte": "2024-12-31"
            }
          }
        }
      ]
    }
  },
  "size": 10,
  "from": 0,
  "sort": [
    { "_score": { "order": "desc" } }
  ]
}
```

### Text Search Filter
```
http://localhost:5173/direct-query?search=patient%20data
```
**Generated Query:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "_all": "patient data"
          }
        }
      ]
    }
  },
  "size": 10,
  "from": 0,
  "sort": [
    { "_score": { "order": "desc" } }
  ]
}
```

## Advanced Custom Filters

### Custom Field Filter (Simple)
```
http://localhost:5173/direct-query?filter_department=cardiology
```
**Generated Query:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "department": "cardiology"
          }
        }
      ]
    }
  },
  "size": 10,
  "from": 0,
  "sort": [
    { "_score": { "order": "desc" } }
  ]
}
```

### Custom Field Filter (Complex JSON)
```
http://localhost:5173/direct-query?filter_priority={"field":"priority","operator":"range","value":"1 TO 5","type":"range","label":"Priority: 1-5"}
```
**Generated Query:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "priority": {
              "gte": "1",
              "lte": "5"
            }
          }
        }
      ]
    }
  },
  "size": 10,
  "from": 0,
  "sort": [
    { "_score": { "order": "desc" } }
  ]
}
```

### Wildcard Filter
```
http://localhost:5173/direct-query?filter_name={"field":"name","operator":"wildcard","value":"*john*","type":"wildcard","label":"Name contains: john"}
```
**Generated Query:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "wildcard": {
            "name": "*john*"
          }
        }
      ]
    }
  },
  "size": 10,
  "from": 0,
  "sort": [
    { "_score": { "order": "desc" } }
  ]
}
```

## Real-World Use Cases

### Healthcare Dashboard Links
```html
<!-- Active patients in cardiology -->
<a href="/direct-query?status=active&filter_department=cardiology">
  View Active Cardiology Patients
</a>

<!-- Recent admissions -->
<a href="/direct-query?date_from=2024-01-01&filter_admission_type=emergency">
  Emergency Admissions This Year
</a>

<!-- Patient search -->
<a href="/direct-query?search=diabetes&status=active">
  Active Diabetes Patients
</a>
```

### Project Management Links
```html
<!-- Open tasks for a project -->
<a href="/direct-query?project=webapp&status=open">
  Open WebApp Tasks
</a>

<!-- High priority items -->
<a href="/direct-query?filter_priority={"field":"priority","value":"high","type":"term"}">
  High Priority Items
</a>

<!-- Recent activity -->
<a href="/direct-query?date_from=2024-01-01&filter_activity_type=updated">
  Recently Updated Items
</a>
```

## Filter Combinations

### Multiple Filters Example
```
http://localhost:5173/direct-query?status=active&project=health&user_id=123&date_from=2024-01-01&search=patient
```

This creates a comprehensive query filtering for:
- Status: active
- Project: health  
- User ID: 123
- Date range: from 2024-01-01
- Text search: patient

### Complex Healthcare Query
```
http://localhost:5173/direct-query?status=active&filter_department=cardiology&filter_priority={"field":"priority","value":"high","type":"term"}&date_from=2024-01-01&date_to=2024-12-31
```

This creates a query for:
- Active records
- Cardiology department
- High priority
- Within the year 2024

## Filter Types Reference

| Type | Usage | Example |
|------|-------|---------|
| `term` | Exact match | `{"field":"status","value":"active","type":"term"}` |
| `range` | Numeric/date range | `{"field":"age","value":"18 TO 65","type":"range"}` |
| `match` | Text search | `{"field":"description","value":"patient","type":"match"}` |
| `wildcard` | Pattern matching | `{"field":"name","value":"*john*","type":"wildcard"}` |
| `exists` | Field existence | `{"field":"email","type":"exists"}` |

## Tips for URL Construction

1. **URL Encoding**: Remember to URL encode special characters
   - Space: `%20`
   - Quotes: `%22`
   - Curly braces: `%7B` and `%7D`

2. **JSON Filters**: For complex filters, construct JSON and URL encode it
   ```javascript
   const filter = {
     field: "priority",
     value: "high", 
     type: "term",
     label: "Priority: High"
   };
   const encodedFilter = encodeURIComponent(JSON.stringify(filter));
   const url = `/direct-query?filter_priority=${encodedFilter}`;
   ```

3. **Testing**: Use browser developer tools to test URLs and inspect generated queries

4. **Bookmarking**: Users can bookmark filtered query URLs for quick access to common searches