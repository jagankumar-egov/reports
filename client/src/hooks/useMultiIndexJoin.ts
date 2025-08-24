import { useState, useCallback } from 'react';
import { 
  MultiIndexJoinRequest, 
  MultiIndexJoinResponse, 
  JoinPreviewResponse 
} from '../types';
import { multiIndexJoinService } from '../services/multiIndexJoin';

interface UseMultiIndexJoinResult {
  result: MultiIndexJoinResponse | null;
  preview: JoinPreviewResponse | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  executeJoin: (request: MultiIndexJoinRequest) => Promise<void>;
  getPreview: (leftIndex: string, rightIndex: string, leftField: string, rightField: string) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

export const useMultiIndexJoin = (): UseMultiIndexJoinResult => {
  const [result, setResult] = useState<MultiIndexJoinResponse | null>(null);
  const [preview, setPreview] = useState<JoinPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeJoin = useCallback(async (request: MultiIndexJoinRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const joinResult = await multiIndexJoinService.executeJoin(request);
      setResult(joinResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute multi-index join');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPreview = useCallback(async (
    leftIndex: string,
    rightIndex: string,
    leftField: string,
    rightField: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const previewResult = await multiIndexJoinService.getJoinPreview(
        leftIndex,
        rightIndex,
        leftField,
        rightField
      );
      setPreview(previewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get join preview');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResult(null);
    setPreview(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    result,
    preview,
    loading,
    error,
    executeJoin,
    getPreview,
    clearResults,
    clearError
  };
};