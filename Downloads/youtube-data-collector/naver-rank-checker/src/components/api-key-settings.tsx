'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';

interface ApiKeySettingsProps {
  onApiKeyChange: (apiKey: string) => void;
}

export function ApiKeySettings({ onApiKeyChange }: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에서 API 키 불러오기
    const savedApiKey = localStorage.getItem('youtube_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsValidated(true);
      onApiKeyChange(savedApiKey);
    }
  }, [onApiKeyChange]);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setIsValidated(false);
  };

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      return;
    }
    
    // 간단한 API 키 형식 검증
    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
      alert('올바른 YouTube API 키 형식이 아닙니다. API 키는 "AIza"로 시작해야 합니다.');
      return;
    }

    localStorage.setItem('youtube_api_key', apiKey);
    setIsValidated(true);
    onApiKeyChange(apiKey);
  };

  const handleClearApiKey = () => {
    setApiKey('');
    setIsValidated(false);
    localStorage.removeItem('youtube_api_key');
    onApiKeyChange('');
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5 text-red-500" />
          YouTube API 키 설정
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API 키</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="YouTube Data API v3 키를 입력하세요"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button 
                onClick={handleSaveApiKey}
                disabled={!apiKey.trim()}
                variant="default"
              >
                저장
              </Button>
              {isValidated && (
                <Button 
                  onClick={handleClearApiKey}
                  variant="outline"
                >
                  지우기
                </Button>
              )}
            </div>
          </div>

          {/* 상태 표시 */}
          {isValidated ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                API 키가 설정되었습니다. 이제 YouTube 데이터를 검색할 수 있습니다.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                YouTube Data API v3 키를 설정해야 데이터를 검색할 수 있습니다.{' '}
                <a 
                  href="https://console.developers.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Google Cloud Console
                </a>에서 API 키를 발급받으세요.
              </AlertDescription>
            </Alert>
          )}

          {/* 사용법 안내 */}
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>API 키 발급 방법:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Google Cloud Console에 접속</li>
              <li>새 프로젝트 생성 또는 기존 프로젝트 선택</li>
              <li>YouTube Data API v3 활성화</li>
              <li>사용자 인증 정보에서 API 키 생성</li>
              <li>생성된 API 키를 위 필드에 입력</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}