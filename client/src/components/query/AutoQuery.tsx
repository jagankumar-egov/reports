import React, { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Link as LinkIcon,
  PlayArrow as ExecuteIcon,
} from '@mui/icons-material';

import {
  QueryResultsSection,
  ExportActions,
  ColumnFilter,
  IndexSelector,
  LoadingSpinner,
  ErrorDisplay,
} from '@/components/common';

import { useAutoQueryState, DefaultFilter } from '@/hooks/useAutoQueryState';
import { useExcelExport } from '@/hooks/useExcelExport';
import {
  getSelectedColumnsForIndex,
  saveColumnPreferences,
  clearColumnPreferencesForIndex,
} from '@/utils/excelExport';

const AutoQuery: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Use centralized state management
  const autoQueryState = useAutoQueryState();
  
  // Excel export functionality
  const excelExport = useExcelExport({
    selectedIndex: autoQueryState.config.selectedIndex,
    selectedColumns: autoQueryState.config.selectedColumns,
  });

  // Parse default filters from URL query parameters
  const defaultFilters = useMemo(() => {
    const filters: DefaultFilter[] = [];
    
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
                field: '@timestamp',
                operator: 'range',
                value: `${value} TO ${searchParams.get('date_to')}`,
                type: 'range',
                label: `Date: ${value} to ${searchParams.get('date_to')}`,
              });
            }
            break;
          default:
            // Generic filter
            filters.push({
              field: key,
              operator: 'term',
              value: value,
              type: 'term',
              label: `${key}: ${value}`,
            });
        }
      }
    });
    
    return filters;
  }, [searchParams]);

  // Track initialization to prevent re-renders
  const [initialized, setInitialized] = React.useState(false);

  // Initialize from URL parameters
  useEffect(() => {
    if (initialized) return;

    const indexFromUrl = searchParams.get('index');
    const queryFromUrl = searchParams.get('query');
    const autoExecute = searchParams.get('autoExecute') === 'true';

    // If there's a direct query parameter, redirect to Direct Query page
    if (queryFromUrl && indexFromUrl) {
      const redirectUrl = new URL('/direct-query', window.location.origin);
      redirectUrl.searchParams.set('index', indexFromUrl);
      redirectUrl.searchParams.set('query', queryFromUrl);
      redirectUrl.searchParams.set('autoExecute', 'true');
      if (searchParams.get('from')) redirectUrl.searchParams.set('from', searchParams.get('from')!);
      if (searchParams.get('size')) redirectUrl.searchParams.set('size', searchParams.get('size')!);
      
      window.location.href = redirectUrl.toString();
      return;
    }

    // Set index if provided
    if (indexFromUrl && indexFromUrl !== autoQueryState.config.selectedIndex) {
      autoQueryState.setSelectedIndex(indexFromUrl);
    }

    // Handle filter-based queries
    if (defaultFilters.length > 0) {
      autoQueryState.setAppliedFilters(defaultFilters);
      
      // Auto-execute if requested
      if (autoExecute && indexFromUrl) {
        setTimeout(() => autoQueryState.executeQuery(), 100);
      }
    }

    setInitialized(true);
  }, []);

  // Handle URL parameter changes after initialization
  useEffect(() => {
    if (!initialized) return;

    const indexFromUrl = searchParams.get('index');
    
    if (indexFromUrl && indexFromUrl !== autoQueryState.config.selectedIndex) {
      autoQueryState.setSelectedIndex(indexFromUrl);
    }
  }, [initialized, searchParams]);

  // Handle index change
  const handleIndexChange = useCallback((index: string) => {
    autoQueryState.setSelectedIndex(index);
    
    // Load saved column preferences for this index
    const savedColumns = getSelectedColumnsForIndex(index);
    if (savedColumns && savedColumns.length > 0) {
      autoQueryState.setSelectedColumns(savedColumns);
    }
    
    // Update URL
    const newSearchParams = new URLSearchParams(searchParams);
    if (index) {
      newSearchParams.set('index', index);
    } else {
      newSearchParams.delete('index');
    }
    setSearchParams(newSearchParams);
  }, [autoQueryState, searchParams, setSearchParams]);

  // Handle filter removal
  const handleFilterRemove = useCallback((filterIndex: number) => {
    autoQueryState.removeFilter(filterIndex);
  }, [autoQueryState]);

  // Handle clear all filters
  const handleClearAllFilters = useCallback(() => {
    autoQueryState.clearFilters();
  }, [autoQueryState]);

  // Handle execute query
  const handleExecuteQuery = useCallback(async () => {
    await autoQueryState.executeQuery();
  }, [autoQueryState]);

  // Handle Excel export
  const handleExcelExport = useCallback(() => {
    if (autoQueryState.result) {
      excelExport.exportToExcel(autoQueryState.result, 'auto_query_results');
    }
  }, [autoQueryState.result, excelExport]);

  // Handle column selection change with persistence
  const handleColumnToggle = useCallback((column: string) => {
    autoQueryState.handleColumnToggle(column);
    
    // Save preferences to session storage
    if (autoQueryState.config.selectedIndex) {
      const newSelection = autoQueryState.config.selectedColumns.includes(column)
        ? autoQueryState.config.selectedColumns.filter(col => col !== column)
        : [...autoQueryState.config.selectedColumns, column];
      saveColumnPreferences(autoQueryState.config.selectedIndex, newSelection);
    }
  }, [autoQueryState]);

  // Handle select all/none for columns with persistence
  const handleSelectAllColumns = useCallback(() => {
    autoQueryState.handleSelectAllColumns();
    if (autoQueryState.config.selectedIndex) {
      const columnsToSelect = autoQueryState.schemaColumns.length > 0 
        ? autoQueryState.schemaColumns 
        : autoQueryState.config.availableColumns;
      saveColumnPreferences(autoQueryState.config.selectedIndex, columnsToSelect);
    }
  }, [autoQueryState]);

  const handleSelectNoColumns = useCallback(() => {
    autoQueryState.handleSelectNoColumns();
    if (autoQueryState.config.selectedIndex) {
      saveColumnPreferences(autoQueryState.config.selectedIndex, ['_id']);
    }
  }, [autoQueryState]);

  // Column filter popover handlers
  const handleColumnFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    autoQueryState.setColumnAnchorEl(event.currentTarget);
    autoQueryState.setColumnFilterOpen(true);
  }, [autoQueryState]);

  const handleColumnFilterClose = useCallback(() => {
    autoQueryState.setColumnFilterOpen(false);
    autoQueryState.setColumnAnchorEl(null);
  }, [autoQueryState]);

  // Generate shareable URL
  const generateShareableUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('index', autoQueryState.config.selectedIndex);
    url.searchParams.set('autoExecute', 'true');
    
    // Add filters to URL
    autoQueryState.config.appliedFilters.forEach((filter, index) => {
      url.searchParams.set(`filter_${index}`, JSON.stringify({
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
        type: filter.type,
        label: filter.label,
      }));
    });
    
    return url.toString();
  }, [autoQueryState.config.selectedIndex, autoQueryState.config.appliedFilters]);

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateShareableUrl());
      // You might want to add a toast notification here
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  }, [generateShareableUrl]);

  // Get formatted results for table display
  const { columns, rows } = autoQueryState.getFormattedResults();
  const totalHits = typeof autoQueryState.result?.hits?.total === 'number' 
    ? autoQueryState.result.hits.total 
    : autoQueryState.result?.hits?.total?.value || 0;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterIcon />
        Auto Query
      </Typography>
      
      <Grid container spacing={3}>
        {/* Configuration Section */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader
              title="Query Configuration"
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Copy shareable URL">
                    <IconButton onClick={handleCopyUrl} disabled={!autoQueryState.config.selectedIndex}>
                      <LinkIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* Index Selection */}
                <Grid item xs={12} md={6}>
                  <IndexSelector
                    selectedIndex={autoQueryState.config.selectedIndex}
                    availableIndexes={autoQueryState.availableIndexes}
                    onIndexChange={handleIndexChange}
                    loading={autoQueryState.indexesLoading}
                  />
                </Grid>

                {/* Show All Data Toggle */}
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoQueryState.config.showAllData}
                        onChange={(e) => autoQueryState.setShowAllData(e.target.checked)}
                      />
                    }
                    label="Show All Data (no filters required)"
                  />
                </Grid>

                {/* Action Buttons */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={autoQueryState.loading ? <LoadingSpinner size={16} /> : <ExecuteIcon />}
                      onClick={handleExecuteQuery}
                      disabled={autoQueryState.loading || !autoQueryState.config.selectedIndex}
                      size="large"
                    >
                      {autoQueryState.loading ? 'Executing...' : 'Execute Query'}
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<ClearIcon />}
                      onClick={autoQueryState.clearResults}
                      disabled={autoQueryState.loading}
                    >
                      Clear Results
                    </Button>

                    {autoQueryState.result && rows.length > 0 && (
                      <ExportActions
                        onExcelExport={handleExcelExport}
                        onColumnFilterClick={handleColumnFilterClick}
                        selectedColumnsCount={autoQueryState.config.selectedColumns.length}
                        totalColumnsCount={autoQueryState.schemaColumns.length > 0 ? autoQueryState.schemaColumns.length : autoQueryState.config.availableColumns.length}
                        disabled={autoQueryState.loading}
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Applied Filters Section */}
        {autoQueryState.config.appliedFilters.length > 0 && (
          <Grid item xs={12}>
            <Card elevation={1}>
              <CardHeader
                title={`Applied Filters (${autoQueryState.config.appliedFilters.length})`}
                action={
                  <Button
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={handleClearAllFilters}
                  >
                    Clear All
                  </Button>
                }
              />
              <CardContent>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {autoQueryState.config.appliedFilters.map((filter, index) => (
                    <Chip
                      key={`${filter.field}-${filter.value}-${index}`}
                      label={filter.label || `${filter.field}: ${filter.value}`}
                      onDelete={() => handleFilterRemove(index)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Loading State */}
        {autoQueryState.loading && (
          <Grid item xs={12}>
            <LoadingSpinner message="Executing auto query..." />
          </Grid>
        )}

        {/* Error Display */}
        {autoQueryState.error && !autoQueryState.loading && (
          <Grid item xs={12}>
            <ErrorDisplay
              error={autoQueryState.error}
              onRetry={handleExecuteQuery}
              context="Auto Query Execution"
            />
          </Grid>
        )}

        {/* Results Section */}
        {autoQueryState.result && !autoQueryState.loading && !autoQueryState.error && (
          <QueryResultsSection
            result={autoQueryState.result}
            error={autoQueryState.error}
            loading={autoQueryState.loading}
            columns={columns}
            rows={rows}
            page={autoQueryState.config.page}
            rowsPerPage={autoQueryState.config.rowsPerPage}
            totalHits={totalHits}
            onPageChange={autoQueryState.handlePageChange}
            onRowsPerPageChange={autoQueryState.handleRowsPerPageChange}
            onRetryError={handleExecuteQuery}
            selectedIndex={autoQueryState.config.selectedIndex}
            emptyMessage="No results found"
          >
            {/* Column Filter Popover */}
            <ColumnFilter
              open={autoQueryState.columnFilterOpen}
              anchorEl={autoQueryState.columnAnchorEl}
              onClose={handleColumnFilterClose}
              availableColumns={autoQueryState.schemaColumns.length > 0 ? autoQueryState.schemaColumns : autoQueryState.config.availableColumns}
              selectedColumns={autoQueryState.config.selectedColumns}
              onColumnToggle={handleColumnToggle}
              onSelectAll={handleSelectAllColumns}
              onSelectNone={handleSelectNoColumns}
              onReset={() => {
                if (autoQueryState.config.selectedIndex) {
                  clearColumnPreferencesForIndex(autoQueryState.config.selectedIndex);
                  const columnsToReset = autoQueryState.schemaColumns.length > 0 ? autoQueryState.schemaColumns : autoQueryState.config.availableColumns;
                  autoQueryState.setSelectedColumns(columnsToReset);
                }
              }}
              footerMessage="Selected columns will be saved for this index"
            />
          </QueryResultsSection>
        )}
      </Grid>
    </Box>
  );
};

export default AutoQuery;