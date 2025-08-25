import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
} from '@mui/material';
import {
  Code as CodeIcon,
  Save as SaveIcon,
  FolderOpen as LoadIcon,
} from '@mui/icons-material';

import {
  QueryExecutionCard,
  QueryResultsSection,
  ColumnFilter,
  ExportActions,
  SaveQueryDialog,
  SavedQueriesList,
} from '@/components/common';

import { useElasticsearchQuery } from '@/hooks/useElasticsearchQuery';
import { useElasticsearchPagination } from '@/hooks/useElasticsearchPagination';
import { useExcelExport } from '@/hooks/useExcelExport';

import {
  getSelectedColumnsForIndex,
  saveColumnPreferences,
  clearColumnPreferencesForIndex,
} from '@/utils/excelExport';

import { SavedQuery, CreateSavedQueryRequest } from '@/types';
import { useSavedQueries } from '@/hooks/useSavedQueries';

const DirectQuery: React.FC = () => {
  // Use shared hooks
  const query = useElasticsearchQuery({
    onResult: (_result) => {
      setLastQueryWasFiltered(queryUsesFiltering);
      pagination.resetPagination();
    },
  });

  const pagination = useElasticsearchPagination(10);
  
  // DirectQuery-specific state for from/size parameters
  const [from, setFrom] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  
  // Column selection state (DirectQuery specific)
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  
  // Excel export functionality (after selectedColumns is declared)
  const excelExport = useExcelExport({
    selectedIndex: query.selectedIndex,
    selectedColumns: selectedColumns,
  });
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [schemaColumns, setSchemaColumns] = useState<string[]>([]); // Full schema, not affected by filtering
  const [lastQueryWasFiltered, setLastQueryWasFiltered] = useState<boolean>(false);
  const [columnFilterOpen, setColumnFilterOpen] = useState(false);
  const [columnAnchorEl, setColumnAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [queryUsesFiltering, setQueryUsesFiltering] = useState(false);
  
  // Saved queries state
  const [saveQueryDialogOpen, setSaveQueryDialogOpen] = useState(false);
  const [savedQueriesListOpen, setSavedQueriesListOpen] = useState(false);
  
  // Saved queries hook
  const savedQueries = useSavedQueries({
    queryType: 'direct',
    targetIndex: query.selectedIndex,
    autoLoad: false,
  });

  // Reset column selection when index changes
  useEffect(() => {
    if (query.selectedIndex) {
      // Clear current selections to force refresh
      setAvailableColumns([]);
      setSelectedColumns([]);
      setSchemaColumns([]);
      setLastQueryWasFiltered(false);
      // Clear any results from previous index
      query.clearResults();
    }
  }, [query.selectedIndex]);

  // Update schema columns when we get unfiltered results
  useEffect(() => {
    if (query.result?.hits?.hits && !lastQueryWasFiltered && schemaColumns.length === 0) {
      // Extract all columns from the unfiltered result
      const allKeys = new Set<string>();
      query.result.hits.hits.forEach(hit => {
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

      const allColumns = ['_id', '_score', ...Array.from(allKeys).sort()];
      setSchemaColumns(allColumns);
      setAvailableColumns(allColumns);
      
      // Load saved column preferences for this index
      const savedColumns = getSelectedColumnsForIndex(query.selectedIndex);
      if (savedColumns && savedColumns.length > 0) {
        // Filter saved columns to only include ones that exist in the schema
        const validSavedColumns = savedColumns.filter(col => allColumns.includes(col));
        if (validSavedColumns.length > 0) {
          setSelectedColumns(validSavedColumns);
        } else {
          // If no valid saved columns, default to all
          setSelectedColumns(allColumns);
        }
      } else {
        // No saved preferences: default to all columns
        setSelectedColumns(allColumns);
      }
    }
  }, [query.result, lastQueryWasFiltered, schemaColumns.length, query.selectedIndex]);

  // Enhanced execute function with column filtering
  const handleExecute = useCallback(async () => {
    // Prepare _source filtering for optimization
    // Only apply filtering if user has made explicit column selections
    let sourceFilter: string[] | boolean = true; // Default: return all fields
    
    if (selectedColumns.length > 0) {
      // User has selected columns - filter to only non-metadata fields
      const sourceFields = selectedColumns.filter(col => !col.startsWith('_'));
      if (sourceFields.length > 0) {
        sourceFilter = sourceFields;
        setQueryUsesFiltering(true);
      }
    } else {
      // No columns selected yet - check if there are saved preferences
      const savedColumns = getSelectedColumnsForIndex(query.selectedIndex);
      if (savedColumns && savedColumns.length > 0) {
        const sourceFields = savedColumns.filter(col => !col.startsWith('_'));
        if (sourceFields.length > 0 && savedColumns.length < 10) { // Only filter if user has limited selection
          sourceFilter = sourceFields;
          setQueryUsesFiltering(true);
        }
      }
    }
    
    // Track whether this query uses filtering
    const queryUsesFilteringFlag = Array.isArray(sourceFilter);
    setQueryUsesFiltering(queryUsesFilteringFlag);
    
    await query.executeQuery(from, size, sourceFilter);
  }, [query, from, size, selectedColumns]);

  // Handle query text change
  const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    query.setQueryText(event.target.value);
  }, [query]);

  // Format result data for table display
  const getPaginatedHits = useCallback(() => {
    if (!query.result?.hits?.hits) return [];
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    return query.result.hits.hits.slice(start, end);
  }, [query.result, pagination.page, pagination.rowsPerPage]);

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
    
    // Use selected columns for display, but only show columns that exist in the current result
    const displayColumns = selectedColumns.length > 0 
      ? selectedColumns.filter(col => resultColumns.includes(col))
      : resultColumns;
    
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

    return { columns: displayColumns, rows };
  }, [selectedColumns]);

  const { columns, rows } = query.result ? formatResultsForTable(getPaginatedHits()) : { columns: [], rows: [] };
  const totalHits = typeof query.result?.hits?.total === 'number' 
    ? query.result.hits.total 
    : query.result?.hits?.total?.value || 0;
  
  // Handle column selection change
  const handleColumnToggle = useCallback((column: string) => {
    setSelectedColumns(prev => {
      const newSelection = prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column];
      
      // Save preferences to session storage
      if (query.selectedIndex) {
        saveColumnPreferences(query.selectedIndex, newSelection);
      }
      
      return newSelection;
    });
  }, [query.selectedIndex]);
  
  // Handle select all/none for columns
  const handleSelectAllColumns = useCallback(() => {
    const columnsToSelect = schemaColumns.length > 0 ? schemaColumns : availableColumns;
    setSelectedColumns(columnsToSelect);
    if (query.selectedIndex) {
      saveColumnPreferences(query.selectedIndex, columnsToSelect);
    }
  }, [schemaColumns, availableColumns, query.selectedIndex]);
  
  const handleSelectNoColumns = useCallback(() => {
    // Keep at least _id column for table structure
    const minColumns = ['_id'];
    setSelectedColumns(minColumns);
    if (query.selectedIndex) {
      saveColumnPreferences(query.selectedIndex, minColumns);
    }
  }, [query.selectedIndex]);
  
  // Handle Excel export
  const handleExcelExport = useCallback(() => {
    if (query.result) {
      excelExport.exportToExcel(query.result, 'direct_query_results');
    }
  }, [query.result, excelExport]);
  
  // Column filter popover handlers
  const handleColumnFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setColumnAnchorEl(event.currentTarget);
    setColumnFilterOpen(true);
  }, []);
  
  const handleColumnFilterClose = useCallback(() => {
    setColumnFilterOpen(false);
    setColumnAnchorEl(null);
  }, []);
  
  // Saved queries handlers
  const handleSaveQuery = useCallback(async (request: CreateSavedQueryRequest) => {
    try {
      await savedQueries.createQuery(request);
      // Query saved successfully - dialog will close automatically
    } catch (error) {
      // Error is handled by the dialog component
      throw error;
    }
  }, [savedQueries]);
  
  const handleLoadSavedQuery = useCallback((savedQuery: SavedQuery) => {
    if (savedQuery.queryData.rawQuery) {
      // Set the index
      if (savedQuery.targetIndex) {
        query.setSelectedIndex(savedQuery.targetIndex);
      }
      
      // Set the query text
      query.setQueryText(JSON.stringify(savedQuery.queryData.rawQuery, null, 2));
      
      // Set pagination parameters if available
      if (savedQuery.queryData.from !== undefined) {
        setFrom(savedQuery.queryData.from);
      }
      if (savedQuery.queryData.size !== undefined) {
        setSize(savedQuery.queryData.size);
      }
    }
  }, [query]);
  
  const handleSaveCurrentQuery = useCallback(() => {
    if (!query.selectedIndex || !query.queryText.trim()) {
      return;
    }
    setSaveQueryDialogOpen(true);
  }, [query.selectedIndex, query.queryText]);
  
  const getCurrentQueryData = useCallback(() => {
    if (!query.queryText.trim()) return null;
    
    try {
      return {
        rawQuery: JSON.parse(query.queryText),
        from,
        size,
        _source: selectedColumns.length > 0 ? selectedColumns.filter(col => !col.startsWith('_')) : undefined,
      };
    } catch {
      return null;
    }
  }, [query.queryText, from, size, selectedColumns]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CodeIcon />
        Direct Elasticsearch Query
      </Typography>
      
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
            onClear={query.clearResults}
            loading={query.loading}
            showFromSize={true}
            from={from}
            size={size}
            onFromChange={setFrom}
            onSizeChange={setSize}
          >
            {/* Saved Queries Buttons */}
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveCurrentQuery}
              disabled={query.loading || !query.selectedIndex || !query.queryText.trim()}
            >
              Save Query
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<LoadIcon />}
              onClick={() => setSavedQueriesListOpen(true)}
              disabled={query.loading}
            >
              Load Query
            </Button>
            {query.result && rows.length > 0 && (
              <ExportActions
                onExcelExport={handleExcelExport}
                onColumnFilterClick={handleColumnFilterClick}
                selectedColumnsCount={selectedColumns.length}
                totalColumnsCount={schemaColumns.length > 0 ? schemaColumns.length : availableColumns.length}
                disabled={query.loading}
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
        >
          {/* Column Filter Popover */}
          <ColumnFilter
            open={columnFilterOpen}
            anchorEl={columnAnchorEl}
            onClose={handleColumnFilterClose}
            availableColumns={schemaColumns.length > 0 ? schemaColumns : availableColumns}
            selectedColumns={selectedColumns}
            onColumnToggle={handleColumnToggle}
            onSelectAll={handleSelectAllColumns}
            onSelectNone={handleSelectNoColumns}
            onReset={() => {
              if (query.selectedIndex) {
                clearColumnPreferencesForIndex(query.selectedIndex);
                const columnsToReset = schemaColumns.length > 0 ? schemaColumns : availableColumns;
                setSelectedColumns(columnsToReset);
              }
            }}
            footerMessage="Selected columns will be saved for this index"
          />
        </QueryResultsSection>
      </Grid>
      
      {/* Saved Queries Dialogs */}
      <SaveQueryDialog
        open={saveQueryDialogOpen}
        onClose={() => setSaveQueryDialogOpen(false)}
        onSave={handleSaveQuery}
        queryType="direct"
        targetIndex={query.selectedIndex || ''}
        queryData={getCurrentQueryData() || {}}
        defaultName=""
        defaultDescription=""
        defaultTags={[]}
      />
      
      <SavedQueriesList
        open={savedQueriesListOpen}
        onClose={() => setSavedQueriesListOpen(false)}
        onQuerySelect={handleLoadSavedQuery}
        targetIndex={query.selectedIndex}
        queryType="direct"
      />
    </Box>
  );
};

export default DirectQuery;