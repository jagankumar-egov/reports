"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const elasticsearch_1 = require("../services/elasticsearch");
const logger_1 = require("../utils/logger");
class ProjectController {
    async getProjects(req, res) {
        const { search, limit = 20 } = req.query;
        try {
            const allowedIndexes = elasticsearch_1.elasticsearchService.getAllowedIndexes();
            const projects = [];
            const stats = await elasticsearch_1.elasticsearchService.getIndicesStats();
            for (const indexPattern of allowedIndexes) {
                const indexNames = indexPattern.endsWith('*')
                    ? this.getMatchingIndexes(stats, indexPattern)
                    : [indexPattern];
                for (const indexName of indexNames) {
                    if (stats.indices?.[indexName]) {
                        const indexStats = stats.indices[indexName];
                        const project = {
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
            let filteredProjects = projects;
            if (search) {
                const searchTerm = search.toLowerCase();
                filteredProjects = projects.filter(project => project.name.toLowerCase().includes(searchTerm) ||
                    project.key.toLowerCase().includes(searchTerm) ||
                    project.description?.toLowerCase().includes(searchTerm));
            }
            const limitedProjects = filteredProjects.slice(0, Number(limit));
            limitedProjects.sort((a, b) => a.name.localeCompare(b.name));
            const response = {
                success: true,
                data: limitedProjects,
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.get('X-Request-ID') || 'unknown',
                    executionTime: 0,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Failed to get projects:', error);
            throw error;
        }
    }
    async getProject(req, res) {
        const { id } = req.params;
        try {
            const allowedIndexes = elasticsearch_1.elasticsearchService.getAllowedIndexes();
            const hasAccess = allowedIndexes.some(allowed => allowed.endsWith('*')
                ? id.startsWith(allowed.slice(0, -1))
                : id === allowed);
            if (!hasAccess) {
                throw new Error(`Access denied to project: ${id}`);
            }
            const stats = await elasticsearch_1.elasticsearchService.getIndicesStats();
            const indexStats = stats.indices?.[id];
            if (!indexStats) {
                throw new Error(`Project not found: ${id}`);
            }
            const project = {
                id,
                key: this.generateProjectKey(id),
                name: this.generateProjectName(id),
                description: `Health data index: ${id}`,
                indexName: id,
                fieldCount: await this.getFieldCount(id),
                recordCount: indexStats.total?.docs?.count || 0,
            };
            const response = {
                success: true,
                data: project,
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.get('X-Request-ID') || 'unknown',
                    executionTime: 0,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error(`Failed to get project ${id}:`, error);
            throw error;
        }
    }
    getMatchingIndexes(stats, pattern) {
        const prefix = pattern.slice(0, -1);
        return Object.keys(stats.indices || {}).filter(indexName => indexName.startsWith(prefix));
    }
    generateProjectKey(indexName) {
        const parts = indexName.split('-');
        const lastPart = parts[parts.length - 1];
        return lastPart.toUpperCase();
    }
    generateProjectName(indexName) {
        const parts = indexName.split('-');
        return parts
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
    async getFieldCount(indexName) {
        try {
            const mapping = await elasticsearch_1.elasticsearchService.getMapping(indexName);
            const indexMapping = mapping[indexName] || mapping[Object.keys(mapping)[0]];
            const properties = indexMapping?.mappings?.properties || {};
            return this.countFields(properties);
        }
        catch (error) {
            logger_1.logger.warn(`Failed to get field count for ${indexName}:`, error);
            return 0;
        }
    }
    countFields(properties, depth = 0, maxDepth = 3) {
        if (depth >= maxDepth)
            return 0;
        let count = 0;
        for (const [fieldName, fieldConfig] of Object.entries(properties)) {
            count++;
            const config = fieldConfig;
            if (config.properties) {
                count += this.countFields(config.properties, depth + 1, maxDepth);
            }
            if (config.fields) {
                count += Object.keys(config.fields).length;
            }
        }
        return count;
    }
}
exports.ProjectController = ProjectController;
//# sourceMappingURL=projectController.js.map