'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { KeywordInput } from './keyword-input';
import { Plus } from 'lucide-react';

const MAX_KEYWORDS = 5;

interface KeywordManagerProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

export function KeywordManager({ keywords, onChange }: KeywordManagerProps) {
  const updateKeyword = useCallback((index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    onChange(newKeywords);
  }, [keywords, onChange]);

  const removeKeyword = useCallback((index: number) => {
    const newKeywords = keywords.filter((_, i) => i !== index);
    onChange(newKeywords);
  }, [keywords, onChange]);

  const addKeyword = useCallback(() => {
    if (keywords.length < MAX_KEYWORDS) {
      onChange([...keywords, '']);
    }
  }, [keywords, onChange]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        검색 키워드 (최대 {MAX_KEYWORDS}개)
      </Label>
      
      <div className="space-y-2">
        {keywords.map((keyword, index) => (
          <KeywordInput
            key={index}
            value={keyword}
            onChange={(value) => updateKeyword(index, value)}
            onRemove={() => removeKeyword(index)}
            placeholder={`키워드 ${index + 1}`}
            canRemove={keywords.length > 1}
          />
        ))}
      </div>

      {keywords.length < MAX_KEYWORDS && (
        <Button
          type="button"
          variant="outline"
          onClick={addKeyword}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          키워드 추가
        </Button>
      )}
    </div>
  );
}