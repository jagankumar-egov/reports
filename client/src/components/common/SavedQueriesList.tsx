import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Build as BuildIcon,
  Link as LinkIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
// Simple time formatting utility
const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
};
import { SavedQuery } from '../../types';
import { useSavedQueries } from '../../hooks/useSavedQueries';

interface SavedQueriesListProps {
  open: boolean;
  onClose: () => void;
  onQuerySelect: (query: SavedQuery) => void;
  targetIndex?: string;
  queryType?: 'direct' | 'visual' | 'auto';
}

const SavedQueriesList: React.FC<SavedQueriesListProps> = ({
  open,
  onClose,
  onQuerySelect,
  targetIndex,
  queryType,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterIndex, setFilterIndex] = useState<string>(targetIndex || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; queryId: string } | null>(null);

  const {
    queries,
    loading,
    error,
    pagination,
    loadQueries,
    deleteQuery,
    executeQuery,
    refresh,
    clearError,
  } = useSavedQueries({
    queryType: filterType || queryType,
    targetIndex: filterIndex,
    tags: selectedTags,
    autoLoad: open,
  });

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, queryId: string) => {
    setMenuAnchor({ element: event.currentTarget, queryId });
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleExecuteQuery = useCallback(async (query: SavedQuery) => {
    try {
      await executeQuery(query.id);
      onQuerySelect(query);
      onClose();
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to execute query:', err);
    }
  }, [executeQuery, onQuerySelect, onClose]);

  const handleDeleteQuery = useCallback(async (queryId: string) => {
    if (window.confirm('Are you sure you want to delete this saved query?')) {
      try {
        await deleteQuery(queryId);
        handleMenuClose();
      } catch (err) {
        // Error is handled by the hook
        console.error('Failed to delete query:', err);
      }
    }
  }, [deleteQuery]);

  const filteredQueries = queries.filter(query =>
    query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.metadata.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getQueryTypeIcon = (type: string) => {
    switch (type) {
      case 'direct': return <CodeIcon fontSize="small" />;
      case 'visual': return <BuildIcon fontSize="small" />;
      case 'auto': return <LinkIcon fontSize="small" />;
      default: return <CodeIcon fontSize="small" />;
    }
  };

  const getQueryTypeColor = (type: string) => {
    switch (type) {
      case 'direct': return 'primary';
      case 'visual': return 'secondary';
      case 'auto': return 'success';
      default: return 'default';
    }
  };

  // Get all unique tags from queries for filtering
  const allTags = Array.from(new Set(queries.flatMap(q => q.metadata.tags || [])));

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon />
          Saved Queries
          {pagination && (
            <Typography variant="caption" color="text.secondary">
              ({pagination.total} total)
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={refresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Type"
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="direct">Direct Query</MenuItem>
              <MenuItem value="visual">Visual Query</MenuItem>
              <MenuItem value="auto">Auto Query</MenuItem>
            </Select>
          </FormControl>

          {!targetIndex && (
            <TextField
              size="small"
              placeholder="Filter by index..."
              value={filterIndex}
              onChange={(e) => setFilterIndex(e.target.value)}
              sx={{ minWidth: 150 }}
            />
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        {/* Queries List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading && queries.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredQueries.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {queries.length === 0 ? 'No saved queries found' : 'No queries match your search'}
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredQueries.map((query) => (
                <ListItem
                  key={query.id}
                  divider
                  sx={{
                    '&:hover': { bgcolor: 'grey.50' },
                    cursor: 'pointer',
                  }}
                  onClick={() => handleExecuteQuery(query)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          icon={getQueryTypeIcon(query.queryType)}
                          label={query.queryType}
                          size="small"
                          color={getQueryTypeColor(query.queryType) as any}
                          variant="outlined"
                        />
                        <Typography variant="subtitle1" component="span">
                          {query.name}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {query.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {query.description}
                          </Typography>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Index: {query.targetIndex}
                            </Typography>
                            {query.metadata.executionCount !== undefined && (
                              <Typography variant="caption" color="text.secondary">
                                • Executed {query.metadata.executionCount} times
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                              • Updated {formatTimeAgo(query.metadata.updatedAt)}
                            </Typography>
                          </Box>
                        </Box>

                        {query.metadata.tags && query.metadata.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                            {query.metadata.tags.map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem' }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Tooltip title="Execute Query">
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecuteQuery(query);
                        }}
                        color="primary"
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, query.id);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Load More */}
        {pagination && pagination.hasMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              onClick={() => loadQueries(pagination.offset + pagination.limit)}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </Box>
        )}
      </DialogContent>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const query = queries.find(q => q.id === menuAnchor?.queryId);
          if (query) handleExecuteQuery(query);
        }}>
          <PlayArrowIcon sx={{ mr: 1 }} />
          Execute Query
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleDeleteQuery(menuAnchor!.queryId)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default SavedQueriesList;