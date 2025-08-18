import { Request, Response } from 'express';
import { elasticsearchService } from '../services/elasticsearch';
import { logger } from '../utils/logger';
import { Project, ApiResponse } from '../types';

export class ProjectController {
  async getProjects(req: Request, res: Response): Promise<void> {
    const { search, limit = 20 } = req.query;

    try {
      const allowedIndexes = elasticsearchService.getAllowedIndexes();
      const projects: Project[] = [];

      // Get stats for all allowed indexes
      const stats = await elasticsearchService.getIndicesStats();

      for (const indexPattern of allowedIndexes) {
        // Handle wildcard patterns
        const indexNames = indexPattern.endsWith('*') 
          ? this.getMatchingIndexes(stats, indexPattern)
          : [indexPattern];

        for (const indexName of indexNames) {
          if (stats.indices?.[indexName]) {
            const indexStats = stats.indices[indexName];
            
            const project: Project = {
              id: indexName,
              key: this.generateProjectKey(indexName),
              name: this.generateProjectName(indexName),
              description: `Health data index: ${indexName}`,
              indexName,
              fieldCount: await this.getFieldCount(indexName),
              recordCount: indexStats.total?.docs?.count || 0,
            };

            projects.push(project);
          }
        }
      }

      // Apply search filter
      let filteredProjects = projects;
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredProjects = projects.filter(project =>
          project.name.toLowerCase().includes(searchTerm) ||
          project.key.toLowerCase().includes(searchTerm) ||
          project.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply limit
      const limitedProjects = filteredProjects.slice(0, Number(limit));

      // Sort by name
      limitedProjects.sort((a, b) => a.name.localeCompare(b.name));

      const response: ApiResponse<Project[]> = {
        success: true,
        data: limitedProjects,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
          executionTime: 0,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get projects:', error);
      throw error;
    }
  }

  async getProject(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const allowedIndexes = elasticsearchService.getAllowedIndexes();
      
      // Validate access to the requested index
      const hasAccess = allowedIndexes.some(allowed => 
        allowed.endsWith('*') 
          ? id.startsWith(allowed.slice(0, -1))
          : id === allowed
      );

      if (!hasAccess) {
        throw new Error(`Access denied to project: ${id}`);
      }

      // Get index stats
      const stats = await elasticsearchService.getIndicesStats();
      const indexStats = stats.indices?.[id];

      if (!indexStats) {
        throw new Error(`Project not found: ${id}`);
      }

      const project: Project = {
        id,
        key: this.generateProjectKey(id),
        name: this.generateProjectName(id),
        description: `Health data index: ${id}`,
        indexName: id,
        fieldCount: await this.getFieldCount(id),
        recordCount: indexStats.total?.docs?.count || 0,
      };

      const response: ApiResponse<Project> = {
        success: true,
        data: project,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
          executionTime: 0,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error(`Failed to get project ${id}:`, error);
      throw error;
    }
  }

  private getMatchingIndexes(stats: any, pattern: string): string[] {
    const prefix = pattern.slice(0, -1); // Remove the '*'
    return Object.keys(stats.indices || {}).filter(indexName =>
      indexName.startsWith(prefix)
    );
  }

  private generateProjectKey(indexName: string): string {
    // Convert index name to a project key
    // e.g., "health-data-patients" -> "PATIENTS"
    const parts = indexName.split('-');
    const lastPart = parts[parts.length - 1];
    return lastPart.toUpperCase();
  }

  private generateProjectName(indexName: string): string {
    // Convert index name to a human-readable project name
    // e.g., "health-data-patients" -> "Health Data - Patients"
    const parts = indexName.split('-');
    return parts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private async getFieldCount(indexName: string): Promise<number> {
    try {
      const mapping = await elasticsearchService.getMapping(indexName);
      const indexMapping = mapping[indexName] || mapping[Object.keys(mapping)[0]];
      const properties = indexMapping?.mappings?.properties || {};
      
      return this.countFields(properties);
    } catch (error) {
      logger.warn(`Failed to get field count for ${indexName}:`, error);
      return 0;
    }
  }

  private countFields(properties: any, depth: number = 0, maxDepth: number = 3): number {
    if (depth >= maxDepth) return 0;
    
    let count = 0;
    for (const [fieldName, fieldConfig] of Object.entries(properties)) {
      count++; // Count the field itself
      
      const config: any = fieldConfig;
      
      // Count nested fields
      if (config.properties) {
        count += this.countFields(config.properties, depth + 1, maxDepth);
      }
      
      // Count multi-fields
      if (config.fields) {
        count += Object.keys(config.fields).length;
      }
    }
    
    return count;
  }
}