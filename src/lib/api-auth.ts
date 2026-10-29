import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

type AuthResult =
  | { session: Session; response?: undefined }
  | { session?: undefined; response: NextResponse };

// API 라우트에서 로그인 세션을 확인한다.
// src/proxy.ts가 1차로 막지만, matcher 누락에 대비해 라우트에서도 다시 확인한다.
//
//   const auth = await requireSession();
//   if (auth.response) return auth.response;
export async function requireSession(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session };
}

// 관리자(role === "ADMIN")만 허용한다.
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireSession();
  if (result.response) return result;
  if (result.session.user.role !== "ADMIN") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
