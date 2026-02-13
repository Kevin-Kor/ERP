'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Loader2, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PublishButtonProps {
  title: string;
  content: string;
  disabled?: boolean;
  onPublish: (data: { subject: string; content: string }) => void;
  isPublishing: boolean;
  result: { success: boolean; articleUrl?: string } | null;
  error: string | null;
}

export function PublishButton({
  title,
  content,
  disabled,
  onPublish,
  isPublishing,
  result,
  error,
}: PublishButtonProps) {
  const [open, setOpen] = useState(false);

  const handlePublish = () => {
    onPublish({ subject: title, content });
  };

  // Show success toast when result arrives
  if (result?.success && result.articleUrl) {
    toast.success('게시글이 발행되었습니다!');
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result?.success && result.articleUrl && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="flex items-center gap-2">
            게시글이 발행되었습니다!
            <a
              href={result.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-green-700 underline hover:text-green-800"
            >
              게시글 보기
              <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
            disabled={disabled || !title.trim() || !content.trim() || isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                발행 중...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                카페에 게시하기
              </>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>게시글 발행 확인</DialogTitle>
            <DialogDescription>
              아래 내용으로 네이버 카페에 게시합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground">제목:</p>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground mt-2">
              본문 길이: {content.replace(/<[^>]*>/g, '').length}자
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                handlePublish();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="mr-2 h-4 w-4" />
              발행하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
