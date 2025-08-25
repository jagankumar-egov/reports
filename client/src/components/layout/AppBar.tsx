import React from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';

import { useAppDispatch } from '@/store';
import { toggleSidebar } from '@/store/slices/uiSlice';

const AppBar: React.FC = () => {
  const dispatch = useAppDispatch();
  // const { sidebarOpen } = useAppSelector((state) => state.ui);
  
  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  return (
    <MuiAppBar
      position="fixed"
      elevation={1}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: (theme) => theme.palette.background.paper,
        color: (theme) => theme.palette.text.primary,
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar>
        {/* Menu button */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={handleToggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {/* App title and phase indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="h6" component="h1" sx={{ mr: 2 }}>
            DHR - Digit Health Reports
          </Typography>
          <Chip
            label="Phase 1"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mr: 2 }}
          />
          <Chip
            label="Query & Data Tables"
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Box>

        {/* Right side actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Search icon - placeholder for future implementation */}
          <IconButton
            color="inherit"
            aria-label="search"
            disabled
            sx={{ opacity: 0.5 }}
          >
            <SearchIcon />
          </IconButton>

          {/* Notifications icon - placeholder for future implementation */}
          <IconButton
            color="inherit"
            aria-label="notifications"
            disabled
            sx={{ opacity: 0.5 }}
          >
            <NotificationsIcon />
          </IconButton>

          {/* User account icon - placeholder for future implementation */}
          <IconButton
            color="inherit"
            aria-label="account"
            disabled
            sx={{ opacity: 0.5 }}
          >
            <AccountCircleIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;