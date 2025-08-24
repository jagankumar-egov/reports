import React from 'react';
import {
  Container,
  Box,
  Typography,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

import AutoQuery from '@/components/query/AutoQuery';

const AutoQueryPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon />
          Auto Query with URL Filters
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Automatically execute Elasticsearch queries based on URL parameters. Perfect for dashboards, bookmarks, and deep linking.
        </Typography>
      </Box>

      {/* Info Alert */}
      <Box sx={{ mb: 3 }}>
        <Alert severity="info">
          <AlertTitle>URL-Driven Queries</AlertTitle>
          This interface automatically generates and executes queries based on URL parameters. 
          Add filters to the URL like: <code>?index=myindex&field=value&autoExecute=true</code>
        </Alert>
      </Box>

      {/* Auto Query Component */}
      <AutoQuery />
    </Container>
  );
};

export default AutoQueryPage;