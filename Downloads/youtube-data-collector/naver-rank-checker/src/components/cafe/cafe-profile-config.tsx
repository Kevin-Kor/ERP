'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { cafeConfigSchema, type CafeConfigFormData, type CafeConfigFormInput } from '@/lib/cafe-validations';
import type { CafeProfile } from '@/types/cafe';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Loader2, Settings, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function CafeProfileConfig() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CafeConfigFormInput, unknown, CafeConfigFormData>({
    resolver: zodResolver(cafeConfigSchema),
    defaultValues: {
      clubId: '',
      cafeName: '',
      defaultMenuId: '',
      dailyCap: 5,
    },
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await axios.get<{ profile: CafeProfile | null }>('/api/naver/cafe/config');
        if (response.data.profile) {
          const { clubId, cafeName, defaultMenuId, dailyCap } = response.data.profile;
          reset({ clubId, cafeName, defaultMenuId, dailyCap });
        }
      } catch {
        // First time use, no config yet
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, [reset]);

  const onSubmit = async (data: CafeConfigFormData) => {
    setIsSaving(true);
    try {
      await axios.post('/api/naver/cafe/config', data);
      toast.success('카페 설정이 저장되었습니다.');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || '설정 저장에 실패했습니다.');
      } else {
        toast.error('설정 저장에 실패했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            카페 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          카페 설정
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cafeName">카페 이름</Label>
              <Input
                id="cafeName"
                placeholder="예: eunsung8151"
                {...register('cafeName')}
              />
              {errors.cafeName && (
                <p className="text-sm text-red-500">{errors.cafeName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clubId">Club ID</Label>
              <Input
                id="clubId"
                placeholder="카페 고유 숫자 ID"
                {...register('clubId')}
              />
              {errors.clubId && (
                <p className="text-sm text-red-500">{errors.clubId.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                카페 관리 페이지 URL에서 clubid 파라미터를 확인하세요.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultMenuId">기본 게시판 ID</Label>
              <Input
                id="defaultMenuId"
                placeholder="게시판 숫자 ID"
                {...register('defaultMenuId')}
              />
              {errors.defaultMenuId && (
                <p className="text-sm text-red-500">{errors.defaultMenuId.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                게시판 URL에서 menuid 파라미터를 확인하세요.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyCap">일일 게시 제한</Label>
              <Input
                id="dailyCap"
                type="number"
                min={1}
                max={20}
                {...register('dailyCap')}
              />
              {errors.dailyCap && (
                <p className="text-sm text-red-500">{errors.dailyCap.message}</p>
              )}
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>입력값을 확인해주세요.</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            설정 저장
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
