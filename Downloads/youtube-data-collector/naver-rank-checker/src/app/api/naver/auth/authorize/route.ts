import { NextResponse } from 'next/server';
import { generateState, buildAuthUrl } from '@/lib/naver-auth';

export async function POST() {
  try {
    const state = generateState();
    const authUrl = buildAuthUrl(state);

    return NextResponse.json({ authUrl, state });
  } catch (error) {
    console.error('Naver auth URL generation error:', error);
    const message =
      error instanceof Error ? error.message : '인증 URL 생성 중 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
