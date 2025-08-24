import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  QueryRequest, 
  QueryResult, 
  QueryValidationResult,
  FieldDefinition,
  Project,
  QueryHistoryItem,
  DirectQueryRequest,
  DirectQueryResponse
} from '@/types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        // Add timestamp
        config.metadata = { startTime: Date.now() };
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful requests in development
        if (process.env.NODE_ENV === 'development') {
          const duration = Date.now() - (response.config.metadata?.startTime || 0);
          console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
        }
        return response;
      },
      (error) => {
        // Log errors
        if (process.env.NODE_ENV === 'development') {
          const duration = Date.now() - (error.config?.metadata?.startTime || 0);
          console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${duration}ms`, error.response?.data);
        }

        // Transform error response
        const apiError = {
          message: error.response?.data?.error?.message || error.message || 'An error occurred',
          code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
          status: error.response?.status || 500,
          details: error.response?.data?.error?.details,
        };

        return Promise.reject(apiError);
      }
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Query API
  async executeQuery(request: QueryRequest): Promise<QueryResult> {
    const response = await this.client.post<ApiResponse<QueryResult>>('/query/execute', request);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Query execution failed');
    }
    return response.data.data;
  }

  async validateQuery(jql: string): Promise<QueryValidationResult> {
    const response = await this.client.post<ApiResponse<QueryValidationResult>>('/query/validate', { jql });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Query validation failed');
    }
    return response.data.data;
  }

  async getQueryHistory(): Promise<QueryHistoryItem[]> {
    const response = await this.client.get<ApiResponse<{ history: QueryHistoryItem[] }>>('/query/history');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get query history');
    }
    return response.data.data.history;
  }

  // Fields API
  async getFields(params?: { index?: string; search?: string; type?: string }): Promise<FieldDefinition[]> {
    const response = await this.client.get<ApiResponse<FieldDefinition[]>>('/fields', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get fields');
    }
    return response.data.data;
  }

  async getFieldsForIndex(index: string): Promise<FieldDefinition[]> {
    const response = await this.client.get<ApiResponse<FieldDefinition[]>>(`/fields/${index}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || `Failed to get fields for index ${index}`);
    }
    return response.data.data;
  }

  // Projects API
  async getProjects(params?: { search?: string; limit?: number }): Promise<Project[]> {
    const response = await this.client.get<ApiResponse<Project[]>>('/projects', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get projects');
    }
    return response.data.data;
  }

  async getProject(id: string): Promise<Project> {
    const response = await this.client.get<ApiResponse<Project>>(`/projects/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || `Failed to get project ${id}`);
    }
    return response.data.data;
  }

  // Direct Query API
  async executeDirectQuery(request: DirectQueryRequest): Promise<DirectQueryResponse> {
    const response = await this.client.post<ApiResponse<DirectQueryResponse>>('/direct-query', request);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Direct query execution failed');
    }
    return response.data.data;
  }

  async getAvailableIndexes(): Promise<string[]> {
    const response = await this.client.get<ApiResponse<string[]>>('/direct-query/indexes');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get available indexes');
    }
    return response.data.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Export individual API modules for cleaner imports
export const queryAPI = {
  execute: (request: QueryRequest) => apiService.executeQuery(request),
  validate: (jql: string) => apiService.validateQuery(jql),
  getHistory: () => apiService.getQueryHistory(),
};

export const fieldsAPI = {
  getAll: (params?: { index?: string; search?: string; type?: string }) => apiService.getFields(params),
  getForIndex: (index: string) => apiService.getFieldsForIndex(index),
};

export const projectsAPI = {
  getAll: (params?: { search?: string; limit?: number }) => apiService.getProjects(params),
  getById: (id: string) => apiService.getProject(id),
};

export const directQueryAPI = {
  execute: (request: DirectQueryRequest) => apiService.executeDirectQuery(request),
  getIndexes: () => apiService.getAvailableIndexes(),
};

export default apiService;