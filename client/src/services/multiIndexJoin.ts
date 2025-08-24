import { 
  MultiIndexJoinRequest, 
  MultiIndexJoinResponse, 
  JoinPreviewResponse,
  ApiResponse 
} from '../types';

const API_BASE_URL = '/api/multi-index-join';

export class MultiIndexJoinService {
  async executeJoin(request: MultiIndexJoinRequest): Promise<MultiIndexJoinResponse> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result: ApiResponse<MultiIndexJoinResponse> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to execute multi-index join');
    }

    return result.data!;
  }

  async getJoinPreview(
    leftIndex: string,
    rightIndex: string,
    leftField: string,
    rightField: string
  ): Promise<JoinPreviewResponse> {
    const searchParams = new URLSearchParams({
      leftIndex,
      rightIndex,
      leftField,
      rightField
    });

    const response = await fetch(`${API_BASE_URL}/preview?${searchParams}`);
    const result: ApiResponse<JoinPreviewResponse> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get join preview');
    }

    return result.data!;
  }
}

export const multiIndexJoinService = new MultiIndexJoinService();