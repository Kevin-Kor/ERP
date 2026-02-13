import { NextRequest, NextResponse } from 'next/server';
import * as tokenStore from '@/lib/token-store';
import { cafeConfigSchema } from '@/lib/cafe-validations';

export async function GET() {
  try {
    const profile = await tokenStore.getCafeProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Config read error:', error);
    return NextResponse.json(
      { error: '카페 설정을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = cafeConfigSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || '입력값이 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    const { clubId, cafeName, defaultMenuId, dailyCap } = parsed.data;

    // Get existing profile to preserve boards list
    const existing = await tokenStore.getCafeProfile();

    const profile = {
      clubId,
      cafeName,
      defaultMenuId,
      dailyCap,
      boards: existing?.boards || [
        {
          menuId: defaultMenuId,
          name: '기본 게시판',
          openyn: true,
          searchopen: true,
        },
      ],
    };

    await tokenStore.setCafeProfile(profile);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Config save error:', error);
    return NextResponse.json(
      { error: '카페 설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
