import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import { useSnackbar } from 'notistack';

import { useAppSelector, useAppDispatch } from '@/store';
import { removeNotification } from '@/store/slices/uiSlice';

// Layout components
import AppBar from '@/components/layout/AppBar';
import Sidebar from '@/components/layout/Sidebar';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Page components
import DirectQueryPage from '@/pages/DirectQueryPage';
import DirectQueryPage2 from '@/pages/DirectQueryPage2';
import AutoQueryPage from '@/pages/AutoQueryPage';
import QueryBuilderPage from '@/pages/QueryBuilderPage';
import MultiIndexJoinPage from '@/pages/MultiIndexJoinPage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  
  const { sidebarOpen, notifications, loading } = useAppSelector((state) => state.ui);

  // Phase 1: No initial data loading needed for direct query

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
            {/* Default route - redirect to direct query */}
            <Route path="/" element={<Navigate to="/direct-query" replace />} />
            
            {/* Phase 1: Direct Elasticsearch Query */}
            <Route path="/direct-query" element={<DirectQueryPage />} />
            <Route path="/direct-query-2" element={<DirectQueryPage2 />} />
            
            {/* Auto Query with URL Parameters */}
            <Route path="/auto-query" element={<AutoQueryPage />} />
            
            {/* Visual Query Builder */}
            <Route path="/query-builder" element={<QueryBuilderPage />} />
            
            {/* Multi-Index Join */}
            <Route path="/multi-index-join" element={<MultiIndexJoinPage />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/direct-query" replace />} />
          </Routes>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default App;