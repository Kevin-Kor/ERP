import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { YouTubeSearchResponse, YouTubeApiError } from '@/types/youtube';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || '60', 10);

// Rate limiting store (in production, use Redis or database)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
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
  // XSS 방지: 특수 문자 제거
  return input.replace(/[<>\"'&]/g, '').trim();
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    const { apiKey: clientApiKey, ...searchParams } = requestData;
    
    // 프로덕션에서는 서버사이드 API 키만 사용 (보안 강화)
    const apiKey = process.env.NODE_ENV === 'production' 
      ? process.env.YOUTUBE_API_KEY 
      : (clientApiKey || process.env.YOUTUBE_API_KEY);
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key is not configured' },
        { status: 500 }
      );
    }
    
    if (!searchParams.query || searchParams.query.trim() === '') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // 입력값 검증 및 sanitize
    const sanitizedQuery = sanitizeInput(searchParams.query);
    const maxResults = Math.min(Math.max(1, searchParams.maxResults || 10), 100); // 1-100 제한
    
    if (sanitizedQuery.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      key: apiKey,
      q: sanitizedQuery,
      maxResults: maxResults.toString(),
      safeSearch: searchParams.safeSearch || 'moderate',
      order: searchParams.order || 'relevance',
    } as Record<string, string>);

    // Only add videoType if it's not 'any'
    if (searchParams.videoType && searchParams.videoType !== 'any') {
      params.append('videoType', searchParams.videoType);
    }

    if (searchParams.region && searchParams.region !== 'all') {
      params.append('regionCode', searchParams.region);
    }

    if (searchParams.publishedAfter) {
      params.append('publishedAfter', new Date(searchParams.publishedAfter).toISOString());
    }

    if (searchParams.publishedBefore) {
      params.append('publishedBefore', new Date(searchParams.publishedBefore).toISOString());
    }

    if (searchParams.videoDuration && searchParams.videoDuration !== 'any') {
      params.append('videoDuration', searchParams.videoDuration);
    }

    if (searchParams.videoDefinition && searchParams.videoDefinition !== 'any') {
      params.append('videoDefinition', searchParams.videoDefinition);
    }

    if (searchParams.videoDimension && searchParams.videoDimension !== 'any') {
      params.append('videoDimension', searchParams.videoDimension);
    }

    const url = `${YOUTUBE_API_BASE}/search?${params.toString()}`;
    
    console.log('YouTube Search API URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await axios.get<YouTubeSearchResponse>(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'YouTube-Data-Collector/1.0',
      },
    });

    if (response.status !== 200) {
      console.error('YouTube API Error:', response.status, response.data);
      return NextResponse.json(
        { error: 'Failed to fetch data from YouTube API' },
        { status: response.status }
      );
    }

    let filteredItems = response.data.items;

    if (searchParams.minViewCount && searchParams.minViewCount > 0) {
      const videoIds = filteredItems
        .map(item => item.id.videoId)
        .filter(Boolean)
        .join(',');

      if (videoIds) {
        try {
          const videosParams = new URLSearchParams({
            part: 'statistics',
            id: videoIds,
            key: apiKey,
          });

          const videosResponse = await axios.get(
            `${YOUTUBE_API_BASE}/videos?${videosParams.toString()}`,
            { timeout: 10000 }
          );

          const videoStats = videosResponse.data.items.reduce((acc: Record<string, number>, video: { id: string; statistics: { viewCount?: string } }) => {
            acc[video.id] = parseInt(video.statistics.viewCount || '0', 10);
            return acc;
          }, {});

          filteredItems = filteredItems.filter(item => {
            if (!item.id.videoId) return false;
            const viewCount = videoStats[item.id.videoId] || 0;
            return viewCount >= searchParams.minViewCount!;
          });
        } catch (error) {
          console.warn('Failed to filter by view count:', error);
        }
      }
    }

    const result: YouTubeSearchResponse = {
      ...response.data,
      items: filteredItems,
      pageInfo: {
        ...response.data.pageInfo,
        totalResults: filteredItems.length,
      },
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('YouTube Search API Error:', error);
    
    if (axios.isAxiosError(error)) {
      const youtubeError = error.response?.data as YouTubeApiError | undefined;
      
      if (youtubeError?.error) {
        const { code, message, errors } = youtubeError.error;
        
        let userMessage = message;
        if (code === 403 && errors[0]?.reason === 'quotaExceeded') {
          userMessage = 'YouTube API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
        } else if (code === 403 && errors[0]?.reason === 'keyInvalid') {
          userMessage = 'YouTube API 키가 유효하지 않습니다.';
        } else if (code === 400) {
          userMessage = '잘못된 검색 요청입니다. 검색어를 확인해주세요.';
        }

        return NextResponse.json(
          { 
            error: userMessage,
            details: errors[0]?.message || message
          },
          { status: code === 403 ? 429 : code }
        );
      }
      
      if (error.code === 'ECONNABORTED') {
        return NextResponse.json(
          { error: '요청 시간이 초과되었습니다. 다시 시도해주세요.' },
          { status: 408 }
        );
      }
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}