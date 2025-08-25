import { useState, useCallback, useEffect } from 'react';
import { DirectQueryResponse } from '@/types';

export interface DirectQueryConfig {
  // Query configuration
  selectedIndex: string;
  queryText: string;
  
  // Pagination
  from: number;
  size: number;
  page: number;
  rowsPerPage: number;
  
  // Column selection
  selectedColumns: string[];
  availableColumns: string[];
  
  // Source filtering
  sourceFields: string[] | boolean;
  
  // Advanced options
  enableFielddata: boolean;
}

export interface DirectQueryState {
  // Configuration
  config: DirectQueryConfig;
  
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
  
  // Saved queries
  saveQueryDialogOpen: boolean;
  savedQueriesListOpen: boolean;
}

export interface DirectQueryActions {
  // Configuration updates
  setSelectedIndex: (index: string) => void;
  setQueryText: (text: string) => void;
  setPagination: (from: number, size: number, page: number, rowsPerPage: number) => void;
  setSelectedColumns: (columns: string[]) => void;
  setEnableFielddata: (enable: boolean) => void;
  
  // Data actions
  executeQuery: () => Promise<void>;
  clearResults: () => void;
  loadAvailableIndexes: () => Promise<void>;
  
  // Pagination actions
  handlePageChange: (event: unknown, newPage: number) => Promise<void>;
  handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  
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
}

const initialConfig: DirectQueryConfig = {
  selectedIndex: '',
  queryText: '',
  from: 0,
  size: 10,
  page: 0,
  rowsPerPage: 10,
  selectedColumns: [],
  availableColumns: [],
  sourceFields: true,
  enableFielddata: false,
};

const initialState: DirectQueryState = {
  config: initialConfig,
  result: null,
  availableIndexes: [],
  loading: false,
  error: null,
  indexesLoading: false,
  schemaColumns: [],
  columnFilterOpen: false,
  columnAnchorEl: null,
  saveQueryDialogOpen: false,
  savedQueriesListOpen: false,
};

export const useDirectQueryState = (): DirectQueryState & DirectQueryActions => {
  const [state, setState] = useState<DirectQueryState>(initialState);

  // Configuration updates
  const setSelectedIndex = useCallback((index: string) => {
    setState(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        selectedIndex: index,
        selectedColumns: [], // Reset column selection
        availableColumns: [], // Reset available columns
        sourceFields: true, // Reset source filtering
      },
      result: null,
      error: null,
      schemaColumns: [],
    }));
  }, []);

  const setQueryText = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, queryText: text },
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

  const setSelectedColumns = useCallback((columns: string[]) => {
    setState(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        selectedColumns: columns,
        sourceFields: columns.length > 0 
          ? columns.filter(col => !col.startsWith('_'))
          : true
      },
    }));
  }, []);

  const setEnableFielddata = useCallback((enable: boolean) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, enableFielddata: enable },
    }));
  }, []);

  // Build Elasticsearch query
  const buildElasticsearchQuery = useCallback(() => {
    const { queryText, from, size, sourceFields, enableFielddata } = state.config;
    
    if (!queryText.trim()) return null;
    
    try {
      const parsedQuery = JSON.parse(queryText);
      return {
        index: state.config.selectedIndex,
        query: parsedQuery,
        from,
        size,
        _source: sourceFields === true ? true : (Array.isArray(sourceFields) && sourceFields.length > 0) ? sourceFields : true,
        enableFielddata,
      };
    } catch (error) {
      throw new Error('Invalid JSON query format');
    }
  }, [state.config]);

  // Execute query
  const executeQuery = useCallback(async () => {
    if (!state.config.selectedIndex || !state.config.queryText.trim()) {
      setState(prev => ({ ...prev, error: 'Index and query are required' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const queryPayload = buildElasticsearchQuery();
      if (!queryPayload) {
        throw new Error('Failed to build query');
      }

      const response = await fetch('/api/direct-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryPayload),
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

      // Extract schema columns from results if this is the first unfiltered query
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

    // Re-execute query with new pagination
    if (state.config.selectedIndex && state.config.queryText.trim()) {
      await executeQuery();
    }
  }, [state.config, executeQuery]);

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

    // Re-execute query with new pagination
    if (state.config.selectedIndex && state.config.queryText.trim()) {
      await executeQuery();
    }
  }, [state.config, executeQuery]);

  // Column management
  const handleColumnToggle = useCallback((column: string) => {
    setState(prev => {
      const newSelectedColumns = prev.config.selectedColumns.includes(column)
        ? prev.config.selectedColumns.filter(col => col !== column)
        : [...prev.config.selectedColumns, column];
      
      return {
        ...prev,
        config: {
          ...prev.config,
          selectedColumns: newSelectedColumns,
          sourceFields: newSelectedColumns.length > 0 
            ? newSelectedColumns.filter(col => !col.startsWith('_'))
            : true
        },
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

  return {
    ...state,
    setSelectedIndex,
    setQueryText,
    setPagination,
    setSelectedColumns,
    setEnableFielddata,
    executeQuery,
    clearResults,
    loadAvailableIndexes,
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
  };
};