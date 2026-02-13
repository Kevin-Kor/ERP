'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  contentGenerateSchema,
  type ContentGenerateFormData,
  type ContentGenerateFormInput,
  toneOptions,
  lengthOptions,
} from '@/lib/cafe-validations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, X, Plus, AlertCircle } from 'lucide-react';
import type { GeneratedContent } from '@/types/cafe';

interface ContentGeneratorFormProps {
  onGenerated: (result: GeneratedContent) => void;
  isLoading: boolean;
  error: string | null;
  onGenerate: (params: ContentGenerateFormData) => void;
}

export function ContentGeneratorForm({
  onGenerated,
  isLoading,
  error,
  onGenerate,
}: ContentGeneratorFormProps) {
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContentGenerateFormInput, unknown, ContentGenerateFormData>({
    resolver: zodResolver(contentGenerateSchema),
    defaultValues: {
      topic: '',
      keywords: [],
      tone: 'informational',
      lengthPreference: 'medium',
      additionalInstructions: '',
    },
  });

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && keywords.length < 5 && !keywords.includes(trimmed)) {
      const updated = [...keywords, trimmed];
      setKeywords(updated);
      setValue('keywords', updated);
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    const updated = keywords.filter((_, i) => i !== index);
    setKeywords(updated);
    setValue('keywords', updated);
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const onSubmit = (data: ContentGenerateFormData) => {
    onGenerate(data);
  };

  // Suppress unused var warning - onGenerated is called by parent after mutation success
  void onGenerated;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5" />
          AI 콘텐츠 생성
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">주제</Label>
            <Input
              id="topic"
              placeholder="예: 겨울철 실내 인테리어 팁"
              {...register('topic')}
            />
            {errors.topic && (
              <p className="text-sm text-red-500">{errors.topic.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>키워드 (최대 5개)</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="키워드 입력 후 Enter"
                disabled={keywords.length >= 5}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addKeyword}
                disabled={keywords.length >= 5 || !keywordInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {errors.keywords && (
              <p className="text-sm text-red-500">{errors.keywords.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tone">톤</Label>
              <Select
                defaultValue="informational"
                onValueChange={(value) =>
                  setValue('tone', value as ContentGenerateFormData['tone'])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="톤 선택" />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lengthPreference">길이</Label>
              <Select
                defaultValue="medium"
                onValueChange={(value) =>
                  setValue(
                    'lengthPreference',
                    value as ContentGenerateFormData['lengthPreference']
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="길이 선택" />
                </SelectTrigger>
                <SelectContent>
                  {lengthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalInstructions">추가 지시사항 (선택)</Label>
            <Textarea
              id="additionalInstructions"
              placeholder="예: 초보자 관점에서 쉽게 설명해주세요"
              rows={3}
              maxLength={500}
              {...register('additionalInstructions')}
            />
            {errors.additionalInstructions && (
              <p className="text-sm text-red-500">
                {errors.additionalInstructions.message}
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                AI 콘텐츠 생성
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
