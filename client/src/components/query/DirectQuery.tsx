import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography,
  Divider,
  Grid,
  Paper,
  CircularProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Checkbox,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  Clear as ClearIcon,
  Storage as IndexIcon,
  Code as CodeIcon,
  TableView as TableIcon,
  Download as DownloadIcon,
  ViewColumn as ColumnIcon,
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

import { DirectQueryRequest, DirectQueryResponse, ElasticsearchHit } from '@/types';
import { directQueryAPI } from '@/services/api';
import { useTheme } from '@mui/material/styles';
import {
  exportToExcel,
  getSelectedColumnsForIndex,
  saveColumnPreferences,
  clearColumnPreferencesForIndex,
  ExportData,
} from '@/utils/excelExport';

const DirectQuery: React.FC = () => {
  const theme = useTheme();
  
  // State management
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [queryText, setQueryText] = useState<string>('{\n  "query": {\n    "match_all": {}\n  },\n  "size": 10\n}');
  const [from, setFrom] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [result, setResult] = useState<DirectQueryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableIndexes, setAvailableIndexes] = useState<string[]>([]);
  const [indexesLoading, setIndexesLoading] = useState<boolean>(true);
  
  // Table pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Column selection state
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [schemaColumns, setSchemaColumns] = useState<string[]>([]); // Full schema, not affected by filtering
  const [lastQueryWasFiltered, setLastQueryWasFiltered] = useState<boolean>(false);
  const [columnFilterOpen, setColumnFilterOpen] = useState(false);
  const [columnAnchorEl, setColumnAnchorEl] = useState<HTMLButtonElement | null>(null);
  
  // Guidelines panel state
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  // Load available indexes on mount
  useEffect(() => {
    const loadIndexes = async () => {
      try {
        setIndexesLoading(true);
        const indexes = await directQueryAPI.getIndexes();
        setAvailableIndexes(indexes);
        if (indexes.length > 0 && !selectedIndex) {
          setSelectedIndex(indexes[0]);
        }
      } catch (err: any) {
        // Handle structured API errors for index loading
        let errorMessage = 'Failed to load indexes';
        
        if (err && typeof err === 'object' && err.message) {
          errorMessage = `Failed to load indexes: ${err.message}`;
          if (err.code) {
            errorMessage = `Failed to load indexes: ${err.code} - ${err.message}`;
          }
        } else if (err instanceof Error) {
          errorMessage = `Failed to load indexes: ${err.message}`;
        } else {
          errorMessage = `Failed to load indexes: ${String(err)}`;
        }
        
        setError(errorMessage);
      } finally {
        setIndexesLoading(false);
      }
    };

    loadIndexes();
  }, [selectedIndex]);

  // Reset column selection when index changes
  useEffect(() => {
    if (selectedIndex) {
      // Clear current selections to force refresh
      setAvailableColumns([]);
      setSelectedColumns([]);
      setSchemaColumns([]);
      setLastQueryWasFiltered(false);
      // Clear any results from previous index
      setResult(null);
      setError(null);
    }
  }, [selectedIndex]);

  // Update schema columns when we get unfiltered results
  useEffect(() => {
    if (result?.hits?.hits && !lastQueryWasFiltered && schemaColumns.length === 0) {
      // Extract all columns from the unfiltered result
      const allKeys = new Set<string>();
      result.hits.hits.forEach(hit => {
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
      const savedColumns = getSelectedColumnsForIndex(selectedIndex);
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
  }, [result, lastQueryWasFiltered, schemaColumns.length, selectedIndex]);

  // Execute query
  const handleExecute = useCallback(async () => {
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

      // Prepare _source filtering for optimization
      // Only apply filtering if user has made explicit column selections
      let sourceFilter: string[] | boolean = true; // Default: return all fields
      
      if (selectedColumns.length > 0) {
        // User has selected columns - filter to only non-metadata fields
        const sourceFields = selectedColumns.filter(col => !col.startsWith('_'));
        if (sourceFields.length > 0) {
          sourceFilter = sourceFields;
        }
      } else {
        // No columns selected yet - check if there are saved preferences
        const savedColumns = getSelectedColumnsForIndex(selectedIndex);
        if (savedColumns && savedColumns.length > 0) {
          const sourceFields = savedColumns.filter(col => !col.startsWith('_'));
          if (sourceFields.length > 0 && savedColumns.length < 10) { // Only filter if user has limited selection
            sourceFilter = sourceFields;
          }
        }
      }
      
      const request: DirectQueryRequest = {
        index: selectedIndex,
        query: parsedQuery,
        from,
        size,
        _source: sourceFilter,
      };

      // Track whether this query uses filtering
      const queryUsesFiltering = Array.isArray(sourceFilter);
      
      // Debug logging (can be enabled for troubleshooting)
      // console.log('DirectQuery: Executing with _source filter:', {
      //   selectedColumns: selectedColumns.length > 0 ? selectedColumns : 'none',
      //   sourceFilter: sourceFilter,
      //   filterType: Array.isArray(sourceFilter) ? 'array' : 'boolean'
      // });

      const response = await directQueryAPI.execute(request);
      setResult(response);
      setLastQueryWasFiltered(queryUsesFiltering);
      setPage(0); // Reset to first page when new results come in
      
    } catch (err: any) {
      // Handle structured API errors
      let errorMessage = 'An unknown error occurred';
      
      if (err && typeof err === 'object') {
        if (err.message) {
          errorMessage = err.message;
          
          // Add more context for specific errors
          if (err.code) {
            errorMessage = `${err.code}: ${err.message}`;
          }
          
          // For Elasticsearch errors, try to extract the root cause
          if (err.details && err.details.includes('index_not_found_exception')) {
            const indexMatch = err.details.match(/no such index \[([^\]]+)\]/);
            if (indexMatch) {
              errorMessage = `Index '${indexMatch[1]}' not found. Please check if the index exists and try again.`;
            }
          } else if (err.details && err.details.includes('parsing_exception')) {
            errorMessage = `Query parsing error: ${err.message}. Please check your Elasticsearch query syntax.`;
          } else if (err.details && err.details.includes('search_phase_execution_exception')) {
            errorMessage = `Search execution error: ${err.message}. There may be an issue with the query or index mapping.`;
          } else if (err.code === 'ACCESS_DENIED') {
            errorMessage = `Access denied: ${err.message}. Please check if you have permission to access this index.`;
          } else if (err.code === 'INTERNAL_ERROR' && err.details) {
            // Try to extract meaningful error from internal errors
            if (err.details.includes('connection')) {
              errorMessage = `Connection error: Unable to connect to Elasticsearch. Please try again.`;
            } else if (err.details.includes('timeout')) {
              errorMessage = `Request timeout: The query took too long to execute. Try simplifying your query or increasing the timeout.`;
            }
          }
        } else if (err.code && err.status) {
          errorMessage = `${err.code} (${err.status})`;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = String(err);
      }
      
      setError(errorMessage);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [selectedIndex, queryText, from, size]);

  // Clear results
  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
    setPage(0);
  }, []);

  // Handle query text change
  const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQueryText(event.target.value);
    setError(null); // Clear errors when user modifies query
  }, []);

  // Handle pagination
  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Format result data for table display
  const formatResultsForTable = useCallback((hits: ElasticsearchHit[]) => {
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
      const row: Record<string, any> = {
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
  }, [selectedIndex, selectedColumns, availableColumns]);

  // Get paginated data
  const getPaginatedHits = useCallback(() => {
    if (!result?.hits?.hits) return [];
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return result.hits.hits.slice(start, end);
  }, [result, page, rowsPerPage]);

  // Helper function to compare arrays
  const arraysEqual = (a: string[], b: string[]) => {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  };

  const { columns, rows } = formatResultsForTable(getPaginatedHits());
  const totalHits = result?.hits?.total?.value || 0;
  
  // Handle column selection change
  const handleColumnToggle = useCallback((column: string) => {
    setSelectedColumns(prev => {
      const newSelection = prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column];
      
      // Save preferences to session storage
      if (selectedIndex) {
        saveColumnPreferences(selectedIndex, newSelection);
        // Debug: Column selection updated
        // console.log('DirectQuery: Column selection updated:', {
        //   column,
        //   newSelection,
        //   index: selectedIndex
        // });
      }
      
      return newSelection;
    });
  }, [selectedIndex]);
  
  // Handle select all/none for columns
  const handleSelectAllColumns = useCallback(() => {
    const columnsToSelect = schemaColumns.length > 0 ? schemaColumns : availableColumns;
    setSelectedColumns(columnsToSelect);
    if (selectedIndex) {
      saveColumnPreferences(selectedIndex, columnsToSelect);
    }
  }, [schemaColumns, availableColumns, selectedIndex]);
  
  const handleSelectNoColumns = useCallback(() => {
    // Keep at least _id column for table structure
    const minColumns = ['_id'];
    setSelectedColumns(minColumns);
    if (selectedIndex) {
      saveColumnPreferences(selectedIndex, minColumns);
    }
  }, [selectedIndex]);
  
  // Handle Excel export
  const handleExcelExport = useCallback(() => {
    if (!result?.hits?.hits || rows.length === 0) {
      return;
    }
    
    // Get all data, not just paginated
    const allResultsFormatted = formatResultsForTable(result.hits.hits);
    const exportData: ExportData = {
      columns: allResultsFormatted.columns,
      rows: allResultsFormatted.rows,
    };
    
    const filename = `${selectedIndex}_query_results_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(exportData, filename);
  }, [result, rows, formatResultsForTable, selectedIndex]);
  
  // Column filter popover handlers
  const handleColumnFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setColumnAnchorEl(event.currentTarget);
    setColumnFilterOpen(true);
  }, []);
  
  const handleColumnFilterClose = useCallback(() => {
    setColumnFilterOpen(false);
    setColumnAnchorEl(null);
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CodeIcon />
        Direct Elasticsearch Query
      </Typography>
      
      <Grid container spacing={3}>
        {/* Query Input Section */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader 
              title="Query Configuration"
              avatar={<IndexIcon color="primary" />}
            />
            <CardContent>
              <Grid container spacing={2}>
                {/* Index Selection */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth disabled={indexesLoading}>
                    <InputLabel>Select Index</InputLabel>
                    <Select
                      value={selectedIndex}
                      label="Select Index"
                      onChange={(e) => setSelectedIndex(e.target.value)}
                    >
                      {availableIndexes.map((index) => (
                        <MenuItem key={index} value={index}>
                          {index}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {indexesLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        Loading indexes...
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* From Parameter */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="From (Offset)"
                    value={from}
                    onChange={(e) => setFrom(Math.max(0, parseInt(e.target.value) || 0))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                {/* Size Parameter */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Size (Limit)"
                    value={size}
                    onChange={(e) => setSize(Math.max(1, Math.min(1000, parseInt(e.target.value) || 10)))}
                    inputProps={{ min: 1, max: 1000 }}
                  />
                </Grid>

                {/* Query JSON Input */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Elasticsearch Query (JSON)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    value={queryText}
                    onChange={handleQueryChange}
                    placeholder="Enter your Elasticsearch query in JSON format..."
                    sx={{
                      fontFamily: 'monospace',
                      '& .MuiInputBase-input': {
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '14px',
                      },
                    }}
                  />
                </Grid>

                {/* Query Guidelines Panel */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <IconButton
                      onClick={() => setGuidelinesOpen(!guidelinesOpen)}
                      size="small"
                    >
                      {guidelinesOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                    <Typography variant="body2" color="text.secondary">
                      Query Examples & Guidelines
                    </Typography>
                    <HelpIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  </Box>
                  
                  <Collapse in={guidelinesOpen}>
                    <Box sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1, 
                      p: 2, 
                      bgcolor: 'background.paper',
                      mb: 2
                    }}>
                      <Tabs 
                        value={selectedTab} 
                        onChange={(_, newTab) => setSelectedTab(newTab)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                      >
                        <Tab label="Basic Queries" />
                        <Tab label="Filters" />
                        <Tab label="Aggregations" />
                        <Tab label="Advanced" />
                      </Tabs>
                      
                      {selectedTab === 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Basic Query Examples</Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Match All Documents:</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "query": {\n    "match_all": {}\n  },\n  "size": 10\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "query": {
    "match_all": {}
  },
  "size": 10
}`}
                              </pre>
                            </Box>
                          </Box>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Match Specific Field:</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "query": {\n    "match": {\n      "field_name": "search_value"\n    }\n  },\n  "size": 10\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "query": {
    "match": {
      "field_name": "search_value"
    }
  },
  "size": 10
}`}
                              </pre>
                            </Box>
                          </Box>
                          
                          <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Term Query (Exact Match):</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "query": {\n    "term": {\n      "status.keyword": "active"\n    }\n  },\n  "size": 10\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "query": {
    "term": {
      "status.keyword": "active"
    }
  },
  "size": 10
}`}
                              </pre>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      
                      {selectedTab === 1 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Filter Query Examples</Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Range Filter:</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "query": {\n    "range": {\n      "age": {\n        "gte": 18,\n        "lte": 65\n      }\n    }\n  },\n  "size": 10\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "query": {
    "range": {
      "age": {
        "gte": 18,
        "lte": 65
      }
    }
  },
  "size": 10
}`}
                              </pre>
                            </Box>
                          </Box>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Multiple Filters (AND):</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "query": {\n    "bool": {\n      "must": [\n        { "term": { "status.keyword": "active" } },\n        { "range": { "created_at": { "gte": "2023-01-01" } } }\n      ]\n    }\n  },\n  "size": 10\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "query": {
    "bool": {
      "must": [
        { "term": { "status.keyword": "active" } },
        { "range": { "created_at": { "gte": "2023-01-01" } } }
      ]
    }
  },
  "size": 10
}`}
                              </pre>
                            </Box>
                          </Box>
                          
                          <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Exclude Filter (NOT):</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "query": {\n    "bool": {\n      "must_not": [\n        { "term": { "status.keyword": "deleted" } }\n      ]\n    }\n  },\n  "size": 10\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "query": {
    "bool": {
      "must_not": [
        { "term": { "status.keyword": "deleted" } }
      ]
    }
  },
  "size": 10
}`}
                              </pre>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      
                      {selectedTab === 2 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Aggregation Examples</Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Terms Aggregation (Group By):</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "size": 0,\n  "aggs": {\n    "status_counts": {\n      "terms": {\n        "field": "status.keyword",\n        "size": 10\n      }\n    }\n  }\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "size": 0,
  "aggs": {
    "status_counts": {
      "terms": {
        "field": "status.keyword",
        "size": 10
      }
    }
  }
}`}
                              </pre>
                            </Box>
                          </Box>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Date Histogram:</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "size": 0,\n  "aggs": {\n    "monthly_counts": {\n      "date_histogram": {\n        "field": "created_at",\n        "calendar_interval": "month"\n      }\n    }\n  }\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "size": 0,
  "aggs": {
    "monthly_counts": {
      "date_histogram": {
        "field": "created_at",
        "calendar_interval": "month"
      }
    }
  }
}`}
                              </pre>
                            </Box>
                          </Box>
                          
                          <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Statistics Aggregation:</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "size": 0,\n  "aggs": {\n    "age_stats": {\n      "stats": {\n        "field": "age"\n      }\n    }\n  }\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "size": 0,
  "aggs": {
    "age_stats": {
      "stats": {
        "field": "age"
      }
    }
  }
}`}
                              </pre>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      
                      {selectedTab === 3 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Advanced Query Examples</Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Wildcard Search:</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "query": {\n    "wildcard": {\n      "name.keyword": "*john*"\n    }\n  },\n  "size": 10\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "query": {
    "wildcard": {
      "name.keyword": "*john*"
    }
  },
  "size": 10
}`}
                              </pre>
                            </Box>
                          </Box>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Fuzzy Search:</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "query": {\n    "fuzzy": {\n      "name": {\n        "value": "john",\n        "fuzziness": "AUTO"\n      }\n    }\n  },\n  "size": 10\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "query": {
    "fuzzy": {
      "name": {
        "value": "john",
        "fuzziness": "AUTO"
      }
    }
  },
  "size": 10
}`}
                              </pre>
                            </Box>
                          </Box>
                          
                          <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Multi-Match Query:</Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 2, 
                              borderRadius: 1, 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              position: 'relative'
                            }}>
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => navigator.clipboard.writeText('{\n  "query": {\n    "multi_match": {\n      "query": "search term",\n      "fields": ["name", "description", "content"]\n    }\n  },\n  "size": 10\n}')}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "query": {
    "multi_match": {
      "query": "search term",
      "fields": ["name", "description", "content"]
    }
  },
  "size": 10
}`}
                              </pre>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                        💡 Tip: Click the copy icon to copy examples to clipboard. Modify field names and values to match your index schema.
                      </Typography>
                    </Box>
                  </Collapse>
                </Grid>

                {/* Action Buttons */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={16} /> : <ExecuteIcon />}
                      onClick={handleExecute}
                      disabled={loading || !selectedIndex}
                      size="large"
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
                    
                    {result && rows.length > 0 && (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          onClick={handleExcelExport}
                          disabled={loading}
                        >
                          Export Excel
                        </Button>
                        
                        <Button
                          variant="outlined"
                          startIcon={<ColumnIcon />}
                          onClick={handleColumnFilterClick}
                          disabled={loading}
                        >
                          Columns ({selectedColumns.length}/{schemaColumns.length > 0 ? schemaColumns.length : availableColumns.length})
                        </Button>
                      </>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Display */}
        {error && (
          <Grid item xs={12}>
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              sx={{ 
                '& .MuiAlert-message': { 
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }
              }}
            >
              <Box>
                <Typography variant="body1" component="div" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                  Query Execution Failed
                </Typography>
                <Typography variant="body2" component="div">
                  {error}
                </Typography>
              </Box>
            </Alert>
          </Grid>
        )}

        {/* Results Section */}
        {result && (
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TableIcon />
                    Query Results
                    <Chip
                      label={`${totalHits} hits in ${result.took}ms`}
                      color="success"
                      size="small"
                    />
                  </Box>
                }
              />
              <CardContent>
                {/* Query Info */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Index:</strong> {selectedIndex} | 
                    <strong> Shards:</strong> {result._shards.successful}/{result._shards.total} successful |
                    <strong> Timed out:</strong> {result.timed_out ? 'Yes' : 'No'}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />
                
                {/* Column Filter Popover */}
                <Popover
                  open={columnFilterOpen}
                  anchorEl={columnAnchorEl}
                  onClose={handleColumnFilterClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                >
                  <Box sx={{ p: 2, minWidth: 300, maxWidth: 400 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Select Columns to Display
                    </Typography>
                    
                    <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleSelectAllColumns}
                      >
                        Select All
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleSelectNoColumns}
                      >
                        Clear All
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => {
                          if (selectedIndex) {
                            clearColumnPreferencesForIndex(selectedIndex);
                            const columnsToReset = schemaColumns.length > 0 ? schemaColumns : availableColumns;
                            setSelectedColumns(columnsToReset);
                          }
                        }}
                      >
                        Reset
                      </Button>
                    </Box>
                    
                    <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {(schemaColumns.length > 0 ? schemaColumns : availableColumns).map((column) => (
                        <ListItem key={column} disablePadding>
                          <ListItemButton
                            onClick={() => handleColumnToggle(column)}
                            dense
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Checkbox
                                checked={selectedColumns.includes(column)}
                                tabIndex={-1}
                                disableRipple
                                size="small"
                              />
                            </ListItemIcon>
                            <ListItemText 
                              primary={column}
                              primaryTypographyProps={{ 
                                fontSize: '0.875rem',
                                fontFamily: column.startsWith('_') ? 'monospace' : 'inherit'
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Selected columns will be saved for this index
                    </Typography>
                  </Box>
                </Popover>

                {/* Results Table */}
                {rows.length > 0 ? (
                  <>
                    <TableContainer component={Paper} variant="outlined">
                      <Table sx={{ minWidth: 650 }} size="small">
                        <TableHead>
                          <TableRow>
                            {columns.map((column) => (
                              <TableCell
                                key={column}
                                sx={{
                                  fontWeight: 'bold',
                                  backgroundColor: theme.palette.grey[50],
                                }}
                              >
                                {column}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow
                              key={row.id}
                              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                              {columns.map((column) => {
                                const rawValue = row[column];
                                const cellValue = rawValue !== undefined && rawValue !== null
                                  ? typeof rawValue === 'object'
                                    ? JSON.stringify(rawValue)
                                    : String(rawValue)
                                  : '-';
                                
                                // Format tooltip content for better readability
                                const tooltipContent = rawValue !== undefined && rawValue !== null
                                  ? typeof rawValue === 'object'
                                    ? JSON.stringify(rawValue, null, 2) // Pretty format JSON
                                    : String(rawValue)
                                  : 'No data';
                                
                                const shouldShowTooltip = cellValue.length > 30 || typeof rawValue === 'object';
                                
                                return (
                                  <TableCell 
                                    key={`${row.id}-${column}`}
                                    sx={{
                                      maxWidth: '200px',
                                      maxHeight: '60px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      position: 'relative',
                                    }}
                                  >
                                    {shouldShowTooltip ? (
                                      <Tooltip 
                                        title={
                                          <Box component="pre" sx={{ 
                                            whiteSpace: 'pre-wrap', 
                                            fontSize: '0.75rem',
                                            fontFamily: 'monospace',
                                            maxWidth: '400px',
                                            maxHeight: '300px',
                                            overflow: 'auto'
                                          }}>
                                            {tooltipContent}
                                          </Box>
                                        } 
                                        placement="top"
                                        arrow
                                        enterDelay={300}
                                      >
                                        <span style={{ cursor: 'help' }}>{cellValue}</span>
                                      </Tooltip>
                                    ) : (
                                      <span>{cellValue}</span>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25, 50]}
                      component="div"
                      count={totalHits}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No results found
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default DirectQuery;