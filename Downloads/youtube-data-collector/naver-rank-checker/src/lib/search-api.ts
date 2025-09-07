import { SearchRequest, SearchResponse } from '@/types/search';

export class SearchApiClient {
  private baseUrl = 'http://127.0.0.1:5002/api';

  async checkRank(request: SearchRequest): Promise<SearchResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/check-rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          detail: "서버 응답 분석 중 오류 발생" 
        }));
        throw new Error(errorData.error || `서버 오류: ${response.status}`);
      }

      const data = await response.json();
      return {
        results: data.results || [],
        status: 'success'
      };
    } catch (error) {
      console.error('API 호출 중 오류 발생:', error);
      return {
        results: [],
        status: 'error',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      };
    }
  }
}

export const searchApiClient = new SearchApiClient();