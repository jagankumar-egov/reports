import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Grid,
  Fab,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';
import { dataPointsAPI } from '../services/api';

function DataPointsPage() {
  const navigate = useNavigate();
  
  const { data: dataPoints, isLoading, error } = useQuery(
    'dataPoints',
    async () => {
      const response = await dataPointsAPI.list();
      return response.data;
    }
  );

  const handleRun = (id: string) => {
    navigate(`/datapoints/${id}/view`);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load data points. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Points
      </Typography>
      
      <Grid container spacing={3} mt={2}>
        {dataPoints?.map((dataPoint: any) => (
          <Grid item xs={12} sm={6} md={4} key={dataPoint.slug}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {dataPoint.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {dataPoint.description || 'No description'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Indices:</strong> {dataPoint.source.indices.join(', ')}
                </Typography>
                {dataPoint.source.timeField && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Time Field:</strong> {dataPoint.source.timeField}
                  </Typography>
                )}
                <Box mt={2}>
                  {dataPoint.tags?.map((tag: string) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
                <Typography variant="caption" display="block" mt={2}>
                  Version {dataPoint.version} • Updated {new Date(dataPoint.updatedAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<RunIcon />}
                  onClick={() => handleRun(dataPoint.slug)}
                >
                  Run
                </Button>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/datapoints/${dataPoint.slug}/edit`)}
                >
                  Edit
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => navigate('/datapoints/new')}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}

export default DataPointsPage;