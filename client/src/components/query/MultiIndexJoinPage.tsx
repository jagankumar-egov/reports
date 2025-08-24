import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Chip,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  JoinInner as JoinIcon,
  Preview as PreviewIcon,
  PlayArrow as ExecuteIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { useElasticsearchQuery } from '@/hooks/useElasticsearchQuery';
import { useMultiIndexJoin } from '@/hooks/useMultiIndexJoin';
import { JoinConfiguration, FieldInfo } from '@/types';
import { directQueryAPI } from '@/services/api';
import { extractFieldsFromMapping } from '@/utils/mappingUtils';

const MultiIndexJoinPage: React.FC = () => {
  // Use shared hooks for index list
  const query = useElasticsearchQuery({
    onResult: () => {}, // We don't need result handling here
  });

  const join = useMultiIndexJoin();

  // Join configuration state
  const [leftIndex, setLeftIndex] = useState('');
  const [rightIndex, setRightIndex] = useState('');
  const [leftField, setLeftField] = useState('');
  const [rightField, setRightField] = useState('');
  const [joinType, setJoinType] = useState<'inner' | 'left' | 'right' | 'full'>('inner');
  const [from, setFrom] = useState(0);
  const [size, setSize] = useState(50);

  // Field mapping state
  const [leftFields, setLeftFields] = useState<FieldInfo[]>([]);
  const [rightFields, setRightFields] = useState<FieldInfo[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState({ left: false, right: false });

  // Handle join preview
  const handlePreview = useCallback(async () => {
    if (!leftIndex || !rightIndex || !leftField || !rightField) {
      return;
    }
    
    await join.getPreview(leftIndex, rightIndex, leftField, rightField);
  }, [leftIndex, rightIndex, leftField, rightField, join]);

  // Handle join execution
  const handleExecute = useCallback(async () => {
    if (!leftIndex || !rightIndex || !leftField || !rightField) {
      return;
    }

    const joinConfig: JoinConfiguration = {
      leftIndex,
      rightIndex,
      joinField: {
        left: leftField,
        right: rightField
      },
      joinType,
      limit: 1000 // Max records per index for join processing
    };

    const request = {
      joins: [joinConfig],
      from,
      size
    };

    await join.executeJoin(request);
  }, [leftIndex, rightIndex, leftField, rightField, joinType, from, size, join]);

  // Load fields when indices change
  useEffect(() => {
    if (leftIndex) {
      setFieldsLoading(prev => ({ ...prev, left: true }));
      directQueryAPI.getIndexMapping(leftIndex)
        .then(mappingResponse => {
          // Extract the actual mapping from the response
          // The response structure is: { "indexName": { "mappings": { ... } } }
          const indexMapping = mappingResponse[leftIndex];
          if (!indexMapping || !indexMapping.mappings) {
            throw new Error(`Invalid mapping structure for index: ${leftIndex}`);
          }
          
          const fields = extractFieldsFromMapping(indexMapping);
          console.log(`✅ Loaded ${fields.length} fields for left index ${leftIndex}:`, fields.slice(0, 5).map(f => f.fullPath));
          setLeftFields(fields);
        })
        .catch(error => {
          console.error('Failed to load left index fields:', error);
          setLeftFields([]);
        })
        .finally(() => {
          setFieldsLoading(prev => ({ ...prev, left: false }));
        });
    } else {
      setLeftFields([]);
      setLeftField('');
    }
  }, [leftIndex]);

  useEffect(() => {
    if (rightIndex) {
      setFieldsLoading(prev => ({ ...prev, right: true }));
      directQueryAPI.getIndexMapping(rightIndex)
        .then(mappingResponse => {
          // Extract the actual mapping from the response
          // The response structure is: { "indexName": { "mappings": { ... } } }
          const indexMapping = mappingResponse[rightIndex];
          if (!indexMapping || !indexMapping.mappings) {
            throw new Error(`Invalid mapping structure for index: ${rightIndex}`);
          }
          
          const fields = extractFieldsFromMapping(indexMapping);
          console.log(`✅ Loaded ${fields.length} fields for right index ${rightIndex}:`, fields.slice(0, 5).map(f => f.fullPath));
          setRightFields(fields);
        })
        .catch(error => {
          console.error('Failed to load right index fields:', error);
          setRightFields([]);
        })
        .finally(() => {
          setFieldsLoading(prev => ({ ...prev, right: false }));
        });
    } else {
      setRightFields([]);
      setRightField('');
    }
  }, [rightIndex]);

  // Auto-preview when all fields are filled (debounced to prevent excessive requests)
  useEffect(() => {
    if (leftIndex && rightIndex && leftField && rightField) {
      const timeoutId = setTimeout(() => {
        join.getPreview(leftIndex, rightIndex, leftField, rightField);
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [leftIndex, rightIndex, leftField, rightField]);

  const getJoinTypeDescription = (type: string) => {
    switch (type) {
      case 'inner': return 'Only records that have matches in both indices';
      case 'left': return 'All records from left index, with matches from right where available';
      case 'right': return 'All records from right index, with matches from left where available';
      case 'full': return 'All records from both indices, matched where possible';
      default: return '';
    }
  };

  const renderJoinSummary = (summary: any) => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="primary">{summary.leftIndexTotal}</Typography>
          <Typography variant="caption">Left Index Records</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="secondary">{summary.rightIndexTotal}</Typography>
          <Typography variant="caption">Right Index Records</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="success.main">{summary.joinedRecords}</Typography>
          <Typography variant="caption">Matched Records</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="warning.main">
            {summary.leftOnlyRecords + summary.rightOnlyRecords}
          </Typography>
          <Typography variant="caption">Unmatched Records</Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderPreviewTable = (records: any[]) => (
    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Join Key</TableCell>
            <TableCell>Join Type</TableCell>
            <TableCell>Left Record</TableCell>
            <TableCell>Right Record</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record, index) => (
            <TableRow key={index}>
              <TableCell>{record.joinKey || 'N/A'}</TableCell>
              <TableCell>
                <Chip 
                  size="small" 
                  label={record.joinType} 
                  color={record.joinType === 'matched' ? 'success' : 'warning'}
                />
              </TableCell>
              <TableCell>
                {record.leftRecord ? (
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(record.leftRecord, null, 2).substring(0, 100)}...
                  </Typography>
                ) : 'No match'}
              </TableCell>
              <TableCell>
                {record.rightRecord ? (
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(record.rightRecord, null, 2).substring(0, 100)}...
                  </Typography>
                ) : 'No match'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <JoinIcon />
        Multi-Index Join
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Join data from multiple Elasticsearch indices using common attributes to create consolidated results.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Join Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon />
                Join Configuration
              </Typography>
              
              <Grid container spacing={2}>
                {/* Index Selection */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Left Index</InputLabel>
                    <Select
                      value={leftIndex}
                      label="Left Index"
                      onChange={(e) => setLeftIndex(e.target.value)}
                      disabled={query.indexesLoading}
                    >
                      {query.availableIndexes.map((index) => (
                        <MenuItem key={index} value={index}>
                          {index}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Right Index</InputLabel>
                    <Select
                      value={rightIndex}
                      label="Right Index"
                      onChange={(e) => setRightIndex(e.target.value)}
                      disabled={query.indexesLoading}
                    >
                      {query.availableIndexes.map((index) => (
                        <MenuItem key={index} value={index}>
                          {index}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Join Fields */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Left Join Field</InputLabel>
                    <Select
                      value={leftField}
                      label="Left Join Field"
                      onChange={(e) => setLeftField(e.target.value)}
                      disabled={!leftIndex || fieldsLoading.left}
                      onOpen={() => console.log('🔍 Left field dropdown opened. Available fields:', leftFields.length, leftFields.slice(0, 3).map(f => f.fullPath))}
                    >
                      {leftFields.map((field) => (
                        <MenuItem key={field.fullPath} value={field.fullPath}>
                          <Box>
                            <Typography variant="body2">{field.fullPath}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {field.type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldsLoading.left && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        Loading fields...
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Right Join Field</InputLabel>
                    <Select
                      value={rightField}
                      label="Right Join Field"
                      onChange={(e) => setRightField(e.target.value)}
                      disabled={!rightIndex || fieldsLoading.right}
                      onOpen={() => console.log('🔍 Right field dropdown opened. Available fields:', rightFields.length, rightFields.slice(0, 3).map(f => f.fullPath))}
                    >
                      {rightFields.map((field) => (
                        <MenuItem key={field.fullPath} value={field.fullPath}>
                          <Box>
                            <Typography variant="body2">{field.fullPath}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {field.type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldsLoading.right && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        Loading fields...
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* Join Type */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Join Type</InputLabel>
                    <Select
                      value={joinType}
                      label="Join Type"
                      onChange={(e) => setJoinType(e.target.value as any)}
                    >
                      <MenuItem value="inner">Inner Join</MenuItem>
                      <MenuItem value="left">Left Join</MenuItem>
                      <MenuItem value="right">Right Join</MenuItem>
                      <MenuItem value="full">Full Outer Join</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {getJoinTypeDescription(joinType)}
                  </Typography>
                </Grid>

                {/* Pagination */}
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="From (Offset)"
                    value={from}
                    onChange={(e) => setFrom(Math.max(0, parseInt(e.target.value) || 0))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Size (Limit)"
                    value={size}
                    onChange={(e) => setSize(Math.max(1, Math.min(1000, parseInt(e.target.value) || 50)))}
                    inputProps={{ min: 1, max: 1000 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={join.loading ? <CircularProgress size={16} /> : <PreviewIcon />}
                  onClick={handlePreview}
                  disabled={join.loading || !leftIndex || !rightIndex || !leftField || !rightField}
                >
                  {join.loading ? 'Loading...' : 'Preview Join'}
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={join.loading ? <CircularProgress size={16} /> : <ExecuteIcon />}
                  onClick={handleExecute}
                  disabled={join.loading || !leftIndex || !rightIndex || !leftField || !rightField}
                  size="large"
                >
                  {join.loading ? 'Executing...' : 'Execute Join'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={join.clearResults}
                  disabled={join.loading}
                >
                  Clear Results
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Display */}
        {join.error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={join.clearError}>
              {join.error}
            </Alert>
          </Grid>
        )}

        {/* Join Preview */}
        {join.preview && (
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Join Preview & Compatibility</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {renderJoinSummary(join.preview.joinSummary)}
                
                {join.preview.preview.length > 0 ? (
                  <>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Sample Joined Records:
                    </Typography>
                    {renderPreviewTable(join.preview.preview)}
                  </>
                ) : (
                  <Alert severity="warning">
                    No matching records found. Check that your join fields contain compatible values.
                  </Alert>
                )}
                
                {Object.keys(join.preview.sampleJoinKeys).length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Sample Join Key Distribution:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(join.preview.sampleJoinKeys).map(([key, count]) => (
                        <Chip key={key} size="small" label={`${key}: ${count}`} variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Join Results */}
        {join.result && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Join Results ({join.result.totalResults} total, showing {join.result.results.length})
                </Typography>
                
                {renderJoinSummary(join.result.joinSummary)}
                
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Joined Data:
                </Typography>
                
                {join.result.results.length > 0 ? (
                  renderPreviewTable(join.result.results)
                ) : (
                  <Alert severity="info">
                    No results found for the specified join criteria.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default MultiIndexJoinPage;