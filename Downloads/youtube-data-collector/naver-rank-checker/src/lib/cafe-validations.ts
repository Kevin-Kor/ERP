import { z } from 'zod';

// Cafe Profile Configuration Schema
export const cafeConfigSchema = z.object({
  clubId: z.string()
    .min(1, '카페 Club ID를 입력해주세요')
    .regex(/^\d+$/, 'Club ID는 숫자만 입력 가능합니다'),

  cafeName: z.string()
    .min(1, '카페 이름을 입력해주세요')
    .max(100, '카페 이름은 100자 이내로 입력해주세요'),

  defaultMenuId: z.string()
    .min(1, '기본 게시판 ID를 입력해주세요')
    .regex(/^\d+$/, '게시판 ID는 숫자만 입력 가능합니다'),

  dailyCap: z.coerce.number()
    .min(1, '최소 1회 이상이어야 합니다')
    .max(20, '최대 20회까지 설정 가능합니다')
    .default(5),
});

export type CafeConfigFormData = z.infer<typeof cafeConfigSchema>;
export type CafeConfigFormInput = z.input<typeof cafeConfigSchema>;

// Cafe Write Schema
export const cafeWriteSchema = z.object({
  subject: z.string()
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자 이내로 입력해주세요'),

  content: z.string()
    .min(10, '본문은 최소 10자 이상이어야 합니다')
    .max(50000, '본문은 50000자 이내로 입력해주세요'),

  menuId: z.string()
    .regex(/^\d+$/, '게시판 ID는 숫자만 입력 가능합니다')
    .optional(),

  openyn: z.boolean().default(true),
  searchopen: z.boolean().default(true),
});

export type CafeWriteFormData = z.infer<typeof cafeWriteSchema>;

// Content Generation Schema
export const contentGenerateSchema = z.object({
  topic: z.string()
    .min(2, '주제를 2자 이상 입력해주세요')
    .max(200, '주제는 200자 이내로 입력해주세요'),

  keywords: z.array(
    z.string().min(1, '키워드를 입력해주세요')
  )
    .min(1, '최소 1개의 키워드가 필요합니다')
    .max(5, '최대 5개까지 입력 가능합니다'),

  tone: z.enum(['informational', 'conversational', 'promotional', 'review'])
    .default('informational'),

  lengthPreference: z.enum(['short', 'medium', 'long'])
    .default('medium'),

  additionalInstructions: z.string()
    .max(500, '추가 지시사항은 500자 이내로 입력해주세요')
    .optional(),
});

export type ContentGenerateFormData = z.infer<typeof contentGenerateSchema>;
export type ContentGenerateFormInput = z.input<typeof contentGenerateSchema>;

// Options for select dropdowns
export const toneOptions = [
  { value: 'informational', label: '정보성' },
  { value: 'conversational', label: '대화체' },
  { value: 'promotional', label: '홍보' },
  { value: 'review', label: '리뷰' },
] as const;

export const lengthOptions = [
  { value: 'short', label: '짧게 (~300자)' },
  { value: 'medium', label: '보통 (~800자)' },
  { value: 'long', label: '길게 (~1500자)' },
] as const;
