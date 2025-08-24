import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import { useSnackbar } from 'notistack';

import { useAppSelector, useAppDispatch } from '@/store';
import { removeNotification } from '@/store/slices/uiSlice';
import { loadProjects } from '@/store/slices/projectsSlice';
import { loadFields } from '@/store/slices/fieldsSlice';

// Layout components
import AppBar from '@/components/layout/AppBar';
import Sidebar from '@/components/layout/Sidebar';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Page components
import QueryPage from '@/pages/QueryPage';
import DirectQueryPage from '@/pages/DirectQueryPage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  
  const { sidebarOpen, notifications, loading } = useAppSelector((state) => state.ui);

  // Initialize data on app start
  useEffect(() => {
    // Load initial data
    dispatch(loadProjects());
    dispatch(loadFields());
  }, [dispatch]);

  // Handle notifications
  useEffect(() => {
    notifications.forEach((notification) => {
      enqueueSnackbar(notification.message, {
        key: notification.id,
        variant: notification.type,
        autoHideDuration: notification.autoHide !== false ? 5000 : null,
        action: (key) => (
          <button
            onClick={() => {
              closeSnackbar(key);
              dispatch(removeNotification(notification.id));
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px',
            }}
          >
            ✕
          </button>
        ),
        onExited: () => {
          dispatch(removeNotification(notification.id));
        },
      });
    });
  }, [notifications, enqueueSnackbar, closeSnackbar, dispatch]);

  // Show global loading spinner
  if (loading.global) {
    return <LoadingSpinner message="Loading DHR..." />;
  }

  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <CssBaseline />
        
        {/* App Bar */}
        <AppBar />
        
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} />
        
        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            mt: '64px', // AppBar height
            ml: sidebarOpen ? '240px' : '0px', // Sidebar width
            transition: (theme) =>
              theme.transitions.create(['margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            height: 'calc(100vh - 64px)',
            overflow: 'auto',
            backgroundColor: (theme) => theme.palette.background.default,
          }}
        >
          <Routes>
            {/* Default route - redirect to query */}
            <Route path="/" element={<Navigate to="/query" replace />} />
            
            {/* Phase 1: Query and Data Tables */}
            <Route path="/query" element={<QueryPage />} />
            <Route path="/direct-query" element={<DirectQueryPage />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/query" replace />} />
          </Routes>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default App;