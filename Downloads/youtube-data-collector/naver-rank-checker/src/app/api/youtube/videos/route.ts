import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { 
  YouTubeVideosResponse, 
  YouTubeChannelsResponse, 
  EnrichedYouTubeVideo,
  YouTubeApiError,
  YouTubeChannel
} from '@/types/youtube';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

function formatDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatNumber(num: string): string {
  const number = parseInt(num, 10);
  if (number >= 1000000000) {
    return `${(number / 1000000000).toFixed(1)}B`;
  } else if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  } else if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }
  return number.toLocaleString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return '1일 전';
  } else if (diffDays < 30) {
    return `${diffDays}일 전`;
  } else if (diffDays < 365) {
    const diffMonths = Math.ceil(diffDays / 30);
    return `${diffMonths}개월 전`;
  } else {
    const diffYears = Math.ceil(diffDays / 365);
    return `${diffYears}년 전`;
  }
}

function isShort(duration: string): boolean {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return false;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds <= 60;
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { apiKey: clientApiKey, videoIds } = requestData;
    
    // 클라이언트에서 제공된 API 키 우선 사용, 없으면 환경 변수 사용
    const apiKey = clientApiKey || process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key is not configured' },
        { status: 500 }
      );
    }

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: 'Video IDs are required' },
        { status: 400 }
      );
    }

    if (videoIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 video IDs allowed per request' },
        { status: 400 }
      );
    }

    const videosParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
      key: apiKey,
    });

    const videosUrl = `${YOUTUBE_API_BASE}/videos?${videosParams.toString()}`;
    console.log('YouTube Videos API URL:', videosUrl.replace(apiKey, 'API_KEY_HIDDEN'));

    const videosResponse = await axios.get<YouTubeVideosResponse>(videosUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'YouTube-Data-Collector/1.0',
      },
    });

    if (videosResponse.status !== 200) {
      console.error('YouTube Videos API Error:', videosResponse.status, videosResponse.data);
      return NextResponse.json(
        { error: 'Failed to fetch video data from YouTube API' },
        { status: videosResponse.status }
      );
    }

    const videos = videosResponse.data.items;
    
    const channelIds = [...new Set(videos.map(video => video.snippet.channelId))];
    let channelData: Record<string, YouTubeChannel> = {};

    if (channelIds.length > 0) {
      try {
        const channelsParams = new URLSearchParams({
          part: 'snippet,statistics',
          id: channelIds.join(','),
          key: apiKey,
        });

        const channelsUrl = `${YOUTUBE_API_BASE}/channels?${channelsParams.toString()}`;
        
        const channelsResponse = await axios.get<YouTubeChannelsResponse>(channelsUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'YouTube-Data-Collector/1.0',
          },
        });

        if (channelsResponse.status === 200) {
          channelData = channelsResponse.data.items.reduce((acc, channel) => {
            acc[channel.id] = channel;
            return acc;
          }, {} as Record<string, YouTubeChannel>);
        }
      } catch (error) {
        console.warn('Failed to fetch channel data:', error);
      }
    }

    const enrichedVideos: EnrichedYouTubeVideo[] = videos.map(video => {
      const channel = channelData[video.snippet.channelId];
      
      return {
        ...video,
        channelInfo: channel,
        formattedDuration: formatDuration(video.contentDetails.duration),
        formattedViewCount: formatNumber(video.statistics.viewCount),
        formattedLikeCount: video.statistics.likeCount 
          ? formatNumber(video.statistics.likeCount) 
          : 'N/A',
        formattedCommentCount: video.statistics.commentCount 
          ? formatNumber(video.statistics.commentCount) 
          : 'N/A',
        formattedPublishedAt: formatDate(video.snippet.publishedAt),
        thumbnailUrl: video.snippet.thumbnails.high?.url || 
                      video.snippet.thumbnails.medium?.url || 
                      video.snippet.thumbnails.default?.url,
        videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
        channelUrl: `https://www.youtube.com/channel/${video.snippet.channelId}`,
        isShort: isShort(video.contentDetails.duration),
      };
    });

    return NextResponse.json({
      videos: enrichedVideos,
      totalCount: enrichedVideos.length,
    });

  } catch (error) {
    console.error('YouTube Videos API Error:', error);
    
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
          userMessage = '잘못된 요청입니다. 동영상 ID를 확인해주세요.';
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