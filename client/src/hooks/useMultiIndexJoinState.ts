import { useState, useCallback, useEffect } from 'react';

export interface JoinCondition {
  id: string;
  leftIndex: string;
  leftField: string;
  rightIndex: string;
  rightField: string;
  joinType: 'inner' | 'left' | 'right' | 'full';
}

export interface ConsolidatedField {
  id: string;
  sourceIndex: string;
  sourceField: string;
  alias: string;
  include: boolean;
}

export interface MultiIndexJoinConfig {
  // Join configuration
  joins: JoinCondition[];
  consolidatedFields: ConsolidatedField[];
  
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
  
  // UI state
  loading: boolean;
  error: string | null;
  indexesLoading: boolean;
  
  // Field mappings for each index
  indexMappings: Record<string, string[]>;
  mappingsLoading: Record<string, boolean>;
  
  // Preview data
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
  
  // Data actions
  executeJoin: () => Promise<void>;
  clearResults: () => void;
  loadAvailableIndexes: () => Promise<void>;
  loadIndexMapping: (index: string) => Promise<void>;
  loadPreviewData: (index: string) => Promise<void>;
  
  // Pagination actions
  handlePageChange: (event: unknown, newPage: number) => Promise<void>;
  handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  
  // Utility functions
  buildJoinQuery: () => any;
  getFormattedResults: () => { columns: string[]; rows: any[] };
  generateJoinId: () => string;
  generateFieldId: () => string;
  validateJoinConfiguration: () => { valid: boolean; errors: string[] };
}

const initialConfig: MultiIndexJoinConfig = {
  joins: [],
  consolidatedFields: [],
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
  loading: false,
  error: null,
  indexesLoading: false,
  indexMappings: {},
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

  // Generate unique IDs
  const generateJoinId = useCallback(() => {
    return `join-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const generateFieldId = useCallback(() => {
    return `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      const key = `${join.leftIndex}-${join.leftField}-${join.rightIndex}-${join.rightField}`;
      if (joinKeys.has(key)) {
        errors.push(`Duplicate join condition found: ${join.leftIndex}.${join.leftField} = ${join.rightIndex}.${join.rightField}`);
      }
      joinKeys.add(key);
    });

    // Check for circular joins
    const indexGraph = new Map();
    state.config.joins.forEach(join => {
      if (!indexGraph.has(join.leftIndex)) {
        indexGraph.set(join.leftIndex, new Set());
      }
      indexGraph.get(join.leftIndex).add(join.rightIndex);
    });

    // Simple cycle detection (for basic cases)
    const visited = new Set();
    const detectCycle = (index: string, path: Set<string>): boolean => {
      if (path.has(index)) return true;
      if (visited.has(index)) return false;

      visited.add(index);
      path.add(index);

      const neighbors = indexGraph.get(index) || new Set();
      for (const neighbor of neighbors) {
        if (detectCycle(neighbor, path)) return true;
      }

      path.delete(index);
      return false;
    };

    for (const index of indexGraph.keys()) {
      if (detectCycle(index, new Set())) {
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
    
    return {
      joins,
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

  // Load index mapping
  const loadIndexMapping = useCallback(async (index: string) => {
    if (!index || state.indexMappings[index]) return;

    setState(prev => ({
      ...prev,
      mappingsLoading: { ...prev.mappingsLoading, [index]: true },
    }));

    try {
      const response = await fetch(`/api/direct-query/indexes/${index}/mapping`);
      if (!response.ok) throw new Error('Failed to load index mapping');
      
      const data = await response.json();
      
      // Extract field names from mapping
      const fields = extractFieldsFromMapping(data.data);
      
      setState(prev => ({
        ...prev,
        indexMappings: { ...prev.indexMappings, [index]: fields },
        mappingsLoading: { ...prev.mappingsLoading, [index]: false },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        mappingsLoading: { ...prev.mappingsLoading, [index]: false },
        error: error instanceof Error ? error.message : 'Failed to load index mapping',
      }));
    }
  }, [state.indexMappings]);

  // Load preview data
  const loadPreviewData = useCallback(async (index: string) => {
    if (!index || state.previewData[index]) return;

    setState(prev => ({
      ...prev,
      previewLoading: { ...prev.previewLoading, [index]: true },
    }));

    try {
      const response = await fetch('/api/direct-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index,
          query: { match_all: {} },
          size: 5, // Small preview
        }),
      });

      if (!response.ok) throw new Error('Failed to load preview data');
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        previewData: { ...prev.previewData, [index]: data.data?.hits?.hits || [] },
        previewLoading: { ...prev.previewLoading, [index]: false },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        previewLoading: { ...prev.previewLoading, [index]: false },
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
      .map(field => field.alias || `${field.sourceIndex}.${field.sourceField}`);
    
    // Create rows
    const rows = results.map((result: any, index: number) => {
      const row: any = {
        id: `joined-${index}`,
      };

      // Add data from consolidated fields
      state.config.consolidatedFields
        .filter(field => field.include)
        .forEach(field => {
          const columnName = field.alias || `${field.sourceIndex}.${field.sourceField}`;
          const value = result[field.sourceIndex]?.[field.sourceField];
          row[columnName] = value !== undefined ? value : '-';
        });

      return row;
    });

    return { columns, rows };
  }, [state.result, state.config.consolidatedFields]);

  // Load indexes on mount
  useEffect(() => {
    loadAvailableIndexes();
  }, [loadAvailableIndexes]);

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
    executeJoin,
    clearResults,
    loadAvailableIndexes,
    loadIndexMapping,
    loadPreviewData,
    handlePageChange,
    handleRowsPerPageChange,
    buildJoinQuery,
    getFormattedResults,
    generateJoinId,
    generateFieldId,
    validateJoinConfiguration,
  };
};