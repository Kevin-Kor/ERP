import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getTokensFromCode,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE_PATH,
  safeEqual,
} from "@/lib/google-calendar";
import { ensureGoogleConfigured } from "@/lib/google-config";

// GET - Handle OAuth callback from Google
// 외부(Google)에서 리다이렉트로 들어오므로 proxy.ts는 통과시키고, 여기서
// ① 로그인 세션 ② state 쿠키 일치를 확인한 뒤 "세션 사용자"에게만 토큰을 저장한다.
export async function GET(request: NextRequest) {
  // 일회성 state 쿠키는 결과와 상관없이 지운다
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
      path: GOOGLE_OAUTH_STATE_COOKIE_PATH,
      maxAge: 0,
    });
    return response;
  };

  try {
    ensureGoogleConfigured();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user denial
    if (error) {
      return redirectTo("/calendar?error=access_denied");
    }

    if (!code || !state) {
      return redirectTo("/calendar?error=invalid_request");
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return redirectTo("/login?callbackUrl=/calendar");
    }

    const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
    if (!expectedState || !safeEqual(state, expectedState)) {
      return redirectTo("/calendar?error=invalid_state");
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token) {
      return redirectTo("/calendar?error=token_error");
    }

    // Calculate token expiry
    const expiryDate = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Update the logged-in user with Google tokens
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: expiryDate,
        googleSyncEnabled: true,
        googleCalendarId: "primary", // Default to primary calendar
      },
    });

    // Redirect back to calendar with success
    return redirectTo("/calendar?google=connected");
  } catch (error) {
    if (error instanceof Error && error.message === "Google Calendar not configured") {
      return redirectTo("/calendar?error=not_configured");
    }

    console.error("Google OAuth callback error:", error);
    return redirectTo("/calendar?error=auth_failed");
  }
}
