import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import ReactECharts from 'echarts-for-react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { Refresh as RefreshIcon, Download as DownloadIcon } from '@mui/icons-material';
import { dashboardsAPI } from '../services/api';
import { echartsTheme } from '../theme';

function DashboardViewerPage() {
  const { id } = useParams();
  const [filters, setFilters] = useState<any>({});
  const [timeRange, setTimeRange] = useState('now-7d');

  const { data: dashboard, isLoading: dashboardLoading } = useQuery(
    ['dashboard', id],
    async () => {
      const response = await dashboardsAPI.get(id!);
      return response.data;
    }
  );

  const { data: dashboardData, isLoading: dataLoading, refetch } = useQuery(
    ['dashboardData', id, filters, timeRange],
    async () => {
      const response = await dashboardsAPI.run(id!, { filters, timeRange });
      return response.data;
    },
    { enabled: !!dashboard }
  );

  const handleExport = async () => {
    try {
      const response = await dashboardsAPI.export(id!, { filters, timeRange, format: 'csv' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}-export.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getChartOption = (widget: any, widgetData: any) => {
    const { widgetType, results } = widgetData;

    if (!results?.aggregations) {
      return {};
    }

    const baseOption = {
      color: echartsTheme.color,
      tooltip: {
        trigger: widgetType === 'pie' ? 'item' : 'axis',
      },
      legend: {
        bottom: 0,
      },
    };

    if (widgetType === 'bar' || widgetType === 'line' || widgetType === 'area') {
      const buckets = results.aggregations.by_lga?.buckets || 
                     results.aggregations.series?.buckets || 
                     [];
      
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: buckets.map((b: any) => b.key_as_string || b.key),
        },
        yAxis: {
          type: 'value',
        },
        series: [{
          type: widgetType === 'area' ? 'line' : widgetType,
          areaStyle: widgetType === 'area' ? {} : undefined,
          data: buckets.map((b: any) => b.doc_count || b.value),
        }],
      };
    }

    if (widgetType === 'pie') {
      const buckets = results.aggregations.by_lga?.buckets || [];
      
      return {
        ...baseOption,
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          data: buckets.map((b: any) => ({
            name: b.key,
            value: b.doc_count || b.value,
          })),
        }],
      };
    }

    if (widgetType === 'scatter') {
      return {
        ...baseOption,
        xAxis: { type: 'value' },
        yAxis: { type: 'value' },
        series: [{
          type: 'scatter',
          data: results.hits?.map((hit: any) => [hit.x, hit.y]) || [],
        }],
      };
    }

    return {};
  };

  const renderWidget = (widget: any, widgetData: any) => {
    if (widgetData.error) {
      return (
        <Alert severity="error">
          {widgetData.error}
        </Alert>
      );
    }

    if (widgetData.widgetType === 'table') {
      const rows = widgetData.results?.hits || [];
      const columns = rows.length > 0 
        ? Object.keys(rows[0]).map(key => ({
            field: key,
            headerName: key.charAt(0).toUpperCase() + key.slice(1),
            width: 150,
          }))
        : [];

      return (
        <DataGrid
          rows={rows.map((row: any, index: number) => ({ id: index, ...row }))}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          checkboxSelection={false}
          disableSelectionOnClick
          autoHeight
        />
      );
    }

    if (widgetData.widgetType === 'kpi') {
      const value = widgetData.results?.aggregations?.total?.value || 
                   widgetData.results?.total?.value || 
                   0;
      
      return (
        <Card>
          <CardContent>
            <Typography variant="h3" component="div" align="center">
              {value.toLocaleString()}
            </Typography>
            <Typography variant="subtitle1" align="center" color="text.secondary">
              {widget.title}
            </Typography>
          </CardContent>
        </Card>
      );
    }

    const option = getChartOption(widget, widgetData);
    return (
      <ReactECharts
        option={option}
        style={{ height: '400px' }}
        theme="light"
      />
    );
  };

  if (dashboardLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Alert severity="error">
        Dashboard not found
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {dashboard.name}
        </Typography>
        <Box>
          <TextField
            label="Time Range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            size="small"
            sx={{ mr: 2 }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Box>

      {dashboard.description && (
        <Typography variant="body1" color="text.secondary" paragraph>
          {dashboard.description}
        </Typography>
      )}

      {dataLoading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {dashboardData?.widgets?.map((widgetData: any) => {
            const widget = dashboard.widgets.find((w: any) => w.id === widgetData.widgetId);
            if (!widget) return null;

            return (
              <Grid
                key={widget.id}
                item
                xs={12}
                sm={widget.position.w > 6 ? 12 : 6}
                md={widget.position.w * (12 / dashboard.layout.cols)}
              >
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {widgetData.title || widget.title}
                  </Typography>
                  {renderWidget(widget, widgetData)}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

export default DashboardViewerPage;