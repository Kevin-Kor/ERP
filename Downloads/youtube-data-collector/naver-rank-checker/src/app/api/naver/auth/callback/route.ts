import { NextRequest, NextResponse } from 'next/server';
import { validateState, exchangeCodeForToken } from '@/lib/naver-auth';
import * as tokenStore from '@/lib/token-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user denial
    if (error) {
      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(
        `${baseUrl}/cafe?auth=denied&error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(
        `${baseUrl}/cafe?auth=error&error=${encodeURIComponent('인증 코드 또는 상태값이 누락되었습니다.')}`
      );
    }

    // Validate CSRF state
    if (!validateState(state)) {
      const baseUrl = request.nextUrl.origin;
      return NextResponse.redirect(
        `${baseUrl}/cafe?auth=error&error=${encodeURIComponent('인증 상태값이 유효하지 않습니다. 다시 시도해주세요.')}`
      );
    }

    // Exchange code for token
    const token = await exchangeCodeForToken(code, state);

    // Store encrypted token
    await tokenStore.setNaverAuth(token);

    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/cafe?auth=success`);
  } catch (error) {
    console.error('Naver OAuth callback error:', error);
    const message =
      error instanceof Error ? error.message : '인증 처리 중 오류가 발생했습니다.';
    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(
      `${baseUrl}/cafe?auth=error&error=${encodeURIComponent(message)}`
    );
  }
}
