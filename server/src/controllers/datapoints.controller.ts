import { Request, Response } from 'express';
import elasticsearchService from '../services/elasticsearch.service';
import logger from '../utils/logger';

export const listDataPoints = async (req: Request, res: Response) => {
  try {
    const dataPoints = await elasticsearchService.listDataPoints();
    return res.json(dataPoints);
  } catch (error) {
    logger.error('Failed to list data points:', error);
    return res.status(500).json({ error: 'Failed to retrieve data points' });
  }
};

export const getDataPoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataPoint = await elasticsearchService.getDataPoint(id);
    
    if (!dataPoint) {
      return res.status(404).json({ error: 'Data point not found' });
    }
    
    res.json(dataPoint);
  } catch (error) {
    logger.error('Failed to get data point:', error);
    res.status(500).json({ error: 'Failed to retrieve data point' });
  }
};

export const createDataPoint = async (req: Request, res: Response) => {
  try {
    const dataPoint = {
      ...req.body,
      version: 1,
      createdBy: req.user?.username || 'system',
      createdAt: new Date().toISOString(),
      updatedBy: req.user?.username || 'system',
      updatedAt: new Date().toISOString(),
      isArchived: false,
    };

    // Validate that source indices are allowed
    if (!elasticsearchService.validateIndexAccess(dataPoint.source.indices)) {
      return res.status(403).json({ error: 'Access denied to one or more source indices' });
    }

    const result = await elasticsearchService.saveDataPoint(dataPoint);
    
    await elasticsearchService.logAudit(
      'create',
      'datapoint',
      dataPoint.slug,
      req.user?.username || 'system',
      { name: dataPoint.name }
    );
    
    res.status(201).json({ ...dataPoint, _id: result._id });
  } catch (error) {
    logger.error('Failed to create data point:', error);
    res.status(500).json({ error: 'Failed to create data point' });
  }
};

export const updateDataPoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingDataPoint = await elasticsearchService.getDataPoint(id);
    
    if (!existingDataPoint) {
      return res.status(404).json({ error: 'Data point not found' });
    }

    const dataPoint = {
      ...existingDataPoint,
      ...req.body,
      slug: id,
      version: (existingDataPoint.version || 0) + 1,
      updatedBy: req.user?.username || 'system',
      updatedAt: new Date().toISOString(),
    };

    // Validate that source indices are allowed
    if (!elasticsearchService.validateIndexAccess(dataPoint.source.indices)) {
      return res.status(403).json({ error: 'Access denied to one or more source indices' });
    }

    const result = await elasticsearchService.saveDataPoint(dataPoint);
    
    await elasticsearchService.logAudit(
      'update',
      'datapoint',
      id,
      req.user?.username || 'system',
      { version: dataPoint.version }
    );
    
    res.json({ ...dataPoint, _id: result._id });
  } catch (error) {
    logger.error('Failed to update data point:', error);
    res.status(500).json({ error: 'Failed to update data point' });
  }
};

export const deleteDataPoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await elasticsearchService.deleteDataPoint(id);
    
    await elasticsearchService.logAudit(
      'delete',
      'datapoint',
      id,
      req.user?.username || 'system'
    );
    
    res.json({ message: 'Data point archived successfully' });
  } catch (error) {
    logger.error('Failed to delete data point:', error);
    res.status(500).json({ error: 'Failed to delete data point' });
  }
};

export const runDataPoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filters, timeRange } = req.body;
    
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

    // Build the search body
    const searchBody: any = {
      query,
      size: dataPoint.aggs ? 0 : 100,
    };

    // Add aggregations
    if (dataPoint.aggs) {
      searchBody.aggs = dataPoint.aggs;
    }

    // Add projections (source filtering)
    if (dataPoint.projections && dataPoint.projections.length > 0) {
      searchBody._source = dataPoint.projections;
    }

    // Execute the search
    const result = await elasticsearchService.search(dataPoint.source.indices, searchBody);
    
    res.json({
      dataPoint: {
        name: dataPoint.name,
        slug: dataPoint.slug,
      },
      results: {
        total: result.hits.total,
        hits: result.hits.hits.map((hit: any) => hit._source),
        aggregations: result.aggregations,
      },
    });
  } catch (error) {
    logger.error('Failed to run data point:', error);
    res.status(500).json({ error: 'Failed to execute data point query' });
  }
};