import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

// Import existing components
import {
  QueryInput,
  DataTable,
  IndexSelector,
  ExportActions,
  ErrorDisplay,
  AggregationsDisplay,
  LoadingSpinner,
  ShareableLink,
} from '@/components/common';

import { DirectQueryRequest, DirectQueryResponse } from '@/types';
import { directQueryAPI } from '@/services/api';

interface DefaultFilter {
  field: string;
  operator: string;
  value: string | number;
  type: 'term' | 'range' | 'match' | 'wildcard' | 'exists';
  label?: string;
}

const AutoQuery: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [queryText, setQueryText] = useState<string>('');
  const [result, setResult] = useState<DirectQueryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableIndexes, setAvailableIndexes] = useState<string[]>([]);
  const [indexesLoading, setIndexesLoading] = useState<boolean>(true);
  const [appliedFilters, setAppliedFilters] = useState<DefaultFilter[]>([]);
  const [urlCopied, setUrlCopied] = useState(false);
  const [autoExecuted, setAutoExecuted] = useState(false);
  
  // Table pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Parse URL parameters for pagination
  const urlFrom = useMemo(() => {
    const from = searchParams.get('from');
    return from ? parseInt(from) : 0;
  }, [searchParams]);

  const urlSize = useMemo(() => {
    const size = searchParams.get('size');
    return size ? parseInt(size) : 10;
  }, [searchParams]);

  // Parse default filters from URL query parameters
  const defaultFilters = useMemo(() => {
    const filters: DefaultFilter[] = [];
    
    // Parse various filter formats from query parameters
    searchParams.forEach((value, key) => {
      // Skip special control parameters
      if (key === 'index' || key === 'from' || key === 'size' || key === 'autoExecute' || key === 'query') {
        return;
      }
      
      if (key.startsWith('filter_')) {
        try {
          const filterData = JSON.parse(value);
          filters.push({
            field: filterData.field || key.replace('filter_', ''),
            operator: filterData.operator || 'term',
            value: filterData.value || value,
            type: (filterData.type as DefaultFilter['type']) || 'term',
            label: filterData.label || `${filterData.field || key.replace('filter_', '')}: ${filterData.value || value}`,
          });
        } catch {
          // Fallback for simple key-value pairs
          filters.push({
            field: key.replace('filter_', ''),
            operator: 'term',
            value: value,
            type: 'term',
            label: `${key.replace('filter_', '')}: ${value}`,
          });
        }
      }
      // Handle nested field paths (e.g., Data.boundaryHierarchy.country)
      else if (key.includes('.')) {
        // For nested fields, check if the field likely needs .keyword suffix
        const fieldNeedsKeyword = !key.endsWith('.keyword') && 
                                 !key.includes('_id') && 
                                 !key.includes('count') &&
                                 !key.includes('amount') &&
                                 !key.includes('number') &&
                                 !key.includes('size') &&
                                 !key.includes('timestamp') &&
                                 !key.includes('date');
        
        filters.push({
          field: fieldNeedsKeyword ? `${key}.keyword` : key,
          operator: 'term',
          value: value,
          type: 'term',
          label: `${key}: ${value}`,
        });
      }
      // Handle common filter patterns
      else {
        switch (key) {
          case 'status':
            filters.push({
              field: 'status.keyword',
              operator: 'term',
              value: value,
              type: 'term',
              label: `Status: ${value}`,
            });
            break;
          case 'date_from':
            if (searchParams.get('date_to')) {
              filters.push({
                field: 'created_at',
                operator: 'range',
                value: `${value} TO ${searchParams.get('date_to')}`,
                type: 'range',
                label: `Date: ${value} to ${searchParams.get('date_to')}`,
              });
            }
            break;
          case 'project':
            filters.push({
              field: 'project.keyword',
              operator: 'term',
              value: value,
              type: 'term',
              label: `Project: ${value}`,
            });
            break;
          case 'user_id':
            filters.push({
              field: 'user_id',
              operator: 'term',
              value: parseInt(value),
              type: 'term',
              label: `User ID: ${value}`,
            });
            break;
          case 'search':
            filters.push({
              field: '_all',
              operator: 'match',
              value: value,
              type: 'match',
              label: `Search: ${value}`,
            });
            break;
          default:
            // For any other parameter, treat as a field filter
            const needsKeyword = typeof value === 'string' && 
                                !key.includes('_id') && 
                                !key.includes('count');
            filters.push({
              field: needsKeyword ? `${key}.keyword` : key,
              operator: 'term',
              value: value,
              type: 'term',
              label: `${key}: ${value}`,
            });
            break;
        }
      }
    });
    
    return filters;
  }, [searchParams]);

  // Generate Elasticsearch query with filters
  const generateFilteredQuery = useCallback((filters: DefaultFilter[]) => {
    // Check if there's a full query in the URL
    const urlQuery = searchParams.get('query');
    if (urlQuery) {
      try {
        const parsedQuery = JSON.parse(urlQuery);
        return JSON.stringify(parsedQuery, null, 2);
      } catch (e) {
        console.error('Failed to parse query from URL:', e);
      }
    }
    
    const mustClauses: any[] = [];
    
    filters.forEach(filter => {
      switch (filter.type) {
        case 'term':
          mustClauses.push({
            term: {
              [filter.field]: filter.value
            }
          });
          break;
        case 'range':
          if (typeof filter.value === 'string' && filter.value.includes(' TO ')) {
            const [fromVal, toVal] = filter.value.split(' TO ');
            mustClauses.push({
              range: {
                [filter.field]: {
                  gte: fromVal.trim(),
                  lte: toVal.trim()
                }
              }
            });
          }
          break;
        case 'match':
          mustClauses.push({
            match: {
              [filter.field]: filter.value
            }
          });
          break;
        case 'wildcard':
          mustClauses.push({
            wildcard: {
              [filter.field]: filter.value
            }
          });
          break;
        case 'exists':
          mustClauses.push({
            exists: {
              field: filter.field
            }
          });
          break;
      }
    });

    const query = {
      query: {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }]
        }
      },
      size: urlSize,
      from: urlFrom,
      sort: [
        { _score: { order: 'desc' } }
      ]
    };

    return JSON.stringify(query, null, 2);
  }, [searchParams, urlSize, urlFrom]);

  // Load available indexes on mount
  useEffect(() => {
    const loadIndexes = async () => {
      try {
        setIndexesLoading(true);
        const indexes = await directQueryAPI.getIndexes();
        setAvailableIndexes(indexes);
        
        // Check if index is specified in URL
        const urlIndex = searchParams.get('index');
        if (urlIndex && indexes.includes(urlIndex)) {
          setSelectedIndex(urlIndex);
        } else if (indexes.length > 0 && !selectedIndex) {
          setSelectedIndex(indexes[0]);
        }
      } catch (err) {
        setError(`Failed to load indexes: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIndexesLoading(false);
      }
    };

    loadIndexes();
  }, [searchParams]);

  // Apply filters and generate query when URL changes
  useEffect(() => {
    setAppliedFilters(defaultFilters);
    const generatedQuery = generateFilteredQuery(defaultFilters);
    setQueryText(generatedQuery);
  }, [defaultFilters, generateFilteredQuery]);

  // Execute query
  const executeQuery = useCallback(async () => {
    if (!selectedIndex) {
      setError('Please select an index');
      return;
    }

    if (!queryText.trim()) {
      setError('Please enter a query');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Parse the query
      let parsedQuery;
      try {
        parsedQuery = JSON.parse(queryText);
      } catch (parseError) {
        throw new Error(`Invalid JSON query: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Extract from and size from the parsed query if they exist
      const queryFrom = parsedQuery.from !== undefined ? parsedQuery.from : urlFrom;
      const querySize = parsedQuery.size !== undefined ? parsedQuery.size : urlSize;
      
      const request: DirectQueryRequest = {
        index: selectedIndex,
        query: parsedQuery,
        from: queryFrom,
        size: querySize,
      };

      const response = await directQueryAPI.execute(request);
      setResult(response);
      setError(null);
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError(String(err.message));
      } else {
        setError('An error occurred while executing the query');
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [selectedIndex, queryText, urlFrom, urlSize]);

  // Auto-execute query if requested via URL
  useEffect(() => {
    if (
      searchParams.get('autoExecute') === 'true' && 
      selectedIndex && 
      queryText && 
      !loading &&
      !indexesLoading &&
      !autoExecuted
    ) {
      setAutoExecuted(true);
      // Execute after a small delay to ensure everything is set up
      const timer = setTimeout(() => {
        executeQuery();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedIndex, queryText, searchParams, indexesLoading, loading, autoExecuted, executeQuery]);

  // Remove a filter
  const removeFilter = (indexToRemove: number) => {
    const updatedFilters = appliedFilters.filter((_, index) => index !== indexToRemove);
    const newParams = new URLSearchParams(searchParams);
    
    // Remove the filter from URL
    const filterToRemove = appliedFilters[indexToRemove];
    searchParams.forEach((value, key) => {
      if (key !== 'index' && key !== 'from' && key !== 'size' && key !== 'autoExecute') {
        const filterLabel = `${key}: ${value}`;
        if (filterToRemove.label === filterLabel || key === filterToRemove.field.replace('.keyword', '')) {
          newParams.delete(key);
        }
      }
    });
    
    setSearchParams(newParams);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    // Keep only control parameters
    if (searchParams.get('index')) newParams.set('index', searchParams.get('index')!);
    if (searchParams.get('from')) newParams.set('from', searchParams.get('from')!);
    if (searchParams.get('size')) newParams.set('size', searchParams.get('size')!);
    setSearchParams(newParams);
  };

  // Copy current URL to clipboard
  const copyUrlToClipboard = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  // Clear results
  const handleClear = () => {
    setResult(null);
    setError(null);
    setAutoExecuted(false);
    setPage(0);
  };

  // Handle pagination
  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Format result data for table display
  const formatResultsForTable = useCallback((hits: any[]) => {
    if (!hits || hits.length === 0) return { columns: [], rows: [] };

    // Get all unique keys from all documents
    const allKeys = new Set<string>();
    hits.forEach(hit => {
      if (hit._source) {
        const extractKeys = (obj: any, prefix = '') => {
          Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
              extractKeys(obj[key], fullKey);
            } else {
              allKeys.add(fullKey);
            }
          });
        };
        extractKeys(hit._source);
      }
    });

    // Create columns from current result
    const resultColumns = ['_id', '_score', ...Array.from(allKeys).sort()];
    
    // Create rows
    const rows = hits.map((hit, index) => {
      const row: any = {
        id: `${hit._id}-${index}`,
        _id: hit._id,
        _score: hit._score,
      };

      // Flatten the _source object
      const flattenObject = (obj: any, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            flattenObject(obj[key], fullKey);
          } else {
            row[fullKey] = obj[key];
          }
        });
      };

      if (hit._source) {
        flattenObject(hit._source);
      }

      return row;
    });

    return { columns: resultColumns, rows };
  }, []);

  // Get paginated data
  const getPaginatedHits = useCallback(() => {
    if (!result?.hits?.hits) return [];
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return result.hits.hits.slice(start, end);
  }, [result, page, rowsPerPage]);

  const { columns, rows } = result ? formatResultsForTable(getPaginatedHits()) : { columns: [], rows: [] };
  const totalHits = typeof result?.hits?.total === 'number' 
    ? result.hits.total 
    : result?.hits?.total?.value || 0;

  return (
    <Box>
      {/* URL Info Section */}
      <Card sx={{ mb: 3 }} elevation={2}>
        <CardHeader 
          title="Current URL Configuration"
          avatar={<LinkIcon color="primary" />}
          action={
            <Tooltip title={urlCopied ? "Copied!" : "Copy URL"}>
              <IconButton onClick={copyUrlToClipboard} color={urlCopied ? "success" : "default"}>
                {urlCopied ? <SuccessIcon /> : <CopyIcon />}
              </IconButton>
            </Tooltip>
          }
        />
        <CardContent>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
            <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {window.location.href}
            </Typography>
          </Paper>
          
          {searchParams.toString() && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Active Parameters:</Typography>
              <List dense>
                {Array.from(searchParams.entries()).map(([key, value]) => (
                  <ListItem key={key}>
                    <ListItemText 
                      primary={`${key}: ${value}`}
                      primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Applied Filters Display */}
      {appliedFilters.length > 0 && (
        <Card sx={{ mb: 3 }} elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FilterIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Applied Filters</Typography>
              <Box sx={{ ml: 'auto' }}>
                <Tooltip title="Clear all filters">
                  <IconButton onClick={clearAllFilters} size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {appliedFilters.map((filter, index) => (
                <Chip
                  key={index}
                  label={filter.label || `${filter.field}: ${filter.value}`}
                  variant="filled"
                  color="primary"
                  onDelete={() => removeFilter(index)}
                  deleteIcon={<ClearIcon />}
                  size="small"
                />
              ))}
            </Box>
            
            <Alert severity="info">
              {appliedFilters.length} filter{appliedFilters.length !== 1 ? 's' : ''} applied from URL parameters. 
              {searchParams.get('autoExecute') === 'true' ? ' Query will auto-execute.' : ' Click Execute to run the query.'}
            </Alert>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Query Configuration */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader 
              title="Query Configuration"
            />
            <CardContent>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <IndexSelector
                    selectedIndex={selectedIndex}
                    availableIndexes={availableIndexes}
                    onIndexChange={setSelectedIndex}
                    loading={indexesLoading}
                  />
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<ExecuteIcon />}
                    onClick={executeQuery}
                    disabled={loading || !selectedIndex || !queryText}
                  >
                    {loading ? 'Executing...' : 'Execute Query'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={handleClear}
                    disabled={loading}
                  >
                    Clear Results
                  </Button>
                  <ShareableLink
                    index={selectedIndex}
                    query={queryText}
                    from={urlFrom}
                    size={urlSize}
                    autoExecute={true}
                    buttonVariant="outlined"
                  />
                  {result && (
                    <ExportActions
                      data={result}
                      filename={`auto-query-${selectedIndex}`}
                    />
                  )}
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Generated Query:
              </Typography>
              <QueryInput
                value={queryText}
                onChange={setQueryText}
                error={error}
                placeholder="Query will be generated automatically from URL parameters"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Loading State */}
        {loading && (
          <Grid item xs={12}>
            <LoadingSpinner message="Executing query..." />
          </Grid>
        )}

        {/* Error Display */}
        {error && !loading && (
          <Grid item xs={12}>
            <ErrorDisplay
              error={error}
              onRetry={executeQuery}
              context="Query Execution"
            />
          </Grid>
        )}

        {/* Results */}
        {result && !loading && !error && (
          <>
            {/* Aggregations */}
            {result.aggregations && Object.keys(result.aggregations).length > 0 && (
              <Grid item xs={12}>
                <AggregationsDisplay 
                  aggregations={result.aggregations}
                  title="Query Aggregations"
                />
              </Grid>
            )}

            {/* Data Table */}
            <Grid item xs={12}>
              <DataTable
                columns={columns}
                rows={rows}
                page={page}
                rowsPerPage={rowsPerPage}
                totalCount={totalHits}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                loading={loading}
                emptyMessage="No results found"
              />
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
};

export default AutoQuery;