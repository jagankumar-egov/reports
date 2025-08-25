import { useState, useCallback, useEffect } from 'react';
import { DirectQueryResponse } from '@/types';

export interface DefaultFilter {
  field: string;
  operator: string;
  value: string | number;
  type: 'term' | 'range' | 'match' | 'wildcard' | 'exists';
  label?: string;
}

export interface AutoQueryConfig {
  // Query configuration
  selectedIndex: string;
  
  // Filters
  appliedFilters: DefaultFilter[];
  tempFilters: DefaultFilter[];
  
  // Pagination  
  page: number;
  rowsPerPage: number;
  
  // Column selection
  selectedColumns: string[];
  availableColumns: string[];
  
  // UI state
  showAllData: boolean;
}

export interface AutoQueryState {
  // Configuration
  config: AutoQueryConfig;
  
  // Data
  result: DirectQueryResponse | null;
  availableIndexes: string[];
  
  // UI state
  loading: boolean;
  error: string | null;
  indexesLoading: boolean;
  
  // Column management
  schemaColumns: string[];
  columnFilterOpen: boolean;
  columnAnchorEl: HTMLButtonElement | null;
}

export interface AutoQueryActions {
  // Configuration updates
  setSelectedIndex: (index: string) => void;
  setAppliedFilters: (filters: DefaultFilter[]) => void;
  setTempFilters: (filters: DefaultFilter[]) => void;
  setPagination: (page: number, rowsPerPage: number) => void;
  setSelectedColumns: (columns: string[]) => void;
  setShowAllData: (show: boolean) => void;
  
  // Data actions
  executeQuery: () => Promise<void>;
  clearResults: () => void;
  loadAvailableIndexes: () => Promise<void>;
  
  // Filter management
  addFilter: (filter: DefaultFilter) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  
  // Pagination actions
  handlePageChange: (event: unknown, newPage: number) => void;
  handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Column management
  handleColumnToggle: (column: string) => void;
  handleSelectAllColumns: () => void;
  handleSelectNoColumns: () => void;
  setColumnFilterOpen: (open: boolean) => void;
  setColumnAnchorEl: (el: HTMLButtonElement | null) => void;
  
  // Utility functions
  buildElasticsearchQuery: () => any;
  getFormattedResults: () => { columns: string[]; rows: any[] };
}

const initialConfig: AutoQueryConfig = {
  selectedIndex: '',
  appliedFilters: [],
  tempFilters: [],
  page: 0,
  rowsPerPage: 10,
  selectedColumns: [],
  availableColumns: [],
  showAllData: false,
};

const initialState: AutoQueryState = {
  config: initialConfig,
  result: null,
  availableIndexes: [],
  loading: false,
  error: null,
  indexesLoading: false,
  schemaColumns: [],
  columnFilterOpen: false,
  columnAnchorEl: null,
};

export const useAutoQueryState = (): AutoQueryState & AutoQueryActions => {
  const [state, setState] = useState<AutoQueryState>(initialState);

  // Configuration updates
  const setSelectedIndex = useCallback((index: string) => {
    setState(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        selectedIndex: index,
        selectedColumns: [],
        availableColumns: [],
        appliedFilters: [],
        tempFilters: [],
      },
      result: null,
      error: null,
      schemaColumns: [],
    }));
  }, []);

  const setAppliedFilters = useCallback((filters: DefaultFilter[]) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, appliedFilters: filters },
    }));
  }, []);

  const setTempFilters = useCallback((filters: DefaultFilter[]) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, tempFilters: filters },
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

  const setShowAllData = useCallback((show: boolean) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, showAllData: show },
    }));
  }, []);

  // Build Elasticsearch query
  const buildElasticsearchQuery = useCallback(() => {
    const { selectedIndex, appliedFilters, showAllData } = state.config;
    
    if (!selectedIndex) return null;

    if (showAllData && appliedFilters.length === 0) {
      return {
        query: { match_all: {} },
        from: state.config.page * state.config.rowsPerPage,
        size: state.config.rowsPerPage,
      };
    }

    if (appliedFilters.length === 0) {
      return null;
    }

    // Build query based on filters
    const boolQuery: any = {
      bool: {
        must: []
      }
    };

    appliedFilters.forEach(filter => {
      switch (filter.type) {
        case 'term':
          boolQuery.bool.must.push({
            term: { [filter.field]: filter.value }
          });
          break;
        case 'match':
          boolQuery.bool.must.push({
            match: { [filter.field]: filter.value }
          });
          break;
        case 'range':
          boolQuery.bool.must.push({
            range: { [filter.field]: { gte: filter.value } }
          });
          break;
        case 'wildcard':
          boolQuery.bool.must.push({
            wildcard: { [filter.field]: `*${filter.value}*` }
          });
          break;
        case 'exists':
          boolQuery.bool.must.push({
            exists: { field: filter.field }
          });
          break;
      }
    });

    return {
      query: boolQuery,
      from: state.config.page * state.config.rowsPerPage,
      size: state.config.rowsPerPage,
    };
  }, [state.config]);

  // Execute query
  const executeQuery = useCallback(async () => {
    if (!state.config.selectedIndex) {
      setState(prev => ({ ...prev, error: 'Index is required' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const queryPayload = buildElasticsearchQuery();
      if (!queryPayload) {
        throw new Error('No filters applied and "Show All Data" is not enabled');
      }

      const response = await fetch('/api/direct-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index: state.config.selectedIndex,
          query: queryPayload.query,
          from: queryPayload.from,
          size: queryPayload.size,
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

  // Filter management
  const addFilter = useCallback((filter: DefaultFilter) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        tempFilters: [...prev.config.tempFilters, filter],
      },
    }));
  }, []);

  const removeFilter = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        appliedFilters: prev.config.appliedFilters.filter((_, i) => i !== index),
      },
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        appliedFilters: [],
        tempFilters: [],
      },
    }));
  }, []);

  const applyFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        appliedFilters: [...prev.config.tempFilters],
        page: 0, // Reset to first page
      },
    }));
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

  return {
    ...state,
    setSelectedIndex,
    setAppliedFilters,
    setTempFilters,
    setPagination,
    setSelectedColumns,
    setShowAllData,
    executeQuery,
    clearResults,
    loadAvailableIndexes,
    addFilter,
    removeFilter,
    clearFilters,
    applyFilters,
    handlePageChange,
    handleRowsPerPageChange,
    handleColumnToggle,
    handleSelectAllColumns,
    handleSelectNoColumns,
    setColumnFilterOpen,
    setColumnAnchorEl,
    buildElasticsearchQuery,
    getFormattedResults,
  };
};