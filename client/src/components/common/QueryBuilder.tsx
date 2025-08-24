import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Typography,
  Grid,
  Paper,
  Chip,
  Tooltip,
  Alert,
  Autocomplete,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

import { FieldInfo, getSuggestedOperators, generateQueryClause } from '@/utils/mappingUtils';

export interface QueryCondition {
  id: string;
  field?: FieldInfo;
  operator?: string;
  value: string;
  logicalOperator: 'AND' | 'OR';
}

export interface QueryBuilderProps {
  fields: FieldInfo[];
  loading?: boolean;
  onQueryGenerated: (query: any) => void;
  onConditionsChange?: (conditions: QueryCondition[]) => void;
  initialConditions?: QueryCondition[];
}

const QueryBuilder: React.FC<QueryBuilderProps> = ({
  fields,
  loading = false,
  onQueryGenerated,
  onConditionsChange,
  initialConditions = [],
}) => {
  const [conditions, setConditions] = useState<QueryCondition[]>(
    initialConditions.length > 0 
      ? initialConditions 
      : [{ id: '1', logicalOperator: 'AND', value: '' }]
  );
  const [generatedQuery, setGeneratedQuery] = useState<string>('');
  const [queryError, setQueryError] = useState<string>('');
  const [showJsonPreview, setShowJsonPreview] = useState<boolean>(false);

  // Generate a unique ID for new conditions
  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  // Add new condition
  const addCondition = useCallback(() => {
    const newCondition: QueryCondition = {
      id: generateId(),
      logicalOperator: 'AND',
      value: '',
    };
    setConditions(prev => {
      const newConditions = [...prev, newCondition];
      onConditionsChange?.(newConditions);
      return newConditions;
    });
  }, [onConditionsChange]);

  // Remove condition
  const removeCondition = useCallback((id: string) => {
    setConditions(prev => {
      const newConditions = prev.filter(condition => condition.id !== id);
      onConditionsChange?.(newConditions);
      return newConditions;
    });
  }, [onConditionsChange]);

  // Update condition
  const updateCondition = useCallback((id: string, updates: Partial<QueryCondition>) => {
    setConditions(prev => {
      const newConditions = prev.map(condition => 
        condition.id === id ? { ...condition, ...updates } : condition
      );
      onConditionsChange?.(newConditions);
      return newConditions;
    });
  }, [onConditionsChange]);

  // Clear all conditions
  const clearAllConditions = useCallback(() => {
    const newConditions: QueryCondition[] = [{ id: generateId(), logicalOperator: 'AND', value: '' }];
    setConditions(newConditions);
    onConditionsChange?.(newConditions);
    setGeneratedQuery('');
    setQueryError('');
  }, [onConditionsChange]);

  // Generate Elasticsearch query
  const generateQuery = useCallback(() => {
    try {
      setQueryError('');
      
      const validConditions = conditions.filter(condition => 
        condition.field && condition.operator && condition.value.trim()
      );

      if (validConditions.length === 0) {
        const emptyQuery = {
          query: { match_all: {} },
          size: 10
        };
        const queryString = JSON.stringify(emptyQuery, null, 2);
        setGeneratedQuery(queryString);
        onQueryGenerated(emptyQuery);
        return;
      }

      const clauses: any[] = [];
      let currentOrGroup: any[] = [];

      validConditions.forEach((condition, index) => {
        const queryClause = generateQueryClause(condition.field!, condition.operator!, condition.value);
        
        if (condition.logicalOperator === 'OR' || (index > 0 && conditions[index - 1]?.logicalOperator === 'OR')) {
          currentOrGroup.push(queryClause);
        } else {
          // If we have accumulated OR clauses, add them as a should clause
          if (currentOrGroup.length > 0) {
            clauses.push(currentOrGroup.length === 1 ? currentOrGroup[0] : { bool: { should: currentOrGroup } });
            currentOrGroup = [];
          }
          currentOrGroup.push(queryClause);
        }
      });

      // Don't forget the last group
      if (currentOrGroup.length > 0) {
        clauses.push(currentOrGroup.length === 1 ? currentOrGroup[0] : { bool: { should: currentOrGroup } });
      }

      const query = {
        query: {
          bool: {
            must: clauses
          }
        },
        size: 10
      };

      const queryString = JSON.stringify(query, null, 2);
      setGeneratedQuery(queryString);
      onQueryGenerated(query);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate query';
      setQueryError(errorMessage);
    }
  }, [conditions, onQueryGenerated]);

  // Copy query to clipboard
  const copyQuery = useCallback(() => {
    if (generatedQuery) {
      navigator.clipboard.writeText(generatedQuery);
    }
  }, [generatedQuery]);

  // Auto-generate query when conditions change
  useEffect(() => {
    const timer = setTimeout(() => {
      generateQuery();
    }, 500);
    return () => clearTimeout(timer);
  }, [conditions, generateQuery]);

  return (
    <Card elevation={2}>
      <CardHeader
        title="Visual Query Builder"
        avatar={<BuildIcon color="primary" />}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CodeIcon />}
              endIcon={showJsonPreview ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              size="small"
            >
              {showJsonPreview ? 'Hide' : 'Show'} Query JSON
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addCondition}
              size="small"
            >
              Add Condition
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearAllConditions}
              size="small"
            >
              Clear All
            </Button>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Conditions */}
          <Grid item xs={12} md={showJsonPreview ? 6 : 12}>
            <Typography variant="h6" gutterBottom>
              Query Conditions
            </Typography>
            
            {conditions.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No conditions added. Click "Add Condition" to start building your query.
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {conditions.map((condition, index) => (
                <Paper key={condition.id} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    {/* Logical Operator (for conditions after the first) */}
                    {index > 0 && (
                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Logic</InputLabel>
                          <Select
                            value={condition.logicalOperator}
                            label="Logic"
                            onChange={(e) => updateCondition(condition.id, { 
                              logicalOperator: e.target.value as 'AND' | 'OR' 
                            })}
                          >
                            <MenuItem value="AND">AND</MenuItem>
                            <MenuItem value="OR">OR</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    {/* Field Selection */}
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        size="small"
                        options={fields}
                        getOptionLabel={(field) => `${field.fullPath} (${field.type})`}
                        value={condition.field || null}
                        onChange={(_, field) => updateCondition(condition.id, { 
                          field: field || undefined,
                          operator: undefined // Reset operator when field changes
                        })}
                        disabled={loading}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Field"
                            placeholder="Select field..."
                          />
                        )}
                        renderOption={(props, field) => (
                          <li {...props}>
                            <Box>
                              <Typography variant="body2">
                                {field.fullPath}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {field.type}
                                {field.hasKeywordVariant && ' • Has .keyword'}
                                {field.isAnalyzed && ' • Analyzed'}
                              </Typography>
                            </Box>
                          </li>
                        )}
                      />
                    </Grid>

                    {/* Operator Selection */}
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small" disabled={!condition.field}>
                        <InputLabel>Operator</InputLabel>
                        <Select
                          value={condition.operator || ''}
                          label="Operator"
                          onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                        >
                          {condition.field && getSuggestedOperators(condition.field).map((op) => (
                            <MenuItem key={op.value} value={op.value}>
                              <Tooltip title={op.description} placement="right">
                                <span>{op.label}</span>
                              </Tooltip>
                            </MenuItem>
                          ))}
                        </Select>
                        {condition.field && (
                          <FormHelperText>
                            {condition.operator && 
                              getSuggestedOperators(condition.field).find(op => op.value === condition.operator)?.description
                            }
                          </FormHelperText>
                        )}
                      </FormControl>
                    </Grid>

                    {/* Value Input */}
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Value"
                        placeholder={
                          condition.operator === 'range' ? 'value1 TO value2' :
                          condition.operator === 'terms' ? 'value1, value2, value3' :
                          condition.operator === 'exists' || condition.operator === 'missing' ? 'Not needed' :
                          'Enter value...'
                        }
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                        disabled={loading || condition.operator === 'exists' || condition.operator === 'missing'}
                        multiline={condition.operator === 'regexp' || condition.operator === 'wildcard'}
                        rows={condition.operator === 'regexp' ? 2 : 1}
                      />
                    </Grid>

                    {/* Remove Button */}
                    <Grid item xs={12} sm={1}>
                      <Tooltip title="Remove condition">
                        <IconButton
                          onClick={() => removeCondition(condition.id)}
                          disabled={conditions.length === 1}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          </Grid>

          {/* Generated Query - Only show when toggled */}
          {showJsonPreview && (
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Generated Query
              </Typography>
              
              {queryError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {queryError}
                </Alert>
              )}

              <Paper variant="outlined" sx={{ p: 2, minHeight: 300 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Elasticsearch Query JSON
                  </Typography>
                  <Tooltip title="Copy query">
                    <IconButton onClick={copyQuery} size="small" disabled={!generatedQuery}>
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <TextField
                  multiline
                  fullWidth
                  value={generatedQuery}
                  InputProps={{
                    readOnly: true,
                    sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
                  }}
                  minRows={12}
                  maxRows={20}
                  variant="outlined"
                />
              </Paper>
            </Grid>
          )}
          
          {/* Query Summary - Always show when there are conditions */}
          {conditions.filter(c => c.field && c.operator && c.value.trim()).length > 0 && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Query Summary
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {conditions
                    .filter(condition => condition.field && condition.operator && condition.value.trim())
                    .map((condition, index) => (
                      <Chip
                        key={condition.id}
                        size="small"
                        label={
                          `${index > 0 ? condition.logicalOperator + ' ' : ''}` +
                          `${condition.field!.fullPath} ${condition.operator} ${condition.value}`
                        }
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default QueryBuilder;