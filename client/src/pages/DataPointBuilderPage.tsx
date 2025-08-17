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
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useQuery, useMutation } from 'react-query';
import { dataPointsAPI, indicesAPI } from '../services/api';

function DataPointBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    source: {
      indices: [] as string[],
      timeField: '',
      defaultTimeRange: 'now-7d',
    },
    projections: [] as string[],
    tags: [] as string[],
  });

  const { data: indices } = useQuery('indices', async () => {
    const response = await indicesAPI.list();
    return response.data.indices;
  });

  const { data: existingDataPoint } = useQuery(
    ['dataPoint', id],
    async () => {
      const response = await dataPointsAPI.get(id!);
      return response.data;
    },
    {
      enabled: isEdit,
      onSuccess: (data) => {
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          source: data.source,
          projections: data.projections || [],
          tags: data.tags || [],
        });
      },
    }
  );

  const saveMutation = useMutation(
    async () => {
      if (isEdit) {
        return dataPointsAPI.update(id!, formData);
      } else {
        return dataPointsAPI.create(formData);
      }
    },
    {
      onSuccess: () => {
        navigate('/datapoints');
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

  const handleSourceChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      source: {
        ...prev.source,
        [field]: value,
      },
    }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEdit ? 'Edit Data Point' : 'Create Data Point'}
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
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={indices || []}
                value={formData.source.indices}
                onChange={(_, value) => handleSourceChange('indices', value)}
                renderInput={(params) => (
                  <TextField {...params} label="Source Indices" required />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option} {...getTagProps({ index })} />
                  ))
                }
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Time Field"
                value={formData.source.timeField}
                onChange={(e) => handleSourceChange('timeField', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Default Time Range"
                value={formData.source.defaultTimeRange}
                onChange={(e) => handleSourceChange('defaultTimeRange', e.target.value)}
                fullWidth
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

          {saveMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to save data point. Please try again.
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
              onClick={() => navigate('/datapoints')}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default DataPointBuilderPage;