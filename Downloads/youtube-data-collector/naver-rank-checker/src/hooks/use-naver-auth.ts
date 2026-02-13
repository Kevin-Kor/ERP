'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { NaverAuthStatus } from '@/types/naver';

export function useNaverAuth() {
  const [authStatus, setAuthStatus] = useState<NaverAuthStatus>({
    authenticated: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsChecking(true);
      const response = await axios.post<NaverAuthStatus & { error?: string }>(
        '/api/naver/auth/token'
      );
      setAuthStatus({
        authenticated: response.data.authenticated,
        expiresAt: response.data.expiresAt,
        needsRefresh: response.data.needsRefresh,
      });
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setError(null);
      }
    } catch {
      setAuthStatus({ authenticated: false });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post<{ authUrl: string }>('/api/naver/auth/authorize');
      return response.data.authUrl;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || '연결 시작 중 오류가 발생했습니다.');
      } else {
        setError('연결 시작 중 오류가 발생했습니다.');
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/naver/auth/revoke');
      return response.data;
    },
    onSuccess: () => {
      setAuthStatus({ authenticated: false });
      setError(null);
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || '연결 해제 중 오류가 발생했습니다.');
      } else {
        setError('연결 해제 중 오류가 발생했습니다.');
      }
    },
  });

  return {
    authStatus,
    error,
    isChecking,
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    refreshAuth: checkAuth,
  };
}
