'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

interface PublishParams {
  subject: string;
  content: string;
  menuId?: string;
  openyn?: boolean;
  searchopen?: boolean;
}

interface PublishResult {
  success: boolean;
  articleId?: number;
  articleUrl?: string;
}

export function useCafePublish() {
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publishMutation = useMutation({
    mutationFn: async (data: PublishParams): Promise<PublishResult> => {
      setError(null);
      const response = await axios.post<PublishResult>('/api/naver/cafe/write', data);
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (error) => {
      console.error('Publish error:', error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || error.message);
      } else {
        setError('게시글 발행 중 오류가 발생했습니다.');
      }
      setResult(null);
    },
  });

  return {
    publish: publishMutation.mutate,
    isPublishing: publishMutation.isPending,
    result,
    error,
    reset: () => {
      publishMutation.reset();
      setResult(null);
      setError(null);
    },
  };
}
