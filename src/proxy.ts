import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 로그인 세션 대신 각 라우트가 자체 검증을 하는 외부 호출 경로.
// 여기서 막으면 Slack/Google/Vercel Cron 호출이 실패하므로 통과시키고,
// 라우트 안에서 아래 방식으로 검증한다.
const EXTERNAL_API_PREFIXES = [
  "/api/auth", // NextAuth 자체 (로그인/세션)
  "/api/slack/webhook", // Slack 서명(X-Slack-Signature) 검증
  "/api/google/webhook", // Google 채널 토큰(X-Goog-Channel-Token) 검증
  "/api/google/callback", // OAuth state 쿠키 + 로그인 세션 검증
  "/api/cron", // CRON_SECRET Bearer 토큰 검증
];

const PUBLIC_PAGES = ["/login"];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    EXTERNAL_API_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix)) ||
    PUBLIC_PAGES.some((page) => matchesPrefix(pathname, page))
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // API는 경로 모양과 상관없이 항상 검사
    "/api/:path*",
    // 페이지: 정적 자산과 확장자가 있는 public 파일(robots.txt 등)은 제외
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
