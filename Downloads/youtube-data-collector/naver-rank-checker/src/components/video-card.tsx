'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EnrichedYouTubeVideo } from '@/types/youtube';
import { 
  ExternalLink, 
  Play, 
  User, 
  Calendar, 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  Clock,
  Share2,
  Bookmark
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface VideoCardProps {
  video: EnrichedYouTubeVideo;
  index?: number;
  showBookmark?: boolean;
  onBookmarkToggle?: (video: EnrichedYouTubeVideo) => void;
  isBookmarked?: boolean;
  compact?: boolean;
}

export function VideoCard({ 
  video, 
  index, 
  showBookmark = false,
  onBookmarkToggle,
  isBookmarked = false,
  compact = false
}: VideoCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.snippet.title,
          text: `${video.snippet.channelTitle}의 동영상을 확인해보세요!`,
          url: video.videoUrl,
        });
      } catch (err) {
        // 공유가 취소되었거나 실패한 경우 클립보드로 대체
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(video.videoUrl);
      // TODO: Toast 알림 표시 (향후 토스트 라이브러리 추가 시)
      alert('링크가 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  const handleBookmarkToggle = () => {
    if (onBookmarkToggle) {
      onBookmarkToggle(video);
    }
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* 썸네일 */}
            <div className="flex-shrink-0">
              <div className="relative w-20 h-12 bg-gray-200 rounded overflow-hidden">
                {video.thumbnailUrl && !imageError && (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.snippet.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                    onError={() => setImageError(true)}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                  <Play className="h-3 w-3 text-white" />
                </div>
              </div>
              {video.isShort && (
                <Badge variant="secondary" className="mt-1 text-xs px-1 py-0">
                  Shorts
                </Badge>
              )}
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 hover:underline"
                >
                  {video.snippet.title}
                </a>
              </h3>
              
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                <User className="h-3 w-3" />
                <span className="truncate">{video.snippet.channelTitle}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {video.formattedViewCount}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {video.formattedDuration}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {index !== undefined && (
              <div className="text-sm font-medium text-gray-500 mb-1">
                #{index + 1}
              </div>
            )}
            <h3 className="font-semibold text-base leading-tight line-clamp-2 mb-2">
              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline"
              >
                {video.snippet.title}
              </a>
            </h3>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <User className="h-4 w-4" />
              <a
                href={video.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline font-medium"
              >
                {video.snippet.channelTitle}
              </a>
            </div>

            {/* 통계 정보 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span className="font-medium">{video.formattedViewCount}</span>
              </div>
              {video.formattedLikeCount !== 'N/A' && (
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{video.formattedLikeCount}</span>
                </div>
              )}
              {video.formattedCommentCount !== 'N/A' && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{video.formattedCommentCount}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{video.formattedDuration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{video.formattedPublishedAt}</span>
              </div>
            </div>

            {/* 설명 */}
            {video.snippet.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {video.snippet.description}
              </p>
            )}

            {/* 배지들 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {video.isShort && (
                <Badge variant="secondary">YouTube Shorts</Badge>
              )}
              {video.snippet.categoryId && (
                <Badge variant="outline">카테고리 ID: {video.snippet.categoryId}</Badge>
              )}
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            {showBookmark && (
              <Button 
                variant={isBookmarked ? "default" : "ghost"} 
                size="sm" 
                onClick={handleBookmarkToggle}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 썸네일 */}
        <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden mb-3">
          {video.thumbnailUrl && !imageError && (
            <Image
              src={video.thumbnailUrl}
              alt={video.snippet.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImageError(true)}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
            <Play className="h-8 w-8 text-white" />
          </div>
          
          {/* 동영상 길이 배지 */}
          {video.formattedDuration && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
              {video.formattedDuration}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}