import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { theme } from './theme';
import Layout from './components/Layout';
import DashboardsPage from './pages/DashboardsPage';
import DataPointsPage from './pages/DataPointsPage';
import DashboardViewerPage from './pages/DashboardViewerPage';
import DataPointViewerPage from './pages/DataPointViewerPage';
import DataPointBuilderPage from './pages/DataPointBuilderPage';
import DashboardBuilderPage from './pages/DashboardBuilderPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const USER_ROLE = import.meta.env.VITE_USER_ROLE || 'reports-viewer';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <CssBaseline />
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboards" replace />} />
                <Route path="/dashboards" element={<DashboardsPage />} />
                <Route path="/dashboards/:id" element={<DashboardViewerPage />} />
                {USER_ROLE === 'reports-admin' && (
                  <>
                    <Route path="/dashboards/new" element={<DashboardBuilderPage />} />
                    <Route path="/dashboards/:id/edit" element={<DashboardBuilderPage />} />
                    <Route path="/datapoints" element={<DataPointsPage />} />
                    <Route path="/datapoints/:id/view" element={<DataPointViewerPage />} />
                    <Route path="/datapoints/new" element={<DataPointBuilderPage />} />
                    <Route path="/datapoints/:id/edit" element={<DataPointBuilderPage />} />
                  </>
                )}
              </Routes>
            </Layout>
          </Router>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;