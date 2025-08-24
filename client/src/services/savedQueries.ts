import { 
  SavedQuery, 
  CreateSavedQueryRequest, 
  UpdateSavedQueryRequest,
  SavedQueriesListResponse,
  ApiResponse 
} from '../types';

const API_BASE_URL = '/api/saved-queries';

export class SavedQueriesService {
  async createSavedQuery(request: CreateSavedQueryRequest): Promise<SavedQuery> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result: ApiResponse<SavedQuery> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create saved query');
    }

    return result.data!;
  }

  async getSavedQuery(queryId: string): Promise<SavedQuery> {
    const response = await fetch(`${API_BASE_URL}/${queryId}`);
    const result: ApiResponse<SavedQuery> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to retrieve saved query');
    }

    return result.data!;
  }

  async getAllSavedQueries(options: {
    queryType?: string;
    targetIndex?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<SavedQueriesListResponse> {
    const searchParams = new URLSearchParams();
    
    if (options.queryType) {
      searchParams.append('queryType', options.queryType);
    }
    
    if (options.targetIndex) {
      searchParams.append('targetIndex', options.targetIndex);
    }
    
    if (options.tags && options.tags.length > 0) {
      searchParams.append('tags', options.tags.join(','));
    }
    
    if (options.limit) {
      searchParams.append('limit', options.limit.toString());
    }
    
    if (options.offset) {
      searchParams.append('offset', options.offset.toString());
    }

    const url = searchParams.toString() ? `${API_BASE_URL}?${searchParams}` : API_BASE_URL;
    const response = await fetch(url);
    const result: ApiResponse<SavedQueriesListResponse> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to list saved queries');
    }

    return result.data!;
  }

  async updateSavedQuery(queryId: string, updates: UpdateSavedQueryRequest): Promise<SavedQuery> {
    const response = await fetch(`${API_BASE_URL}/${queryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const result: ApiResponse<SavedQuery> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update saved query');
    }

    return result.data!;
  }

  async deleteSavedQuery(queryId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/${queryId}`, {
      method: 'DELETE',
    });

    const result: ApiResponse<{ deleted: boolean; queryId: string }> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete saved query');
    }

    return result.data!.deleted;
  }

  async executeAndTrackSavedQuery(queryId: string): Promise<SavedQuery> {
    const response = await fetch(`${API_BASE_URL}/${queryId}/execute`, {
      method: 'POST',
    });

    const result: ApiResponse<{ query: SavedQuery; message: string }> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to execute saved query');
    }

    return result.data!.query;
  }
}

export const savedQueriesService = new SavedQueriesService();