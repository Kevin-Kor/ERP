import { NextRequest, NextResponse } from 'next/server';
import * as tokenStore from '@/lib/token-store';
import { isTokenExpired, refreshAccessToken } from '@/lib/naver-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const forceRefresh = body.forceRefresh === true;

    const auth = await tokenStore.getNaverAuth();

    if (!auth) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    const needsRefresh = isTokenExpired(auth);

    if (needsRefresh || forceRefresh) {
      try {
        const refreshed = await refreshAccessToken(auth.refreshToken);
        await tokenStore.setNaverAuth(refreshed);
        return NextResponse.json({
          authenticated: true,
          expiresAt: refreshed.expiresAt,
          needsRefresh: false,
        });
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, clear the stored token
        await tokenStore.clearNaverAuth();
        return NextResponse.json({
          authenticated: false,
          error: '토큰 갱신에 실패했습니다. 다시 로그인해주세요.',
        });
      }
    }

    return NextResponse.json({
      authenticated: true,
      expiresAt: auth.expiresAt,
      needsRefresh: false,
    });
  } catch (error) {
    console.error('Token status check error:', error);
    return NextResponse.json(
      { error: '토큰 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
