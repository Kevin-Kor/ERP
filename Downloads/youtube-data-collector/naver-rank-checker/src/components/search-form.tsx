'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  youtubeSearchSchema, 
  type YouTubeSearchFormData,
  regionOptions,
  videoDurationOptions,
  orderOptions,
  uploadPeriodOptions,
  getDateRange
} from '@/lib/validations';
import { Search, Loader2, Youtube } from 'lucide-react';

interface SearchFormProps {
  onSubmit: (data: YouTubeSearchFormData) => void;
  isLoading?: boolean;
}

export function SearchForm({ onSubmit, isLoading = false }: SearchFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<YouTubeSearchFormData>({
    resolver: zodResolver(youtubeSearchSchema),
    defaultValues: {
      query: '',
      maxResults: 20,
      region: 'all',
      videoDuration: 'any',
      videoType: 'any',
      order: 'relevance',
      safeSearch: 'moderate',
      minViewCount: 0,
    },
  });

  watch('uploadPeriod');

  const handleUploadPeriodChange = (period: string) => {
    const dateRange = getDateRange(period);
    if (dateRange.publishedAfter) {
      setValue('publishedAfter', dateRange.publishedAfter);
    } else {
      setValue('publishedAfter', undefined);
    }
    if (dateRange.publishedBefore) {
      setValue('publishedBefore', dateRange.publishedBefore);
    } else {
      setValue('publishedBefore', undefined);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          YouTube 데이터 수집기
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Search Query */}
          <div className="space-y-2">
            <Label htmlFor="query">검색어</Label>
            <Input
              id="query"
              type="text"
              placeholder="예: React Tutorial, K-pop 뮤직비디오, 요리 레시피"
              {...register('query')}
              className={errors.query ? 'border-destructive' : ''}
            />
            {errors.query && (
              <p className="text-sm text-destructive">
                {errors.query.message}
              </p>
            )}
          </div>

          {/* Search Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Max Results */}
            <div className="space-y-2">
              <Label htmlFor="maxResults">결과 개수</Label>
              <Input
                id="maxResults"
                type="number"
                min="1"
                max="100"
                placeholder="20"
                {...register('maxResults', { valueAsNumber: true })}
                className={errors.maxResults ? 'border-destructive' : ''}
              />
              {errors.maxResults && (
                <p className="text-sm text-destructive">
                  {errors.maxResults.message}
                </p>
              )}
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label>지역</Label>
              <Select onValueChange={(value) => setValue('region', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 지역" />
                </SelectTrigger>
                <SelectContent>
                  {regionOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Upload Period */}
            <div className="space-y-2">
              <Label>업로드 기간</Label>
              <Select onValueChange={handleUploadPeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  {uploadPeriodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video Duration */}
            <div className="space-y-2">
              <Label>동영상 길이</Label>
              <Select onValueChange={(value) => setValue('videoDuration', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  {videoDurationOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label>정렬 기준</Label>
              <Select onValueChange={(value) => setValue('order', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="관련성" />
                </SelectTrigger>
                <SelectContent>
                  {orderOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min View Count */}
            <div className="space-y-2">
              <Label htmlFor="minViewCount">최소 조회수</Label>
              <Input
                id="minViewCount"
                type="number"
                min="0"
                placeholder="1000"
                {...register('minViewCount', { valueAsNumber: true })}
                className={errors.minViewCount ? 'border-destructive' : ''}
              />
              {errors.minViewCount && (
                <p className="text-sm text-destructive">
                  {errors.minViewCount.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                데이터 수집 중...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                데이터 수집
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}