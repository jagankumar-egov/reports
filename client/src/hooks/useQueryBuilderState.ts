import { useState, useCallback, useEffect } from 'react';
import { DirectQueryResponse } from '@/types';
import { FieldInfo } from '@/utils/mappingUtils';

export interface QueryCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number;
  logicalOperator?: 'AND' | 'OR';
}

export interface QueryBuilderConfig {
  // Query configuration
  selectedIndex: string;
  conditions: QueryCondition[];
  
  // Pagination
  page: number;
  rowsPerPage: number;
  
  // Column selection
  selectedColumns: string[];
  availableColumns: string[];
  
  // Advanced options
  enableFielddata: boolean;
}

export interface QueryBuilderState {
  // Configuration
  config: QueryBuilderConfig;
  
  // Data
  result: DirectQueryResponse | null;
  availableIndexes: string[];
  
  // UI state
  loading: boolean;
  error: string | null;
  indexesLoading: boolean;
  mappingLoading: boolean;
  
  // Field mapping
  fields: FieldInfo[];
  
  // Column management
  schemaColumns: string[];
  columnFilterOpen: boolean;
  columnAnchorEl: HTMLButtonElement | null;
  
  // Saved queries
  saveQueryDialogOpen: boolean;
  savedQueriesListOpen: boolean;
}

export interface QueryBuilderActions {
  // Configuration updates
  setSelectedIndex: (index: string) => void;
  setConditions: (conditions: QueryCondition[]) => void;
  addCondition: (condition: QueryCondition) => void;
  updateCondition: (id: string, updates: Partial<QueryCondition>) => void;
  removeCondition: (id: string) => void;
  setPagination: (page: number, rowsPerPage: number) => void;
  setSelectedColumns: (columns: string[]) => void;
  setEnableFielddata: (enable: boolean) => void;
  
  // Data actions
  executeQuery: () => Promise<void>;
  clearResults: () => void;
  loadAvailableIndexes: () => Promise<void>;
  loadFieldMapping: (index: string) => Promise<void>;
  
  // Pagination actions
  handlePageChange: (event: unknown, newPage: number) => void;
  handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Column management
  handleColumnToggle: (column: string) => void;
  handleSelectAllColumns: () => void;
  handleSelectNoColumns: () => void;
  setColumnFilterOpen: (open: boolean) => void;
  setColumnAnchorEl: (el: HTMLButtonElement | null) => void;
  
  // UI state
  setSaveQueryDialogOpen: (open: boolean) => void;
  setSavedQueriesListOpen: (open: boolean) => void;
  
  // Utility functions
  buildElasticsearchQuery: () => any;
  getFormattedResults: () => { columns: string[]; rows: any[] };
  generateConditionId: () => string;
}

const initialConfig: QueryBuilderConfig = {
  selectedIndex: '',
  conditions: [],
  page: 0,
  rowsPerPage: 10,
  selectedColumns: [],
  availableColumns: [],
  enableFielddata: false,
};

const initialState: QueryBuilderState = {
  config: initialConfig,
  result: null,
  availableIndexes: [],
  loading: false,
  error: null,
  indexesLoading: false,
  mappingLoading: false,
  fields: [],
  schemaColumns: [],
  columnFilterOpen: false,
  columnAnchorEl: null,
  saveQueryDialogOpen: false,
  savedQueriesListOpen: false,
};

