import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  // Search as SearchIcon,
  FilterList as FilterListIcon,
  Dashboard as DashboardIcon,
  GetApp as ExportIcon,
  Help as HelpIcon,
  Code as CodeIcon,
  Build as BuildIcon,
  JoinInner as JoinInnerIcon,
} from '@mui/icons-material';

interface SidebarProps {
  open: boolean;
}

const DRAWER_WIDTH = 240;

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  available: boolean;
  phase: number;
}

const navItems: NavItem[] = [
  {
    id: 'direct-query',
    label: 'Direct ES Query',
    icon: <CodeIcon />,
    path: '/direct-query',
    available: true,
    phase: 1,
  },
  {
    id: 'direct-query-2',
    label: 'Direct ES Query 2',
    icon: <CodeIcon />,
    path: '/direct-query-2',
    available: true,
    phase: 1,
  },
  {
    id: 'query-builder',
    label: 'Query Builder',
    icon: <BuildIcon />,
    path: '/query-builder',
    available: true,
    phase: 1,
  },
  {
    id: 'multi-index-join',
    label: 'Multi-Index Join',
    icon: <JoinInnerIcon />,
    path: '/multi-index-join',
    available: true,
    phase: 1,
  },
  {
    id: 'filters',
    label: 'Filter Library',
    icon: <FilterListIcon />,
    path: '/filters',
    available: false,
    phase: 2,
  },
  {
    id: 'dashboards',
    label: 'Dashboards',
    icon: <DashboardIcon />,
    path: '/dashboards',
    available: false,
    phase: 3,
  },
  {
    id: 'exports',
    label: 'Export Center',
    icon: <ExportIcon />,
    path: '/exports',
    available: false,
    phase: 4,
  },
  {
    id: 'help',
    label: 'Help & Docs',
    icon: <HelpIcon />,
    path: '/help',
    available: false,
    phase: 5,
  },
];

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string, available: boolean) => {
    if (available) {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getPhaseColor = (phase: number) => {
    switch (phase) {
      case 1: return 'success';
      case 2: return 'warning';
      case 3: return 'info';
      case 4: return 'secondary';
      case 5: return 'default';
      default: return 'default';
    }
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          top: '64px', // Below AppBar
          height: 'calc(100% - 64px)',
          borderRight: (theme) => `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Navigation
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Phase 1: Direct Elasticsearch Query
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ pt: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path, item.available)}
              selected={isActive(item.path) && item.available}
              disabled={!item.available}
              sx={{
                mx: 1,
                borderRadius: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: (theme) => theme.palette.primary.main,
                  color: (theme) => theme.palette.primary.contrastText,
                  '& .MuiListItemIcon-root': {
                    color: (theme) => theme.palette.primary.contrastText,
                  },
                },
                '&.Mui-disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActive(item.path) && item.available 
                    ? 'inherit' 
                    : (theme) => theme.palette.text.secondary,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.875rem',
                    fontWeight: isActive(item.path) && item.available ? 500 : 400,
                  },
                }}
              />
              <Chip
                label={`P${item.phase}`}
                size="small"
                color={item.available ? getPhaseColor(item.phase) as any : 'default'}
                variant={item.available ? 'filled' : 'outlined'}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mt: 2 }} />

      {/* Phase 1 Quick Actions */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Quick Actions
        </Typography>
        <List dense>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => navigate('/direct-query')}
              sx={{ borderRadius: 1, py: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CodeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="New Direct Query"
                sx={{ '& .MuiListItemText-primary': { fontSize: '0.8rem' } }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 'auto', p: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          DHR v1.0.0 - Phase 1
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Digit Health Reports
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;