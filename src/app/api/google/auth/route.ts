import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google-calendar";
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

    const authUrl = getAuthUrl(session.user.id);
    
    return NextResponse.json({ authUrl });
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

