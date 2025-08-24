import React from 'react';
import {
  Alert,
  Box,
  Typography,
  AlertColor,
} from '@mui/material';

interface ErrorDisplayProps {
  error: string | null;
  onClose?: () => void;
  severity?: AlertColor;
  title?: string;
  showTitle?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onClose,
  severity = 'error',
  title = 'Query Execution Failed',
  showTitle = true,
}) => {
  if (!error) {
    return null;
  }

  return (
    <Alert 
      severity={severity}
      onClose={onClose}
      sx={{ 
        '& .MuiAlert-message': { 
          fontSize: '0.95rem',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap'
        }
      }}
    >
      <Box>
        {showTitle && (
          <Typography variant="body1" component="div" sx={{ fontWeight: 'medium', mb: 0.5 }}>
            {title}
          </Typography>
        )}
        <Typography variant="body2" component="div">
          {error}
        </Typography>
      </Box>
    </Alert>
  );
};

export default ErrorDisplay;