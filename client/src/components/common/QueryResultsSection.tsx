import React from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Chip,
  Divider,
  Box,
} from '@mui/material';
import {
  TableView as TableIcon,
} from '@mui/icons-material';

import {
  DataTable,
  AggregationsDisplay,
  ErrorDisplay,
  LoadingSpinner,
} from '@/components/common';
import { DirectQueryResponse, TableRow } from '@/types';

export interface QueryResultsSectionProps {
  // Data
  result: DirectQueryResponse | null;
  error: string | null;
  loading: boolean;

  // Table data
  columns: string[];
  rows: TableRow[];
  page: number;
  rowsPerPage: number;
  totalHits: number;

  // Event handlers
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRetryError?: () => void;

  // Configuration
  selectedIndex: string;
  emptyMessage?: string;
  showAggregations?: boolean;
  
  // Additional custom actions or content
  additionalActions?: React.ReactNode;
  children?: React.ReactNode;
}

const QueryResultsSection: React.FC<QueryResultsSectionProps> = ({
  result,
  error,
  loading,
  columns,
  rows,
  page,
  rowsPerPage,
  totalHits,
  onPageChange,
  onRowsPerPageChange,
  onRetryError,
  selectedIndex,
  emptyMessage = "No results found",
  showAggregations = true,
  additionalActions,
  children,
}) => {
  return (
    <>
      {/* Loading State */}
      {loading && (
        <Grid item xs={12}>
          <LoadingSpinner message="Executing query..." />
        </Grid>
      )}

      {/* Error Display */}
      {error && !loading && (
        <Grid item xs={12}>
          <ErrorDisplay
            error={error}
            onRetry={onRetryError}
            context="Query Execution"
          />
        </Grid>
      )}

      {/* Results */}
      {result && !loading && !error && (
        <>
          {/* Aggregations */}
          {showAggregations && result.aggregations && Object.keys(result.aggregations).length > 0 && (
            <Grid item xs={12}>
              <AggregationsDisplay 
                aggregations={result.aggregations}
                title="Query Aggregations"
                defaultExpanded={true}
              />
            </Grid>
          )}

          {/* Results Table */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TableIcon />
                    Query Results
                    <Chip
                      label={`${totalHits} hits in ${result.took}ms`}
                      color="success"
                      size="small"
                    />
                  </Box>
                }
                action={additionalActions}
              />
              <CardContent>
                {/* Query Info */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Index:</strong> {selectedIndex} | 
                    <strong> Shards:</strong> {result._shards.successful}/{result._shards.total} successful |
                    <strong> Timed out:</strong> {result.timed_out ? 'Yes' : 'No'}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />
                
                {/* Custom content */}
                {children}

                {/* Results Table */}
                <DataTable
                  columns={columns}
                  rows={rows}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  totalCount={totalHits}
                  onPageChange={onPageChange}
                  onRowsPerPageChange={onRowsPerPageChange}
                  loading={loading}
                  emptyMessage={emptyMessage}
                />
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </>
  );
};

export default QueryResultsSection;