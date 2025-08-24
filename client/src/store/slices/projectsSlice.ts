import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ProjectsState, Project } from '@/types';
import { projectsAPI } from '@/services/api';

const initialState: ProjectsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// Async thunks
export const loadProjects = createAsyncThunk(
  'projects/loadAll',
  async (params?: { search?: string; limit?: number }, { rejectWithValue }) => {
    try {
      const projects = await projectsAPI.getAll(params);
      return projects;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load projects');
    }
  }
);

export const loadProject = createAsyncThunk(
  'projects/loadById',
  async (id: string, { rejectWithValue }) => {
    try {
      const project = await projectsAPI.getById(id);
      return project;
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to load project ${id}`);
    }
  }
);

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearProjects: (state) => {
      state.items = [];
      state.error = null;
      state.lastFetched = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load all projects
    builder
      .addCase(loadProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(loadProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Load specific project
    builder
      .addCase(loadProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProject.fulfilled, (state, action) => {
        state.loading = false;
        // Update or add the project to the list
        const existingIndex = state.items.findIndex(p => p.id === action.payload.id);
        if (existingIndex >= 0) {
          state.items[existingIndex] = action.payload;
        } else {
          state.items.push(action.payload);
        }
        state.error = null;
      })
      .addCase(loadProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProjects, clearError } = projectsSlice.actions;

export default projectsSlice.reducer;