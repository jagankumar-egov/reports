"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jqlConverterService = void 0;
const logger_1 = require("../utils/logger");
const elasticsearch_1 = require("./elasticsearch");
class JQLConverterService {
    constructor() {
        this.esService = elasticsearch_1.elasticsearchService;
    }
    convertJQLToElasticsearch(jql, allowedIndexes) {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to convert JQL to Elasticsearch query:', error);
            throw new Error(`Invalid JQL query: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    parseJQL(jql) {
        const trimmedJQL = jql.trim();
        const projectMatch = trimmedJQL.match(/project\s*=\s*([^\s]+)/i);
        const projects = projectMatch ? [projectMatch[1].replace(/['"]/g, '')] : [];
        const conditions = this.parseConditions(trimmedJQL);
        const orderByMatch = trimmedJQL.match(/order\s+by\s+(.+?)(?:\s|$)/i);
        const orderBy = orderByMatch ? this.parseOrderBy(orderByMatch[1]) : [];
        const limitMatch = trimmedJQL.match(/limit\s+(\d+)/i);
        const limit = limitMatch ? parseInt(limitMatch[1], 10) : undefined;
        return {
            projects,
            conditions,
            orderBy,
            limit,
        };
    }
    parseConditions(jql) {
        const conditions = [];
        const patterns = [
            /(\w+)\s*=\s*['"]?([^'"'\s]+)['"]?/g,
            /(\w+)\s*!=\s*['"]?([^'"'\s]+)['"]?/g,
            /(\w+)\s*~\s*['"]?([^'"'\s]+)['"]?/g,
            /(\w+)\s*!~\s*['"]?([^'"'\s]+)['"]?/g,
            /(\w+)\s+in\s*\(([^)]+)\)/gi,
            /(\w+)\s+not\s+in\s*\(([^)]+)\)/gi,
            /(\w+)\s*>\s*(['"]?)([^'"'\s]+)\2/g,
            /(\w+)\s*<\s*(['"]?)([^'"'\s]+)\2/g,
            /(\w+)\s+is\s+null/gi,
            /(\w+)\s+is\s+not\s+null/gi,
        ];
        let match;
        const equalsRegex = /(\w+)\s*=\s*(['"]?)([^'"'\s]+)\2/g;
        while ((match = equalsRegex.exec(jql)) !== null) {
            if (match[1].toLowerCase() !== 'project') {
                conditions.push({
                    field: match[1],
                    operator: 'equals',
                    value: match[3],
                });
            }
        }
        const notEqualsRegex = /(\w+)\s*!=\s*(['"]?)([^'"'\s]+)\2/g;
        while ((match = notEqualsRegex.exec(jql)) !== null) {
            conditions.push({
                field: match[1],
                operator: 'not_equals',
                value: match[3],
            });
        }
        const containsRegex = /(\w+)\s*~\s*(['"]?)([^'"'\s]+)\2/g;
        while ((match = containsRegex.exec(jql)) !== null) {
            conditions.push({
                field: match[1],
                operator: 'contains',
                value: match[3],
            });
        }
        const inRegex = /(\w+)\s+in\s*\(([^)]+)\)/gi;
        while ((match = inRegex.exec(jql)) !== null) {
            const values = match[2].split(',').map(v => v.trim().replace(/['"]/g, ''));
            conditions.push({
                field: match[1],
                operator: 'in',
                value: values,
                values,
            });
        }
        return conditions;
    }
    parseOrderBy(orderByClause) {
        return orderByClause.split(',').map(clause => {
            const parts = clause.trim().split(/\s+/);
            const field = parts[0];
            const direction = parts[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
            return { field, direction };
        });
    }
    buildElasticsearchQuery(parsedJQL) {
        if (!parsedJQL.conditions || parsedJQL.conditions.length === 0) {
            return { match_all: {} };
        }
        const mustClauses = [];
        const mustNotClauses = [];
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
        const boolQuery = {};
        if (mustClauses.length > 0) {
            boolQuery.must = mustClauses;
        }
        if (mustNotClauses.length > 0) {
            boolQuery.must_not = mustNotClauses;
        }
        if (mustClauses.length === 0 && mustNotClauses.length === 0) {
            return { match_all: {} };
        }
        return { bool: boolQuery };
    }
    extractIndexes(parsedJQL, allowedIndexes) {
        if (!parsedJQL.projects || parsedJQL.projects.length === 0) {
            return allowedIndexes;
        }
        const projectToIndexMap = this.esService.getProjectIndexMapping();
        const requestedIndexes = parsedJQL.projects.map(project => {
            const indexName = projectToIndexMap[project.toLowerCase()] || project;
            return indexName;
        });
        return requestedIndexes.filter(index => allowedIndexes.some(allowed => allowed.endsWith('*')
            ? index.startsWith(allowed.slice(0, -1))
            : index === allowed));
    }
    buildSortClause(parsedJQL) {
        if (!parsedJQL.orderBy || parsedJQL.orderBy.length === 0) {
            return undefined;
        }
        return parsedJQL.orderBy.map(orderBy => ({
            [`${orderBy.field}.keyword`]: { order: orderBy.direction }
        }));
    }
    validateJQL(jql, allowedIndexes) {
        const errors = [];
        const warnings = [];
        try {
            if (!jql || jql.trim().length === 0) {
                errors.push({ field: 'jql', message: 'JQL query cannot be empty' });
                return { isValid: false, errors, warnings };
            }
            const parsedJQL = this.parseJQL(jql);
            const requestedIndexes = this.extractIndexes(parsedJQL, allowedIndexes);
            if (requestedIndexes.length === 0) {
                warnings.push('No valid indexes found for the specified projects');
            }
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
        }
        catch (error) {
            errors.push({ field: 'jql', message: error instanceof Error ? error.message : String(error) });
            return { isValid: false, errors, warnings };
        }
    }
}
exports.jqlConverterService = new JQLConverterService();
//# sourceMappingURL=jqlConverter.js.map