export const useQueryBuilderState = (): QueryBuilderState & QueryBuilderActions => {
  const [state, setState] = useState<QueryBuilderState>(initialState);

  // Configuration updates
  const setSelectedIndex = useCallback((index: string) => {
    setState(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        selectedIndex: index,
        conditions: [],
        selectedColumns: [],
        availableColumns: [],
      },
      result: null,
      error: null,
      schemaColumns: [],
      fields: [],
    }));
  }, []);

  const setConditions = useCallback((conditions: QueryCondition[]) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, conditions },
    }));
  }, []);

  const addCondition = useCallback((condition: QueryCondition) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        conditions: [...prev.config.conditions, condition],
      },
    }));
  }, []);

  const updateCondition = useCallback((id: string, updates: Partial<QueryCondition>) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        conditions: prev.config.conditions.map(condition =>
          condition.id === id ? { ...condition, ...updates } : condition
        ),
      },
    }));
  }, []);

  const removeCondition = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        conditions: prev.config.conditions.filter(condition => condition.id !== id),
      },
    }));
  }, []);

  const setPagination = useCallback((page: number, rowsPerPage: number) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, page, rowsPerPage },
    }));
  }, []);

  const setSelectedColumns = useCallback((columns: string[]) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, selectedColumns: columns },
    }));
  }, []);

  const setEnableFielddata = useCallback((enable: boolean) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, enableFielddata: enable },
    }));
  }, []);

  // Generate unique condition ID
  const generateConditionId = useCallback(() => {
    return `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Build Elasticsearch query
  const buildElasticsearchQuery = useCallback(() => {
    const { conditions, enableFielddata } = state.config;
    
    if (conditions.length === 0) {
      return {
        query: { match_all: {} },
        from: state.config.page * state.config.rowsPerPage,
        size: state.config.rowsPerPage,
        enableFielddata,
      };
    }

    // Build query based on conditions
    const boolQuery: any = {
      bool: {
        must: [],
        should: [],
        minimum_should_match: 0,
      }
    };

    let hasOrConditions = false;

    conditions.forEach((condition, index) => {
      const queryClause = buildQueryClause(condition);
      
      if (condition.logicalOperator === 'OR' || (index > 0 && conditions[index - 1].logicalOperator === 'OR')) {
        boolQuery.bool.should.push(queryClause);
        hasOrConditions = true;
      } else {
        boolQuery.bool.must.push(queryClause);
      }
    });

    // Set minimum_should_match if we have OR conditions
    if (hasOrConditions) {
      boolQuery.bool.minimum_should_match = 1;
    }

    // Clean up empty arrays
    if (boolQuery.bool.must.length === 0) {
      delete boolQuery.bool.must;
    }
    if (boolQuery.bool.should.length === 0) {
      delete boolQuery.bool.should;
      delete boolQuery.bool.minimum_should_match;
    }

    return {
      query: boolQuery,
      from: state.config.page * state.config.rowsPerPage,
      size: state.config.rowsPerPage,
      enableFielddata,
    };
  }, [state.config]);

  // Helper function to build individual query clauses
  const buildQueryClause = (condition: QueryCondition) => {
    switch (condition.operator) {
      case 'equals':
        return { term: { [condition.field]: condition.value } };
      case 'not_equals':
        return { bool: { must_not: { term: { [condition.field]: condition.value } } } };
      case 'contains':
        return { match: { [condition.field]: condition.value } };
      case 'starts_with':
        return { prefix: { [condition.field]: condition.value } };
      case 'ends_with':
        return { wildcard: { [condition.field]: `*${condition.value}` } };
      case 'greater_than':
        return { range: { [condition.field]: { gt: condition.value } } };
      case 'greater_than_equal':
        return { range: { [condition.field]: { gte: condition.value } } };
      case 'less_than':
        return { range: { [condition.field]: { lt: condition.value } } };
      case 'less_than_equal':
        return { range: { [condition.field]: { lte: condition.value } } };
      case 'exists':
        return { exists: { field: condition.field } };
      case 'not_exists':
        return { bool: { must_not: { exists: { field: condition.field } } } };
      case 'wildcard':
        return { wildcard: { [condition.field]: `*${condition.value}*` } };
      default:
        return { term: { [condition.field]: condition.value } };
    }
  };

  // Execute query
  const executeQuery = useCallback(async () => {
    if (!state.config.selectedIndex) {
      setState(prev => ({ ...prev, error: 'Index is required' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const queryPayload = buildElasticsearchQuery();

      const response = await fetch('/api/direct-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index: state.config.selectedIndex,
          query: queryPayload.query,
          from: queryPayload.from,
          size: queryPayload.size,
          enableFielddata: queryPayload.enableFielddata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Query execution failed');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        result: data.data,
        loading: false,
        error: null,
      }));

      // Extract schema columns from results
      if (data.data?.hits?.hits && state.schemaColumns.length === 0) {
        const allKeys = new Set<string>();
        data.data.hits.hits.forEach((hit: any) => {
          if (hit._source) {
            const extractKeys = (obj: any, prefix = '') => {
              Object.keys(obj).forEach(key => {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                  extractKeys(obj[key], fullKey);
                } else {
                  allKeys.add(fullKey);
                }
              });
            };
            extractKeys(hit._source);
          }
        });

        const schemaColumns = ['_id', '_score', ...Array.from(allKeys).sort()];
        setState(prev => ({
          ...prev,
          schemaColumns,
          config: {
            ...prev.config,
            availableColumns: schemaColumns,
            selectedColumns: prev.config.selectedColumns.length === 0 ? schemaColumns : prev.config.selectedColumns,
          }
        }));
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [state.config, state.schemaColumns.length, buildElasticsearchQuery]);

  // Clear results
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      error: null,
      schemaColumns: [],
      config: { ...prev.config, selectedColumns: [], availableColumns: [] },
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

  // Load field mapping
  const loadFieldMapping = useCallback(async (index: string) => {
    if (!index) return;

    setState(prev => ({ ...prev, mappingLoading: true }));

    try {
      const response = await fetch(`/api/direct-query/indexes/${index}/mapping`);
      if (!response.ok) throw new Error('Failed to load field mapping');
      
      const data = await response.json();
      
      // Extract fields from mapping (you'll need to implement extractFieldsFromMapping)
      const fields: FieldInfo[] = []; // This would be populated by extractFieldsFromMapping
      console.log('Mapping data:', data); // Keep data usage to avoid unused variable error
      
      setState(prev => ({
        ...prev,
        fields,
        mappingLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        mappingLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load field mapping',
      }));
    }
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((_event: unknown, newPage: number) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, page: newPage },
    }));
    // Auto-execute query when page changes
    executeQuery();
  }, [executeQuery]);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setState(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        rowsPerPage: newRowsPerPage,
        page: 0,
      },
    }));
    // Auto-execute query when rows per page changes
    executeQuery();
  }, [executeQuery]);

  // Column management
  const handleColumnToggle = useCallback((column: string) => {
    setState(prev => {
      const newSelectedColumns = prev.config.selectedColumns.includes(column)
        ? prev.config.selectedColumns.filter(col => col !== column)
        : [...prev.config.selectedColumns, column];
      
      return {
        ...prev,
        config: { ...prev.config, selectedColumns: newSelectedColumns },
      };
    });
  }, []);

  const handleSelectAllColumns = useCallback(() => {
    const columnsToSelect = state.schemaColumns.length > 0 ? state.schemaColumns : state.config.availableColumns;
    setSelectedColumns(columnsToSelect);
  }, [state.schemaColumns, state.config.availableColumns, setSelectedColumns]);

  const handleSelectNoColumns = useCallback(() => {
    setSelectedColumns(['_id']); // Keep at least _id for table structure
  }, [setSelectedColumns]);

  // UI state setters
  const setColumnFilterOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, columnFilterOpen: open }));
  }, []);

  const setColumnAnchorEl = useCallback((el: HTMLButtonElement | null) => {
    setState(prev => ({ ...prev, columnAnchorEl: el }));
  }, []);

  const setSaveQueryDialogOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, saveQueryDialogOpen: open }));
  }, []);

  const setSavedQueriesListOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, savedQueriesListOpen: open }));
  }, []);

  // Format results for table display
  const getFormattedResults = useCallback(() => {
    if (!state.result?.hits?.hits) return { columns: [], rows: [] };

    const hits = state.result.hits.hits;
    
    // Get all unique keys from all documents
    const allKeys = new Set<string>();
    hits.forEach(hit => {
      if (hit._source) {
        const extractKeys = (obj: any, prefix = '') => {
          Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
              extractKeys(obj[key], fullKey);
            } else {
              allKeys.add(fullKey);
            }
          });
        };
        extractKeys(hit._source);
      }
    });

    const resultColumns = ['_id', '_score', ...Array.from(allKeys).sort()];
    
    // Use selected columns for display, but only show columns that exist in the current result
    const displayColumns = state.config.selectedColumns.length > 0 
      ? state.config.selectedColumns.filter(col => resultColumns.includes(col))
      : resultColumns;
    
    // Create rows
    const rows = hits.map((hit: any, index: number) => {
      const row: any = {
        id: `${hit._id}-${index}`,
        _id: hit._id,
        _score: hit._score,
      };

      // Flatten the _source object
      const flattenObject = (obj: any, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            flattenObject(obj[key], fullKey);
          } else {
            row[fullKey] = obj[key];
          }
        });
      };

      if (hit._source) {
        flattenObject(hit._source);
      }

      return row;
    });

    return { columns: displayColumns, rows };
  }, [state.result, state.config.selectedColumns]);

  // Load indexes on mount
  useEffect(() => {
    loadAvailableIndexes();
  }, [loadAvailableIndexes]);

  // Load field mapping when index changes
  useEffect(() => {
    if (state.config.selectedIndex) {
      loadFieldMapping(state.config.selectedIndex);
    }
  }, [state.config.selectedIndex, loadFieldMapping]);

  return {
    ...state,
    setSelectedIndex,
    setConditions,
    addCondition,
    updateCondition,
    removeCondition,
    setPagination,
    setSelectedColumns,
    setEnableFielddata,
    executeQuery,
    clearResults,
    loadAvailableIndexes,
    loadFieldMapping,
    handlePageChange,
    handleRowsPerPageChange,
    handleColumnToggle,
    handleSelectAllColumns,
    handleSelectNoColumns,
    setColumnFilterOpen,
    setColumnAnchorEl,
    setSaveQueryDialogOpen,
    setSavedQueriesListOpen,
    buildElasticsearchQuery,
    getFormattedResults,
    generateConditionId,
  };
};