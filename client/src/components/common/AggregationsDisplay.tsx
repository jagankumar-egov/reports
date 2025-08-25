import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  // Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider,
  // Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Assessment as StatsIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  DataObject as DataObjectIcon,
  ContentCopy as CopyIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';

interface AggregationsDisplayProps {
  aggregations: Record<string, any>;
  title?: string;
  defaultExpanded?: boolean;
}

interface AggregationBucket {
  key: any;
  doc_count: number;
  [key: string]: any;
}

interface StatsAggregation {
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
}

const AggregationsDisplay: React.FC<AggregationsDisplayProps> = ({
  aggregations,
  title = 'Aggregations',
  defaultExpanded = true,
}) => {
  const [expandedAggregations, setExpandedAggregations] = useState<Record<string, boolean>>({});

  if (!aggregations || Object.keys(aggregations).length === 0) {
    return null;
  }

  const handleToggleAggregation = (aggName: string) => {
    setExpandedAggregations(prev => ({
      ...prev,
      [aggName]: !prev[aggName]
    }));
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const getAggregationType = (aggregation: any): string => {
    if (aggregation.buckets) {
      if (aggregation.buckets[0]?.key_as_string || aggregation.buckets[0]?.key instanceof Date) {
        return 'date_histogram';
      }
      return 'terms';
    }
    if (aggregation.count !== undefined && aggregation.avg !== undefined) {
      return 'stats';
    }
    if (aggregation.value !== undefined) {
      return 'metric';
    }
    if (aggregation.values) {
      return 'percentiles';
    }
    return 'other';
  };

  const getAggregationIcon = (type: string) => {
    switch (type) {
      case 'terms':
        return <PieChartIcon color="primary" />;
      case 'date_histogram':
        return <TimelineIcon color="primary" />;
      case 'stats':
        return <StatsIcon color="primary" />;
      case 'metric':
        return <BarChartIcon color="primary" />;
      default:
        return <DataObjectIcon color="primary" />;
    }
  };

  const renderTermsAggregation = (_aggName: string, aggregation: any) => {
    const buckets = aggregation.buckets as AggregationBucket[];
    const totalDocs = buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0);

    return (
      <Box>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Total Documents: <strong>{totalDocs.toLocaleString()}</strong>
          </Typography>
          <Chip
            label={`${buckets.length} buckets`}
            size="small"
            variant="outlined"
          />
        </Box>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Key</strong></TableCell>
                <TableCell align="right"><strong>Count</strong></TableCell>
                <TableCell align="right"><strong>Percentage</strong></TableCell>
                {buckets[0] && Object.keys(buckets[0]).filter(key => 
                  !['key', 'doc_count', 'key_as_string'].includes(key)
                ).length > 0 && (
                  <TableCell><strong>Sub-aggregations</strong></TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {buckets.map((bucket, index) => {
                const percentage = totalDocs > 0 ? ((bucket.doc_count / totalDocs) * 100).toFixed(1) : '0';
                const subAggs = Object.keys(bucket).filter(key => 
                  !['key', 'doc_count', 'key_as_string'].includes(key)
                );
                
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {bucket.key_as_string || formatValue(bucket.key)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {bucket.doc_count.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        {percentage}%
                        <Box 
                          sx={{ 
                            width: 40, 
                            height: 6, 
                            bgcolor: 'grey.200', 
                            borderRadius: 1,
                            overflow: 'hidden'
                          }}
                        >
                          <Box 
                            sx={{ 
                              width: `${percentage}%`, 
                              height: '100%', 
                              bgcolor: 'primary.main' 
                            }} 
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    {subAggs.length > 0 && (
                      <TableCell>
                        {subAggs.map(subAgg => (
                          <Chip 
                            key={subAgg} 
                            label={subAgg} 
                            size="small" 
                            sx={{ mr: 0.5 }}
                          />
                        ))}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderStatsAggregation = (_aggName: string, stats: StatsAggregation) => (
    <Box>
      <List dense>
        <ListItem>
          <ListItemText
            primary="Count"
            secondary={stats.count?.toLocaleString() || '-'}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="Sum"
            secondary={stats.sum?.toLocaleString() || '-'}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="Average"
            secondary={stats.avg?.toFixed(2) || '-'}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="Minimum"
            secondary={stats.min?.toLocaleString() || '-'}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="Maximum"
            secondary={stats.max?.toLocaleString() || '-'}
          />
        </ListItem>
      </List>
    </Box>
  );

  const renderMetricAggregation = (_aggName: string, aggregation: any) => (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h4" color="primary.main" gutterBottom>
        {formatValue(aggregation.value)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {_aggName.replace(/_/g, ' ').toUpperCase()}
      </Typography>
    </Box>
  );

  const renderPercentilesAggregation = (_aggName: string, aggregation: any) => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>Percentile</strong></TableCell>
            <TableCell align="right"><strong>Value</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(aggregation.values).map(([percentile, value]) => (
            <TableRow key={percentile}>
              <TableCell>{percentile}%</TableCell>
              <TableCell align="right">{formatValue(value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGenericAggregation = (_aggName: string, aggregation: any) => (
    <Box sx={{ 
      bgcolor: 'grey.50', 
      p: 2, 
      borderRadius: 1, 
      fontFamily: 'monospace', 
      fontSize: '0.875rem',
      position: 'relative'
    }}>
      <IconButton
        size="small"
        sx={{ position: 'absolute', top: 4, right: 4 }}
        onClick={() => copyToClipboard(JSON.stringify(aggregation, null, 2))}
      >
        <CopyIcon fontSize="small" />
      </IconButton>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '300px' }}>
        {JSON.stringify(aggregation, null, 2)}
      </pre>
    </Box>
  );

  const renderAggregationContent = (aggName: string, aggregation: any) => {
    const type = getAggregationType(aggregation);
    
    switch (type) {
      case 'terms':
      case 'date_histogram':
        return renderTermsAggregation(aggName, aggregation);
      case 'stats':
        return renderStatsAggregation(aggName, aggregation);
      case 'metric':
        return renderMetricAggregation(aggName, aggregation);
      case 'percentiles':
        return renderPercentilesAggregation(aggName, aggregation);
      default:
        return renderGenericAggregation(aggName, aggregation);
    }
  };

  const aggregationCount = Object.keys(aggregations).length;

  return (
    <Card elevation={2}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StatsIcon />
            {title}
            <Chip
              label={`${aggregationCount} aggregation${aggregationCount !== 1 ? 's' : ''}`}
              color="primary"
              size="small"
            />
          </Box>
        }
      />
      <CardContent>
        {Object.keys(aggregations).length === 1 ? (
          // Single aggregation - show directly without accordion
          <Box>
            {Object.entries(aggregations).map(([aggName, aggregation]) => {
              const type = getAggregationType(aggregation);
              return (
                <Box key={aggName}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {getAggregationIcon(type)}
                    <Typography variant="h6">
                      {aggName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Typography>
                    <Chip 
                      label={type.replace(/_/g, ' ')} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                  {renderAggregationContent(aggName, aggregation)}
                </Box>
              );
            })}
          </Box>
        ) : (
          // Multiple aggregations - use accordions
          <Box>
            {Object.entries(aggregations).map(([aggName, aggregation]) => {
              const type = getAggregationType(aggregation);
              const isExpanded = expandedAggregations[aggName] ?? defaultExpanded;
              
              return (
                <Accordion 
                  key={aggName}
                  expanded={isExpanded}
                  onChange={() => handleToggleAggregation(aggName)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      {getAggregationIcon(type)}
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                        {aggName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                      <Chip 
                        label={type.replace(/_/g, ' ')} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {renderAggregationContent(aggName, aggregation)}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AggregationsDisplay;