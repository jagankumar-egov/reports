import { logger } from '../utils/logger';
import { JQLQuery, QueryCondition, QueryValidationResult } from '../types';
import { elasticsearchService } from './elasticsearch';

class JQLConverterService {
  private esService = elasticsearchService;
  /**
   * Convert JQL string to Elasticsearch query
   */
  convertJQLToElasticsearch(jql: string, allowedIndexes: string[]): {
    query: any;
    indexes: string[];
    sort?: any[];
  } {
    try {
      const parsedJQL = this.parseJQL(jql);
      const esQuery = this.buildElasticsearchQuery(parsedJQL);
      const indexes = this.extractIndexes(parsedJQL, allowedIndexes);
      const sort = this.buildSortClause(parsedJQL);

      return {
        query: esQuery,
        indexes,
        sort,
      };
    } catch (error) {
      logger.error('Failed to convert JQL to Elasticsearch query:', error);
      throw new Error(`Invalid JQL query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse JQL string into structured query object
   */
  private parseJQL(jql: string): JQLQuery {
    // Basic JQL parser - can be enhanced for more complex queries
    const trimmedJQL = jql.trim();
    
    // Extract projects (indexes)
    const projectMatch = trimmedJQL.match(/project\s*=\s*([^\s]+)/i);
    const projects = projectMatch ? [projectMatch[1].replace(/['"]/g, '')] : [];

    // Extract conditions
    const conditions = this.parseConditions(trimmedJQL);

    // Extract ORDER BY clause
    const orderByMatch = trimmedJQL.match(/order\s+by\s+(.+?)(?:\s|$)/i);
    const orderBy = orderByMatch ? this.parseOrderBy(orderByMatch[1]) : [];

    // Extract LIMIT clause
    const limitMatch = trimmedJQL.match(/limit\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : undefined;

    return {
      projects,
      conditions,
      orderBy,
      limit,
    };
  }

  /**
   * Parse conditions from JQL string
   */
  private parseConditions(jql: string): QueryCondition[] {
    const conditions: QueryCondition[] = [];
    
    // Simple regex patterns for common JQL conditions
    const patterns = [
      // field = value
      /(\w+)\s*=\s*['"]?([^'"'\s]+)['"]?/g,
      // field != value  
      /(\w+)\s*!=\s*['"]?([^'"'\s]+)['"]?/g,
      // field ~ value (contains)
      /(\w+)\s*~\s*['"]?([^'"'\s]+)['"]?/g,
      // field !~ value (not contains)
      /(\w+)\s*!~\s*['"]?([^'"'\s]+)['"]?/g,
      // field IN (value1, value2)
      /(\w+)\s+in\s*\(([^)]+)\)/gi,
      // field NOT IN (value1, value2)
      /(\w+)\s+not\s+in\s*\(([^)]+)\)/gi,
      // field > value
      /(\w+)\s*>\s*(['"]?)([^'"'\s]+)\2/g,
      // field < value
      /(\w+)\s*<\s*(['"]?)([^'"'\s]+)\2/g,
      // field IS NULL
      /(\w+)\s+is\s+null/gi,
      // field IS NOT NULL
      /(\w+)\s+is\s+not\s+null/gi,
    ];

    // Extract equals conditions
    let match;
    const equalsRegex = /(\w+)\s*=\s*(['"]?)([^'"'\s]+)\2/g;
    while ((match = equalsRegex.exec(jql)) !== null) {
      if (match[1].toLowerCase() !== 'project') { // Skip project clause
        conditions.push({
          field: match[1],
          operator: 'equals',
          value: match[3],
        });
      }
    }

    // Extract not equals conditions
    const notEqualsRegex = /(\w+)\s*!=\s*(['"]?)([^'"'\s]+)\2/g;
    while ((match = notEqualsRegex.exec(jql)) !== null) {
      conditions.push({
        field: match[1],
        operator: 'not_equals',
        value: match[3],
      });
    }

    // Extract contains conditions
    const containsRegex = /(\w+)\s*~\s*(['"]?)([^'"'\s]+)\2/g;
    while ((match = containsRegex.exec(jql)) !== null) {
      conditions.push({
        field: match[1],
        operator: 'contains',
        value: match[3],
      });
    }

    // Extract IN conditions
    const inRegex = /(\w+)\s+in\s*\(([^)]+)\)/gi;
    while ((match = inRegex.exec(jql)) !== null) {
      const values = match[2].split(',').map(v => v.trim().replace(/['"]/g, ''));
      conditions.push({
        field: match[1],
        operator: 'in',
        value: values, // Use values as value for compatibility
        values,
      });
    }

    return conditions;
  }

  /**
   * Parse ORDER BY clause
   */
  private parseOrderBy(orderByClause: string) {
    return orderByClause.split(',').map(clause => {
      const parts = clause.trim().split(/\s+/);
      const field = parts[0];
      const direction = parts[1]?.toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const;
      return { field, direction };
    });
  }

  /**
   * Build Elasticsearch query from parsed JQL
   */
  private buildElasticsearchQuery(parsedJQL: JQLQuery): any {
    if (!parsedJQL.conditions || parsedJQL.conditions.length === 0) {
      return { match_all: {} };
    }

    const mustClauses: any[] = [];
    const mustNotClauses: any[] = [];

    for (const condition of parsedJQL.conditions) {
      switch (condition.operator) {
        case 'equals':
          mustClauses.push({
            term: { [`${condition.field}.keyword`]: condition.value }
          });
          break;

        case 'not_equals':
          mustNotClauses.push({
            term: { [`${condition.field}.keyword`]: condition.value }
          });
          break;

        case 'contains':
          mustClauses.push({
            match: { [condition.field]: condition.value }
          });
          break;

        case 'not_contains':
          mustNotClauses.push({
            match: { [condition.field]: condition.value }
          });
          break;

        case 'in':
          if (condition.values && condition.values.length > 0) {
            mustClauses.push({
              terms: { [`${condition.field}.keyword`]: condition.values }
            });
          }
          break;

        case 'not_in':
          if (condition.values && condition.values.length > 0) {
            mustNotClauses.push({
              terms: { [`${condition.field}.keyword`]: condition.values }
            });
          }
          break;

        case 'greater_than':
          mustClauses.push({
            range: { [condition.field]: { gt: condition.value } }
          });
          break;

        case 'less_than':
          mustClauses.push({
            range: { [condition.field]: { lt: condition.value } }
          });
          break;

        case 'is_null':
          mustNotClauses.push({
            exists: { field: condition.field }
          });
          break;

        case 'is_not_null':
          mustClauses.push({
            exists: { field: condition.field }
          });
          break;
      }
    }

    // Build boolean query
    const boolQuery: any = {};
    
    if (mustClauses.length > 0) {
      boolQuery.must = mustClauses;
    }
    
    if (mustNotClauses.length > 0) {
      boolQuery.must_not = mustNotClauses;
    }

    // If no clauses, return match_all
    if (mustClauses.length === 0 && mustNotClauses.length === 0) {
      return { match_all: {} };
    }

    return { bool: boolQuery };
  }

  /**
   * Extract indexes from JQL query
   */
  private extractIndexes(parsedJQL: JQLQuery, allowedIndexes: string[]): string[] {
    if (!parsedJQL.projects || parsedJQL.projects.length === 0) {
      return allowedIndexes; // Return all allowed indexes if no project specified
    }

    // Get project to index mapping from configuration
    const projectToIndexMap = this.esService.getProjectIndexMapping();

    const requestedIndexes = parsedJQL.projects.map(project => {
      const indexName = projectToIndexMap[project.toLowerCase()] || project;
      return indexName;
    });

    // Filter to only allowed indexes
    return requestedIndexes.filter(index => 
      allowedIndexes.some(allowed => 
        allowed.endsWith('*') 
          ? index.startsWith(allowed.slice(0, -1))
          : index === allowed
      )
    );
  }

  /**
   * Build Elasticsearch sort clause
   */
  private buildSortClause(parsedJQL: JQLQuery): any[] | undefined {
    if (!parsedJQL.orderBy || parsedJQL.orderBy.length === 0) {
      return undefined;
    }

    return parsedJQL.orderBy.map(orderBy => ({
      [`${orderBy.field}.keyword`]: { order: orderBy.direction }
    }));
  }

  /**
   * Validate JQL query
   */
  validateJQL(jql: string, allowedIndexes: string[]): QueryValidationResult {
    const errors: any[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (!jql || jql.trim().length === 0) {
        errors.push({ field: 'jql', message: 'JQL query cannot be empty' });
        return { isValid: false, errors, warnings };
      }

      // Try to parse the JQL
      const parsedJQL = this.parseJQL(jql);

      // Validate indexes
      const requestedIndexes = this.extractIndexes(parsedJQL, allowedIndexes);
      if (requestedIndexes.length === 0) {
        warnings.push('No valid indexes found for the specified projects');
      }

      // Validate conditions
      if (parsedJQL.conditions) {
        for (const condition of parsedJQL.conditions) {
          if (!condition.field) {
            errors.push({ field: 'condition', message: 'Field name is required' });
          }
          if (condition.operator === 'in' && (!condition.values || condition.values.length === 0)) {
            errors.push({ field: 'condition', message: 'IN operator requires at least one value' });
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({ field: 'jql', message: error instanceof Error ? error.message : String(error) });
      return { isValid: false, errors, warnings };
    }
  }
}

export const jqlConverterService = new JQLConverterService();