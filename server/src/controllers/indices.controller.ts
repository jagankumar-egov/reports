import { Request, Response } from 'express';
import elasticsearchService from '../services/elasticsearch.service';
import { config } from '../config';
import logger from '../utils/logger';

export const getIndices = async (req: Request, res: Response) => {
  try {
    const allowedIndices = config.elasticsearch.allowedIndices;
    res.json({ indices: allowedIndices });
  } catch (error) {
    logger.error('Failed to get indices:', error);
    res.status(500).json({ error: 'Failed to retrieve indices' });
  }
};

export const getIndexMapping = async (req: Request, res: Response) => {
  try {
    const { index } = req.params;
    const mappings = await elasticsearchService.getFieldMappings(index);
    
    const fields: any[] = [];
    const indexMapping = Object.values(mappings)[0] as any;
    const properties = indexMapping.mappings.properties || {};

    const processProperties = (props: any, prefix = '') => {
      for (const [key, value] of Object.entries(props)) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        const fieldDef = value as any;
        
        fields.push({
          name: fieldName,
          type: fieldDef.type || 'object',
          searchable: fieldDef.type !== 'object',
          aggregatable: ['keyword', 'long', 'integer', 'short', 'byte', 'double', 'float', 'date', 'boolean'].includes(fieldDef.type),
        });

        if (fieldDef.properties) {
          processProperties(fieldDef.properties, fieldName);
        }
        
        if (fieldDef.fields) {
          for (const [subKey, subValue] of Object.entries(fieldDef.fields)) {
            const subFieldDef = subValue as any;
            fields.push({
              name: `${fieldName}.${subKey}`,
              type: subFieldDef.type,
              searchable: true,
              aggregatable: subFieldDef.type === 'keyword',
            });
          }
        }
      }
    };

    processProperties(properties);
    
    res.json({ index, fields });
  } catch (error: any) {
    logger.error('Failed to get index mapping:', error);
    if (error.message?.includes('Access denied')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to retrieve index mapping' });
    }
  }
};

export const getFieldCaps = async (req: Request, res: Response) => {
  try {
    const { indices } = req.body;
    const fieldCaps = await elasticsearchService.getFieldCaps(indices);
    res.json(fieldCaps);
  } catch (error: any) {
    logger.error('Failed to get field capabilities:', error);
    if (error.message?.includes('Access denied')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to retrieve field capabilities' });
    }
  }
};