import { elasticsearchService } from './elasticsearch';
import { logger } from '../utils/logger';
import { 
  MultiIndexJoinRequest, 
  MultiIndexJoinResponse, 
  JoinConfiguration,
  JoinedRecord,
  JoinSource
} from '../types';

class MultiIndexJoinService {
  async executeJoin(request: MultiIndexJoinRequest): Promise<MultiIndexJoinResponse> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[MULTI-INDEX-JOIN-${operationId}] Starting multi-index join operation`, {
      operationId,
      joinsCount: request.joins.length,
      from: request.from || 0,
      size: request.size || 100
    });

    try {
      // For now, support single join (can be extended for multiple joins later)
      if (request.joins.length !== 1) {
        throw new Error('Currently only single join operations are supported');
      }

      const joinConfig = request.joins[0];
      const joinStartTime = Date.now();

      // Execute the join
      const joinResult = await this.executeSingleJoin(joinConfig, operationId);
      
      // Apply pagination if requested
      const from = request.from || 0;
      const size = request.size || 100;
      const paginatedResults = joinResult.results.slice(from, from + size);

      const totalTime = Date.now() - operationStartTime;
      const joinTime = Date.now() - joinStartTime;

      logger.info(`[MULTI-INDEX-JOIN-${operationId}] Multi-index join completed successfully`, {
        operationId,
        totalTime: `${totalTime}ms`,
        joinTime: `${joinTime}ms`,
        totalResults: joinResult.results.length,
        paginatedResults: paginatedResults.length,
        joinSummary: joinResult.joinSummary
      });

      return {
        took: totalTime,
        totalResults: joinResult.results.length,
        joinSummary: joinResult.joinSummary,
        results: paginatedResults,
        aggregations: joinResult.aggregations
      };
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[MULTI-INDEX-JOIN-${operationId}] Multi-index join failed after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async executeSingleJoin(
    config: JoinConfiguration, 
    operationId: string
  ): Promise<{ results: JoinedRecord[]; joinSummary: any; aggregations?: any }> {
    
    // Support both old and new formats
    const isNewFormat = config.leftSource && config.rightSource;
    
    const leftSource = isNewFormat ? config.leftSource : { type: 'index', id: config.leftIndex!, name: config.leftIndex! };
    const rightSource = isNewFormat ? config.rightSource : { type: 'index', id: config.rightIndex!, name: config.rightIndex! };
    const leftField = isNewFormat ? config.leftField! : config.joinField!.left;
    const rightField = isNewFormat ? config.rightField! : config.joinField!.right;
    
    logger.info(`[MULTI-INDEX-JOIN-${operationId}] Executing single join`, {
      operationId,
      leftSource: leftSource.type === 'index' ? leftSource.id : `savedQuery:${leftSource.name}`,
      rightSource: rightSource.type === 'index' ? rightSource.id : `savedQuery:${rightSource.name}`,
      joinType: config.joinType,
      leftField,
      rightField
    });

    // Step 1: Get left data (from index or saved query)
    const leftStartTime = Date.now();
    const leftResults = await this.getSourceData(leftSource, operationId, 'left', config.limit);
    const leftTime = Date.now() - leftStartTime;

    logger.info(`[MULTI-INDEX-JOIN-${operationId}] Left source query completed`, {
      operationId,
      leftSource: leftSource.type === 'index' ? leftSource.id : `savedQuery:${leftSource.name}`,
      leftResults: leftResults.hits.hits.length,
      leftTime: `${leftTime}ms`
    });

    // Step 2: Get right data (from index or saved query)
    const rightStartTime = Date.now();
    const rightResults = await this.getSourceData(rightSource, operationId, 'right', config.limit);
    const rightTime = Date.now() - rightStartTime;

    logger.info(`[MULTI-INDEX-JOIN-${operationId}] Right source query completed`, {
      operationId,
      rightSource: rightSource.type === 'index' ? rightSource.id : `savedQuery:${rightSource.name}`,
      rightResults: rightResults.hits.hits.length,
      rightTime: `${rightTime}ms`
    });

    // Step 3: Perform the join in memory
    const joinStartTime = Date.now();
    const joinedRecords = this.performJoin(
      leftResults.hits.hits, 
      rightResults.hits.hits,
      leftField,
      rightField,
      config.joinType,
      operationId
    );
    const joinTime = Date.now() - joinStartTime;

    const joinSummary = {
      leftIndexTotal: leftResults.hits.hits.length,
      rightIndexTotal: rightResults.hits.hits.length,
      joinedRecords: joinedRecords.filter(r => r.leftRecord && r.rightRecord).length,
      leftOnlyRecords: joinedRecords.filter(r => r.leftRecord && !r.rightRecord).length,
      rightOnlyRecords: joinedRecords.filter(r => !r.leftRecord && r.rightRecord).length,
    };

    logger.info(`[MULTI-INDEX-JOIN-${operationId}] Join processing completed`, {
      operationId,
      joinTime: `${joinTime}ms`,
      ...joinSummary
    });

    return {
      results: joinedRecords,
      joinSummary,
      aggregations: {
        joinFieldDistribution: this.generateJoinFieldDistribution(joinedRecords),
        indexDistribution: {
          leftIndex: joinSummary.leftIndexTotal,
          rightIndex: joinSummary.rightIndexTotal,
          joined: joinSummary.joinedRecords
        }
      }
    };
  }

  /**
   * Get data from either an index or a saved query
   */
  private async getSourceData(
    source: JoinSource, 
    operationId: string, 
    side: 'left' | 'right', 
    limit?: number
  ): Promise<any> {
    if (source.type === 'index') {
      // Query the index directly
      const searchParams = {
        index: source.id,
        query: { match_all: {} }, // You could pass custom queries here
        size: limit || 1000,
        _source: true
      };
      return await elasticsearchService.search(searchParams);
    } else if (source.type === 'savedQuery') {
      // Execute the saved query
      if (!source.query || !source.targetIndex) {
        throw new Error(`Invalid saved query source: missing query or targetIndex for ${source.name}`);
      }
      
      const searchParams = {
        index: source.targetIndex,
        query: source.query,
        size: limit || 1000,
        _source: true
      };
      
      logger.info(`[MULTI-INDEX-JOIN-${operationId}] Executing saved query for ${side} source`, {
        operationId,
        savedQueryName: source.name,
        targetIndex: source.targetIndex,
        hasQuery: !!source.query
      });
      
      return await elasticsearchService.search(searchParams);
    } else {
      throw new Error(`Unknown source type: ${source.type}`);
    }
  }

  private performJoin(
    leftHits: any[],
    rightHits: any[],
    leftField: string,
    rightField: string,
    joinType: string,
    operationId: string
  ): JoinedRecord[] {
    // Create a temporary config for createJoinedRecords compatibility
    const tempConfig: JoinConfiguration = {
      joinType: joinType as any,
      joinField: { left: leftField, right: rightField }
    };
    
    // Create lookup maps for efficient joining
    const leftLookup = new Map<string, any[]>();
    const rightLookup = new Map<string, any[]>();

    // Build left lookup
    leftHits.forEach(hit => {
      const joinValue = this.extractJoinValue(hit._source, leftField);
      if (joinValue !== null && joinValue !== undefined) {
        const key = String(joinValue);
        if (!leftLookup.has(key)) {
          leftLookup.set(key, []);
        }
        leftLookup.get(key)!.push(hit);
      }
    });

    // Build right lookup
    rightHits.forEach(hit => {
      const joinValue = this.extractJoinValue(hit._source, rightField);
      if (joinValue !== null && joinValue !== undefined) {
        const key = String(joinValue);
        if (!rightLookup.has(key)) {
          rightLookup.set(key, []);
        }
        rightLookup.get(key)!.push(hit);
      }
    });

    const results: JoinedRecord[] = [];
    const processedKeys = new Set<string>();

    // Perform the join based on join type
    switch (joinType) {
      case 'inner':
        // Only records with matches in both indices
        for (const [key, leftRecords] of leftLookup) {
          if (rightLookup.has(key)) {
            const rightRecords = rightLookup.get(key)!;
            this.createJoinedRecords(key, leftRecords, rightRecords, tempConfig, results);
            processedKeys.add(key);
          }
        }
        break;

      case 'left':
        // All left records, with right matches where available
        for (const [key, leftRecords] of leftLookup) {
          const rightRecords = rightLookup.get(key) || [];
          this.createJoinedRecords(key, leftRecords, rightRecords, tempConfig, results);
          processedKeys.add(key);
        }
        break;

      case 'right':
        // All right records, with left matches where available
        for (const [key, rightRecords] of rightLookup) {
          const leftRecords = leftLookup.get(key) || [];
          this.createJoinedRecords(key, leftRecords, rightRecords, tempConfig, results);
          processedKeys.add(key);
        }
        break;

      case 'full':
        // All records from both indices
        const allKeys = new Set([...leftLookup.keys(), ...rightLookup.keys()]);
        for (const key of allKeys) {
          const leftRecords = leftLookup.get(key) || [];
          const rightRecords = rightLookup.get(key) || [];
          this.createJoinedRecords(key, leftRecords, rightRecords, tempConfig, results);
        }
        break;
    }

    return results;
  }

  private createJoinedRecords(
    joinKey: string,
    leftRecords: any[],
    rightRecords: any[],
    config: JoinConfiguration,
    results: JoinedRecord[]
  ): void {
    
    if (leftRecords.length === 0 && rightRecords.length === 0) return;

    if (leftRecords.length === 0) {
      // Right only records
      rightRecords.forEach(rightRecord => {
        results.push({
          joinKey,
          rightRecord: rightRecord._source,
          consolidatedRecord: this.consolidateRecord(null, rightRecord._source, config),
          joinType: 'right_only'
        });
      });
    } else if (rightRecords.length === 0) {
      // Left only records
      leftRecords.forEach(leftRecord => {
        results.push({
          joinKey,
          leftRecord: leftRecord._source,
          consolidatedRecord: this.consolidateRecord(leftRecord._source, null, config),
          joinType: 'left_only'
        });
      });
    } else {
      // Matched records - create cartesian product
      leftRecords.forEach(leftRecord => {
        rightRecords.forEach(rightRecord => {
          results.push({
            joinKey,
            leftRecord: leftRecord._source,
            rightRecord: rightRecord._source,
            consolidatedRecord: this.consolidateRecord(leftRecord._source, rightRecord._source, config),
            joinType: 'matched'
          });
        });
      });
    }
  }

  private consolidateRecord(leftRecord: any, rightRecord: any, config: JoinConfiguration): any {
    const consolidated: any = {};

    // Add left record fields with optional prefix
    if (leftRecord) {
      const leftPrefix = `${config.leftIndex}_`;
      Object.keys(leftRecord).forEach(key => {
        consolidated[`${leftPrefix}${key}`] = leftRecord[key];
      });
    }

    // Add right record fields with optional prefix
    if (rightRecord) {
      const rightPrefix = `${config.rightIndex}_`;
      Object.keys(rightRecord).forEach(key => {
        consolidated[`${rightPrefix}${key}`] = rightRecord[key];
      });
    }

    // Add join key
    consolidated._joinKey = leftRecord || rightRecord ? 
      this.extractJoinValue(leftRecord, config.joinField.left) || 
      this.extractJoinValue(rightRecord, config.joinField.right) : null;

    return consolidated;
  }

  private extractJoinValue(record: any, fieldPath: string): any {
    if (!record) return null;
    
    const parts = fieldPath.split('.');
    let value = record;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return value;
  }

  private generateJoinFieldDistribution(results: JoinedRecord[]): any {
    const distribution: Record<string, number> = {};
    
    results.forEach(result => {
      const key = result.joinKey || 'null';
      distribution[key] = (distribution[key] || 0) + 1;
    });

    return {
      totalUniqueKeys: Object.keys(distribution).length,
      distribution: Object.entries(distribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10) // Top 10 most common join keys
        .reduce((obj, [key, count]) => ({ ...obj, [key]: count }), {})
    };
  }
}

export const multiIndexJoinService = new MultiIndexJoinService();