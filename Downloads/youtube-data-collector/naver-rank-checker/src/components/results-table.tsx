'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EnrichedYouTubeVideo } from '@/types/youtube';
import { ExternalLink, Play, User, Calendar, Eye, ThumbsUp, MessageSquare, Clock, Download } from 'lucide-react';
import Image from 'next/image';

interface ResultsTableProps {
  results: EnrichedYouTubeVideo[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  if (!results || results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            검색 결과가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleExportCSV = () => {
    const csvHeaders = [
      '제목',
      '채널명',
      '조회수',
      '좋아요',
      '댓글수',
      '동영상 길이',
      '업로드일',
      'URL',
      '채널 URL',
      '썸네일 URL'
    ];

    const csvData = results.map(video => [
      `"${video.snippet.title.replace(/"/g, '""')}"`,
      `"${video.snippet.channelTitle.replace(/"/g, '""')}"`,
      video.formattedViewCount || '0',
      video.formattedLikeCount || 'N/A',
      video.formattedCommentCount || 'N/A',
      video.formattedDuration || 'N/A',
      video.formattedPublishedAt || 'N/A',
      video.videoUrl,
      video.channelUrl || '',
      video.thumbnailUrl || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `youtube-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            YouTube 검색 결과 ({results.length}개)
          </CardTitle>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((video, index) => (
            <div key={video.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  <div className="relative w-32 h-20 bg-gray-200 rounded-md overflow-hidden">
                    {video.thumbnailUrl && (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.snippet.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 120px, 128px"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  {video.isShort && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Shorts
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-2">
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 hover:underline"
                        >
                          {video.snippet.title}
                        </a>
                      </h3>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <User className="h-3 w-3" />
                        <a
                          href={video.channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 hover:underline truncate"
                        >
                          {video.snippet.channelTitle}
                        </a>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {video.formattedViewCount}
                        </div>
                        {video.formattedLikeCount !== 'N/A' && (
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {video.formattedLikeCount}
                          </div>
                        )}
                        {video.formattedCommentCount !== 'N/A' && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {video.formattedCommentCount}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {video.formattedDuration}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {video.formattedPublishedAt}
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>

                  {video.snippet.description && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {video.snippet.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}