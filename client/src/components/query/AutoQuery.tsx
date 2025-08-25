import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  // Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Clear as ClearIcon,
  FilterList as FilterIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

import {
  QueryExecutionCard,
  QueryResultsSection,
  ExportActions,
} from '@/components/common';

import { useElasticsearchQuery } from '@/hooks/useElasticsearchQuery';
import { useElasticsearchPagination } from '@/hooks/useElasticsearchPagination';
import { useExcelExport } from '@/hooks/useExcelExport';

interface DefaultFilter {
  field: string;
  operator: string;
  value: string | number;
  type: 'term' | 'range' | 'match' | 'wildcard' | 'exists';
  label?: string;
}

const AutoQuery: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL state
  const [appliedFilters, setAppliedFilters] = useState<DefaultFilter[]>([]);
  const [urlCopied, setUrlCopied] = useState(false);
  const [autoExecuted, setAutoExecuted] = useState(false);

  // Parse URL parameters for pagination
  const urlFrom = useMemo(() => {
    const from = searchParams.get('from');
    return from ? parseInt(from) : 0;
  }, [searchParams]);

  const urlSize = useMemo(() => {
    const size = searchParams.get('size');
    return size ? parseInt(size) : 10;
  }, [searchParams]);

  // Use shared hooks
  const query = useElasticsearchQuery({
    onResult: () => {
      pagination.resetPagination();
    },
  });

  const pagination = useElasticsearchPagination(10);
  
  // Excel export functionality
  const excelExport = useExcelExport({
    selectedIndex: query.selectedIndex,
  });

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

    const queryObj = {
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

    return JSON.stringify(queryObj, null, 2);
  }, [searchParams, urlSize, urlFrom]);

  // Set index from URL
  useEffect(() => {
    const urlIndex = searchParams.get('index');
    if (urlIndex && query.availableIndexes.includes(urlIndex)) {
      query.setSelectedIndex(urlIndex);
    }
  }, [searchParams, query.availableIndexes]);

  // Apply filters and generate query when URL changes
  useEffect(() => {
    setAppliedFilters(defaultFilters);
    const generatedQuery = generateFilteredQuery(defaultFilters);
    query.setQueryText(generatedQuery);
  }, [defaultFilters, generateFilteredQuery, query]);

  // Auto-execute query if requested via URL or if there are filters applied
  useEffect(() => {
    const shouldAutoExecute = 
      (searchParams.get('autoExecute') === 'true') || 
      (appliedFilters.length > 0) ||
      (searchParams.get('query')); // Execute if there's a direct query parameter
      
    if (
      shouldAutoExecute && 
      query.selectedIndex && 
      query.queryText && 
      !query.loading &&
      !query.indexesLoading &&
      !autoExecuted
    ) {
      setAutoExecuted(true);
      // Execute after a small delay to ensure everything is set up
      const timer = setTimeout(() => {
        handleExecute();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [query.selectedIndex, query.queryText, appliedFilters, searchParams, query.indexesLoading, query.loading, autoExecuted]);

  // Enhanced execute function
  const handleExecute = useCallback(async () => {
    await query.executeQuery(urlFrom, urlSize);
  }, [query, urlFrom, urlSize]);

  // Handle query text change
  const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    query.setQueryText(event.target.value);
  }, [query]);

  // Remove a filter
  const removeFilter = (indexToRemove: number) => {
    // const updatedFilters = appliedFilters.filter((_, index) => index !== indexToRemove);
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
    query.clearResults();
    setAutoExecuted(false);
    pagination.resetPagination();
  };

  const { columns, rows } = query.result ? query.formatResultsForTable(pagination.getPaginatedHits(query.result)) : { columns: [], rows: [] };
  const totalHits = typeof query.result?.hits?.total === 'number' 
    ? query.result.hits.total 
    : query.result?.hits?.total?.value || 0;

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
          <QueryExecutionCard
            selectedIndex={query.selectedIndex}
            availableIndexes={query.availableIndexes}
            onIndexChange={query.setSelectedIndex}
            indexesLoading={query.indexesLoading}
            queryText={query.queryText}
            onQueryChange={handleQueryChange}
            onExecute={handleExecute}
            onClear={handleClear}
            loading={query.loading}
            showFromSize={false}
            title="Generated Query Configuration"
            showQueryGuidelines={false}
          >
            {query.result && (
              <ExportActions
                onExcelExport={() => excelExport.exportToExcel(query.result!, 'auto_query_results')}
                onColumnFilterClick={() => {}}
                selectedColumnsCount={0}
                totalColumnsCount={0}
                disabled={excelExport.isExportDisabled(query.result)}
                showExcelExport={true}
                showColumnFilter={false}
                excelLabel="Export Results"
              />
            )}
          </QueryExecutionCard>
        </Grid>

        {/* Results Section */}
        <QueryResultsSection
          result={query.result}
          error={query.error}
          loading={query.loading}
          columns={columns}
          rows={rows}
          page={pagination.page}
          rowsPerPage={pagination.rowsPerPage}
          totalHits={totalHits}
          onPageChange={pagination.handleChangePage}
          onRowsPerPageChange={pagination.handleChangeRowsPerPage}
          onRetryError={handleExecute}
          selectedIndex={query.selectedIndex}
          emptyMessage="No results found"
        />
      </Grid>
    </Box>
  );
};

export default AutoQuery;