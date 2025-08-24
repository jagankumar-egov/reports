import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Alert,
  Paper,
} from '@mui/material';
import {
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  CheckCircle as SuccessIcon,
  OpenInNew as OpenIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface ShareableLinkProps {
  index?: string;
  query?: string;
  from?: number;
  size?: number;
  autoExecute?: boolean;
  buttonVariant?: 'text' | 'outlined' | 'contained';
  buttonSize?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  buttonText?: string;
}

const ShareableLink: React.FC<ShareableLinkProps> = ({
  index,
  query,
  from = 0,
  size = 10,
  autoExecute = true,
  buttonVariant = 'outlined',
  buttonSize = 'medium',
  showIcon = true,
  buttonText = 'Get Shareable Link',
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate the Auto Query URL
  const generatedUrl = useMemo(() => {
    if (!index || !query) return '';

    const params = new URLSearchParams();
    params.set('index', index);
    params.set('from', from.toString());
    params.set('size', size.toString());
    params.set('autoExecute', autoExecute.toString());

    // Parse the query to extract filters
    try {
      const parsedQuery = typeof query === 'string' ? JSON.parse(query) : query;
      
      // Extract filters from bool query
      if (parsedQuery.query?.bool?.must) {
        const mustClauses = Array.isArray(parsedQuery.query.bool.must) 
          ? parsedQuery.query.bool.must 
          : [parsedQuery.query.bool.must];

        mustClauses.forEach((clause: any) => {
          // Handle term queries
          if (clause.term) {
            const field = Object.keys(clause.term)[0];
            const value = clause.term[field];
            // Remove .keyword suffix for cleaner URLs
            const cleanField = field.replace('.keyword', '');
            params.set(cleanField, value);
          }
          // Handle match queries
          else if (clause.match) {
            const field = Object.keys(clause.match)[0];
            const value = clause.match[field];
            if (field === '_all') {
              params.set('search', value);
            } else {
              params.set(field, value);
            }
          }
          // Handle range queries
          else if (clause.range) {
            const field = Object.keys(clause.range)[0];
            const range = clause.range[field];
            if (field === 'created_at' && range.gte && range.lte) {
              params.set('date_from', range.gte);
              params.set('date_to', range.lte);
            } else {
              // For other range queries, encode as custom filter
              params.set(`filter_${field}`, JSON.stringify({
                field,
                type: 'range',
                value: `${range.gte || ''} TO ${range.lte || ''}`,
                operator: 'range'
              }));
            }
          }
          // Handle wildcard queries
          else if (clause.wildcard) {
            const field = Object.keys(clause.wildcard)[0];
            const value = clause.wildcard[field];
            params.set(`filter_${field}`, JSON.stringify({
              field,
              type: 'wildcard',
              value,
              operator: 'wildcard'
            }));
          }
        });
      }
      // If no specific filters, but not match_all, include the full query
      else if (!parsedQuery.query?.match_all) {
        params.set('query', JSON.stringify(parsedQuery));
      }

      // Handle sort if present
      if (parsedQuery.sort && parsedQuery.sort.length > 0) {
        const sortField = Object.keys(parsedQuery.sort[0])[0];
        const sortOrder = parsedQuery.sort[0][sortField].order || parsedQuery.sort[0][sortField];
        if (sortField !== '_score') {
          params.set('sort_field', sortField);
          params.set('sort_order', sortOrder);
        }
      }

      // Handle aggregations if present
      if (parsedQuery.aggs || parsedQuery.aggregations) {
        params.set('has_aggregations', 'true');
      }

    } catch (error) {
      console.error('Error parsing query:', error);
      // Fallback: include the entire query as encoded JSON
      params.set('query', encodeURIComponent(query));
    }

    const baseUrl = `${window.location.origin}/auto-query`;
    return `${baseUrl}?${params.toString()}`;
  }, [index, query, from, size, autoExecute]);

  const handleOpen = () => {
    setOpen(true);
    setCopied(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleCopy = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInNewTab = () => {
    if (generatedUrl) {
      window.open(generatedUrl, '_blank');
    }
  };

  // Parse URL to show active filters
  const activeFilters = useMemo(() => {
    if (!generatedUrl) return [];
    
    try {
      const url = new URL(generatedUrl);
      const filters: string[] = [];
      
      url.searchParams.forEach((value, key) => {
        if (!['index', 'from', 'size', 'autoExecute', 'query', 'has_aggregations'].includes(key)) {
          if (key.startsWith('filter_')) {
            try {
              const filterData = JSON.parse(value);
              filters.push(`${filterData.field}: ${filterData.value}`);
            } catch {
              filters.push(`${key.replace('filter_', '')}: ${value}`);
            }
          } else if (key === 'date_from') {
            const dateTo = url.searchParams.get('date_to');
            if (dateTo) {
              filters.push(`Date: ${value} to ${dateTo}`);
            }
          } else if (key !== 'date_to') {
            filters.push(`${key}: ${value}`);
          }
        }
      });
      
      return filters;
    } catch {
      return [];
    }
  }, [generatedUrl]);

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        startIcon={showIcon ? <LinkIcon /> : undefined}
        onClick={handleOpen}
        disabled={!index || !query}
      >
        {buttonText}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon color="primary" />
            <Typography variant="h6">Shareable Auto Query Link</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {generatedUrl ? (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                This link will open in the Auto Query page with all current filters and settings applied.
                {autoExecute && ' The query will execute automatically when the page loads.'}
              </Alert>

              <Typography variant="subtitle2" gutterBottom>
                Generated URL:
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <TextField
                  fullWidth
                  multiline
                  value={generatedUrl}
                  InputProps={{
                    readOnly: true,
                    sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Tooltip title={copied ? "Copied!" : "Copy URL"}>
                    <IconButton 
                      onClick={handleCopy} 
                      color={copied ? "success" : "default"}
                      size="small"
                    >
                      {copied ? <SuccessIcon /> : <CopyIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Open in new tab">
                    <IconButton onClick={handleOpenInNewTab} size="small">
                      <OpenIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>

              {activeFilters.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Active Filters in URL:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {activeFilters.map((filter, index) => (
                      <Chip
                        key={index}
                        label={filter}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </>
              )}

              <Typography variant="subtitle2" gutterBottom>
                URL Parameters:
              </Typography>
              <Box sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                <Typography variant="body2" component="div">
                  <strong>Index:</strong> {index}<br />
                  <strong>From:</strong> {from}<br />
                  <strong>Size:</strong> {size}<br />
                  <strong>Auto Execute:</strong> {autoExecute ? 'Yes' : 'No'}
                </Typography>
              </Box>
            </>
          ) : (
            <Alert severity="warning">
              Please ensure you have selected an index and have a valid query before generating a shareable link.
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          {generatedUrl && (
            <>
              <Button 
                variant="contained" 
                onClick={handleCopy}
                startIcon={copied ? <SuccessIcon /> : <CopyIcon />}
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
              <Button 
                variant="contained" 
                color="secondary"
                onClick={handleOpenInNewTab}
                startIcon={<OpenIcon />}
              >
                Open in New Tab
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShareableLink;