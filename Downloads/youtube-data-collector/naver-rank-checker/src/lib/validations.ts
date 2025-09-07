import { z } from 'zod';

export const youtubeSearchSchema = z.object({
  query: z.string()
    .min(1, '검색어를 입력해주세요')
    .max(200, '검색어는 200자 이내로 입력해주세요'),
  
  maxResults: z.coerce.number()
    .min(1, '최소 1개 이상의 결과가 필요합니다')
    .max(100, '최대 100개까지 검색 가능합니다')
    .default(20),
  
  region: z.enum(['all', 'KR', 'US', 'JP', 'GB'])
    .default('all'),
  
  publishedAfter: z.string()
    .optional(),
  
  publishedBefore: z.string()
    .optional(),
  
  videoDuration: z.enum(['any', 'short', 'medium', 'long'])
    .default('any'),
  
  minViewCount: z.coerce.number()
    .min(0, '조회수는 0 이상이어야 합니다')
    .optional()
    .default(0),
  
  videoType: z.enum(['any', 'episode', 'movie'])
    .default('any'),
  
  order: z.enum(['relevance', 'date', 'rating', 'viewCount', 'title'])
    .default('relevance'),

  safeSearch: z.enum(['none', 'moderate', 'strict'])
    .default('moderate'),

  uploadPeriod: z.enum(['all', 'today', 'week', 'month', 'year'])
    .default('all'),
});

export type YouTubeSearchFormData = z.infer<typeof youtubeSearchSchema>;

export const uploadPeriodOptions = [
  { value: 'all', label: '전체' },
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: 'year', label: '올해' },
] as const;

export const regionOptions = [
  { value: 'all', label: '전체 지역' },
  { value: 'KR', label: '대한민국' },
  { value: 'US', label: '미국' },
  { value: 'JP', label: '일본' },
  { value: 'GB', label: '영국' },
] as const;

export const videoDurationOptions = [
  { value: 'any', label: '전체' },
  { value: 'short', label: '4분 미만' },
  { value: 'medium', label: '4-20분' },
  { value: 'long', label: '20분 이상' },
] as const;

export const videoTypeOptions = [
  { value: 'any', label: '전체' },
  { value: 'episode', label: '에피소드' },
  { value: 'movie', label: '영화' },
] as const;

export const orderOptions = [
  { value: 'relevance', label: '관련성' },
  { value: 'date', label: '업로드 날짜' },
  { value: 'rating', label: '평점' },
  { value: 'viewCount', label: '조회수' },
  { value: 'title', label: '제목' },
] as const;

export function getDateRange(period: string): { publishedAfter?: string; publishedBefore?: string } {
  const now = new Date();
  
  switch (period) {
    case 'today': {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return {
        publishedAfter: today.toISOString(),
      };
    }
    
    case 'week': {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return {
        publishedAfter: weekAgo.toISOString(),
      };
    }
    
    case 'month': {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      return {
        publishedAfter: monthAgo.toISOString(),
      };
    }
    
    case 'year': {
      const yearAgo = new Date();
      yearAgo.setFullYear(now.getFullYear() - 1);
      return {
        publishedAfter: yearAgo.toISOString(),
      };
    }
    
    case 'all':
    default:
      return {};
  }
}

// Legacy schema for backward compatibility
export const searchSchema = z.object({
  targetUrl: z
    .string()
    .min(1, '확인할 URL을 입력해주세요.')
    .url('유효한 URL을 입력해주세요.'),
  keywords: z
    .array(z.string().min(1, '키워드를 입력해주세요.'))
    .min(1, '최소 1개의 키워드가 필요합니다.')
    .max(5, '최대 5개까지 입력 가능합니다.')
    .refine(
      (keywords) => keywords.every(keyword => keyword.trim().length > 0),
      {
        message: '모든 키워드를 입력해주세요.'
      }
    )
});

export type SearchFormData = z.infer<typeof searchSchema>;