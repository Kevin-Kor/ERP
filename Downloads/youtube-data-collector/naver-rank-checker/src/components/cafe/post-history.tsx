'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import type { PostHistoryEntry } from '@/types/cafe';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, ExternalLink, AlertCircle } from 'lucide-react';

export function PostHistory() {
  const [posts, setPosts] = useState<PostHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    try {
      // Reuse the config endpoint to get the store data
      // We'll add a dedicated history endpoint or use the existing store
      const response = await axios.get<{ history: PostHistoryEntry[] }>(
        '/api/naver/cafe/history'
      );
      setPosts(response.data.history || []);
    } catch {
      // No history yet
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            발행 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          발행 이력
        </CardTitle>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            아직 게시된 글이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <StatusBadge status={post.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {new Date(post.publishedAt).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {post.error && (
                      <span className="text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {post.error}
                      </span>
                    )}
                  </div>
                </div>
                {post.articleUrl && (
                  <a
                    href={post.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground ml-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'published':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          발행됨
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="text-xs">
          실패
        </Badge>
      );
    case 'draft':
      return (
        <Badge variant="secondary" className="text-xs">
          임시저장
        </Badge>
      );
    default:
      return null;
  }
}
