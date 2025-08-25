import React, { useCallback } from 'react';
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

import { useDirectQueryState } from '@/hooks/useDirectQueryState';
import { useExcelExport } from '@/hooks/useExcelExport';
import { useSavedQueries } from '@/hooks/useSavedQueries';

import {
  saveColumnPreferences,
  clearColumnPreferencesForIndex,
} from '@/utils/excelExport';

import { SavedQuery, CreateSavedQueryRequest } from '@/types';

const DirectQuery: React.FC = () => {
  // Use centralized state management
  const queryState = useDirectQueryState();
  
  // Excel export functionality
  const excelExport = useExcelExport({
    selectedIndex: queryState.config.selectedIndex,
    selectedColumns: queryState.config.selectedColumns,
  });
  
  // Saved queries hook
  const savedQueries = useSavedQueries({
    queryType: 'direct',
    targetIndex: queryState.config.selectedIndex,
    autoLoad: false,
  });

  // Handle query text change
  const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    queryState.setQueryText(event.target.value);
  }, [queryState]);

  // Handle execute button click
  const handleExecute = useCallback(async () => {
    await queryState.executeQuery();
  }, [queryState]);

  // Get formatted results for table display
  const { columns, rows } = queryState.getFormattedResults();
  const totalHits = typeof queryState.result?.hits?.total === 'number' 
    ? queryState.result.hits.total 
    : queryState.result?.hits?.total?.value || 0;
  
  // Handle column selection change with persistence
  const handleColumnToggle = useCallback((column: string) => {
    queryState.handleColumnToggle(column);
    
    // Save preferences to session storage
    if (queryState.config.selectedIndex) {
      const newSelection = queryState.config.selectedColumns.includes(column)
        ? queryState.config.selectedColumns.filter(col => col !== column)
        : [...queryState.config.selectedColumns, column];
      saveColumnPreferences(queryState.config.selectedIndex, newSelection);
    }
  }, [queryState]);
  
  // Handle select all/none for columns with persistence
  const handleSelectAllColumns = useCallback(() => {
    queryState.handleSelectAllColumns();
    if (queryState.config.selectedIndex) {
      const columnsToSelect = queryState.schemaColumns.length > 0 
        ? queryState.schemaColumns 
        : queryState.config.availableColumns;
      saveColumnPreferences(queryState.config.selectedIndex, columnsToSelect);
    }
  }, [queryState]);
  
  const handleSelectNoColumns = useCallback(() => {
    queryState.handleSelectNoColumns();
    if (queryState.config.selectedIndex) {
      saveColumnPreferences(queryState.config.selectedIndex, ['_id']);
    }
  }, [queryState]);
  
  // Handle Excel export
  const handleExcelExport = useCallback(() => {
    if (queryState.result) {
      excelExport.exportToExcel(queryState.result, 'direct_query_results');
    }
  }, [queryState.result, excelExport]);
  
  // Column filter popover handlers
  const handleColumnFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    queryState.setColumnAnchorEl(event.currentTarget);
    queryState.setColumnFilterOpen(true);
  }, [queryState]);
  
  const handleColumnFilterClose = useCallback(() => {
    queryState.setColumnFilterOpen(false);
    queryState.setColumnAnchorEl(null);
  }, [queryState]);
  
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
        queryState.setSelectedIndex(savedQuery.targetIndex);
      }
      
      // Set the query text
      queryState.setQueryText(JSON.stringify(savedQuery.queryData.rawQuery, null, 2));
      
      // Set pagination parameters if available
      const from = savedQuery.queryData.from || 0;
      const size = savedQuery.queryData.size || 10;
      queryState.setPagination(from, size, 0, size);
    }
  }, [queryState]);
  
  const handleSaveCurrentQuery = useCallback(() => {
    if (!queryState.config.selectedIndex || !queryState.config.queryText.trim()) {
      return;
    }
    queryState.setSaveQueryDialogOpen(true);
  }, [queryState]);
  
  const getCurrentQueryData = useCallback(() => {
    if (!queryState.config.queryText.trim()) return null;
    
    try {
      return {
        rawQuery: JSON.parse(queryState.config.queryText),
        from: queryState.config.from,
        size: queryState.config.size,
        _source: queryState.config.selectedColumns.length > 0 
          ? queryState.config.selectedColumns.filter(col => !col.startsWith('_')) 
          : undefined,
      };
    } catch {
      return null;
    }
  }, [queryState.config]);

  // Handle from/size changes
  const handleFromChange = useCallback((from: number) => {
    queryState.setPagination(
      from, 
      queryState.config.size, 
      Math.floor(from / queryState.config.size), 
      queryState.config.size
    );
  }, [queryState]);

  const handleSizeChange = useCallback((size: number) => {
    queryState.setPagination(
      0, 
      size, 
      0, 
      size
    );
  }, [queryState]);

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
            selectedIndex={queryState.config.selectedIndex}
            availableIndexes={queryState.availableIndexes}
            onIndexChange={queryState.setSelectedIndex}
            indexesLoading={queryState.indexesLoading}
            queryText={queryState.config.queryText}
            onQueryChange={handleQueryChange}
            onExecute={handleExecute}
            onClear={queryState.clearResults}
            loading={queryState.loading}
            showFromSize={true}
            from={queryState.config.from}
            size={queryState.config.size}
            onFromChange={handleFromChange}
            onSizeChange={handleSizeChange}
            showFielddataOption={true}
            enableFielddata={queryState.config.enableFielddata}
            onEnableFielddataChange={queryState.setEnableFielddata}
          >
            {/* Saved Queries Buttons */}
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveCurrentQuery}
              disabled={queryState.loading || !queryState.config.selectedIndex || !queryState.config.queryText.trim()}
            >
              Save Query
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<LoadIcon />}
              onClick={() => queryState.setSavedQueriesListOpen(true)}
              disabled={queryState.loading}
            >
              Load Query
            </Button>
            {queryState.result && rows.length > 0 && (
              <ExportActions
                onExcelExport={handleExcelExport}
                onColumnFilterClick={handleColumnFilterClick}
                selectedColumnsCount={queryState.config.selectedColumns.length}
                totalColumnsCount={queryState.schemaColumns.length > 0 ? queryState.schemaColumns.length : queryState.config.availableColumns.length}
                disabled={queryState.loading}
              />
            )}
          </QueryExecutionCard>
        </Grid>

        {/* Results Section */}
        <QueryResultsSection
          result={queryState.result}
          error={queryState.error}
          loading={queryState.loading}
          columns={columns}
          rows={rows}
          page={queryState.config.page}
          rowsPerPage={queryState.config.rowsPerPage}
          totalHits={totalHits}
          onPageChange={queryState.handlePageChange}
          onRowsPerPageChange={queryState.handleRowsPerPageChange}
          onRetryError={handleExecute}
          selectedIndex={queryState.config.selectedIndex}
          emptyMessage="No results found"
        >
          {/* Column Filter Popover */}
          <ColumnFilter
            open={queryState.columnFilterOpen}
            anchorEl={queryState.columnAnchorEl}
            onClose={handleColumnFilterClose}
            availableColumns={queryState.schemaColumns.length > 0 ? queryState.schemaColumns : queryState.config.availableColumns}
            selectedColumns={queryState.config.selectedColumns}
            onColumnToggle={handleColumnToggle}
            onSelectAll={handleSelectAllColumns}
            onSelectNone={handleSelectNoColumns}
            onReset={() => {
              if (queryState.config.selectedIndex) {
                clearColumnPreferencesForIndex(queryState.config.selectedIndex);
                const columnsToReset = queryState.schemaColumns.length > 0 ? queryState.schemaColumns : queryState.config.availableColumns;
                queryState.setSelectedColumns(columnsToReset);
              }
            }}
            footerMessage="Selected columns will be saved for this index"
          />
        </QueryResultsSection>
      </Grid>
      
      {/* Saved Queries Dialogs */}
      <SaveQueryDialog
        open={queryState.saveQueryDialogOpen}
        onClose={() => queryState.setSaveQueryDialogOpen(false)}
        onSave={handleSaveQuery}
        queryType="direct"
        targetIndex={queryState.config.selectedIndex || ''}
        queryData={getCurrentQueryData() || {}}
        defaultName=""
        defaultDescription=""
        defaultTags={[]}
      />
      
      <SavedQueriesList
        open={queryState.savedQueriesListOpen}
        onClose={() => queryState.setSavedQueriesListOpen(false)}
        onQuerySelect={handleLoadSavedQuery}
        targetIndex={queryState.config.selectedIndex}
        queryType="direct"
      />
    </Box>
  );
};

export default DirectQuery;