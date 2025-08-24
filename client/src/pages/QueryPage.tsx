import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Paper,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Timeline as TimelineIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';

import { useAppSelector, useAppDispatch } from '@/store';
import { executeQuery, clearResult } from '@/store/slices/querySlice';
import { addNotification } from '@/store/slices/uiSlice';
import QueryBuilder from '@/components/query/QueryBuilder';
import DataTable from '@/components/data/DataTable';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const QueryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  
  const { jql, result, loading, error } = useAppSelector((state) => state.query);
  const { items: availableFields, loading: fieldsLoading } = useAppSelector((state) => state.fields);
  const { items: availableProjects, loading: projectsLoading } = useAppSelector((state) => state.projects);
  
  const [showQueryInfo, setShowQueryInfo] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Clear results when component mounts
  useEffect(() => {
    dispatch(clearResult());
  }, [dispatch]);

  const handleExecuteQuery = async () => {
    if (!jql.trim()) {
      dispatch(addNotification({
        type: 'warning',
        title: 'Query Required',
        message: 'Please enter a JQL query to execute',
      }));
      return;
    }

    try {
      await dispatch(executeQuery({
        jql,
        startAt: currentPage * pageSize,
        maxResults: pageSize,
      })).unwrap();

      dispatch(addNotification({
        type: 'success',
        title: 'Query Executed',
        message: `Query completed successfully`,
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        title: 'Query Failed',
        message: error.message || 'Failed to execute query',
      }));
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    
    if (result && jql) {
      // Re-execute query with new pagination
      dispatch(executeQuery({
        jql,
        startAt: newPage * pageSize,
        maxResults: pageSize,
      }));
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(0); // Reset to first page
    
    if (result && jql) {
      // Re-execute query with new page size
      dispatch(executeQuery({
        jql,
        startAt: 0,
        maxResults: newPageSize,
      }));
    }
  };

  const handleRowSelect = (record: any) => {
    // TODO: Show record details in a modal or side panel
    console.log('Selected record:', record);
  };

  // Show loading spinner while initial data is loading
  if (fieldsLoading || projectsLoading) {
    return <LoadingSpinner message="Loading available fields and projects..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Query & Search
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Execute JQL queries against health data indexes and view results in tabular format
        </Typography>
      </Box>

      {/* Query Builder Section */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <QueryBuilder onExecute={handleExecuteQuery} />
        </Grid>

        {/* Query Info Panel */}
        {jql && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TimelineIcon color="primary" />
                  <Typography variant="h6">Query Information</Typography>
                  {result && (
                    <Chip
                      label={`${result.total.toLocaleString()} results`}
                      color="primary"
                      size="small"
                    />
                  )}
                </Box>
                <IconButton onClick={() => setShowQueryInfo(!showQueryInfo)}>
                  {showQueryInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              
              <Collapse in={showQueryInfo}>
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StorageIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Fields Available: {availableFields.length.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StorageIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Projects Available: {availableProjects.length}
                    </Typography>
                  </Box>
                  {result && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TimelineIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Execution Time: {result.executionTime}ms
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
          </Grid>
        )}

        {/* Error Display */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error">
              <AlertTitle>Query Error</AlertTitle>
              {error}
            </Alert>
          </Grid>
        )}

        {/* Results Section */}
        {result && (
          <Grid item xs={12}>
            <DataTable
              data={result.issues}
              fields={result.fields}
              loading={loading}
              totalRows={result.total}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onRowSelect={handleRowSelect}
            />
          </Grid>
        )}

        {/* Empty State */}
        {!result && !loading && !error && jql && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Ready to Execute
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Execute Query" to run your JQL query and view results
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Welcome State */}
        {!result && !loading && !error && !jql && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Welcome to DHR Query Builder
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Start by building a query using the visual builder or write JQL directly.
                You can query across multiple health data indexes and view results in a sortable, 
                filterable table.
              </Typography>
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip 
                  label={`${availableProjects.length} Projects Available`}
                  color="primary"
                  variant="outlined"
                />
                <Chip 
                  label={`${availableFields.length} Fields Available`}
                  color="secondary"
                  variant="outlined"
                />
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default QueryPage;