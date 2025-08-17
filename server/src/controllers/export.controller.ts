import { Request, Response } from 'express';
import elasticsearchService from '../services/elasticsearch.service';
import logger from '../utils/logger';

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

export const exportDataPoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'csv', filters, timeRange } = req.body;
    
    const dataPoint = await elasticsearchService.getDataPoint(id);
    
    if (!dataPoint) {
      return res.status(404).json({ error: 'Data point not found' });
    }

    // Build the query
    const query: any = {
      bool: {
        must: [],
        filter: [],
      },
    };

    // Add base query from data point
    if (dataPoint.query) {
      query.bool.must.push(dataPoint.query);
    }

    // Add time range filter
    if (timeRange || dataPoint.source.defaultTimeRange) {
      const range = timeRange || dataPoint.source.defaultTimeRange;
      if (dataPoint.source.timeField) {
        query.bool.filter.push({
          range: {
            [dataPoint.source.timeField]: {
              gte: range,
            },
          },
        });
      }
    }

    // Add runtime filters
    if (filters) {
      for (const filter of filters) {
        if (filter.type === 'term') {
          query.bool.filter.push({ term: { [filter.field]: filter.value } });
        } else if (filter.type === 'range') {
          query.bool.filter.push({ range: { [filter.field]: filter.value } });
        }
      }
    }

    // Build the search body - for export, we want documents, not aggregations
    const searchBody: any = {
      query,
      size: 10000, // Limit for safety
    };

    // Add projections (source filtering)
    if (dataPoint.projections && dataPoint.projections.length > 0) {
      searchBody._source = dataPoint.projections;
    }

    // Execute the search
    const result = await elasticsearchService.search(dataPoint.source.indices, searchBody);
    const data = result.hits.hits.map((hit: any) => hit._source);

    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dataPoint.slug}-export.csv"`);
      res.send(csv);
    } else {
      // For Excel format, we'd need a library like exceljs
      // For now, return JSON
      res.json(data);
    }
  } catch (error) {
    logger.error('Failed to export data point:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

export const exportDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'csv', filters, timeRange } = req.body;
    
    const dashboard = await elasticsearchService.getDashboard(id);
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const exportData: any = {
      dashboard: dashboard.name,
      exportDate: new Date().toISOString(),
      widgets: [],
    };

    // Execute each widget's data point
    for (const widget of dashboard.widgets) {
      const dataPoint = await elasticsearchService.getDataPoint(widget.dataPointId);
      
      if (!dataPoint) {
        continue;
      }

      // Build the query
      const query: any = {
        bool: {
          must: [],
          filter: [],
        },
      };

      // Add base query from data point
      if (dataPoint.query) {
        query.bool.must.push(dataPoint.query);
      }

      // Add time range filter
      if (timeRange || dataPoint.source.defaultTimeRange) {
        const range = timeRange || dataPoint.source.defaultTimeRange;
        if (dataPoint.source.timeField) {
          query.bool.filter.push({
            range: {
              [dataPoint.source.timeField]: {
                gte: range,
              },
            },
          });
        }
      }

      // Add runtime filters
      if (filters) {
        for (const filter of filters) {
          if (filter.type === 'term') {
            query.bool.filter.push({ term: { [filter.field]: filter.value } });
          } else if (filter.type === 'range') {
            query.bool.filter.push({ range: { [filter.field]: filter.value } });
          }
        }
      }

      // Build the search body
      const searchBody: any = {
        query,
        size: widget.type === 'table' ? 1000 : 0,
      };

      // Add aggregations for chart widgets
      if (widget.type !== 'table' && (widget.overrides?.aggs || dataPoint.aggs)) {
        searchBody.aggs = widget.overrides?.aggs || dataPoint.aggs;
      }

      // Add projections for table widgets
      if (widget.type === 'table' && dataPoint.projections && dataPoint.projections.length > 0) {
        searchBody._source = dataPoint.projections;
      }

      try {
        // Execute the search
        const result = await elasticsearchService.search(dataPoint.source.indices, searchBody);
        
        if (widget.type === 'table') {
          const data = result.hits.hits.map((hit: any) => hit._source);
          exportData.widgets.push({
            title: widget.title,
            type: widget.type,
            data,
          });
        } else {
          exportData.widgets.push({
            title: widget.title,
            type: widget.type,
            aggregations: result.aggregations,
          });
        }
      } catch (error: any) {
        logger.error(`Failed to export widget ${widget.id}:`, error);
      }
    }

    if (format === 'csv') {
      // For CSV, we'll export only table widgets
      const tableWidgets = exportData.widgets.filter((w: any) => w.type === 'table');
      
      if (tableWidgets.length === 0) {
        return res.status(400).json({ error: 'No table widgets to export' });
      }

      // Export first table widget as CSV
      const csv = convertToCSV(tableWidgets[0].data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dashboard.slug}-export.csv"`);
      res.send(csv);
    } else {
      // Return JSON format
      res.json(exportData);
    }
  } catch (error) {
    logger.error('Failed to export dashboard:', error);
    res.status(500).json({ error: 'Failed to export dashboard' });
  }
};