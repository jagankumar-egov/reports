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
  Visibility as ViewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { dashboardsAPI } from '../services/api';

const USER_ROLE = import.meta.env.VITE_USER_ROLE || 'reports-viewer';

function DashboardsPage() {
  const navigate = useNavigate();
  
  const { data: dashboards, isLoading, error } = useQuery(
    'dashboards',
    async () => {
      const response = await dashboardsAPI.list();
      return response.data;
    }
  );

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
        Failed to load dashboards. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboards
      </Typography>
      
      <Grid container spacing={3} mt={2}>
        {dashboards?.map((dashboard: any) => (
          <Grid item xs={12} sm={6} md={4} key={dashboard.slug}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {dashboard.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {dashboard.description || 'No description'}
                </Typography>
                <Box mt={2}>
                  {dashboard.tags?.map((tag: string) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
                <Typography variant="caption" display="block" mt={2}>
                  Version {dashboard.version} • Updated {new Date(dashboard.updatedAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => navigate(`/dashboards/${dashboard.slug}`)}
                >
                  View
                </Button>
                {USER_ROLE === 'reports-admin' && (
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/dashboards/${dashboard.slug}/edit`)}
                  >
                    Edit
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {USER_ROLE === 'reports-admin' && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => navigate('/dashboards/new')}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
}

export default DashboardsPage;