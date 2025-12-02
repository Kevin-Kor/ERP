import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google-calendar";

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

    // Check if Google credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { 
          error: "Google Calendar not configured",
          message: "Google OAuth credentials are not set up. Please contact administrator."
        },
        { status: 503 }
      );
    }

    const authUrl = getAuthUrl(session.user.id);
    
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Google Auth URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}

