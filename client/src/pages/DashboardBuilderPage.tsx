import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  Autocomplete,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useQuery, useMutation } from 'react-query';
import { dashboardsAPI, dataPointsAPI } from '../services/api';

function DashboardBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    layout: {
      type: 'grid',
      cols: 12,
      rowHeight: 110,
    },
    widgets: [] as any[],
    tags: [] as string[],
  });

  const { data: dataPoints } = useQuery('dataPoints', async () => {
    const response = await dataPointsAPI.list();
    return response.data;
  });

  const { data: existingDashboard } = useQuery(
    ['dashboard', id],
    async () => {
      const response = await dashboardsAPI.get(id!);
      return response.data;
    },
    {
      enabled: isEdit,
      onSuccess: (data) => {
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          layout: data.layout,
          widgets: data.widgets || [],
          tags: data.tags || [],
        });
      },
    }
  );

  const saveMutation = useMutation(
    async () => {
      if (isEdit) {
        return dashboardsAPI.update(id!, formData);
      } else {
        return dashboardsAPI.create(formData);
      }
    },
    {
      onSuccess: () => {
        navigate('/dashboards');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addWidget = () => {
    const newWidget = {
      id: `widget-${Date.now()}`,
      type: 'bar',
      title: 'New Widget',
      dataPointId: '',
      position: {
        x: 0,
        y: 0,
        w: 6,
        h: 3,
      },
    };
    setFormData(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));
  };

  const updateWidget = (widgetId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, [field]: value } : w
      ),
    }));
  };

  const removeWidget = (widgetId: string) => {
    setFormData(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
    }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEdit ? 'Edit Dashboard' : 'Create Dashboard'}
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                fullWidth
                required
                disabled={isEdit}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={formData.tags}
                onChange={(_, value) => handleChange('tags', value)}
                renderInput={(params) => (
                  <TextField {...params} label="Tags" />
                )}
              />
            </Grid>
          </Grid>

          <Box mt={4}>
            <Typography variant="h6" gutterBottom>
              Widgets
            </Typography>
            <Button variant="outlined" onClick={addWidget} sx={{ mb: 2 }}>
              Add Widget
            </Button>

            {formData.widgets.map((widget) => (
              <Paper key={widget.id} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Title"
                      value={widget.title}
                      onChange={(e) => updateWidget(widget.id, 'title', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={widget.type}
                        label="Type"
                        onChange={(e) => updateWidget(widget.id, 'type', e.target.value)}
                      >
                        <MenuItem value="bar">Bar Chart</MenuItem>
                        <MenuItem value="line">Line Chart</MenuItem>
                        <MenuItem value="area">Area Chart</MenuItem>
                        <MenuItem value="pie">Pie Chart</MenuItem>
                        <MenuItem value="table">Table</MenuItem>
                        <MenuItem value="kpi">KPI</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Data Point</InputLabel>
                      <Select
                        value={widget.dataPointId}
                        label="Data Point"
                        onChange={(e) => updateWidget(widget.id, 'dataPointId', e.target.value)}
                      >
                        {dataPoints?.map((dp: any) => (
                          <MenuItem key={dp.slug} value={dp.slug}>
                            {dp.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => removeWidget(widget.id)}
                    >
                      Remove
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>

          {saveMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to save dashboard. Please try again.
            </Alert>
          )}

          <Box mt={3} display="flex" gap={2}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saveMutation.isLoading}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => navigate('/dashboards')}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default DashboardBuilderPage;