import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { FieldsState, FieldDefinition } from '@/types';
import { fieldsAPI } from '@/services/api';

const initialState: FieldsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// Async thunks
export const loadFields = createAsyncThunk(
  'fields/loadAll',
  async (params?: { index?: string; search?: string; type?: string }, { rejectWithValue }) => {
    try {
      const fields = await fieldsAPI.getAll(params);
      return fields;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load fields');
    }
  }
);

export const loadFieldsForIndex = createAsyncThunk(
  'fields/loadForIndex',
  async (index: string, { rejectWithValue }) => {
    try {
      const fields = await fieldsAPI.getForIndex(index);
      return fields;
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to load fields for index ${index}`);
    }
  }
);

const fieldsSlice = createSlice({
  name: 'fields',
  initialState,
  reducers: {
    clearFields: (state) => {
      state.items = [];
      state.error = null;
      state.lastFetched = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load all fields
    builder
      .addCase(loadFields.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadFields.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(loadFields.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Load fields for specific index
    builder
      .addCase(loadFieldsForIndex.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadFieldsForIndex.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(loadFieldsForIndex.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearFields, clearError } = fieldsSlice.actions;

export default fieldsSlice.reducer;