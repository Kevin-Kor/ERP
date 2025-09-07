'use client';
import { useState } from 'react';
import { SearchForm } from '@/components/search-form';
import { ResultsTable } from '@/components/results-table';
import { ApiKeySettings } from '@/components/api-key-settings';
import { useYouTubeSearch } from '@/hooks/use-youtube-search';
import { YouTubeSearchFormData } from '@/lib/validations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function HomePage() {
  const [apiKey, setApiKey] = useState('');
  const { isLoading, error, results, searchVideos } = useYouTubeSearch({ apiKey });

  const handleSearch = async (data: YouTubeSearchFormData) => {
    await searchVideos(data);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-8">
        {/* API Key Settings */}
        <ApiKeySettings onApiKeyChange={setApiKey} />
        
        {/* Search Form */}
        <SearchForm onSubmit={handleSearch} isLoading={isLoading} />

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <ResultsTable results={results} />
        )}

        {/* Empty Results Message */}
        {results && results.length === 0 && !isLoading && !error && (
          <Alert>
            <AlertDescription>
              검색 결과가 없습니다. 다른 검색어로 시도해보세요.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
