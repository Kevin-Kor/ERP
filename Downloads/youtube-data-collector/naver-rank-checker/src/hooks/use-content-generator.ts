'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { ContentGenerateParams, GeneratedContent } from '@/types/cafe';

export function useContentGenerator() {
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (params: ContentGenerateParams): Promise<GeneratedContent> => {
      setError(null);
      const response = await axios.post<GeneratedContent>('/api/naver/ai/generate', params);
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (error) => {
      console.error('Content generation error:', error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || error.message);
      } else {
        setError('콘텐츠 생성 중 오류가 발생했습니다.');
      }
      setResult(null);
    },
  });

  return {
    generate: generateMutation.mutate,
    isLoading: generateMutation.isPending,
    result,
    error,
    reset: () => {
      generateMutation.reset();
      setResult(null);
      setError(null);
    },
  };
}
