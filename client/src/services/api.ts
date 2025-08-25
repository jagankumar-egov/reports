import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
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
        (config as any).metadata = { startTime: Date.now() };
        
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
          const duration = Date.now() - ((response.config as any).metadata?.startTime || 0);
          console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
        }
        return response;
      },
      (error) => {
        // Log errors
        if (process.env.NODE_ENV === 'development') {
          const duration = Date.now() - ((error.config as any)?.metadata?.startTime || 0);
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

  async getIndexMapping(indexName: string): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>(`/direct-query/indexes/${indexName}/mapping`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get index mapping');
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

// Export API for Phase 1: Direct Query
export const directQueryAPI = {
  execute: (request: DirectQueryRequest) => apiService.executeDirectQuery(request),
  getIndexes: () => apiService.getAvailableIndexes(),
  getIndexMapping: (indexName: string) => apiService.getIndexMapping(indexName),
};

export default apiService;