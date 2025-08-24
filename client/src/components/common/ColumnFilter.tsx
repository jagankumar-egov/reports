import React from 'react';
import {
  Box,
  Button,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from '@mui/material';

interface ColumnFilterProps {
  open: boolean;
  anchorEl: HTMLButtonElement | null;
  onClose: () => void;
  availableColumns: string[];
  selectedColumns: string[];
  onColumnToggle: (column: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onReset?: () => void;
  title?: string;
  footerMessage?: string;
}

const ColumnFilter: React.FC<ColumnFilterProps> = ({
  open,
  anchorEl,
  onClose,
  availableColumns,
  selectedColumns,
  onColumnToggle,
  onSelectAll,
  onSelectNone,
  onReset,
  title = 'Select Columns to Display',
  footerMessage = 'Selected columns will be saved for this session',
}) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
    >
      <Box sx={{ p: 2, minWidth: 300, maxWidth: 400 }}>
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={onSelectAll}
          >
            Select All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={onSelectNone}
          >
            Clear All
          </Button>
          {onReset && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={onReset}
            >
              Reset
            </Button>
          )}
        </Box>
        
        <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
          {availableColumns.map((column) => (
            <ListItem key={column} disablePadding>
              <ListItemButton
                onClick={() => onColumnToggle(column)}
                dense
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    checked={selectedColumns.includes(column)}
                    tabIndex={-1}
                    disableRipple
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={column}
                  primaryTypographyProps={{ 
                    fontSize: '0.875rem',
                    fontFamily: column.startsWith('_') ? 'monospace' : 'inherit'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {footerMessage}
        </Typography>
      </Box>
    </Popover>
  );
};

export default ColumnFilter;