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
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  Clear as ClearIcon,
  Storage as IndexIcon,
  Code as CodeIcon,
  TableView as TableIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { DirectQueryRequest, DirectQueryResponse, ElasticsearchHit } from '@/types';
import { directQueryAPI } from '@/services/api';
import { useTheme } from '@mui/material/styles';

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
      } catch (err) {
        setError(`Failed to load indexes: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIndexesLoading(false);
      }
    };

    loadIndexes();
  }, [selectedIndex]);

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

      const request: DirectQueryRequest = {
        index: selectedIndex,
        query: parsedQuery,
        from,
        size,
      };

      const response = await directQueryAPI.execute(request);
      setResult(response);
      setPage(0); // Reset to first page when new results come in
      
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
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

    // Create columns
    const columns = ['_id', '_score', ...Array.from(allKeys).sort()];
    
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

    return { columns, rows };
  }, []);

  // Get paginated data
  const getPaginatedHits = useCallback(() => {
    if (!result?.hits?.hits) return [];
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return result.hits.hits.slice(start, end);
  }, [result, page, rowsPerPage]);

  const { columns, rows } = formatResultsForTable(getPaginatedHits());
  const totalHits = result?.hits?.total?.value || 0;

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
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Display */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
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