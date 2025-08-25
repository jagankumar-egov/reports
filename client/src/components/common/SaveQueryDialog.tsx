import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  // FormControl,
  // InputLabel,
  // Select,
  // MenuItem,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  // Close as CloseIcon,
} from '@mui/icons-material';
import { CreateSavedQueryRequest } from '../../types';

interface SaveQueryDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (request: CreateSavedQueryRequest) => Promise<void>;
  queryType: 'direct' | 'visual' | 'auto';
  targetIndex: string;
  queryData: any;
  defaultName?: string;
  defaultDescription?: string;
  defaultTags?: string[];
}

const SaveQueryDialog: React.FC<SaveQueryDialogProps> = ({
  open,
  onClose,
  onSave,
  queryType,
  targetIndex,
  queryData,
  defaultName = '',
  defaultDescription = '',
  defaultTags = [],
}) => {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription(defaultDescription);
      setTags(defaultTags);
      setNewTag('');
      setError(null);
    }
  }, [open, defaultName, defaultDescription, defaultTags]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && newTag.trim()) {
      event.preventDefault();
      handleAddTag();
    }
  }, [newTag, handleAddTag]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Query name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: CreateSavedQueryRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        queryType,
        targetIndex,
        queryData,
        tags: tags.length > 0 ? tags : undefined,
      };

      await onSave(request);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save query');
    } finally {
      setLoading(false);
    }
  }, [name, description, queryType, targetIndex, queryData, tags, onSave, onClose]);

  const getQueryTypeLabel = (type: string) => {
    switch (type) {
      case 'direct': return 'Direct Query';
      case 'visual': return 'Visual Query Builder';
      case 'auto': return 'Auto Query';
      default: return type;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SaveIcon />
        Save Query
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              label="Query Type"
              value={getQueryTypeLabel(queryType)}
              disabled
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Target Index"
              value={targetIndex}
              disabled
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            label="Query Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a descriptive name for this query"
            required
            error={!name.trim() && error !== null}
            helperText={!name.trim() && error !== null ? 'Query name is required' : ''}
            fullWidth
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of what this query does"
            multiline
            rows={3}
            fullWidth
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Tags
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => handleRemoveTag(tag)}
                />
              ))}
            </Box>

            <TextField
              size="small"
              label="Add Tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type tag name and press Enter"
              fullWidth
              InputProps={{
                endAdornment: (
                  <Button
                    size="small"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    sx={{ ml: 1 }}
                  >
                    Add
                  </Button>
                ),
              }}
            />
          </Box>

          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              This query will be saved to Elasticsearch and can be accessed across all query interfaces.
              You can organize queries using tags and search by name, type, or index.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || !name.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : 'Save Query'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveQueryDialog;