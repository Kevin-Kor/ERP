import { useState, useCallback } from 'react';
import { FormState, SearchRequest } from '@/types/search';
import { searchApiClient } from '@/lib/search-api';

export function useSearchApi() {
  const [state, setState] = useState<FormState>({
    targetUrl: '',
    keywords: [''],
    isLoading: false,
    error: null,
    results: null,
  });

  const searchRank = useCallback(async (data: SearchRequest) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      results: null
    }));

    const response = await searchApiClient.checkRank(data);
    
    if (response.status === 'error') {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: response.message || '검색 중 오류가 발생했습니다.',
        results: null
      }));
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        results: response.results
      }));
    }
  }, []);

  const updateTargetUrl = useCallback((targetUrl: string) => {
    setState(prev => ({ ...prev, targetUrl }));
  }, []);

  const updateKeywords = useCallback((keywords: string[]) => {
    setState(prev => ({ ...prev, keywords }));
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: null,
      error: null
    }));
  }, []);

  return {
    ...state,
    searchRank,
    updateTargetUrl,
    updateKeywords,
    clearResults,
  };
}