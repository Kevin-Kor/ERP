'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Edit3 } from 'lucide-react';

interface ContentPreviewProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  wordCount: number;
  tokensUsed?: number;
}

function sanitizeHtmlForPreview(html: string): string {
  // Remove potentially dangerous tags but keep safe formatting tags
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

export function ContentPreview({
  title,
  content,
  onTitleChange,
  onContentChange,
  wordCount,
  tokensUsed,
}: ContentPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            콘텐츠 미리보기
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{wordCount}자</Badge>
            {tokensUsed !== undefined && tokensUsed > 0 && (
              <Badge variant="outline">{tokensUsed} 토큰</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="preview-title">제목</Label>
          <Input
            id="preview-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-lg font-semibold"
          />
        </div>

        <Tabs defaultValue="edit">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="gap-1">
              <Edit3 className="h-3 w-3" />
              편집
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1">
              <Eye className="h-3 w-3" />
              미리보기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-4">
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              rows={15}
              className="font-mono text-sm"
              placeholder="HTML 콘텐츠..."
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div
              className="prose prose-sm max-w-none rounded-md border p-4 min-h-[300px] bg-white"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtmlForPreview(content),
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
