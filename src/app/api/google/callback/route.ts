import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokensFromCode } from "@/lib/google-calendar";
import { ensureGoogleConfigured } from "@/lib/google-config";

// GET - Handle OAuth callback from Google
export async function GET(request: NextRequest) {
  try {
    ensureGoogleConfigured();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // User ID passed as state
    const error = searchParams.get("error");

    // Handle user denial
    if (error) {
      return NextResponse.redirect(
        new URL("/calendar?error=access_denied", request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/calendar?error=invalid_request", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/calendar?error=token_error", request.url)
      );
    }

    // Calculate token expiry
    const expiryDate = tokens.expiry_date 
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Update user with Google tokens
    await prisma.user.update({
      where: { id: state },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: expiryDate,
        googleSyncEnabled: true,
        googleCalendarId: "primary", // Default to primary calendar
      },
    });

    // Redirect back to calendar with success
    return NextResponse.redirect(
      new URL("/calendar?google=connected", request.url)
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Google Calendar not configured") {
      return NextResponse.redirect(
        new URL("/calendar?error=not_configured", request.url)
      );
    }

    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/calendar?error=auth_failed", request.url)
    );
  }
}

