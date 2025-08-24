import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Collapse,
  IconButton,
  Tooltip,
  Typography,
  Divider,
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  Clear as ClearIcon,
  Code as CodeIcon,
  ViewList as VisualIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Help as HelpIcon,
  Storage as IndexIcon,
} from '@mui/icons-material';

import { useAppSelector, useAppDispatch } from '@/store';
import { setJQL, validateQuery } from '@/store/slices/querySlice';
import { FieldDefinition } from '@/types';
import { fieldsAPI } from '@/services/api';
import JQLEditor from './JQLEditor';

interface QueryBuilderProps {
  onExecute: () => void;
}

const QueryBuilder: React.FC<QueryBuilderProps> = ({ onExecute }) => {
  const dispatch = useAppDispatch();
  
  const { jql, loading, validation } = useAppSelector((state) => state.query);
  const { items: availableProjects } = useAppSelector((state) => state.projects);
  
  // Available indexes (using projects as index sources)
  const availableIndexes = availableProjects.map(project => project.key);
  
  const [mode, setMode] = useState<'visual' | 'jql'>('visual');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxResults, setMaxResults] = useState(50);
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [indexFields, setIndexFields] = useState<FieldDefinition[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // Visual query builder state
  const [conditions, setConditions] = useState<Array<{
    field: string;
    operator: string;
    value: string;
    id: string;
  }>>([]);

  const operators = [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: '~', label: 'contains' },
    { value: '!~', label: 'not contains' },
    { value: '>', label: 'greater than' },
    { value: '<', label: 'less than' },
    { value: 'IN', label: 'in' },
    { value: 'NOT IN', label: 'not in' },
    { value: 'IS NULL', label: 'is null' },
    { value: 'IS NOT NULL', label: 'is not null' },
  ];

  // Load fields when index is selected
  useEffect(() => {
    if (selectedIndex) {
      setFieldsLoading(true);
      fieldsAPI.getForIndex(selectedIndex)
        .then(fields => {
          setIndexFields(fields);
        })
        .catch(error => {
          console.error('Failed to load fields for index:', error);
          setIndexFields([]);
        })
        .finally(() => {
          setFieldsLoading(false);
        });
    } else {
      setIndexFields([]);
    }
  }, [selectedIndex]);

  // Generate JQL from visual conditions
  const generateJQL = useCallback(() => {
    let jqlParts: string[] = [];

    // Add project clause
    if (selectedIndex) {
      jqlParts.push(`project = ${selectedIndex}`);
    }

    // Add conditions
    conditions.forEach((condition) => {
      if (condition.field && condition.operator) {
        let conditionStr = '';
        
        if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
          conditionStr = `${condition.field} ${condition.operator}`;
        } else if (condition.value) {
          if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
            // Handle IN operator - split comma-separated values
            const values = condition.value.split(',').map(v => `"${v.trim()}"`).join(', ');
            conditionStr = `${condition.field} ${condition.operator} (${values})`;
          } else {
            conditionStr = `${condition.field} ${condition.operator} "${condition.value}"`;
          }
        }
        
        if (conditionStr) {
          jqlParts.push(conditionStr);
        }
      }
    });

    return jqlParts.join(' AND ');
  }, [selectedIndex, conditions]);

  // Update JQL when visual conditions change
  useEffect(() => {
    if (mode === 'visual') {
      const newJQL = generateJQL();
      if (newJQL !== jql) {
        dispatch(setJQL(newJQL));
      }
    }
  }, [mode, generateJQL, dispatch, jql]);

  // Validate JQL when it changes
  useEffect(() => {
    const validateTimeout = setTimeout(() => {
      if (jql.trim()) {
        dispatch(validateQuery(jql));
      }
    }, 500);

    return () => clearTimeout(validateTimeout);
  }, [jql, dispatch]);

  const handleJQLChange = (value: string) => {
    dispatch(setJQL(value));
  };

  const handleModeChange = (newMode: 'visual' | 'jql') => {
    setMode(newMode);
  };

  const handleClear = () => {
    dispatch(setJQL(''));
    setSelectedIndex('');
    setIndexFields([]);
    setSelectedFields([]);
    setConditions([]);
  };

  const handleIndexChange = (newIndex: string) => {
    setSelectedIndex(newIndex);
    // Clear existing conditions when index changes
    setConditions([]);
    setSelectedFields([]);
  };

  const handleExecute = () => {
    if (jql.trim() && (!validation || validation.isValid)) {
      onExecute();
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        field: '',
        operator: '=',
        value: '',
        id: `condition_${Date.now()}`,
      },
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<typeof conditions[0]>) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const hasValidationErrors = validation && !validation.isValid;
  const canExecute = jql.trim() && !hasValidationErrors && !loading;

  return (
    <Card>
      <CardHeader
        title="Query Builder"
        subheader="Build and execute queries against health data"
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, newMode) => newMode && handleModeChange(newMode)}
              size="small"
            >
              <ToggleButton value="visual">
                <VisualIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="jql">
                <CodeIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
            
            <Tooltip title="Query Help">
              <IconButton size="small">
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      
      <CardContent>
        {/* Visual Query Builder */}
        {mode === 'visual' && (
          <Box sx={{ mb: 3 }}>
            {/* Index Selection */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '2px dashed', borderColor: 'primary.main' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IndexIcon color="primary" />
                <Typography variant="h6" color="primary">
                  Step 1: Select Data Index
                </Typography>
              </Box>
              
              <FormControl fullWidth size="small">
                <InputLabel>Choose Index</InputLabel>
                <Select
                  value={selectedIndex}
                  label="Choose Index"
                  onChange={(e) => handleIndexChange(e.target.value)}
                >
                  {availableIndexes.map((index) => {
                    const project = availableProjects.find(p => p.key === index);
                    return (
                      <MenuItem key={index} value={index}>
                        <Box>
                          <div>{project?.name || index}</div>
                          <div style={{ fontSize: '0.75rem', color: 'gray' }}>
                            {project ? `${project.recordCount.toLocaleString()} records • ${project.fieldCount} fields` : index}
                          </div>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              
              {selectedIndex && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`${indexFields.length} fields available`}
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                  {fieldsLoading && (
                    <Typography variant="body2" color="text.secondary">
                      Loading fields...
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
            
            {selectedIndex && (
              <>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6" color="text.secondary">
                    Step 2: Build Query Conditions
                  </Typography>
                </Box>
              </>
            )}

            {/* Conditions */}
            {selectedIndex && (
              <Box sx={{ mb: 2 }}>
                {conditions.map((condition, index) => (
                  <Box
                    key={condition.id}
                    sx={{
                      display: 'flex',
                      gap: 1,
                      mb: 1,
                      alignItems: 'center',
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    {index > 0 && (
                      <Chip label="AND" size="small" color="primary" variant="outlined" />
                    )}
                    
                    <Autocomplete
                      options={indexFields}
                      getOptionLabel={(option) => option.name}
                      value={indexFields.find((f) => f.name === condition.field) || null}
                      onChange={(_, newValue) =>
                        updateCondition(condition.id, { field: newValue?.name || '' })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Field"
                          size="small"
                          sx={{ minWidth: 200 }}
                          disabled={fieldsLoading}
                        />
                      )}
                      renderOption={(props, option) => (
                        <li {...props}>
                          <Box>
                            <div>{option.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'gray' }}>
                              {option.type} • {option.description}
                            </div>
                          </Box>
                        </li>
                      )}
                    />

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Operator</InputLabel>
                      <Select
                        value={condition.operator}
                        label="Operator"
                        onChange={(e) =>
                          updateCondition(condition.id, { operator: e.target.value })
                        }
                      >
                        {operators.map((op) => (
                          <MenuItem key={op.value} value={op.value}>
                            {op.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {!['IS NULL', 'IS NOT NULL'].includes(condition.operator) && (
                      <TextField
                        label="Value"
                        value={condition.value}
                        onChange={(e) =>
                          updateCondition(condition.id, { value: e.target.value })
                        }
                        size="small"
                        sx={{ minWidth: 150 }}
                        placeholder={
                          ['IN', 'NOT IN'].includes(condition.operator)
                            ? 'value1, value2, value3'
                            : 'Enter value'
                        }
                      />
                    )}

                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeCondition(condition.id)}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}

                <Button
                  variant="outlined"
                  size="small"
                  onClick={addCondition}
                  sx={{ mt: 1 }}
                  disabled={!selectedIndex || fieldsLoading}
                >
                  Add Condition
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* JQL Editor */}
        {mode === 'jql' && (
          <Box sx={{ mb: 3 }}>
            <JQLEditor
              value={jql}
              onChange={handleJQLChange}
              height="200px"
              error={hasValidationErrors || false}
            />
          </Box>
        )}

        {/* Validation Messages */}
        {validation && (
          <Box sx={{ mb: 2 }}>
            {!validation.isValid && (
              <Alert severity="error" sx={{ mb: 1 }}>
                Query validation failed: {validation.errors.map((e) => e.message).join(', ')}
              </Alert>
            )}
            {validation.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                {validation.warnings.join(', ')}
              </Alert>
            )}
          </Box>
        )}

        {/* Advanced Options */}
        <Box sx={{ mb: 2 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowAdvanced(!showAdvanced)}
            endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          >
            Advanced Options
          </Button>
          
          <Collapse in={showAdvanced}>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Max Results"
                type="number"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                size="small"
                sx={{ width: 150 }}
                InputProps={{ inputProps: { min: 1, max: 1000 } }}
              />
              
              <Autocomplete
                multiple
                options={indexFields}
                getOptionLabel={(option) => option.name}
                value={indexFields.filter((f) => selectedFields.includes(f.name))}
                onChange={(_, newValue) => setSelectedFields(newValue.map((f) => f.name))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Fields"
                    placeholder="All fields"
                    size="small"
                    sx={{ minWidth: 300 }}
                    disabled={!selectedIndex || fieldsLoading}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.name}
                      size="small"
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            </Box>
          </Collapse>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClear}
            disabled={!jql.trim()}
          >
            Clear
          </Button>
          
          <Button
            variant="contained"
            startIcon={<ExecuteIcon />}
            onClick={handleExecute}
            disabled={!canExecute}
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default QueryBuilder;