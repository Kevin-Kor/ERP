'use client';

import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { EnrichedYouTubeVideo } from '@/types/youtube';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ExportButtonProps {
  results: EnrichedYouTubeVideo[];
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  format?: 'csv' | 'json';
}

export function ExportButton({ 
  results, 
  disabled = false, 
  variant = 'outline',
  size = 'sm',
  format: exportFormat = 'csv'
}: ExportButtonProps) {
  const handleExport = () => {
    if (!results || results.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    if (exportFormat === 'csv') {
      exportToCSV();
    } else {
      exportToJSON();
    }
  };

  const exportToCSV = () => {
    const csvHeaders = [
      '순서',
      '제목',
      '채널명',
      '조회수',
      '좋아요',
      '댓글수',
      '동영상 길이',
      '업로드일',
      '썸네일 URL',
      '동영상 URL',
      '채널 URL',
      '설명'
    ];

    const csvData = results.map((video, index) => [
      (index + 1).toString(),
      `"${video.snippet.title.replace(/"/g, '""')}"`,
      `"${video.snippet.channelTitle.replace(/"/g, '""')}"`,
      video.formattedViewCount || '0',
      video.formattedLikeCount || 'N/A',
      video.formattedCommentCount || 'N/A',
      video.formattedDuration || 'N/A',
      video.formattedPublishedAt || 'N/A',
      video.thumbnailUrl || '',
      video.videoUrl,
      video.channelUrl || '',
      `"${(video.snippet.description || '').substring(0, 200).replace(/"/g, '""')}"` // 설명 200자 제한
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm', { locale: ko });
    link.download = `youtube-data-${timestamp}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const jsonData = {
      exportDate: new Date().toISOString(),
      totalResults: results.length,
      data: results.map((video, index) => ({
        순서: index + 1,
        제목: video.snippet.title,
        채널명: video.snippet.channelTitle,
        조회수: {
          원본: video.statistics?.viewCount,
          포맷: video.formattedViewCount
        },
        좋아요: {
          원본: video.statistics?.likeCount,
          포맷: video.formattedLikeCount
        },
        댓글수: {
          원본: video.statistics?.commentCount,
          포맷: video.formattedCommentCount
        },
        동영상길이: {
          원본: video.contentDetails?.duration,
          포맷: video.formattedDuration
        },
        업로드일: {
          원본: video.snippet.publishedAt,
          포맷: video.formattedPublishedAt
        },
        썸네일URL: video.thumbnailUrl,
        동영상URL: video.videoUrl,
        채널URL: video.channelUrl,
        설명: video.snippet.description,
        카테고리ID: video.snippet.categoryId,
        태그: video.snippet.tags || [],
        기본언어: video.snippet.defaultLanguage,
        쇼츠여부: video.isShort
      }))
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm', { locale: ko });
    link.download = `youtube-data-${timestamp}.json`;
    link.click();
  };

  const getIcon = () => {
    if (exportFormat === 'csv') {
      return <FileSpreadsheet className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getButtonText = () => {
    const formatText = exportFormat === 'csv' ? 'CSV' : 'JSON';
    return `${formatText} 내보내기`;
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || !results || results.length === 0}
      variant={variant}
      size={size}
      className="flex items-center gap-2"
    >
      {getIcon()}
      {getButtonText()}
      {results && results.length > 0 && (
        <span className="text-xs opacity-75">({results.length}개)</span>
      )}
    </Button>
  );
}