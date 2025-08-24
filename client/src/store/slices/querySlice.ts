import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  QueryState, 
  QueryRequest, 
  QueryResult, 
  QueryValidationResult,
  QueryHistoryItem 
} from '@/types';
import { queryAPI } from '@/services/api';

const initialState: QueryState = {
  jql: '',
  result: null,
  loading: false,
  error: null,
  history: [],
  validation: null,
};

// Async thunks
export const executeQuery = createAsyncThunk(
  'query/execute',
  async (request: QueryRequest, { rejectWithValue }) => {
    try {
      const result = await queryAPI.execute(request);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to execute query');
    }
  }
);

export const validateQuery = createAsyncThunk(
  'query/validate',
  async (jql: string, { rejectWithValue }) => {
    try {
      const result = await queryAPI.validate(jql);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to validate query');
    }
  }
);

export const loadQueryHistory = createAsyncThunk(
  'query/loadHistory',
  async (_, { rejectWithValue }) => {
    try {
      const history = await queryAPI.getHistory();
      return history;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load query history');
    }
  }
);

const querySlice = createSlice({
  name: 'query',
  initialState,
  reducers: {
    setJQL: (state, action: PayloadAction<string>) => {
      state.jql = action.payload;
      // Clear validation when JQL changes
      if (state.validation) {
        state.validation = null;
      }
    },
    clearResult: (state) => {
      state.result = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    addToHistory: (state, action: PayloadAction<QueryHistoryItem>) => {
      // Add to beginning of history and limit to 50 items
      state.history = [action.payload, ...state.history.slice(0, 49)];
    },
    clearHistory: (state) => {
      state.history = [];
    },
    clearValidation: (state) => {
      state.validation = null;
    },
  },
  extraReducers: (builder) => {
    // Execute query
    builder
      .addCase(executeQuery.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(executeQuery.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload;
        state.error = null;
        
        // Add to history
        const historyItem: QueryHistoryItem = {
          id: `query_${Date.now()}`,
          jql: state.jql,
          executedAt: new Date().toISOString(),
          executionTime: action.payload.executionTime,
          resultCount: action.payload.total,
        };
        state.history = [historyItem, ...state.history.slice(0, 49)];
      })
      .addCase(executeQuery.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.result = null;
      });

    // Validate query
    builder
      .addCase(validateQuery.pending, (state) => {
        // Don't show loading for validation
      })
      .addCase(validateQuery.fulfilled, (state, action) => {
        state.validation = action.payload;
      })
      .addCase(validateQuery.rejected, (state, action) => {
        state.validation = {
          isValid: false,
          errors: [{ field: 'jql', message: action.payload as string }],
          warnings: [],
        };
      });

    // Load history
    builder
      .addCase(loadQueryHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      })
      .addCase(loadQueryHistory.rejected, (state, action) => {
        console.error('Failed to load query history:', action.payload);
      });
  },
});

export const {
  setJQL,
  clearResult,
  clearError,
  addToHistory,
  clearHistory,
  clearValidation,
} = querySlice.actions;

export default querySlice.reducer;