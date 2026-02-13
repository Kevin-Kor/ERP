'use client';

import { Suspense, useState } from 'react';
import { NaverAuthStatus } from '@/components/cafe/naver-auth-status';
import { CafeProfileConfig } from '@/components/cafe/cafe-profile-config';
import { ContentGeneratorForm } from '@/components/cafe/content-generator-form';
import { ContentPreview } from '@/components/cafe/content-preview';
import { PublishButton } from '@/components/cafe/publish-button';
import { PostHistory } from '@/components/cafe/post-history';
import { useContentGenerator } from '@/hooks/use-content-generator';
import { useCafePublish } from '@/hooks/use-cafe-publish';
import { Separator } from '@/components/ui/separator';
import type { GeneratedContent } from '@/types/cafe';

function CafePageContent() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [hasContent, setHasContent] = useState(false);

  const {
    generate,
    isLoading: isGenerating,
    error: generateError,
  } = useContentGenerator();

  const {
    publish,
    isPublishing,
    result: publishResult,
    error: publishError,
  } = useCafePublish();

  const handleGenerated = (result: GeneratedContent) => {
    setTitle(result.title);
    setContent(result.content);
    setWordCount(result.wordCount);
    setTokensUsed(result.tokensUsed);
    setHasContent(true);
  };

  const handlePublish = (data: { subject: string; content: string }) => {
    publish(data);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">네이버 카페 자동화</h1>
          <p className="text-muted-foreground mt-1">
            AI로 콘텐츠를 생성하고 네이버 카페에 자동으로 발행합니다.
          </p>
        </div>

        <NaverAuthStatus />

        <CafeProfileConfig />

        <Separator />

        <ContentGeneratorForm
          onGenerated={handleGenerated}
          isLoading={isGenerating}
          error={generateError}
          onGenerate={(params) => {
            generate(params, {
              onSuccess: handleGenerated,
            });
          }}
        />

        {hasContent && (
          <>
            <ContentPreview
              title={title}
              content={content}
              onTitleChange={setTitle}
              onContentChange={(newContent) => {
                setContent(newContent);
                setWordCount(newContent.replace(/<[^>]*>/g, '').length);
              }}
              wordCount={wordCount}
              tokensUsed={tokensUsed}
            />

            <PublishButton
              title={title}
              content={content}
              onPublish={handlePublish}
              isPublishing={isPublishing}
              result={publishResult}
              error={publishError}
            />
          </>
        )}

        <Separator />

        <PostHistory />
      </div>
    </main>
  );
}

export default function CafePage() {
  return (
    <Suspense>
      <CafePageContent />
    </Suspense>
  );
}
