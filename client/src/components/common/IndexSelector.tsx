import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';

interface IndexSelectorProps {
  selectedIndex: string;
  availableIndexes: string[];
  onIndexChange: (index: string) => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingMessage?: string;
}

const IndexSelector: React.FC<IndexSelectorProps> = ({
  selectedIndex,
  availableIndexes,
  onIndexChange,
  loading = false,
  disabled = false,
  label = 'Select Index',
  loadingMessage = 'Loading indexes...',
}) => {
  return (
    <>
      <FormControl fullWidth disabled={loading || disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={selectedIndex}
          label={label}
          onChange={(e) => onIndexChange(e.target.value)}
        >
          {availableIndexes.map((index) => (
            <MenuItem key={index} value={index}>
              {index}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" sx={{ ml: 1 }}>
            {loadingMessage}
          </Typography>
        </Box>
      )}
    </>
  );
};

export default IndexSelector;