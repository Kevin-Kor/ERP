import axios from 'axios';
import { ensureValidToken } from '@/lib/naver-auth';
import type { NaverCafeWriteResponse, NaverCafeApiError } from '@/types/naver';

const NAVER_CAFE_API = 'https://openapi.naver.com/v1/cafe';

// HTML tag allowlist for Naver Cafe
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u',
  'h3', 'h4', 'ul', 'ol', 'li', 'a', 'blockquote',
]);

export function sanitizeContent(html: string): string {
  // Remove dangerous tags completely (script, style, iframe, etc.)
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove disallowed tags but keep their content
  sanitized = sanitized.replace(/<\/?(\w+)(\s[^>]*)?>/g, (match, tag) => {
    const lower = tag.toLowerCase();
    if (ALLOWED_TAGS.has(lower)) {
      return match;
    }
    return '';
  });

  return sanitized.trim();
}

interface PublishParams {
  clubId: string;
  menuId: string;
  subject: string;
  content: string;
  openyn?: boolean;
  searchopen?: boolean;
}

export async function publishArticle(
  params: PublishParams
): Promise<{ articleId: number; articleUrl: string }> {
  const accessToken = await ensureValidToken();

  const { clubId, menuId, subject, content, openyn = true, searchopen = true } = params;

  const sanitizedContent = sanitizeContent(content);

  const formData = new URLSearchParams();
  formData.append('subject', subject);
  formData.append('content', sanitizedContent);
  formData.append('openyn', String(openyn));
  formData.append('searchopen', String(searchopen));

  try {
    const response = await axios.post<NaverCafeWriteResponse>(
      `${NAVER_CAFE_API}/${clubId}/menu/${menuId}/articles`,
      formData.toString(),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    const { articleId, articleUrl } = response.data.message.result;

    return { articleId, articleUrl };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const cafeError = error.response.data as NaverCafeApiError;
      const status = error.response.status;

      if (status === 401) {
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      if (status === 403) {
        throw new Error('카페 글쓰기 권한이 없습니다. 카페 가입 여부와 API 권한을 확인해주세요.');
      }
      if (status === 429) {
        throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
      }

      throw new Error(
        cafeError.errorMessage ||
          `카페 API 오류 (${cafeError.errorCode || status})`
      );
    }

    throw error;
  }
}
