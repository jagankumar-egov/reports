import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import ReactECharts from 'echarts-for-react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Checkbox,
  FormControlLabel,
  FormGroup,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Chip,
  TextField,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { dataPointsAPI, indicesAPI } from '../services/api';
import { echartsTheme } from '../theme';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`data-point-tabpanel-${index}`}
      aria-labelledby={`data-point-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const timeRangeOptions = [
  { value: 'now-1h', label: 'Last 1 Hour' },
  { value: 'now-6h', label: 'Last 6 Hours' },
  { value: 'now-24h', label: 'Last 24 Hours' },
  { value: 'now-7d', label: 'Last 7 Days' },
  { value: 'now-30d', label: 'Last 30 Days' },
  { value: 'now-90d', label: 'Last 90 Days' },
  { value: 'now-1y', label: 'Last 1 Year' },
  { value: 'all', label: 'All Time' },
];

function DataPointViewerPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('now-30d');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [filters, setFilters] = useState<any[]>([]);

  // Fetch data point details
  const { data: dataPoint, isLoading: dataPointLoading } = useQuery(
    ['dataPoint', id],
    async () => {
      const response = await dataPointsAPI.get(id!);
      return response.data;
    }
  );

  // Fetch field mappings for the data point's indices
  const { data: fieldMappings } = useQuery(
    ['fieldMappings', dataPoint?.source.indices],
    async () => {
      if (!dataPoint?.source.indices?.[0]) return null;
      const response = await indicesAPI.getMapping(dataPoint.source.indices[0]);
      return response.data;
    },
    { enabled: !!dataPoint?.source.indices?.[0] }
  );

  // Run data point query
  const { data: queryResults, isLoading: queryLoading, refetch } = useQuery(
    ['dataPointResults', id, timeRange, selectedFields, filters],
    async () => {
      if (!dataPoint) return null;
      const response = await dataPointsAPI.run(id!, { 
        timeRange,
        projections: selectedFields.length > 0 ? selectedFields : undefined,
        filters 
      });
      return response.data;
    },
    { enabled: !!dataPoint }
  );

  // Extract available fields from mapping
  useEffect(() => {
    if (fieldMappings) {
      const extractFields = (obj: any, prefix = ''): string[] => {
        const fields: string[] = [];
        for (const [key, value] of Object.entries(obj)) {
          const fieldPath = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === 'object') {
            if ((value as any).properties) {
              fields.push(...extractFields((value as any).properties, fieldPath));
            } else if ((value as any).type) {
              fields.push(fieldPath);
            }
          }
        }
        return fields;
      };

      const indexName = Object.keys(fieldMappings)[0];
      const properties = fieldMappings[indexName]?.mappings?.properties || {};
      const fields = extractFields(properties);
      setAvailableFields(fields.sort());
      
      // Set default selected fields if none are selected
      if (selectedFields.length === 0 && dataPoint?.projections) {
        setSelectedFields(dataPoint.projections);
      }
    }
  }, [fieldMappings, dataPoint]);

  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const getVisualizationData = () => {
    if (!queryResults?.results?.aggregations) return null;

    const aggs = queryResults.results.aggregations;
    
    // Try to find a terms aggregation for visualization
    const termsAgg = Object.entries(aggs).find(([key, value]) => 
      value && typeof value === 'object' && (value as any).buckets
    );

    if (termsAgg) {
      const [aggName, aggData] = termsAgg;
      const buckets = (aggData as any).buckets || [];
      
      return {
        title: aggName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data: buckets.map((bucket: any) => ({
          name: bucket.key,
          value: bucket.doc_count || bucket.value || 0
        }))
      };
    }

    return null;
  };

  const getChartOption = () => {
    const vizData = getVisualizationData();
    if (!vizData) return {};

    return {
      color: echartsTheme.color,
      title: {
        text: vizData.title,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        bottom: 0,
        type: 'scroll'
      },
      series: [{
        name: vizData.title,
        type: 'pie',
        radius: ['30%', '70%'],
        center: ['50%', '45%'],
        data: vizData.data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  const getTableData = () => {
    if (!queryResults?.results?.hits) return { columns: [], rows: [] };

    const hits = queryResults.results.hits;
    if (hits.length === 0) return { columns: [], rows: [] };

    // Get columns from first hit
    const firstHit = hits[0];
    const columns: GridColDef[] = Object.keys(firstHit).map(key => ({
      field: key,
      headerName: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      width: 150,
      sortable: true,
    }));

    // Format rows
    const rows = hits.map((hit: any, index: number) => ({
      id: index,
      ...hit
    }));

    return { columns, rows };
  };

  if (dataPointLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dataPoint) {
    return (
      <Alert severity="error">
        Data point not found
      </Alert>
    );
  }

  const vizData = getVisualizationData();
  const { columns, rows } = getTableData();

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <div>
          <Typography variant="h4" gutterBottom>
            {dataPoint.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {dataPoint.description}
          </Typography>
          <Box mt={1}>
            {dataPoint.tags?.map((tag: string) => (
              <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
            ))}
          </Box>
        </div>
        <Box>
          <FormControl size="small" sx={{ mr: 2, minWidth: 160 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              {timeRangeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={queryLoading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Field Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Field Selection
            </Typography>
            <IconButton onClick={() => setShowFieldSelector(!showFieldSelector)}>
              {showFieldSelector ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          </Box>
          <Collapse in={showFieldSelector}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select which fields to include in the query results:
            </Typography>
            <FormGroup sx={{ maxHeight: 200, overflow: 'auto', mt: 2 }}>
              <Grid container>
                {availableFields.map((field) => (
                  <Grid item xs={12} sm={6} md={4} key={field}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedFields.includes(field)}
                          onChange={() => handleFieldToggle(field)}
                          size="small"
                        />
                      }
                      label={<Typography variant="body2">{field}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
            <Box mt={2}>
              <Button
                size="small"
                onClick={() => setSelectedFields(availableFields)}
                sx={{ mr: 1 }}
              >
                Select All
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedFields([])}
                sx={{ mr: 1 }}
              >
                Clear All
              </Button>
              <Typography variant="caption" color="text.secondary">
                {selectedFields.length} of {availableFields.length} fields selected
              </Typography>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Overview" />
            <Tab label="Visualization" disabled={!vizData} />
            <Tab label="Table View" disabled={rows.length === 0} />
            <Tab label="Raw JSON" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {queryLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : queryResults ? (
            <Grid container spacing={3}>
              {/* Summary Cards */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Query Summary
                  </Typography>
                  <Typography variant="body2">
                    <strong>Total Results:</strong> {queryResults.results.total?.value || 0}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Indices:</strong> {dataPoint.source.indices.join(', ')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Time Range:</strong> {timeRangeOptions.find(opt => opt.value === timeRange)?.label}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Selected Fields:</strong> {selectedFields.length > 0 ? selectedFields.length : 'All'}
                  </Typography>
                </Paper>
              </Grid>
              
              {/* Aggregations Summary */}
              {queryResults.results.aggregations && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Aggregations
                    </Typography>
                    {Object.entries(queryResults.results.aggregations).map(([key, value]) => (
                      <Typography key={key} variant="body2">
                        <strong>{key.replace(/_/g, ' ')}:</strong> {
                          typeof value === 'object' && value !== null
                            ? (value as any).value || (value as any).buckets?.length || 'Complex'
                            : String(value)
                        }
                      </Typography>
                    ))}
                  </Paper>
                </Grid>
              )}
            </Grid>
          ) : (
            <Typography>No results. Click Refresh to run the query.</Typography>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {vizData && (
            <ReactECharts
              option={getChartOption()}
              style={{ height: '400px' }}
              theme="light"
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {rows.length > 0 && (
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              checkboxSelection={false}
              disableSelectionOnClick
              autoHeight
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Raw JSON Response
            </Typography>
            <pre style={{ 
              fontSize: '12px', 
              overflow: 'auto', 
              maxHeight: '500px',
              margin: 0,
              padding: '16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}>
              {queryResults ? JSON.stringify(queryResults, null, 2) : 'No data'}
            </pre>
          </Paper>
        </TabPanel>
      </Card>
    </Box>
  );
}

export default DataPointViewerPage;