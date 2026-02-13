import { NextResponse } from 'next/server';
import * as tokenStore from '@/lib/token-store';
import { revokeToken } from '@/lib/naver-auth';

export async function POST() {
  try {
    const auth = await tokenStore.getNaverAuth();

    if (!auth) {
      return NextResponse.json({
        success: true,
        message: '이미 연결 해제된 상태입니다.',
      });
    }

    try {
      await revokeToken(auth.accessToken);
    } catch (error) {
      // Even if revocation fails on Naver's end, clear local token
      console.warn('Naver token revocation API error (clearing local token):', error);
    }

    await tokenStore.clearNaverAuth();

    return NextResponse.json({
      success: true,
      message: '네이버 계정 연결이 해제되었습니다.',
    });
  } catch (error) {
    console.error('Token revocation error:', error);
    return NextResponse.json(
      { error: '연결 해제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
