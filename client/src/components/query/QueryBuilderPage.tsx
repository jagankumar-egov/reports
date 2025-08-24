import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Build as BuildIcon,
} from '@mui/icons-material';

import {
  QueryBuilder,
  QueryResultsSection,
  ShareableLink,
  ExportActions,
} from '@/components/common';

import { useElasticsearchQuery } from '@/hooks/useElasticsearchQuery';
import { useElasticsearchPagination } from '@/hooks/useElasticsearchPagination';
import { directQueryAPI } from '@/services/api';
import { extractFieldsFromMapping, FieldInfo } from '@/utils/mappingUtils';
import { QueryCondition } from '@/components/common/QueryBuilder';

const QueryBuilderPage: React.FC = () => {
  // Use shared hooks
  const query = useElasticsearchQuery({
    onResult: () => {
      pagination.resetPagination();
    },
  });

  const pagination = useElasticsearchPagination(10);

  // Query Builder specific state
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [builtQuery, setBuiltQuery] = useState<any>(null);
  const [conditions, setConditions] = useState<QueryCondition[]>([]);

  // Load fields when index changes
  useEffect(() => {
    if (query.selectedIndex) {
      loadIndexFields(query.selectedIndex);
    } else {
      setFields([]);
      setFieldsError(null);
    }
  }, [query.selectedIndex]);

  const loadIndexFields = async (indexName: string) => {
    try {
      setFieldsLoading(true);
      setFieldsError(null);
      const mappingResponse = await directQueryAPI.getIndexMapping(indexName);
      
      // Extract the actual mapping from the response
      // The response structure is: { "indexName": { "mappings": { ... } } }
      const indexMapping = mappingResponse[indexName];
      if (!indexMapping || !indexMapping.mappings) {
        throw new Error(`Invalid mapping structure for index: ${indexName}`);
      }
      
      const extractedFields = extractFieldsFromMapping(indexMapping);
      if (extractedFields.length === 0) {
        throw new Error(`No fields found in mapping for index: ${indexName}`);
      }
      
      setFields(extractedFields);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load index fields';
      setFieldsError(errorMessage);
      setFields([]);
    } finally {
      setFieldsLoading(false);
    }
  };

  // Handle query generation from QueryBuilder
  const handleQueryGenerated = useCallback((generatedQuery: any) => {
    setBuiltQuery(generatedQuery);
    query.setQueryText(JSON.stringify(generatedQuery, null, 2));
  }, [query]);

  // Enhanced execute function
  const handleExecute = useCallback(async () => {
    if (!builtQuery) {
      return;
    }
    await query.executeQuery();
  }, [query, builtQuery]);


  const { columns, rows } = query.result ? query.formatResultsForTable(pagination.getPaginatedHits(query.result)) : { columns: [], rows: [] };
  const totalHits = typeof query.result?.hits?.total === 'number' 
    ? query.result.hits.total 
    : query.result?.hits?.total?.value || 0;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuildIcon />
        Visual Query Builder
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Build Elasticsearch queries visually by selecting fields, operators, and values. 
        No need to write JSON manually!
      </Typography>
      
      <Grid container spacing={3}>
        {/* Query Builder */}
        <Grid item xs={12}>
          {query.selectedIndex ? (
            <>
              {fieldsLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Loading fields for index: {query.selectedIndex}...
                  </Typography>
                </Box>
              )}
              
              {fieldsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {fieldsError}
                </Alert>
              )}
              
              {!fieldsLoading && fields.length > 0 && (
                <QueryBuilder
                  fields={fields}
                  onQueryGenerated={handleQueryGenerated}
                  onConditionsChange={setConditions}
                />
              )}
              
              {!fieldsLoading && fields.length === 0 && !fieldsError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No fields found for index: {query.selectedIndex}. 
                  The index might be empty or inaccessible.
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="info">
              Please select an index below to start building your query.
            </Alert>
          )}
        </Grid>

        {/* Index Selection and Execute Button */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Select Index</InputLabel>
                    <Select
                      value={query.selectedIndex}
                      label="Select Index"
                      onChange={(e) => query.setSelectedIndex(e.target.value)}
                      disabled={query.indexesLoading}
                    >
                      {query.availableIndexes.map((index) => (
                        <MenuItem key={index} value={index}>
                          {index}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="contained"
                    onClick={handleExecute}
                    disabled={query.loading || !builtQuery || !query.selectedIndex}
                    fullWidth
                    size="large"
                  >
                    {query.loading ? 'Executing...' : 'Execute Query'}
                  </Button>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    variant="outlined"
                    onClick={query.clearResults}
                    disabled={query.loading}
                    fullWidth
                    size="large"
                  >
                    Clear Results
                  </Button>
                </Grid>
                
                {/* ShareableLink and Export Actions */}
                <Grid item xs={12} sm={3}>
                  <ShareableLink 
                    index={query.selectedIndex}
                    query={query.queryText}
                    from={0}
                    size={10}
                    autoExecute={true}
                    buttonText="Share Query"
                    buttonSize="large"
                  />
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <ExportActions
                    onExcelExport={() => {
                      // TODO: Implement Excel export for QueryBuilder
                      console.log('Excel export for QueryBuilder');
                    }}
                    onColumnFilterClick={() => {
                      // TODO: Implement column filter for QueryBuilder
                      console.log('Column filter for QueryBuilder');
                    }}
                    selectedColumnsCount={0}
                    totalColumnsCount={0}
                    disabled={!query.result || query.loading}
                    showExcelExport={true}
                    showColumnFilter={false}
                    excelLabel="Export Results"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
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
          emptyMessage="No results found for your query"
        />
      </Grid>
    </Box>
  );
};

export default QueryBuilderPage;