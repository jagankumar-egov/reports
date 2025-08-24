import React from 'react';
import {
  TextField,
  Typography,
  Grid,
} from '@mui/material';

interface QueryInputProps {
  queryText: string;
  onQueryChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  rows?: number;
}

const QueryInput: React.FC<QueryInputProps> = ({
  queryText,
  onQueryChange,
  disabled = false,
  label = 'Elasticsearch Query (JSON)',
  placeholder = 'Enter your Elasticsearch query in JSON format...',
  rows = 12,
}) => {
  return (
    <Grid item xs={12}>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={rows}
        value={queryText}
        onChange={onQueryChange}
        placeholder={placeholder}
        disabled={disabled}
        sx={{
          fontFamily: 'monospace',
          '& .MuiInputBase-input': {
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '14px',
          },
        }}
      />
    </Grid>
  );
};

export default QueryInput;