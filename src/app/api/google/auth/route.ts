import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createRandomToken,
  getAuthUrl,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE_PATH,
} from "@/lib/google-calendar";
import { ensureGoogleConfigured } from "@/lib/google-config";

// GET - Generate Google OAuth URL
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    ensureGoogleConfigured();

    // state에는 사용자 ID 대신 일회성 임의 값을 넣고, 같은 값을 httpOnly 쿠키로 저장한다.
    // 콜백은 두 값이 일치하고 로그인 세션이 있을 때만 토큰을 저장한다 (계정 연결 CSRF 방지).
    const state = createRandomToken();
    const authUrl = getAuthUrl(state);

    const response = NextResponse.json({ authUrl });
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: GOOGLE_OAUTH_STATE_COOKIE_PATH,
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "Google Calendar not configured") {
      return NextResponse.json(
        {
          error: error.message,
          message: "Google OAuth credentials are not set up. Please contact administrator."
        },
        { status: 503 }
      );
    }

    console.error("Google Auth URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}

