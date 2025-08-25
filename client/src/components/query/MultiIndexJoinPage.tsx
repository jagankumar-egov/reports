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
} from '@mui/icons-material';

import { useElasticsearchQuery } from '@/hooks/useElasticsearchQuery';
import { useMultiIndexJoin } from '@/hooks/useMultiIndexJoin';
import { JoinConfiguration, FieldInfo } from '@/types';
import { directQueryAPI } from '@/services/api';
import { extractFieldsFromMapping } from '@/utils/mappingUtils';
import { exportToExcel } from '@/utils/excelExport';

/**
 * Multi-Index Join Page Component
 * 
 * Provides a comprehensive interface for joining data from multiple Elasticsearch indices.
 * Features include:
 * - Cross-index data joining with four join types (Inner, Left, Right, Full)
 * - Automatic field discovery with dropdown selectors
 * - Real-time join preview with compatibility checking
 * - Advanced table view with flattened column structure
 * - Smart column merging and index differentiation
 * - WYSIWYG Excel export with pagination support
 * - Debounced requests to prevent API overload
 */
const MultiIndexJoinPage: React.FC = () => {
  // Use shared hooks for index list - leveraging existing infrastructure
  const query = useElasticsearchQuery({
    onResult: () => {}, // We don't need result handling here, only index discovery
  });

  // Custom hook for multi-index join operations
  const join = useMultiIndexJoin();

  // Join configuration state - core settings for the join operation
  const [leftIndex, setLeftIndex] = useState('');  // Source index for left side of join
  const [rightIndex, setRightIndex] = useState(''); // Source index for right side of join
  const [leftField, setLeftField] = useState('');   // Field from left index to join on
  const [rightField, setRightField] = useState(''); // Field from right index to join on
  const [joinType, setJoinType] = useState<'inner' | 'left' | 'right' | 'full'>('inner'); // SQL-style join type
  const [from, setFrom] = useState(0);   // Pagination offset
  const [size, setSize] = useState(50);  // Results per page

  // Field mapping state - dynamic field discovery from Elasticsearch mappings
  const [leftFields, setLeftFields] = useState<FieldInfo[]>([]);   // Available fields from left index
  const [rightFields, setRightFields] = useState<FieldInfo[]>([]); // Available fields from right index
  const [fieldsLoading, setFieldsLoading] = useState({ left: false, right: false }); // Loading states for field discovery

  // Table view state - advanced table display and export options
  const [viewMode, setViewMode] = useState<'preview' | 'table'>('preview'); // Toggle between JSON preview and structured table
  const [page, setPage] = useState(0);           // Current page in table pagination
  const [rowsPerPage, setRowsPerPage] = useState(10); // Rows per page (5, 10, 25, 50)
  const [mergeColumns, setMergeColumns] = useState(true); // Whether to merge common columns or show separately
  const [exportAll, setExportAll] = useState(false);     // Export all data vs current page only
  const [exporting, setExporting] = useState(false);     // Export operation in progress

  // Handle join preview
  const handlePreview = useCallback(async () => {
    if (!leftIndex || !rightIndex || !leftField || !rightField) {
      return;
    }
    
    await join.getPreview(leftIndex, rightIndex, leftField, rightField);
  }, [leftIndex, rightIndex, leftField, rightField, join]);

  // Handle join execution
  const handleExecute = useCallback(async () => {
    if (!leftIndex || !rightIndex || !leftField || !rightField) {
      return;
    }

    const joinConfig: JoinConfiguration = {
      leftIndex,
      rightIndex,
      joinField: {
        left: leftField,
        right: rightField
      },
      joinType,
      limit: 1000 // Max records per index for join processing
    };

    const request = {
      joins: [joinConfig],
      from,
      size
    };

    await join.executeJoin(request);
  }, [leftIndex, rightIndex, leftField, rightField, joinType, from, size, join]);

  /**
   * Load available fields when left index changes
   * Uses Elasticsearch mapping API to discover field structure dynamically
   * This eliminates need for hardcoded field lists and adapts to any index schema
   */
  useEffect(() => {
    if (leftIndex) {
      setFieldsLoading(prev => ({ ...prev, left: true }));
      directQueryAPI.getIndexMapping(leftIndex)
        .then(mappingResponse => {
          // Extract the actual mapping from the nested response structure
          // API returns: { "indexName": { "mappings": { "properties": { ... } } } }
          const indexMapping = mappingResponse[leftIndex];
          if (!indexMapping || !indexMapping.mappings) {
            throw new Error(`Invalid mapping structure for index: ${leftIndex}`);
          }
          
          // Transform ES mapping into structured field information
          const fields = extractFieldsFromMapping(indexMapping);
          console.log(`✅ Loaded ${fields.length} fields for left index ${leftIndex}:`, fields.slice(0, 5).map(f => f.fullPath));
          setLeftFields(fields);
        })
        .catch(error => {
          console.error('Failed to load left index fields:', error);
          setLeftFields([]);
        })
        .finally(() => {
          setFieldsLoading(prev => ({ ...prev, left: false }));
        });
    } else {
      setLeftFields([]);
      setLeftField('');
    }
  }, [leftIndex]);

  /**
   * Load available fields when right index changes
   * Mirror of left index field loading with same dynamic discovery approach
   */
  useEffect(() => {
    if (rightIndex) {
      setFieldsLoading(prev => ({ ...prev, right: true }));
      directQueryAPI.getIndexMapping(rightIndex)
        .then(mappingResponse => {
          // Extract the actual mapping from the nested response structure
          // API returns: { "indexName": { "mappings": { "properties": { ... } } } }
          const indexMapping = mappingResponse[rightIndex];
          if (!indexMapping || !indexMapping.mappings) {
            throw new Error(`Invalid mapping structure for index: ${rightIndex}`);
          }
          
          // Transform ES mapping into structured field information
          const fields = extractFieldsFromMapping(indexMapping);
          console.log(`✅ Loaded ${fields.length} fields for right index ${rightIndex}:`, fields.slice(0, 5).map(f => f.fullPath));
          setRightFields(fields);
        })
        .catch(error => {
          console.error('Failed to load right index fields:', error);
          setRightFields([]);
        })
        .finally(() => {
          setFieldsLoading(prev => ({ ...prev, right: false }));
        });
    } else {
      setRightFields([]);
      setRightField('');
    }
  }, [rightIndex]);

  // Auto-preview when all fields are filled (debounced to prevent excessive requests)
  // This provides real-time compatibility checking without overwhelming the API
  useEffect(() => {
    if (leftIndex && rightIndex && leftField && rightField) {
      // Debounce preview requests to prevent API storm when user is rapidly changing selections
      const timeoutId = setTimeout(() => {
        join.getPreview(leftIndex, rightIndex, leftField, rightField);
      }, 500); // 500ms debounce - balance between responsiveness and API efficiency
      
      return () => clearTimeout(timeoutId); // Cleanup on dependency change
    }
  }, [leftIndex, rightIndex, leftField, rightField]);

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
   * Index colors for visual differentiation in table view
   * Consistent color coding helps users identify data sources
   */
  const getIndexColor = (indexName: string) => {
    const colors = {
      [leftIndex]: '#1976d2', // Blue for left index - primary color
      [rightIndex]: '#d32f2f', // Red for right index - secondary color
    };
    return colors[indexName] || '#666'; // Default gray for unknown indices
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

  /**
   * Process joined data for table view
   * Converts raw join results into structured table format with proper column handling
   * Supports both merged (common columns combined) and separated (all columns distinct) views
   */
  const processTableData = (results: any[]) => {
    if (!results || results.length === 0) return { columns: [], rows: [] };

    // Collect all unique field paths from both indices (flattened)
    const allFieldPaths = new Set<string>();
    const leftFieldPaths = new Set<string>();
    const rightFieldPaths = new Set<string>();
    const commonFields = new Set<string>();

    // First pass: collect all unique field paths from both indices
    // This discovers the complete schema across all joined records
    results.forEach(record => {
      if (record.leftRecord) {
        const flattened = flattenObject(record.leftRecord);
        Object.keys(flattened).forEach(field => {
          leftFieldPaths.add(field);
          allFieldPaths.add(field);
        });
      }
      if (record.rightRecord) {
        const flattened = flattenObject(record.rightRecord);
        Object.keys(flattened).forEach(field => {
          rightFieldPaths.add(field);
          allFieldPaths.add(field);
        });
      }
    });

    // Identify common fields that exist in both indices
    // These can be merged into single columns or displayed separately
    leftFieldPaths.forEach(field => {
      if (rightFieldPaths.has(field)) {
        commonFields.add(field);
      }
    });

    // Create columns based on merge preference
    const columns: Array<{
      id: string;
      label: string;
      field: string;
      sourceIndex?: string;
      color?: string;
      merged?: boolean;
    }> = [];

    // Always add join key column first if exists
    columns.push({
      id: '_joinKey',
      label: 'Join Key',
      field: '_joinKey',
      merged: true,
    });

    if (mergeColumns) {
      // Merged view: combine common fields into single columns
      // This provides a cleaner, more consolidated view of the data
      [...commonFields].sort().forEach(field => {
        columns.push({
          id: field,
          label: field,
          field,
          merged: true,
        });
      });

      // Add separate columns for fields unique to left index
      // These fields have no counterpart in the right index
      [...leftFieldPaths].filter(field => !commonFields.has(field)).sort().forEach(field => {
        columns.push({
          id: `${leftIndex}.${field}`,
          label: field,
          field,
          sourceIndex: leftIndex,
          color: getIndexColor(leftIndex),
        });
      });

      // Add separate columns for fields unique to right index
      // These fields have no counterpart in the left index
      [...rightFieldPaths].filter(field => !commonFields.has(field)).sort().forEach(field => {
        columns.push({
          id: `${rightIndex}.${field}`,
          label: field,
          field,
          sourceIndex: rightIndex,
          color: getIndexColor(rightIndex),
        });
      });
    } else {
      // Separated view: show all fields with index prefixes
      // This provides complete visibility into data sources but creates more columns
      [...leftFieldPaths].sort().forEach(field => {
        columns.push({
          id: `${leftIndex}.${field}`,
          label: `[${leftIndex}] ${field}`,
          field,
          sourceIndex: leftIndex,
          color: getIndexColor(leftIndex),
        });
      });

      [...rightFieldPaths].sort().forEach(field => {
        columns.push({
          id: `${rightIndex}.${field}`,
          label: `[${rightIndex}] ${field}`,
          field,
          sourceIndex: rightIndex,
          color: getIndexColor(rightIndex),
        });
      });
    }

    // Create table rows by flattening and mapping join result data
    // Each row represents one joined record with proper column mapping
    const rows = results.map((record, index) => {
      const row: any = { id: index, _joinKey: record.joinKey || 'N/A' };
      
      // Flatten both records
      const leftFlattened = record.leftRecord ? flattenObject(record.leftRecord) : {};
      const rightFlattened = record.rightRecord ? flattenObject(record.rightRecord) : {};

      columns.forEach(column => {
        if (column.field === '_joinKey') {
          // Skip, already set
        } else if (column.merged) {
          // For merged columns, prefer left record value, fallback to right
          // This provides a unified view while preserving data priority
          const value = leftFlattened[column.field] ?? rightFlattened[column.field] ?? '';
          row[column.id] = formatCellValue(value);
        } else if (column.sourceIndex === leftIndex) {
          const value = leftFlattened[column.field] ?? '';
          row[column.id] = formatCellValue(value);
        } else if (column.sourceIndex === rightIndex) {
          const value = rightFlattened[column.field] ?? '';
          row[column.id] = formatCellValue(value);
        }
      });

      return row;
    });

    return { columns, rows };
  };

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
  const handleExcelExport = async (forceExportAll = false) => {
    if (!join.result?.results) {
      console.warn('No join results available for export');
      return;
    }

    setExporting(true);
    
    try {
      const { columns, rows } = processTableData(join.result.results);
      
      if (!columns.length || !rows.length) {
        console.warn('No data available for export');
        return;
      }
      
      // Export all data or just current page based on user preference
      const shouldExportAll = forceExportAll || exportAll;
      const dataToExport = shouldExportAll 
        ? rows
        : rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
      
      if (!dataToExport.length) {
        console.warn('No data on current page to export');
        return;
      }
      
      // Convert table data to format expected by exportToExcel utility
      // Maintains column order and ensures proper mapping of display labels to data
      const columnLabels = columns.map(col => col.label);
      const exportRows = dataToExport.map(row => {
        const exportRow: any = {};
        columns.forEach(col => {
          exportRow[col.label] = row[col.id] || ''; // Use display label as key
        });
        return exportRow;
      });

      // Generate descriptive filename with metadata for easy identification
      const viewType = mergeColumns ? 'merged' : 'separated';           // Column merge strategy
      const exportType = shouldExportAll ? '_all' : `_page${page + 1}`; // Data scope
      const filename = `join_${leftIndex}_${rightIndex}_${viewType}${exportType}_${new Date().toISOString().split('T')[0]}`;
      
      // Use the raw exportToExcel utility
      exportToExcel({
        columns: columnLabels,
        rows: exportRows
      }, filename);
      
      console.log(`✅ Exported ${exportRows.length} rows with ${columnLabels.length} columns to ${filename}.csv`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  /**
   * Render join summary statistics
   * Provides high-level overview of join operation results
   */
  const renderJoinSummary = (summary: any) => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="primary">{summary.leftIndexTotal}</Typography>
          <Typography variant="caption">Left Index Records</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="secondary">{summary.rightIndexTotal}</Typography>
          <Typography variant="caption">Right Index Records</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="success.main">{summary.joinedRecords}</Typography>
          <Typography variant="caption">Matched Records</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="warning.main">
            {summary.leftOnlyRecords + summary.rightOnlyRecords}
          </Typography>
          <Typography variant="caption">Unmatched Records</Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  /**
   * Render preview table showing raw join records
   * Displays JSON preview format for detailed inspection
   */
  const renderPreviewTable = (records: any[]) => (
    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Join Key</TableCell>
            <TableCell>Join Type</TableCell>
            <TableCell>Left Record</TableCell>
            <TableCell>Right Record</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record, index) => (
            <TableRow key={index}>
              <TableCell>{record.joinKey || 'N/A'}</TableCell>
              <TableCell>
                <Chip 
                  size="small" 
                  label={record.joinType} 
                  color={record.joinType === 'matched' ? 'success' : 'warning'}
                />
              </TableCell>
              <TableCell>
                {record.leftRecord ? (
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(record.leftRecord, null, 2).substring(0, 100)}...
                  </Typography>
                ) : 'No match'}
              </TableCell>
              <TableCell>
                {record.rightRecord ? (
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(record.rightRecord, null, 2).substring(0, 100)}...
                  </Typography>
                ) : 'No match'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  /**
   * Render structured table view with advanced features
   * Provides flattened, paginated, exportable table with column management
   */
  const renderTableView = (results: any[]) => {
    const { columns, rows } = processTableData(results);
    const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    
    // Count columns by type for informational display to user
    // Helps users understand the table structure and data distribution
    const mergedColumnsCount = columns.filter(c => c.merged && c.field !== '_joinKey').length;  // Common fields
    const leftColumnsCount = columns.filter(c => c.sourceIndex === leftIndex).length;           // Left-only fields
    const rightColumnsCount = columns.filter(c => c.sourceIndex === rightIndex).length;         // Right-only fields

    return (
      <Box>
        {/* Table controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ToggleButtonGroup
              value={mergeColumns}
              exclusive
              onChange={(_e, value) => value !== null && setMergeColumns(value)}
              size="small"
            >
              <ToggleButton value={true}>
                <Tooltip title="Merge common columns">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Merged View
                  </Box>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value={false}>
                <Tooltip title="Show separate columns for each index">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Separated View
                  </Box>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Index legend */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                size="small"
                label={leftIndex}
                sx={{ 
                  backgroundColor: getIndexColor(leftIndex), 
                  color: 'white',
                  fontSize: '0.75rem'
                }}
              />
              <Chip
                size="small"
                label={rightIndex}
                sx={{ 
                  backgroundColor: getIndexColor(rightIndex), 
                  color: 'white',
                  fontSize: '0.75rem'
                }}
              />
            </Box>
          </Box>

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
        </Box>

        {/* Column info */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Showing {columns.length} columns total{mergeColumns ? ` (${mergedColumnsCount} common, ${leftColumnsCount} from ${leftIndex}, ${rightColumnsCount} from ${rightIndex})` : ''}
        </Typography>

        {/* Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map(column => (
                  <TableCell 
                    key={column.id}
                    sx={{
                      backgroundColor: column.color ? `${column.color}15` : 'background.paper',
                      borderLeft: column.color ? `3px solid ${column.color}` : 'none',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      minWidth: 120,
                    }}
                  >
                    <Tooltip title={`${column.sourceIndex ? `From: ${column.sourceIndex}` : column.merged ? 'Common field' : 'Join Key'}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {column.label}
                        {column.merged && column.field !== '_joinKey' && (
                          <Chip 
                            size="small" 
                            label="M" 
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 14, '& .MuiChip-label': { px: 0.5 } }}
                          />
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.map(row => (
                <TableRow key={row.id} hover>
                  {columns.map(column => (
                    <TableCell 
                      key={column.id}
                      sx={{
                        borderLeft: column.color ? `3px solid ${column.color}` : 'none',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Tooltip title={String(row[column.id] || '')}>
                        <span>{String(row[column.id] || '')}</span>
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
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <JoinIcon />
        Multi-Index Join
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Join data from multiple Elasticsearch indices using common attributes to create consolidated results.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Join Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon />
                Join Configuration
              </Typography>
              
              <Grid container spacing={2}>
                {/* Index Selection */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Left Index</InputLabel>
                    <Select
                      value={leftIndex}
                      label="Left Index"
                      onChange={(e) => setLeftIndex(e.target.value)}
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
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Right Index</InputLabel>
                    <Select
                      value={rightIndex}
                      label="Right Index"
                      onChange={(e) => setRightIndex(e.target.value)}
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

                {/* Join Fields */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Left Join Field</InputLabel>
                    <Select
                      value={leftField}
                      label="Left Join Field"
                      onChange={(e) => setLeftField(e.target.value)}
                      disabled={!leftIndex || fieldsLoading.left}
                      onOpen={() => console.log('🔍 Left field dropdown opened. Available fields:', leftFields.length, leftFields.slice(0, 3).map(f => f.fullPath))}
                    >
                      {leftFields.map((field) => (
                        <MenuItem key={field.fullPath} value={field.fullPath}>
                          <Box>
                            <Typography variant="body2">{field.fullPath}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {field.type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldsLoading.left && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        Loading fields...
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Right Join Field</InputLabel>
                    <Select
                      value={rightField}
                      label="Right Join Field"
                      onChange={(e) => setRightField(e.target.value)}
                      disabled={!rightIndex || fieldsLoading.right}
                      onOpen={() => console.log('🔍 Right field dropdown opened. Available fields:', rightFields.length, rightFields.slice(0, 3).map(f => f.fullPath))}
                    >
                      {rightFields.map((field) => (
                        <MenuItem key={field.fullPath} value={field.fullPath}>
                          <Box>
                            <Typography variant="body2">{field.fullPath}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {field.type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldsLoading.right && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        Loading fields...
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* Join Type */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Join Type</InputLabel>
                    <Select
                      value={joinType}
                      label="Join Type"
                      onChange={(e) => setJoinType(e.target.value as any)}
                    >
                      <MenuItem value="inner">Inner Join</MenuItem>
                      <MenuItem value="left">Left Join</MenuItem>
                      <MenuItem value="right">Right Join</MenuItem>
                      <MenuItem value="full">Full Outer Join</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {getJoinTypeDescription(joinType)}
                  </Typography>
                </Grid>

                {/* Pagination */}
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="From (Offset)"
                    value={from}
                    onChange={(e) => setFrom(Math.max(0, parseInt(e.target.value) || 0))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Size (Limit)"
                    value={size}
                    onChange={(e) => setSize(Math.max(1, Math.min(1000, parseInt(e.target.value) || 50)))}
                    inputProps={{ min: 1, max: 1000 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={join.loading ? <CircularProgress size={16} /> : <PreviewIcon />}
                  onClick={handlePreview}
                  disabled={join.loading || !leftIndex || !rightIndex || !leftField || !rightField}
                >
                  {join.loading ? 'Loading...' : 'Preview Join'}
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={join.loading ? <CircularProgress size={16} /> : <ExecuteIcon />}
                  onClick={handleExecute}
                  disabled={join.loading || !leftIndex || !rightIndex || !leftField || !rightField}
                  size="large"
                >
                  {join.loading ? 'Executing...' : 'Execute Join'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={join.clearResults}
                  disabled={join.loading}
                >
                  Clear Results
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Display */}
        {join.error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={join.clearError}>
              {join.error}
            </Alert>
          </Grid>
        )}

        {/* Join Preview */}
        {join.preview && (
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Join Preview & Compatibility</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {renderJoinSummary(join.preview.joinSummary)}
                
                {join.preview.preview.length > 0 ? (
                  <>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Sample Joined Records:
                    </Typography>
                    {renderPreviewTable(join.preview.preview)}
                  </>
                ) : (
                  <Alert severity="warning">
                    No matching records found. Check that your join fields contain compatible values.
                  </Alert>
                )}
                
                {Object.keys(join.preview.sampleJoinKeys).length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Sample Join Key Distribution:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(join.preview.sampleJoinKeys).map(([key, count]) => (
                        <Chip key={key} size="small" label={`${key}: ${count}`} variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Join Results */}
        {join.result && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Join Results ({join.result.totalResults} total, showing {join.result.results.length})
                  </Typography>
                  
                  {/* View mode toggle */}
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_e, value) => value !== null && setViewMode(value)}
                    size="small"
                  >
                    <ToggleButton value="preview">
                      <ListViewIcon sx={{ mr: 1 }} />
                      Preview
                    </ToggleButton>
                    <ToggleButton value="table">
                      <TableViewIcon sx={{ mr: 1 }} />
                      Table
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                {renderJoinSummary(join.result.joinSummary)}
                
                {join.result.results.length > 0 ? (
                  <>
                    {viewMode === 'preview' ? (
                      <>
                        <Typography variant="subtitle1" sx={{ mb: 2 }}>
                          Joined Data (Preview):
                        </Typography>
                        {renderPreviewTable(join.result.results)}
                      </>
                    ) : (
                      <>
                        <Typography variant="subtitle1" sx={{ mb: 2 }}>
                          Joined Data (Table):
                        </Typography>
                        {renderTableView(join.result.results)}
                      </>
                    )}
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