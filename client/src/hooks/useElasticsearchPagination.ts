import { useState, useCallback } from 'react';
import { DirectQueryResponse } from '@/types';

export interface ElasticsearchPaginationResult {
  // State
  page: number;
  rowsPerPage: number;

  // Actions
  setPage: (page: number) => void;
  setRowsPerPage: (rowsPerPage: number) => void;
  handleChangePage: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  getPaginatedHits: (result: DirectQueryResponse | null) => any[];
  resetPagination: () => void;
}

export const useElasticsearchPagination = (initialRowsPerPage: number = 10): ElasticsearchPaginationResult => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  // Handle pagination
  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Get paginated data
  const getPaginatedHits = useCallback((result: DirectQueryResponse | null) => {
    if (!result?.hits?.hits) return [];
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return result.hits.hits.slice(start, end);
  }, [page, rowsPerPage]);

  // Reset pagination to first page
  const resetPagination = useCallback(() => {
    setPage(0);
  }, []);

  return {
    // State
    page,
    rowsPerPage,

    // Actions
    setPage,
    setRowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    getPaginatedHits,
    resetPagination,
  };
};