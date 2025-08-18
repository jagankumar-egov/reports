import { Request, Response } from 'express';
import elasticsearchService from '../services/elasticsearch.service';
import logger from '../utils/logger';

export const listDashboards = async (req: Request, res: Response) => {
  try {
    const dashboards = await elasticsearchService.listDashboards();
    res.json(dashboards);
  } catch (error) {
    logger.error('Failed to list dashboards:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboards' });
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dashboard = await elasticsearchService.getDashboard(id);
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    res.json(dashboard);
  } catch (error) {
    logger.error('Failed to get dashboard:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard' });
  }
};

export const createDashboard = async (req: Request, res: Response) => {
  try {
    const dashboard = {
      ...req.body,
      version: 1,
      createdBy: req.user?.username || 'system',
      createdAt: new Date().toISOString(),
      updatedBy: req.user?.username || 'system',
      updatedAt: new Date().toISOString(),
      isArchived: false,
    };

    const result = await elasticsearchService.saveDashboard(dashboard);
    
    await elasticsearchService.logAudit(
      'create',
      'dashboard',
      dashboard.slug,
      req.user?.username || 'system',
      { name: dashboard.name }
    );
    
    res.status(201).json({ ...dashboard, _id: result._id });
  } catch (error) {
    logger.error('Failed to create dashboard:', error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
};

export const updateDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingDashboard = await elasticsearchService.getDashboard(id);
    
    if (!existingDashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const dashboard = {
      ...existingDashboard,
      ...req.body,
      slug: id,
      version: (existingDashboard.version || 0) + 1,
      updatedBy: req.user?.username || 'system',
      updatedAt: new Date().toISOString(),
    };

    const result = await elasticsearchService.saveDashboard(dashboard);
    
    await elasticsearchService.logAudit(
      'update',
      'dashboard',
      id,
      req.user?.username || 'system',
      { version: dashboard.version }
    );
    
    res.json({ ...dashboard, _id: result._id });
  } catch (error) {
    logger.error('Failed to update dashboard:', error);
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
};

export const deleteDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await elasticsearchService.deleteDashboard(id);
    
    await elasticsearchService.logAudit(
      'delete',
      'dashboard',
      id,
      req.user?.username || 'system'
    );
    
    res.json({ message: 'Dashboard archived successfully' });
  } catch (error) {
    logger.error('Failed to delete dashboard:', error);
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
};

export const runDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filters, timeRange } = req.body;
    
    const dashboard = await elasticsearchService.getDashboard(id);
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const widgetResults: any[] = [];

    // Execute each widget's data point
    for (const widget of dashboard.widgets) {
      const dataPoint = await elasticsearchService.getDataPoint(widget.dataPointSlug);
      
      if (!dataPoint) {
        widgetResults.push({
          widgetId: widget.id,
          error: 'Data point not found',
        });
        continue;
      }

      // Build the query with widget overrides
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

      // Add time range filter - skip if timeRange is explicitly 'all'
      if (timeRange !== 'all') {
        const effectiveTimeRange = timeRange || dataPoint.source.defaultTimeRange;
        if (effectiveTimeRange && effectiveTimeRange !== 'all' && dataPoint.source.timeField) {
          query.bool.filter.push({
            range: {
              [dataPoint.source.timeField]: {
                gte: effectiveTimeRange,
              },
            },
          });
        }
      }

      // Add runtime filters
      if (filters && Array.isArray(filters)) {
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
        size: widget.overrides?.size || (dataPoint.aggs ? 0 : 100),
      };

      // Add aggregations (with widget overrides)
      const aggs = widget.overrides?.aggs || dataPoint.aggs;
      if (aggs) {
        searchBody.aggs = aggs;
      }

      // Add projections
      if (dataPoint.projections && dataPoint.projections.length > 0) {
        searchBody._source = dataPoint.projections;
      }

      try {
        // Execute the search
        const result = await elasticsearchService.search(dataPoint.source.indices, searchBody);
        
        widgetResults.push({
          widgetId: widget.id,
          widgetType: widget.type,
          title: widget.title,
          results: {
            total: result.hits.total,
            hits: result.hits.hits.map((hit: any) => hit._source),
            aggregations: result.aggregations,
          },
        });
      } catch (error: any) {
        widgetResults.push({
          widgetId: widget.id,
          error: error.message,
        });
      }
    }

    res.json({
      dashboard: {
        name: dashboard.name,
        slug: dashboard.slug,
        layout: dashboard.layout,
      },
      widgets: widgetResults,
    });
  } catch (error) {
    logger.error('Failed to run dashboard:', error);
    res.status(500).json({ error: 'Failed to execute dashboard' });
  }
};