'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { YouTubeSearchFormData } from '@/lib/validations';
import { EnrichedYouTubeVideo, YouTubeSearchResponse } from '@/types/youtube';

interface SearchVideosResponse {
  videos: EnrichedYouTubeVideo[];
  totalCount: number;
}

interface UseYouTubeSearchOptions {
  apiKey?: string;
}

export function useYouTubeSearch(options: UseYouTubeSearchOptions = {}) {
  const [results, setResults] = useState<EnrichedYouTubeVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: async (searchData: YouTubeSearchFormData): Promise<SearchVideosResponse> => {
      setError(null);

      const requestData = {
        ...searchData,
        apiKey: options.apiKey, // API 키 포함
      };

      const searchResponse = await axios.post<YouTubeSearchResponse>('/api/youtube/search', requestData);
      
      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return { videos: [], totalCount: 0 };
      }

      const videoIds = searchResponse.data.items
        .map(item => item.id.videoId)
        .filter(Boolean) as string[];

      if (videoIds.length === 0) {
        return { videos: [], totalCount: 0 };
      }

      const videosResponse = await axios.post<SearchVideosResponse>('/api/youtube/videos', {
        videoIds,
        apiKey: options.apiKey, // API 키 포함
      });

      return videosResponse.data;
    },
    onSuccess: (data) => {
      setResults(data.videos);
      setError(null);
      
      queryClient.setQueryData(['youtube-search-results'], data.videos);
    },
    onError: (error) => {
      console.error('YouTube search error:', error);
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message;
        setError(errorMessage);
      } else {
        setError('검색 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
      
      setResults(null);
    },
  });

  return {
    searchVideos: searchMutation.mutate,
    isLoading: searchMutation.isPending,
    error,
    results,
    isSuccess: searchMutation.isSuccess,
    isError: searchMutation.isError,
    reset: () => {
      searchMutation.reset();
      setResults(null);
      setError(null);
    },
  };
}