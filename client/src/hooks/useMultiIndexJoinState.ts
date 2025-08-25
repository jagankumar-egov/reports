import { useState, useCallback, useEffect } from 'react';
import { SavedQuery } from '@/types';

export interface JoinSource {
  type: 'index' | 'savedQuery';
  id: string; // index name or saved query id
  name: string; // display name
  query?: any; // for saved queries
  targetIndex?: string; // for saved queries
}

export interface JoinCondition {
  id: string;
  leftSource: JoinSource;
  leftField: string;
  rightSource: JoinSource;
  rightField: string;
  joinType: 'inner' | 'left' | 'right' | 'full';
}

export interface ConsolidatedField {
  id: string;
  sourceId: string; // can be index name or saved query id
  sourceName: string; // display name
  sourceField: string;
  alias: string;
  include: boolean;
}

export interface MultiIndexJoinConfig {
  // Join configuration
  joins: JoinCondition[];
  consolidatedFields: ConsolidatedField[];
  
  // Advanced mode
  advancedMode: boolean;
  
  // Pagination
  from: number;
  size: number;
  page: number;
  rowsPerPage: number;
  
  // Options
  enableFielddata: boolean;
}

export interface MultiIndexJoinState {
  // Configuration
  config: MultiIndexJoinConfig;
  
  // Data
  result: any | null;
  availableIndexes: string[];
  availableSavedQueries: SavedQuery[];
  
  // UI state
  loading: boolean;
  error: string | null;
  indexesLoading: boolean;
  savedQueriesLoading: boolean;
  
  // Field mappings for each source
  sourceMappings: Record<string, string[]>; // source ID -> fields
  mappingsLoading: Record<string, boolean>;
  
  // Preview data for sources
  previewData: Record<string, any[]>;
  previewLoading: Record<string, boolean>;
}

export interface MultiIndexJoinActions {
  // Configuration updates
  setJoins: (joins: JoinCondition[]) => void;
  addJoin: (join: JoinCondition) => void;
  updateJoin: (id: string, updates: Partial<JoinCondition>) => void;
  removeJoin: (id: string) => void;
  setConsolidatedFields: (fields: ConsolidatedField[]) => void;
  addConsolidatedField: (field: ConsolidatedField) => void;
  updateConsolidatedField: (id: string, updates: Partial<ConsolidatedField>) => void;
  removeConsolidatedField: (id: string) => void;
  setPagination: (from: number, size: number, page: number, rowsPerPage: number) => void;
  setEnableFielddata: (enable: boolean) => void;
  setAdvancedMode: (enabled: boolean) => void;
  
  // Data actions
  executeJoin: () => Promise<void>;
  clearResults: () => void;
  loadAvailableIndexes: () => Promise<void>;
  loadAvailableSavedQueries: () => Promise<void>;
  loadSourceMapping: (source: JoinSource) => Promise<void>;
  loadPreviewData: (source: JoinSource) => Promise<void>;
  
  // Pagination actions
  handlePageChange: (event: unknown, newPage: number) => Promise<void>;
  handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  
  // Utility functions
  buildJoinQuery: () => any;
  getFormattedResults: () => { columns: string[]; rows: any[] };
  generateJoinId: () => string;
  generateFieldId: () => string;
  validateJoinConfiguration: () => { valid: boolean; errors: string[] };
  createJoinSourceFromIndex: (index: string) => JoinSource;
  createJoinSourceFromSavedQuery: (savedQuery: SavedQuery) => JoinSource;
}

const initialConfig: MultiIndexJoinConfig = {
  joins: [],
  consolidatedFields: [],
  advancedMode: false,
  from: 0,
  size: 100,
  page: 0,
  rowsPerPage: 10,
  enableFielddata: false,
};

const initialState: MultiIndexJoinState = {
  config: initialConfig,
  result: null,
  availableIndexes: [],
  availableSavedQueries: [],
  loading: false,
  error: null,
  indexesLoading: false,
  savedQueriesLoading: false,
  sourceMappings: {},
  mappingsLoading: {},
  previewData: {},
  previewLoading: {},
};

