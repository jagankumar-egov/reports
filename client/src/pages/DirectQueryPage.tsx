import React from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Code as CodeIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

import DirectQuery from '@/components/query/DirectQuery';

const DirectQueryPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon />
          Direct Elasticsearch Query
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Execute direct Elasticsearch queries with full JSON syntax and view results in a dynamic table
        </Typography>
      </Box>

      {/* Warning Alert */}
      <Box sx={{ mb: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Advanced Feature</AlertTitle>
          This tool allows direct Elasticsearch queries with full JSON syntax. Please ensure your queries are properly formatted and secure. 
          Malformed queries may cause performance issues or errors.
        </Alert>
      </Box>


      {/* Direct Query Component */}
      <DirectQuery />
    </Container>
  );
};

export default DirectQueryPage;