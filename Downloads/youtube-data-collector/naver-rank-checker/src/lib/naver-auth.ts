import axios from 'axios';
import { randomBytes } from 'crypto';
import type { NaverAuthToken, NaverTokenResponse, NaverTokenRefreshResponse } from '@/types/naver';
import * as tokenStore from '@/lib/token-store';

const NAVER_AUTH_URL = 'https://nid.naver.com/oauth2.0/authorize';
const NAVER_TOKEN_URL = 'https://nid.naver.com/oauth2.0/token';

// In-memory state store for CSRF protection
const oauthStates = new Map<string, number>();

function getClientId(): string {
  const id = process.env.NAVER_CLIENT_ID;
  if (!id) throw new Error('NAVER_CLIENT_ID 환경변수가 설정되지 않았습니다.');
  return id;
}

function getClientSecret(): string {
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!secret) throw new Error('NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env.NAVER_REDIRECT_URI;
  if (!uri) throw new Error('NAVER_REDIRECT_URI 환경변수가 설정되지 않았습니다.');
  return uri;
}

export function generateState(): string {
  const state = randomBytes(16).toString('hex');
  // Store state with 10-minute expiry
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);

  // Clean up expired states
  for (const [key, expiry] of oauthStates) {
    if (Date.now() > expiry) {
      oauthStates.delete(key);
    }
  }

  return state;
}

export function validateState(state: string): boolean {
  const expiry = oauthStates.get(state);
  if (!expiry || Date.now() > expiry) {
    return false;
  }
  oauthStates.delete(state);
  return true;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    state,
  });
  return `${NAVER_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  state: string
): Promise<NaverAuthToken> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code,
    state,
  });

  const response = await axios.get<NaverTokenResponse>(
    `${NAVER_TOKEN_URL}?${params.toString()}`,
    { timeout: 10000 }
  );

  const { access_token, refresh_token, token_type, expires_in } = response.data;

  if (!access_token) {
    throw new Error('토큰 발급에 실패했습니다.');
  }

  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenType: token_type,
    expiresAt: Date.now() + parseInt(expires_in, 10) * 1000,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<NaverAuthToken> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
  });

  const response = await axios.get<NaverTokenRefreshResponse>(
    `${NAVER_TOKEN_URL}?${params.toString()}`,
    { timeout: 10000 }
  );

  const { access_token, token_type, expires_in } = response.data;

  if (!access_token) {
    throw new Error('토큰 갱신에 실패했습니다.');
  }

  return {
    accessToken: access_token,
    refreshToken, // Refresh token doesn't change
    tokenType: token_type,
    expiresAt: Date.now() + parseInt(expires_in, 10) * 1000,
  };
}

export async function revokeToken(accessToken: string): Promise<void> {
  const params = new URLSearchParams({
    grant_type: 'delete',
    client_id: getClientId(),
    client_secret: getClientSecret(),
    access_token: accessToken,
    service_provider: 'NAVER',
  });

  await axios.get(`${NAVER_TOKEN_URL}?${params.toString()}`, {
    timeout: 10000,
  });
}

export function isTokenExpired(auth: NaverAuthToken): boolean {
  // Consider expired if less than 5 minutes remaining
  return auth.expiresAt - Date.now() < 5 * 60 * 1000;
}

/**
 * Gets a valid access token, refreshing if necessary.
 * Throws if not authenticated.
 */
export async function ensureValidToken(): Promise<string> {
  const auth = await tokenStore.getNaverAuth();
  if (!auth) {
    throw new Error('네이버 계정이 연결되지 않았습니다.');
  }

  if (isTokenExpired(auth)) {
    const refreshed = await refreshAccessToken(auth.refreshToken);
    await tokenStore.setNaverAuth(refreshed);
    return refreshed.accessToken;
  }

  return auth.accessToken;
}
