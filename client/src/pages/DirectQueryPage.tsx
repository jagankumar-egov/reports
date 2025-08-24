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

      {/* Information Panel */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.50' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="primary" />
          Query Guidelines
        </Typography>
        <Box sx={{ ml: 4 }}>
          <Typography variant="body2" paragraph>
            • Use valid Elasticsearch JSON query syntax
          </Typography>
          <Typography variant="body2" paragraph>
            • The "from" and "size" parameters control pagination
          </Typography>
          <Typography variant="body2" paragraph>
            • Results are limited to a maximum of 1000 documents per query
          </Typography>
          <Typography variant="body2" paragraph>
            • Complex nested objects will be flattened for table display
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold' }}>
          Example Query:
        </Typography>
        <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.100', fontFamily: 'monospace' }}>
          <pre style={{ margin: 0, fontSize: '12px' }}>
{`{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "Data.projectName": "LLIN"
          }
        }
      ]
    }
  },
  "size": 20,
  "sort": [
    {
      "Data.@timestamp": {
        "order": "desc"
      }
    }
  ]
}`}
          </pre>
        </Paper>
      </Paper>

      {/* Direct Query Component */}
      <DirectQuery />
    </Container>
  );
};

export default DirectQueryPage;