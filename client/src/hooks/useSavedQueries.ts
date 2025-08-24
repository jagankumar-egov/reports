import { useState, useEffect, useCallback } from 'react';
import { 
  SavedQuery, 
  CreateSavedQueryRequest, 
  UpdateSavedQueryRequest,
  SavedQueriesListResponse 
} from '../types';
import { savedQueriesService } from '../services/savedQueries';

interface UseSavedQueriesOptions {
  queryType?: string;
  targetIndex?: string;
  tags?: string[];
  limit?: number;
  autoLoad?: boolean;
}

interface UseSavedQueriesResult {
  queries: SavedQuery[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
  
  // Actions
  loadQueries: (offset?: number) => Promise<void>;
  createQuery: (request: CreateSavedQueryRequest) => Promise<SavedQuery>;
  updateQuery: (queryId: string, updates: UpdateSavedQueryRequest) => Promise<SavedQuery>;
  deleteQuery: (queryId: string) => Promise<void>;
  executeQuery: (queryId: string) => Promise<SavedQuery>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useSavedQueries = (options: UseSavedQueriesOptions = {}): UseSavedQueriesResult => {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null>(null);

  const {
    queryType,
    targetIndex,
    tags,
    limit = 50,
    autoLoad = true
  } = options;

  const loadQueries = useCallback(async (offset: number = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await savedQueriesService.getAllSavedQueries({
        queryType,
        targetIndex,
        tags,
        limit,
        offset
      });
      
      if (offset === 0) {
        // Replace queries for initial load or refresh
        setQueries(result.queries);
      } else {
        // Append queries for pagination
        setQueries(prev => [...prev, ...result.queries]);
      }
      
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved queries');
      if (offset === 0) {
        setQueries([]);
        setPagination(null);
      }
    } finally {
      setLoading(false);
    }
  }, [queryType, targetIndex, tags, limit]);

  const createQuery = useCallback(async (request: CreateSavedQueryRequest): Promise<SavedQuery> => {
    setError(null);
    
    try {
      const newQuery = await savedQueriesService.createSavedQuery(request);
      setQueries(prev => [newQuery, ...prev]);
      
      // Update pagination if we have it
      if (pagination) {
        setPagination(prev => prev ? { ...prev, total: prev.total + 1 } : null);
      }
      
      return newQuery;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create saved query');
      throw err;
    }
  }, [pagination]);

  const updateQuery = useCallback(async (queryId: string, updates: UpdateSavedQueryRequest): Promise<SavedQuery> => {
    setError(null);
    
    try {
      const updatedQuery = await savedQueriesService.updateSavedQuery(queryId, updates);
      setQueries(prev => prev.map(q => q.id === queryId ? updatedQuery : q));
      return updatedQuery;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update saved query');
      throw err;
    }
  }, []);

  const deleteQuery = useCallback(async (queryId: string): Promise<void> => {
    setError(null);
    
    try {
      await savedQueriesService.deleteSavedQuery(queryId);
      setQueries(prev => prev.filter(q => q.id !== queryId));
      
      // Update pagination if we have it
      if (pagination) {
        setPagination(prev => prev ? { ...prev, total: Math.max(0, prev.total - 1) } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete saved query');
      throw err;
    }
  }, [pagination]);

  const executeQuery = useCallback(async (queryId: string): Promise<SavedQuery> => {
    setError(null);
    
    try {
      const query = await savedQueriesService.executeAndTrackSavedQuery(queryId);
      
      // Update the query in our local state to reflect execution count increment
      setQueries(prev => prev.map(q => q.id === queryId ? {
        ...q,
        metadata: {
          ...q.metadata,
          executionCount: (q.metadata.executionCount || 0) + 1,
          lastExecutedAt: new Date().toISOString()
        }
      } : q));
      
      return query;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute saved query');
      throw err;
    }
  }, []);

  const refresh = useCallback(() => loadQueries(0), [loadQueries]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load queries on mount or when dependencies change
  useEffect(() => {
    if (autoLoad) {
      loadQueries(0);
    }
  }, [autoLoad, loadQueries]);

  return {
    queries,
    loading,
    error,
    pagination,
    loadQueries,
    createQuery,
    updateQuery,
    deleteQuery,
    executeQuery,
    refresh,
    clearError
  };
};