export const useMultiIndexJoinState = (): MultiIndexJoinState & MultiIndexJoinActions => {
  const [state, setState] = useState<MultiIndexJoinState>(initialState);

  // Configuration updates
  const setJoins = useCallback((joins: JoinCondition[]) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, joins },
    }));
  }, []);

  const addJoin = useCallback((join: JoinCondition) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        joins: [...prev.config.joins, join],
      },
    }));
  }, []);

  const updateJoin = useCallback((id: string, updates: Partial<JoinCondition>) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        joins: prev.config.joins.map(join =>
          join.id === id ? { ...join, ...updates } : join
        ),
      },
    }));
  }, []);

  const removeJoin = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        joins: prev.config.joins.filter(join => join.id !== id),
      },
    }));
  }, []);

  const setConsolidatedFields = useCallback((fields: ConsolidatedField[]) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, consolidatedFields: fields },
    }));
  }, []);

  const addConsolidatedField = useCallback((field: ConsolidatedField) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        consolidatedFields: [...prev.config.consolidatedFields, field],
      },
    }));
  }, []);

  const updateConsolidatedField = useCallback((id: string, updates: Partial<ConsolidatedField>) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        consolidatedFields: prev.config.consolidatedFields.map(field =>
          field.id === id ? { ...field, ...updates } : field
        ),
      },
    }));
  }, []);

  const removeConsolidatedField = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        consolidatedFields: prev.config.consolidatedFields.filter(field => field.id !== id),
      },
    }));
  }, []);

  const setPagination = useCallback((from: number, size: number, page: number, rowsPerPage: number) => {
    setState(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        from, 
        size, 
        page, 
        rowsPerPage 
      },
    }));
  }, []);

  const setEnableFielddata = useCallback((enable: boolean) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, enableFielddata: enable },
    }));
  }, []);

  const setAdvancedMode = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        advancedMode: enabled,
        // Clear joins and fields when switching modes
        joins: [],
        consolidatedFields: [],
      },
    }));
  }, []);

  // Generate unique IDs
  const generateJoinId = useCallback(() => {
    return `join-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const generateFieldId = useCallback(() => {
    return `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create join source from index
  const createJoinSourceFromIndex = useCallback((index: string): JoinSource => {
    return {
      type: 'index',
      id: index,
      name: index,
    };
  }, []);

  // Create join source from saved query
  const createJoinSourceFromSavedQuery = useCallback((savedQuery: SavedQuery): JoinSource => {
    return {
      type: 'savedQuery',
      id: savedQuery.id,
      name: savedQuery.name,
      query: savedQuery.queryData.rawQuery,
      targetIndex: savedQuery.targetIndex,
    };
  }, []);

  // Validate join configuration
  const validateJoinConfiguration = useCallback(() => {
    const errors: string[] = [];
    
    if (state.config.joins.length === 0) {
      errors.push('At least one join condition is required');
    }

    if (state.config.consolidatedFields.length === 0) {
      errors.push('At least one consolidated field must be selected');
    }

    // Check for duplicate join conditions
    const joinKeys = new Set();
    state.config.joins.forEach(join => {
      const key = `${join.leftSource.id}-${join.leftField}-${join.rightSource.id}-${join.rightField}`;
      if (joinKeys.has(key)) {
        errors.push(`Duplicate join condition found: ${join.leftSource.name}.${join.leftField} = ${join.rightSource.name}.${join.rightField}`);
      }
      joinKeys.add(key);
    });

    // Check for circular joins
    const sourceGraph = new Map();
    state.config.joins.forEach(join => {
      if (!sourceGraph.has(join.leftSource.id)) {
        sourceGraph.set(join.leftSource.id, new Set());
      }
      sourceGraph.get(join.leftSource.id).add(join.rightSource.id);
    });

    // Simple cycle detection (for basic cases)
    const visited = new Set();
    const detectCycle = (sourceId: string, path: Set<string>): boolean => {
      if (path.has(sourceId)) return true;
      if (visited.has(sourceId)) return false;

      visited.add(sourceId);
      path.add(sourceId);

      const neighbors = sourceGraph.get(sourceId) || new Set();
      for (const neighbor of neighbors) {
        if (detectCycle(neighbor, path)) return true;
      }

      path.delete(sourceId);
      return false;
    };

    for (const sourceId of sourceGraph.keys()) {
      if (detectCycle(sourceId, new Set())) {
        errors.push('Circular join detected - joins cannot form cycles');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [state.config.joins, state.config.consolidatedFields]);

  // Build join query
  const buildJoinQuery = useCallback(() => {
    const { joins, consolidatedFields, from, size, enableFielddata } = state.config;
    
    // Transform joins to include full source information for backend processing
    const processedJoins = joins.map(join => ({
      ...join,
      leftSource: {
        ...join.leftSource,
        // Include query if it's a saved query type
        ...(join.leftSource.type === 'savedQuery' && { 
          query: join.leftSource.query,
          targetIndex: join.leftSource.targetIndex 
        })
      },
      rightSource: {
        ...join.rightSource,
        // Include query if it's a saved query type
        ...(join.rightSource.type === 'savedQuery' && { 
          query: join.rightSource.query,
          targetIndex: join.rightSource.targetIndex 
        })
      }
    }));
    
    return {
      joins: processedJoins,
      consolidatedFields: consolidatedFields.filter(field => field.include),
      from,
      size,
      enableFielddata,
    };
  }, [state.config]);

  // Execute join
  const executeJoin = useCallback(async () => {
    const validation = validateJoinConfiguration();
    if (!validation.valid) {
      setState(prev => ({ ...prev, error: validation.errors.join('; ') }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const queryPayload = buildJoinQuery();

      const response = await fetch('/api/multi-index-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Join execution failed');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        result: data.data,
        loading: false,
        error: null,
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [validateJoinConfiguration, buildJoinQuery]);

  // Clear results
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      error: null,
    }));
  }, []);

  // Load available indexes
  const loadAvailableIndexes = useCallback(async () => {
    setState(prev => ({ ...prev, indexesLoading: true }));

    try {
      const response = await fetch('/api/direct-query/indexes');
      if (!response.ok) throw new Error('Failed to load indexes');
      
      const data = await response.json();
      setState(prev => ({
        ...prev,
        availableIndexes: data.data || [],
        indexesLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        indexesLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load indexes',
      }));
    }
  }, []);

  // Load available saved queries
  const loadAvailableSavedQueries = useCallback(async () => {
    setState(prev => ({ ...prev, savedQueriesLoading: true }));

    try {
      const response = await fetch('/api/saved-queries');
      if (!response.ok) throw new Error('Failed to load saved queries');
      
      const data = await response.json();
      setState(prev => ({
        ...prev,
        availableSavedQueries: data.data?.queries || [],
        savedQueriesLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        savedQueriesLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load saved queries',
      }));
    }
  }, []);

  // Load source mapping (works for both indexes and saved queries)
  const loadSourceMapping = useCallback(async (source: JoinSource) => {
    if (!source.id || state.sourceMappings[source.id]) return;

    setState(prev => ({
      ...prev,
      mappingsLoading: { ...prev.mappingsLoading, [source.id]: true },
    }));

    try {
      if (source.type === 'index') {
        // Load mapping from index
        const response = await fetch(`/api/direct-query/indexes/${source.id}/mapping`);
        if (!response.ok) throw new Error('Failed to load index mapping');
        
        const data = await response.json();
        const fields = extractFieldsFromMapping(data.data);
        
        setState(prev => ({
          ...prev,
          sourceMappings: { ...prev.sourceMappings, [source.id]: fields },
          mappingsLoading: { ...prev.mappingsLoading, [source.id]: false },
        }));
      } else if (source.type === 'savedQuery' && source.targetIndex) {
        // Load mapping from the saved query's target index
        const response = await fetch(`/api/direct-query/indexes/${source.targetIndex}/mapping`);
        if (!response.ok) throw new Error('Failed to load target index mapping');
        
        const data = await response.json();
        const fields = extractFieldsFromMapping(data.data);
        
        setState(prev => ({
          ...prev,
          sourceMappings: { ...prev.sourceMappings, [source.id]: fields },
          mappingsLoading: { ...prev.mappingsLoading, [source.id]: false },
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        mappingsLoading: { ...prev.mappingsLoading, [source.id]: false },
        error: error instanceof Error ? error.message : 'Failed to load source mapping',
      }));
    }
  }, [state.sourceMappings]);

  // Load preview data (works for both indexes and saved queries)
  const loadPreviewData = useCallback(async (source: JoinSource) => {
    if (!source.id || state.previewData[source.id]) return;

    setState(prev => ({
      ...prev,
      previewLoading: { ...prev.previewLoading, [source.id]: true },
    }));

    try {
      let query, index;

      if (source.type === 'index') {
        query = { match_all: {} };
        index = source.id;
      } else if (source.type === 'savedQuery') {
        query = source.query || { match_all: {} };
        index = source.targetIndex;
      }

      const response = await fetch('/api/direct-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index,
          query,
          size: 5, // Small preview
        }),
      });

      if (!response.ok) throw new Error('Failed to load preview data');
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        previewData: { ...prev.previewData, [source.id]: data.data?.hits?.hits || [] },
        previewLoading: { ...prev.previewLoading, [source.id]: false },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        previewLoading: { ...prev.previewLoading, [source.id]: false },
      }));
    }
  }, [state.previewData]);

  // Helper function to extract fields from mapping
  const extractFieldsFromMapping = (mapping: any): string[] => {
    const fields: string[] = [];
    
    const extractFields = (properties: any, prefix = '') => {
      if (!properties) return;
      
      Object.keys(properties).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const fieldDef = properties[key];
        
        if (fieldDef.properties) {
          // Nested object
          extractFields(fieldDef.properties, fullKey);
        } else {
          // Leaf field
          fields.push(fullKey);
        }
      });
    };

    // Extract from all indexes in the mapping
    Object.values(mapping).forEach((indexMapping: any) => {
      if (indexMapping.mappings?.properties) {
        extractFields(indexMapping.mappings.properties);
      }
    });

    return fields.sort();
  };

  // Pagination handlers
  const handlePageChange = useCallback(async (_event: unknown, newPage: number) => {
    const newFrom = newPage * state.config.rowsPerPage;
    
    setState(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        page: newPage, 
        from: newFrom 
      },
    }));

    // Re-execute join with new pagination
    await executeJoin();
  }, [state.config.rowsPerPage, executeJoin]);

  const handleRowsPerPageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value, 10);
    
    setState(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        size: newSize,
        rowsPerPage: newSize,
        from: 0,
        page: 0,
      },
    }));

    // Re-execute join with new pagination
    await executeJoin();
  }, [executeJoin]);

  // Format results for table display
  const getFormattedResults = useCallback(() => {
    if (!state.result?.results) return { columns: [], rows: [] };

    const results = state.result.results;
    
    if (results.length === 0) return { columns: [], rows: [] };

    // Get columns from consolidated fields
    const columns = state.config.consolidatedFields
      .filter(field => field.include)
      .map(field => field.alias || `${field.sourceName}.${field.sourceField}`);
    
    // Create rows
    const rows = results.map((result: any, index: number) => {
      const row: any = {
        id: `joined-${index}`,
      };

      // Add data from consolidated fields
      state.config.consolidatedFields
        .filter(field => field.include)
        .forEach(field => {
          const columnName = field.alias || `${field.sourceName}.${field.sourceField}`;
          const value = result[field.sourceId]?.[field.sourceField];
          row[columnName] = value !== undefined ? value : '-';
        });

      return row;
    });

    return { columns, rows };
  }, [state.result, state.config.consolidatedFields]);

  // Load indexes and saved queries on mount
  useEffect(() => {
    loadAvailableIndexes();
    loadAvailableSavedQueries();
  }, [loadAvailableIndexes, loadAvailableSavedQueries]);

  return {
    ...state,
    setJoins,
    addJoin,
    updateJoin,
    removeJoin,
    setConsolidatedFields,
    addConsolidatedField,
    updateConsolidatedField,
    removeConsolidatedField,
    setPagination,
    setEnableFielddata,
    setAdvancedMode,
    executeJoin,
    clearResults,
    loadAvailableIndexes,
    loadAvailableSavedQueries,
    loadSourceMapping,
    loadPreviewData,
    handlePageChange,
    handleRowsPerPageChange,
    buildJoinQuery,
    getFormattedResults,
    generateJoinId,
    generateFieldId,
    validateJoinConfiguration,
    createJoinSourceFromIndex,
    createJoinSourceFromSavedQuery,
  };
};