import React from 'react';
import { Box, Typography, Button, Alert, AlertTitle } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you would send this to your error reporting service
    // Example: errorReportingService.captureException(error, { extra: errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            backgroundColor: (theme) => theme.palette.background.default,
          }}
        >
          <Box sx={{ maxWidth: 600, width: '100%' }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>Something went wrong</AlertTitle>
              The application encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </Alert>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Oops! Application Error
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We're sorry for the inconvenience. The DHR application has encountered an error.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReset}
              >
                Try Again
              </Button>
            </Box>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <AlertTitle>Development Error Details</AlertTitle>
                <Typography variant="body2" component="pre" sx={{ 
                  fontSize: '0.75rem', 
                  overflow: 'auto',
                  maxHeight: 300,
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Alert>
            )}
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;