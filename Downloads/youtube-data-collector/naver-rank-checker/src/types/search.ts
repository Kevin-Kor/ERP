export interface SearchResult {
  keyword: string;
  target_url: string;
  found: boolean;
  appearances: Appearance[];
}

export interface Appearance {
  section_name: string;
  rank_in_section: number;
  context_snippet: string;
}

export interface SearchRequest {
  targetUrl: string;
  keywords: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  status: 'success' | 'error';
  message?: string;
}

export interface FormState {
  targetUrl: string;
  keywords: string[];
  isLoading: boolean;
  error: string | null;
  results: SearchResult[] | null;
}

export interface KeywordInputProps {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  placeholder: string;
  canRemove: boolean;
}

export interface ResultsTableProps {
  results: SearchResult[];
}