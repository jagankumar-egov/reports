import { useState, useCallback, useEffect } from 'react';
import { DirectQueryRequest, DirectQueryResponse } from '@/types';
import { directQueryAPI } from '@/services/api';

export interface UseElasticsearchQueryOptions {
  autoExecute?: boolean;
  initialQuery?: string;
  onResult?: (result: DirectQueryResponse) => void;
  onError?: (error: string) => void;
}

export interface ElasticsearchQueryResult {
  // State
  selectedIndex: string;
  queryText: string;
  result: DirectQueryResponse | null;
  loading: boolean;
  error: string | null;
  availableIndexes: string[];
  indexesLoading: boolean;

  // Actions
  setSelectedIndex: (index: string) => void;
  setQueryText: (text: string) => void;
  executeQuery: (customFrom?: number, customSize?: number, customSourceFilter?: string[] | boolean) => Promise<void>;
  clearResults: () => void;
  formatResultsForTable: (hits: any[]) => { columns: string[]; rows: any[] };
}

export const useElasticsearchQuery = (options: UseElasticsearchQueryOptions = {}): ElasticsearchQueryResult => {
  const {
    autoExecute = false,
    initialQuery = '{\n  "query": {\n    "match_all": {}\n  },\n  "size": 10\n}',
    onResult,
    onError
  } = options;

  // State
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [queryText, setQueryText] = useState<string>(initialQuery);
  const [result, setResult] = useState<DirectQueryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableIndexes, setAvailableIndexes] = useState<string[]>([]);
  const [indexesLoading, setIndexesLoading] = useState<boolean>(true);

  // Load available indexes on mount
  useEffect(() => {
    const loadIndexes = async () => {
      try {
        setIndexesLoading(true);
        const indexes = await directQueryAPI.getIndexes();
        setAvailableIndexes(indexes);
        
        if (indexes.length > 0 && !selectedIndex) {
          setSelectedIndex(indexes[0]);
        }
      } catch (err: any) {
        let errorMessage = 'Failed to load indexes';
        
        if (err && typeof err === 'object' && err.message) {
          errorMessage = `Failed to load indexes: ${err.message}`;
          if (err.code) {
            errorMessage = `Failed to load indexes: ${err.code} - ${err.message}`;
          }
        } else if (err instanceof Error) {
          errorMessage = `Failed to load indexes: ${err.message}`;
        } else {
          errorMessage = `Failed to load indexes: ${String(err)}`;
        }
        
        const finalError = errorMessage;
        setError(finalError);
        if (onError) onError(finalError);
      } finally {
        setIndexesLoading(false);
      }
    };

    loadIndexes();
  }, [selectedIndex, onError]);

  // Execute query
  const executeQuery = useCallback(async (customFrom?: number, customSize?: number, customSourceFilter?: string[] | boolean) => {
    if (!selectedIndex) {
      const errorMsg = 'Please select an index';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (!queryText.trim()) {
      const errorMsg = 'Please enter a query';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Parse the query
      let parsedQuery;
      try {
        parsedQuery = JSON.parse(queryText);
      } catch (parseError) {
        throw new Error(`Invalid JSON query: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Extract from and size from the parsed query if they exist
      const queryFrom = customFrom !== undefined ? customFrom : (parsedQuery.from !== undefined ? parsedQuery.from : 0);
      const querySize = customSize !== undefined ? customSize : (parsedQuery.size !== undefined ? parsedQuery.size : 10);
      
      const request: DirectQueryRequest = {
        index: selectedIndex,
        query: parsedQuery,
        from: queryFrom,
        size: querySize,
        ...(customSourceFilter !== undefined && { _source: customSourceFilter }),
      };

      const response = await directQueryAPI.execute(request);
      setResult(response);
      setError(null);
      if (onResult) onResult(response);
    } catch (err: any) {
      // Handle structured API errors
      let errorMessage = 'An unknown error occurred';
      
      if (err && typeof err === 'object') {
        if (err.message) {
          errorMessage = err.message;
          
          // Add more context for specific errors
          if (err.code) {
            errorMessage = `${err.code}: ${err.message}`;
          }
          
          // For Elasticsearch errors, try to extract the root cause
          if (err.details && err.details.includes('index_not_found_exception')) {
            const indexMatch = err.details.match(/no such index \[([^\]]+)\]/);
            if (indexMatch) {
              errorMessage = `Index '${indexMatch[1]}' not found. Please check if the index exists and try again.`;
            }
          } else if (err.details && err.details.includes('parsing_exception')) {
            errorMessage = `Query parsing error: ${err.message}. Please check your Elasticsearch query syntax.`;
          } else if (err.details && err.details.includes('search_phase_execution_exception')) {
            errorMessage = `Search execution error: ${err.message}. There may be an issue with the query or index mapping.`;
          } else if (err.code === 'ACCESS_DENIED') {
            errorMessage = `Access denied: ${err.message}. Please check if you have permission to access this index.`;
          } else if (err.code === 'INTERNAL_ERROR' && err.details) {
            // Try to extract meaningful error from internal errors
            if (err.details.includes('connection')) {
              errorMessage = `Connection error: Unable to connect to Elasticsearch. Please try again.`;
            } else if (err.details.includes('timeout')) {
              errorMessage = `Request timeout: The query took too long to execute. Try simplifying your query or increasing the timeout.`;
            }
          }
        } else if (err.code && err.status) {
          errorMessage = `${err.code} (${err.status})`;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = String(err);
      }
      
      setError(errorMessage);
      setResult(null);
      if (onError) onError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedIndex, queryText, onResult, onError]);

  // Clear results
  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // Format result data for table display
  const formatResultsForTable = useCallback((hits: any[]) => {
    if (!hits || hits.length === 0) return { columns: [], rows: [] };

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

    // Create columns from current result
    const resultColumns = ['_id', '_score', ...Array.from(allKeys).sort()];
    
    // Create rows
    const rows = hits.map((hit, index) => {
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

    return { columns: resultColumns, rows };
  }, []);

  return {
    // State
    selectedIndex,
    queryText,
    result,
    loading,
    error,
    availableIndexes,
    indexesLoading,

    // Actions
    setSelectedIndex,
    setQueryText,
    executeQuery,
    clearResults,
    formatResultsForTable,
  };
};