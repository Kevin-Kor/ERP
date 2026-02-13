'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNaverAuth } from '@/hooks/use-naver-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, LogOut, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function NaverAuthStatus() {
  const searchParams = useSearchParams();
  const {
    authStatus,
    error,
    isChecking,
    connect,
    disconnect,
    isConnecting,
    isDisconnecting,
    refreshAuth,
  } = useNaverAuth();

  // Handle OAuth callback result from URL params
  useEffect(() => {
    const authResult = searchParams.get('auth');
    if (authResult === 'success') {
      toast.success('네이버 계정이 연결되었습니다.');
      refreshAuth();
      // Clean URL params
      window.history.replaceState({}, '', '/cafe');
    } else if (authResult === 'error') {
      const errorMsg = searchParams.get('error') || '인증 중 오류가 발생했습니다.';
      toast.error(errorMsg);
      window.history.replaceState({}, '', '/cafe');
    } else if (authResult === 'denied') {
      toast.info('인증이 취소되었습니다.');
      window.history.replaceState({}, '', '/cafe');
    }
  }, [searchParams, refreshAuth]);

  if (isChecking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">네이버 계정 연결</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">네이버 계정 연결</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {authStatus.authenticated ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">연결됨</span>
              {authStatus.expiresAt && (
                <span className="text-sm text-muted-foreground">
                  (만료: {new Date(authStatus.expiresAt).toLocaleTimeString('ko-KR')})
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => disconnect()}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              연결 해제
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              카페 글쓰기를 위해 네이버 계정을 연결해주세요.
            </span>
            <Button
              onClick={() => connect()}
              disabled={isConnecting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              네이버 계정 연결
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
