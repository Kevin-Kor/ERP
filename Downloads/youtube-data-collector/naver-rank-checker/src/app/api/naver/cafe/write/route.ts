import { NextRequest, NextResponse } from 'next/server';
import { cafeWriteSchema } from '@/lib/cafe-validations';
import { publishArticle } from '@/lib/naver-cafe-client';
import * as tokenStore from '@/lib/token-store';
import { randomUUID } from 'crypto';

const RATE_LIMIT = 5; // 5 publish requests per minute
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;

  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    // Validate input
    const body = await request.json();
    const parsed = cafeWriteSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || '입력값이 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    // Check cafe profile
    const profile = await tokenStore.getCafeProfile();
    if (!profile) {
      return NextResponse.json(
        { error: '카페 설정이 필요합니다. 먼저 카페 프로필을 설정해주세요.' },
        { status: 400 }
      );
    }

    // Check daily cap
    const todayCount = await tokenStore.getDailyPostCount();
    if (todayCount >= profile.dailyCap) {
      return NextResponse.json(
        { error: `일일 게시 제한(${profile.dailyCap}회)에 도달했습니다.` },
        { status: 429 }
      );
    }

    const { subject, content, menuId, openyn, searchopen } = parsed.data;
    const targetMenuId = menuId || profile.defaultMenuId;

    // Publish
    const result = await publishArticle({
      clubId: profile.clubId,
      menuId: targetMenuId,
      subject,
      content,
      openyn,
      searchopen,
    });

    // Save to post history
    await tokenStore.addPostHistory({
      id: randomUUID(),
      title: subject,
      menuId: targetMenuId,
      publishedAt: new Date().toISOString(),
      articleUrl: result.articleUrl,
      articleId: result.articleId,
      status: 'published',
      generatedBy: 'ai',
    });

    return NextResponse.json({
      success: true,
      articleId: result.articleId,
      articleUrl: result.articleUrl,
    });
  } catch (error) {
    console.error('Cafe write error:', error);

    const message =
      error instanceof Error ? error.message : '게시글 발행 중 오류가 발생했습니다.';

    // Save failed attempt to history
    try {
      const body = await request.clone().json().catch(() => ({}));
      const profile = await tokenStore.getCafeProfile();
      if (body.subject && profile) {
        await tokenStore.addPostHistory({
          id: randomUUID(),
          title: body.subject || '(제목 없음)',
          menuId: body.menuId || profile.defaultMenuId,
          publishedAt: new Date().toISOString(),
          status: 'failed',
          generatedBy: 'ai',
          error: message,
        });
      }
    } catch {
      // Ignore history save errors
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
