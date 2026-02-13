// Naver OAuth 2.0 Types

export interface NaverTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: string; // Naver returns this as a string, not number
}

export interface NaverAuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface NaverTokenRefreshResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: string;
}

export interface NaverTokenDeleteResponse {
  access_token: string;
  result: string;
}

export interface NaverUserProfile {
  resultcode: string;
  message: string;
  response: {
    id: string;
    nickname?: string;
    profile_image?: string;
    email?: string;
    name?: string;
  };
}

// Naver Cafe API Types

export interface NaverCafeWriteRequest {
  subject: string;
  content: string;
  openyn?: boolean;
  searchopen?: boolean;
  replyyn?: boolean;
  metoo?: boolean;
  autosourcing?: boolean;
  rclick?: boolean;
  ccl?: boolean;
}

export interface NaverCafeWriteResponse {
  message: {
    status: string;
    result: {
      articleId: number;
      articleUrl: string;
    };
  };
}

export interface NaverCafeApiError {
  errorMessage: string;
  errorCode: string;
}

export interface NaverAuthStatus {
  authenticated: boolean;
  expiresAt?: number;
  needsRefresh?: boolean;
}
