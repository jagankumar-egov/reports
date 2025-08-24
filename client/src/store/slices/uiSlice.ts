import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UiState, Notification } from '@/types';

const initialState: UiState = {
  sidebarOpen: false,
  theme: 'light',
  notifications: [],
  loading: {
    global: false,
    query: false,
    fields: false,
    projects: false,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    setQueryLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.query = action.payload;
    },
    setFieldsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.fields = action.payload;
    },
    setProjectsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.projects = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setGlobalLoading,
  setQueryLoading,
  setFieldsLoading,
  setProjectsLoading,
  addNotification,
  removeNotification,
  clearAllNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;