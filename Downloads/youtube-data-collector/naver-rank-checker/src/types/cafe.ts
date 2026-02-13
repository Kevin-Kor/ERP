// Cafe Profile & Configuration Types

export interface CafeBoard {
  menuId: string;
  name: string;
  openyn: boolean;
  searchopen: boolean;
}

export interface CafeProfile {
  clubId: string;
  cafeName: string;
  defaultMenuId: string;
  boards: CafeBoard[];
  dailyCap: number;
}

// Post History Types

export type PostStatus = 'published' | 'failed' | 'draft';

export interface PostHistoryEntry {
  id: string;
  title: string;
  menuId: string;
  publishedAt: string; // ISO 8601
  articleUrl?: string;
  articleId?: number;
  status: PostStatus;
  generatedBy: 'ai' | 'manual';
  error?: string;
}

// Content Generation Types

export type ContentTone = 'informational' | 'conversational' | 'promotional' | 'review';
export type ContentLength = 'short' | 'medium' | 'long';

export interface ContentGenerateParams {
  topic: string;
  keywords: string[];
  tone: ContentTone;
  lengthPreference: ContentLength;
  additionalInstructions?: string;
}

export interface GeneratedContent {
  title: string;
  content: string;
  wordCount: number;
  tokensUsed: number;
}

// Store Types

export interface StoreData {
  naverAuth: import('@/types/naver').NaverAuthToken | null;
  cafeProfile: CafeProfile | null;
  postHistory: PostHistoryEntry[];
}
