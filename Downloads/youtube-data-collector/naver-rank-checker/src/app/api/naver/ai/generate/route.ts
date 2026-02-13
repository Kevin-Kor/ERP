import { NextRequest, NextResponse } from 'next/server';
import { contentGenerateSchema } from '@/lib/cafe-validations';
import { generateContent } from '@/lib/openai-client';

const RATE_LIMIT = 10; // 10 requests per minute for AI generation
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

function sanitizeInput(input: string): string {
  return input.replace(/[<>\"'&]/g, '').trim();
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

    const body = await request.json();
    const parsed = contentGenerateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || '입력값이 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedParams = {
      ...parsed.data,
      topic: sanitizeInput(parsed.data.topic),
      keywords: parsed.data.keywords.map(k => sanitizeInput(k)),
      additionalInstructions: parsed.data.additionalInstructions
        ? sanitizeInput(parsed.data.additionalInstructions)
        : undefined,
    };

    const result = await generateContent(sanitizedParams);

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI content generation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          { error: 'OpenAI API 키가 설정되지 않았습니다.' },
          { status: 500 }
        );
      }
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          { error: 'OpenAI API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: '콘텐츠 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
