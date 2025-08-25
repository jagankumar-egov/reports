import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Grid,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  Clear as ClearIcon,
  Storage as IndexIcon,
} from '@mui/icons-material';

import {
  QueryInput,
  QueryGuidelines,
  IndexSelector,
  ShareableLink,
} from '@/components/common';

export interface QueryExecutionCardProps {
  // Index selection
  selectedIndex: string;
  availableIndexes: string[];
  onIndexChange: (index: string) => void;
  indexesLoading: boolean;

  // Query configuration
  queryText: string;
  onQueryChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  // Execution
  onExecute: () => void;
  onClear: () => void;
  loading: boolean;

  // Optional DirectQuery specific props
  showFromSize?: boolean;
  from?: number;
  size?: number;
  onFromChange?: (from: number) => void;
  onSizeChange?: (size: number) => void;
  
  // Advanced options
  showFielddataOption?: boolean;
  enableFielddata?: boolean;
  onEnableFielddataChange?: (enabled: boolean) => void;

  // Additional customization
  title?: string;
  showQueryGuidelines?: boolean;
  showShareableLink?: boolean;
  children?: React.ReactNode; // For additional buttons/controls
}

const QueryExecutionCard: React.FC<QueryExecutionCardProps> = ({
  selectedIndex,
  availableIndexes,
  onIndexChange,
  indexesLoading,
  queryText,
  onQueryChange,
  onExecute,
  onClear,
  loading,
  showFromSize = false,
  from = 0,
  size = 10,
  onFromChange,
  onSizeChange,
  showFielddataOption = false,
  enableFielddata = false,
  onEnableFielddataChange,
  title = "Query Configuration",
  showQueryGuidelines = true,
  showShareableLink = true,
  children,
}) => {
  return (
    <Card elevation={2}>
      <CardHeader 
        title={title}
        avatar={<IndexIcon color="primary" />}
      />
      <CardContent>
        <Grid container spacing={2}>
          {/* Index Selection */}
          <Grid item xs={12} md={showFromSize ? 4 : 6}>
            <IndexSelector
              selectedIndex={selectedIndex}
              availableIndexes={availableIndexes}
              onIndexChange={onIndexChange}
              loading={indexesLoading}
            />
          </Grid>

          {/* From Parameter - Only show for DirectQuery */}
          {showFromSize && onFromChange && (
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="From (Offset)"
                value={from}
                onChange={(e) => onFromChange(Math.max(0, parseInt(e.target.value) || 0))}
                inputProps={{ min: 0 }}
              />
            </Grid>
          )}

          {/* Size Parameter - Only show for DirectQuery */}
          {showFromSize && onSizeChange && (
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Size (Limit)"
                value={size}
                onChange={(e) => onSizeChange(Math.max(1, Math.min(1000, parseInt(e.target.value) || 10)))}
                inputProps={{ min: 1, max: 1000 }}
              />
            </Grid>
          )}

          {/* Enable Fielddata Option - Only show for DirectQuery */}
          {showFielddataOption && onEnableFielddataChange && (
            <Grid item xs={12}>
              <Tooltip title="Enable fielddata for text fields to allow aggregations and sorting. Warning: This may use significant memory!">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={enableFielddata}
                      onChange={(e) => onEnableFielddataChange(e.target.checked)}
                      color="warning"
                    />
                  }
                  label="Enable Fielddata (for aggregations on text fields)"
                />
              </Tooltip>
            </Grid>
          )}

          {/* Query JSON Input */}
          <QueryInput
            queryText={queryText}
            onQueryChange={onQueryChange}
            disabled={loading}
          />

          {/* Query Guidelines Panel */}
          {showQueryGuidelines && (
            <Grid item xs={12}>
              <QueryGuidelines />
            </Grid>
          )}

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} /> : <ExecuteIcon />}
                onClick={onExecute}
                disabled={loading || !selectedIndex}
                size="large"
              >
                {loading ? 'Executing...' : 'Execute Query'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={onClear}
                disabled={loading}
              >
                Clear Results
              </Button>
              
              {showShareableLink && (
                <ShareableLink
                  index={selectedIndex}
                  query={queryText}
                  from={from}
                  size={size}
                  autoExecute={true}
                  buttonVariant="outlined"
                  buttonSize="large"
                />
              )}

              {/* Additional custom buttons */}
              {children}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default QueryExecutionCard;