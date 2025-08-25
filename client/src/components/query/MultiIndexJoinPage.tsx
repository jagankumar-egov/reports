import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Chip,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  TablePagination,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  CardHeader,
  Autocomplete,
} from '@mui/material';
import {
  JoinInner as JoinIcon,
  Preview as PreviewIcon,
  PlayArrow as ExecuteIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  TableView as TableViewIcon,
  ViewList as ListViewIcon,
  GetApp as DownloadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as AdvancedIcon,
} from '@mui/icons-material';

import { useMultiIndexJoinState, JoinSource, JoinCondition, ConsolidatedField } from '@/hooks/useMultiIndexJoinState';
import { SavedQuery } from '@/types';
import { exportToExcel } from '@/utils/excelExport';

/**
 * Multi-Index Join Page Component
 * 
 * Provides a comprehensive interface for joining data from multiple Elasticsearch indices.
 * Features include:
 * - Cross-index data joining with four join types (Inner, Left, Right, Full)
 * - Advanced mode: Use saved queries instead of raw indexes
 * - Automatic field discovery with dropdown selectors
 * - Real-time join preview with compatibility checking
 * - Advanced table view with flattened column structure
 * - Smart column merging and index differentiation
 * - WYSIWYG Excel export with pagination support
 * - Debounced requests to prevent API overload
 */
const MultiIndexJoinPage: React.FC = () => {
  // Use centralized state management
  const multiIndexJoin = useMultiIndexJoinState();

  // Local UI state for table view
  const [viewMode, setViewMode] = useState<'preview' | 'table'>('table');
  const [mergeColumns, setMergeColumns] = useState(true);
  const [exportAll, setExportAll] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Handle adding a new join condition
  const handleAddJoin = useCallback(() => {
    const newJoin: JoinCondition = {
      id: multiIndexJoin.generateJoinId(),
      leftSource: multiIndexJoin.config.advancedMode 
        ? { type: 'savedQuery', id: '', name: '' }
        : { type: 'index', id: '', name: '' },
      leftField: '',
      rightSource: multiIndexJoin.config.advancedMode
        ? { type: 'savedQuery', id: '', name: '' }
        : { type: 'index', id: '', name: '' },
      rightField: '',
      joinType: 'inner',
    };
    multiIndexJoin.addJoin(newJoin);
  }, [multiIndexJoin]);

  // Handle removing a join condition
  const handleRemoveJoin = useCallback((joinId: string) => {
    multiIndexJoin.removeJoin(joinId);
  }, [multiIndexJoin]);

  // Handle updating a join condition
  const handleUpdateJoin = useCallback((joinId: string, updates: Partial<JoinCondition>) => {
    multiIndexJoin.updateJoin(joinId, updates);
  }, [multiIndexJoin]);

  // Handle adding a consolidated field
  const handleAddConsolidatedField = useCallback((sourceId: string, sourceName: string, sourceField: string) => {
    const newField: ConsolidatedField = {
      id: multiIndexJoin.generateFieldId(),
      sourceId,
      sourceName,
      sourceField,
      alias: `${sourceName}_${sourceField}`,
      include: true,
    };
    multiIndexJoin.addConsolidatedField(newField);
  }, [multiIndexJoin]);

  // Auto-generate consolidated fields from available sources
  const handleAutoGenerateFields = useCallback(() => {
    const fields: ConsolidatedField[] = [];
    
    // Get all unique sources from joins
    const sources = new Set<string>();
    multiIndexJoin.config.joins.forEach(join => {
      if (join.leftSource.id) sources.add(join.leftSource.id);
      if (join.rightSource.id) sources.add(join.rightSource.id);
    });

    // Add fields from each source
    sources.forEach(sourceId => {
      const availableFields = multiIndexJoin.sourceMappings[sourceId] || [];
      const sourceName = multiIndexJoin.config.joins
        .find(j => j.leftSource.id === sourceId || j.rightSource.id === sourceId)
        ?.leftSource.id === sourceId 
        ? multiIndexJoin.config.joins.find(j => j.leftSource.id === sourceId)?.leftSource.name
        : multiIndexJoin.config.joins.find(j => j.rightSource.id === sourceId)?.rightSource.name;

      if (sourceName) {
        // Add up to 5 fields per source to avoid overwhelming the UI
        availableFields.slice(0, 5).forEach(fieldName => {
          fields.push({
            id: multiIndexJoin.generateFieldId(),
            sourceId,
            sourceName,
            sourceField: fieldName,
            alias: `${sourceName}_${fieldName}`,
            include: true,
          });
        });
      }
    });

    if (fields.length > 0) {
      multiIndexJoin.setConsolidatedFields(fields);
    }
  }, [multiIndexJoin]);

  // Handle execute join
  const handleExecute = useCallback(async () => {
    // Auto-generate fields if none exist
    if (multiIndexJoin.config.consolidatedFields.length === 0) {
      handleAutoGenerateFields();
      // Wait for state update, then execute
      setTimeout(() => multiIndexJoin.executeJoin(), 100);
    } else {
      await multiIndexJoin.executeJoin();
    }
  }, [multiIndexJoin, handleAutoGenerateFields]);

  // Load source mapping when source changes
  const handleLoadSourceMapping = useCallback(async (source: JoinSource) => {
    if (source.id && source.name) {
      await multiIndexJoin.loadSourceMapping(source);
    }
  }, [multiIndexJoin]);

  // Initialize with one join condition if none exist
  useEffect(() => {
    if (multiIndexJoin.config.joins.length === 0) {
      handleAddJoin();
    }
  }, [multiIndexJoin.config.joins.length, handleAddJoin]);

  /**
   * Get human-readable description for join types
   * Helps users understand SQL-style join behavior in Elasticsearch context
   */
  const getJoinTypeDescription = (type: string) => {
    switch (type) {
      case 'inner': return 'Only records that have matches in both indices';
      case 'left': return 'All records from left index, with matches from right where available';
      case 'right': return 'All records from right index, with matches from left where available';
      case 'full': return 'All records from both indices, matched where possible';
      default: return '';
    }
  };

  /**
   * Source colors for visual differentiation in table view
   * Consistent color coding helps users identify data sources
   */
  const getSourceColor = (sourceId: string) => {
    const colors = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2', '#c62828'];
    const index = Math.abs(sourceId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
    return colors[index];
  };

  /**
   * Flatten nested object to get all field paths for table display
   * Converts nested Elasticsearch documents into flat structure suitable for table columns
   * Example: { Data: { location: { country: "USA" } } } -> { "Data.location.country": "USA" }
   */
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    Object.keys(obj || {}).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        // Add the value to flattened object
        flattened[newKey] = value;
      }
    });
    
    return flattened;
  };

  // Use the formatted results from the hook
  const { columns, rows } = multiIndexJoin.getFormattedResults();

  /**
   * Format cell value for display in table
   * Handles various data types and ensures consistent string representation
   */
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.join(', ');
      if (value instanceof Date) return value.toISOString();
      return JSON.stringify(value);
    }
    return String(value);
  };

  /**
   * Handle Excel export - WYSIWYG export functionality
   * Exports exactly what's visible in the table with proper formatting
   * Supports both current page and full dataset export
   */
  const handleExcelExport = useCallback(async (forceExportAll = false) => {
    if (!columns.length || !rows.length) {
      console.warn('No data available for export');
      return;
    }

    setExporting(true);
    
    try {
      // Export all data or just current page based on user preference
      const shouldExportAll = forceExportAll || exportAll;
      const dataToExport = shouldExportAll 
        ? rows
        : rows.slice(multiIndexJoin.config.page * multiIndexJoin.config.rowsPerPage, 
                    multiIndexJoin.config.page * multiIndexJoin.config.rowsPerPage + multiIndexJoin.config.rowsPerPage);
      
      if (!dataToExport.length) {
        console.warn('No data on current page to export');
        return;
      }
      
      // Generate descriptive filename with metadata for easy identification
      const exportType = shouldExportAll ? '_all' : `_page${multiIndexJoin.config.page + 1}`;
      const filename = `multi_index_join${exportType}_${new Date().toISOString().split('T')[0]}`;
      
      // Use the raw exportToExcel utility
      exportToExcel({
        columns,
        rows: dataToExport
      }, filename);
      
      console.log(`✅ Exported ${dataToExport.length} rows with ${columns.length} columns to ${filename}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  }, [columns, rows, exportAll, multiIndexJoin.config.page, multiIndexJoin.config.rowsPerPage]);


  // Helper to render source selector (index or saved query)
  const renderSourceSelector = (
    join: JoinCondition, 
    side: 'left' | 'right', 
    label: string
  ) => {
    const source = side === 'left' ? join.leftSource : join.rightSource;
    const isAdvanced = multiIndexJoin.config.advancedMode;

    return (
      <FormControl fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select
          value={source.id}
          label={label}
          onChange={(e) => {
            const selectedId = e.target.value;
            if (isAdvanced) {
              // Find saved query
              const savedQuery = (multiIndexJoin.availableSavedQueries || []).find(sq => sq.id === selectedId);
              if (savedQuery) {
                const newSource = multiIndexJoin.createJoinSourceFromSavedQuery(savedQuery);
                handleUpdateJoin(join.id, { [side + 'Source']: newSource });
                handleLoadSourceMapping(newSource);
              }
            } else {
              // Regular index
              const newSource = multiIndexJoin.createJoinSourceFromIndex(selectedId);
              handleUpdateJoin(join.id, { [side + 'Source']: newSource });
              handleLoadSourceMapping(newSource);
            }
          }}
          disabled={isAdvanced ? multiIndexJoin.savedQueriesLoading : multiIndexJoin.indexesLoading}
        >
          {isAdvanced 
            ? (multiIndexJoin.availableSavedQueries || []).map((savedQuery: SavedQuery) => (
                <MenuItem key={savedQuery.id} value={savedQuery.id}>
                  <Box>
                    <Typography variant="body2">{savedQuery.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Target: {savedQuery.targetIndex}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            : (multiIndexJoin.availableIndexes || []).map((index: string) => (
                <MenuItem key={index} value={index}>
                  {index}
                </MenuItem>
              ))
          }
        </Select>
      </FormControl>
    );
  };

  // Helper to render field selector
  const renderFieldSelector = (
    join: JoinCondition,
    side: 'left' | 'right',
    label: string
  ) => {
    const source = side === 'left' ? join.leftSource : join.rightSource;
    const field = side === 'left' ? join.leftField : join.rightField;
    const fields = multiIndexJoin.sourceMappings[source.id] || [];
    const loading = multiIndexJoin.mappingsLoading[source.id] || false;

    return (
      <FormControl fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select
          value={field}
          label={label}
          onChange={(e) => {
            handleUpdateJoin(join.id, { [side + 'Field']: e.target.value });
          }}
          disabled={!source.id || loading}
        >
          {(fields || []).map((fieldName: string) => (
            <MenuItem key={fieldName} value={fieldName}>
              {fieldName}
            </MenuItem>
          ))}
        </Select>
        {loading && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Loading fields...
          </Typography>
        )}
      </FormControl>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <JoinIcon />
        Multi-Index Join
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Join data from multiple Elasticsearch indices or saved queries to create consolidated results.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Advanced Mode Toggle */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={multiIndexJoin.config.advancedMode}
                    onChange={(e) => multiIndexJoin.setAdvancedMode(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AdvancedIcon />
                    Advanced Mode
                  </Box>
                }
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {multiIndexJoin.config.advancedMode 
                  ? 'Use saved queries as join sources instead of raw indexes'
                  : 'Use raw indexes as join sources'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Join Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon />
                  Join Configuration
                </Box>
              }
              action={
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddJoin}
                  variant="outlined"
                  size="small"
                >
                  Add Join
                </Button>
              }
            />
            <CardContent>
              {multiIndexJoin.config.joins.map((join, index) => (
                <Box key={join.id} sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Join Condition {index + 1}</Typography>
                    {multiIndexJoin.config.joins.length > 1 && (
                      <IconButton 
                        onClick={() => handleRemoveJoin(join.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                  
                  <Grid container spacing={2}>
                    {/* Left Source */}
                    <Grid item xs={12} md={3}>
                      {renderSourceSelector(join, 'left', multiIndexJoin.config.advancedMode ? 'Left Saved Query' : 'Left Index')}
                    </Grid>
                    
                    {/* Left Field */}
                    <Grid item xs={12} md={3}>
                      {renderFieldSelector(join, 'left', 'Left Field')}
                    </Grid>
                    
                    {/* Right Source */}
                    <Grid item xs={12} md={3}>
                      {renderSourceSelector(join, 'right', multiIndexJoin.config.advancedMode ? 'Right Saved Query' : 'Right Index')}
                    </Grid>
                    
                    {/* Right Field */}
                    <Grid item xs={12} md={3}>
                      {renderFieldSelector(join, 'right', 'Right Field')}
                    </Grid>

                    {/* Join Type */}
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Join Type</InputLabel>
                        <Select
                          value={join.joinType}
                          label="Join Type"
                          onChange={(e) => handleUpdateJoin(join.id, { joinType: e.target.value as any })}
                        >
                          <MenuItem value="inner">Inner Join</MenuItem>
                          <MenuItem value="left">Left Join</MenuItem>
                          <MenuItem value="right">Right Join</MenuItem>
                          <MenuItem value="full">Full Outer Join</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        {getJoinTypeDescription(join.joinType)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={multiIndexJoin.loading ? <CircularProgress size={16} /> : <ExecuteIcon />}
                  onClick={handleExecute}
                  disabled={multiIndexJoin.loading || multiIndexJoin.config.joins.length === 0}
                  size="large"
                >
                  {multiIndexJoin.loading ? 'Executing...' : 'Execute Join'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={multiIndexJoin.clearResults}
                  disabled={multiIndexJoin.loading}
                >
                  Clear Results
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Consolidated Fields Management */}
        {multiIndexJoin.config.joins.length > 0 && multiIndexJoin.config.consolidatedFields.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableViewIcon />
                    Output Fields ({multiIndexJoin.config.consolidatedFields.filter(f => f.include).length} selected)
                  </Box>
                }
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={handleAutoGenerateFields}
                      variant="outlined"
                    >
                      Auto-Generate Fields
                    </Button>
                    <Button
                      size="small"
                      onClick={() => multiIndexJoin.setConsolidatedFields([])}
                      variant="outlined"
                      color="error"
                    >
                      Clear All
                    </Button>
                  </Box>
                }
              />
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Select which fields to include in the joined results. Fields will be aliased to avoid naming conflicts.
                </Typography>
                
                <Grid container spacing={1}>
                  {multiIndexJoin.config.consolidatedFields.map((field) => (
                    <Grid item xs={12} sm={6} md={4} key={field.id}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: field.include ? 'primary.main' : 'divider',
                          bgcolor: field.include ? 'primary.50' : 'background.paper',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                        onClick={() => multiIndexJoin.updateConsolidatedField(field.id, { include: !field.include })}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Switch 
                            checked={field.include} 
                            size="small"
                            onChange={(e) => {
                              e.stopPropagation();
                              multiIndexJoin.updateConsolidatedField(field.id, { include: e.target.checked });
                            }}
                          />
                          <Chip 
                            size="small" 
                            label={field.sourceName} 
                            sx={{ 
                              bgcolor: getSourceColor(field.sourceId), 
                              color: 'white',
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Box>
                        
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {field.sourceField}
                        </Typography>
                        
                        <TextField
                          size="small"
                          label="Alias"
                          value={field.alias}
                          onChange={(e) => {
                            e.stopPropagation();
                            multiIndexJoin.updateConsolidatedField(field.id, { alias: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ mt: 1, width: '100%' }}
                        />
                        
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            multiIndexJoin.removeConsolidatedField(field.id);
                          }}
                          sx={{ position: 'absolute', top: 8, right: 8 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                
                {multiIndexJoin.config.consolidatedFields.filter(f => f.include).length === 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    No output fields selected. Click "Auto-Generate Fields" or select individual fields above.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Error Display */}
        {multiIndexJoin.error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => multiIndexJoin.clearResults()}>
              {multiIndexJoin.error}
            </Alert>
          </Grid>
        )}

        {/* Join Results */}
        {multiIndexJoin.result && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Join Results ({rows.length} records)
                  </Typography>
                  
                  {/* Export Button */}
                  {rows.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControl size="small">
                        <Select
                          value={exportAll ? 'all' : 'page'}
                          onChange={(e) => setExportAll(e.target.value === 'all')}
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="page">Current Page</MenuItem>
                          <MenuItem value="all">All Data</MenuItem>
                        </Select>
                      </FormControl>
                      <Tooltip title={`Export ${exportAll ? 'All Data' : 'Current Page'} to Excel`}>
                        <IconButton 
                          onClick={() => handleExcelExport()}
                          disabled={!rows.length || exporting}
                          color="primary"
                        >
                          {exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
                
                {rows.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {columns.map((column: string) => (
                              <TableCell key={column} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 120 }}>
                                {column}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows
                            .slice(
                              multiIndexJoin.config.page * multiIndexJoin.config.rowsPerPage,
                              multiIndexJoin.config.page * multiIndexJoin.config.rowsPerPage + multiIndexJoin.config.rowsPerPage
                            )
                            .map((row: any, index: number) => (
                            <TableRow key={row.id || index} hover>
                              {columns.map((column: string) => (
                                <TableCell 
                                  key={column}
                                  sx={{
                                    maxWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <Tooltip title={String(row[column] || '')}>
                                    <span>{String(row[column] || '')}</span>
                                  </Tooltip>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Pagination */}
                    <TablePagination
                      component="div"
                      count={rows.length}
                      page={multiIndexJoin.config.page}
                      onPageChange={multiIndexJoin.handlePageChange}
                      rowsPerPage={multiIndexJoin.config.rowsPerPage}
                      onRowsPerPageChange={multiIndexJoin.handleRowsPerPageChange}
                      rowsPerPageOptions={[5, 10, 25, 50]}
                    />
                  </>
                ) : (
                  <Alert severity="info">
                    No results found for the specified join criteria.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default MultiIndexJoinPage;