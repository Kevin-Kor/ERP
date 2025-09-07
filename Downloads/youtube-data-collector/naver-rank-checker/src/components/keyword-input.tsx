'use client';

import { KeywordInputProps } from '@/types/search';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function KeywordInput({ 
  value, 
  onChange, 
  onRemove, 
  placeholder, 
  canRemove 
}: KeywordInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      {canRemove && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={onRemove}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}