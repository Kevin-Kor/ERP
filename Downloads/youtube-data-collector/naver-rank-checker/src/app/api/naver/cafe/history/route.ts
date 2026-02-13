import { NextResponse } from 'next/server';
import * as tokenStore from '@/lib/token-store';

export async function GET() {
  try {
    const history = await tokenStore.getPostHistory(20);
    return NextResponse.json({ history });
  } catch (error) {
    console.error('History read error:', error);
    return NextResponse.json(
      { error: '발행 이력을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
