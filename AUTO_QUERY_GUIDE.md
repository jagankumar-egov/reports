# Auto Query Guide

The Auto Query page is a dedicated interface for executing Elasticsearch queries based on URL parameters. It's perfect for creating bookmarkable queries, dashboard links, and automated reporting.

## Key Differences from Direct Query

| Feature | Direct Query | Auto Query |
|---------|-------------|------------|
| **Purpose** | Manual query editing | URL-driven queries |
| **Query Generation** | Manual | Automatic from URL |
| **Best For** | Development & testing | Dashboards & links |
| **URL Parameters** | Not used | Fully utilized |
| **Auto-Execute** | No | Yes (with parameter) |

## URL Structure

```
/auto-query?[parameters]
```

### Essential Parameters

- **`index`** - Elasticsearch index to query
- **`autoExecute`** - Set to `true` to run query immediately on page load

### Example URLs

#### Basic Query with Auto-Execute
```
http://localhost:3001/auto-query?index=project-index-v1&autoExecute=true
```

#### Filtered Query
```
http://localhost:3001/auto-query?index=project-index-v1&Data.boundaryHierarchy.country=Mozambique&autoExecute=true
```

#### Query with Pagination
```
http://localhost:3001/auto-query?index=project-index-v1&from=0&size=50&status=active&autoExecute=true
```

## Supported Filter Types

### 1. Simple Field Filters
Any URL parameter that doesn't match a reserved keyword becomes a filter:

```
?status=active
?department=cardiology
?userId=12345
```

### 2. Nested Field Filters
Use dot notation for nested fields:

```
?Data.boundaryHierarchy.country=Mozambique
?Data.type=household
?metadata.source.system=healthcare
```

**Note**: The system automatically adds `.keyword` suffix for text fields requiring exact matching.

### 3. Date Range Filters
Use `date_from` and `date_to` for date ranges:

```
?date_from=2024-01-01&date_to=2024-12-31
```

### 4. Text Search
Use the `search` parameter for full-text search:

```
?search=patient%20care
```

### 5. Custom Filters
Use `filter_` prefix for complex filters:

```
?filter_priority={"field":"priority","operator":"range","value":"1 TO 5","type":"range"}
```

## Real-World Examples

### Healthcare Dashboard

#### Active Patients in Mozambique
```
/auto-query?index=health-data&Data.boundaryHierarchy.country=Mozambique&status=active&autoExecute=true
```

#### Emergency Admissions Today
```
/auto-query?index=admissions&type=emergency&date_from=2024-01-01&date_to=2024-01-01&autoExecute=true
```

### Project Management

#### Open High-Priority Tasks
```
/auto-query?index=tasks&status=open&priority=high&autoExecute=true
```

#### Team Member's Tasks
```
/auto-query?index=tasks&assignee=john.doe&status=in_progress&autoExecute=true
```

## Features

### 1. Visual URL Display
- Shows the current URL with all parameters
- Copy button for easy sharing
- Lists all active parameters

### 2. Filter Management
- Visual chips for each applied filter
- Individual filter removal
- Clear all filters option

### 3. Query Preview
- Shows the generated Elasticsearch query
- Editable before execution
- Syntax highlighted

### 4. Auto-Execution
- Queries run automatically when `autoExecute=true`
- Useful for dashboard integration
- Shows loading state during execution

### 5. Results Display
- Full data table with pagination
- Aggregations visualization
- Export to Excel functionality

## Integration Examples

### HTML Dashboard Links
```html
<a href="/auto-query?index=projects&status=active&autoExecute=true">
  View Active Projects
</a>
```

### JavaScript Dynamic URLs
```javascript
function createQueryUrl(filters) {
  const params = new URLSearchParams({
    index: 'my-index',
    autoExecute: 'true',
    ...filters
  });
  return `/auto-query?${params.toString()}`;
}

// Usage
const url = createQueryUrl({
  'Data.boundaryHierarchy.country': 'Mozambique',
  'status': 'active',
  'from': 0,
  'size': 100
});
```

### React Navigation
```jsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const openFilteredQuery = () => {
    const params = new URLSearchParams({
      index: 'health-data',
      'Data.boundaryHierarchy.country': 'Mozambique',
      autoExecute: 'true'
    });
    navigate(`/auto-query?${params.toString()}`);
  };
  
  return (
    <button onClick={openFilteredQuery}>
      View Mozambique Data
    </button>
  );
}
```

## Tips & Best Practices

1. **Always Include Index**: The `index` parameter is required for queries to execute

2. **URL Encoding**: Remember to URL encode special characters:
   - Space → `%20`
   - Quotes → `%22`
   - Special chars → Use `encodeURIComponent()`

3. **Bookmarking**: Save frequently used queries as bookmarks for quick access

4. **Dashboard Integration**: Use `autoExecute=true` for embedded dashboard views

5. **Testing URLs**: Use the browser's address bar to test and refine your query URLs

6. **Field Naming**: 
   - Text fields automatically get `.keyword` suffix
   - Numeric fields remain unchanged
   - Already suffixed fields are not modified

## Troubleshooting

### Query Not Executing
- Ensure `index` parameter is present
- Check if `autoExecute=true` is set
- Verify the index exists and is accessible

### Filters Not Applied
- Check field names match your index mapping
- Ensure proper URL encoding for special characters
- Verify nested field paths are correct

### No Results
- Check if filters are too restrictive
- Verify the index contains data
- Test with fewer filters first

## Advanced Usage

### Complex Query with Full JSON
You can pass a complete Elasticsearch query as JSON:

```
/auto-query?index=my-index&query={"query":{"bool":{"must":[{"term":{"status":"active"}}]}}}&autoExecute=true
```

Note: The JSON must be URL encoded.

### Programmatic URL Generation
```javascript
const generateAutoQueryUrl = (config) => {
  const { index, filters = {}, pagination = {}, autoExecute = true } = config;
  
  const params = new URLSearchParams({
    index,
    ...pagination,
    ...filters,
    autoExecute: autoExecute.toString()
  });
  
  return `/auto-query?${params.toString()}`;
};

// Example usage
const url = generateAutoQueryUrl({
  index: 'health-data',
  filters: {
    'Data.boundaryHierarchy.country': 'Mozambique',
    'status': 'active'
  },
  pagination: {
    from: 0,
    size: 50
  },
  autoExecute: true
});
```