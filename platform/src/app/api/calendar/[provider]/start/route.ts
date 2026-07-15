import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { authorizationUrl, providerConfigured, type LiveCalendarProvider } from "@/lib/calendarServer";

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const returnUrl = new URL("/calendar", request.url);
  if (provider === "apple") {
    returnUrl.searchParams.set("calendar_notice", "apple-import");
    return NextResponse.redirect(returnUrl);
  }
  if ((provider !== "google" && provider !== "microsoft") || !providerConfigured(provider)) {
    returnUrl.searchParams.set("calendar_notice", "not-configured");
    return NextResponse.redirect(returnUrl);
  }
  const state = randomBytes(24).toString("base64url");
  const redirectUri = new URL(`/api/calendar/${provider}/callback`, request.url).toString();
  const response = NextResponse.redirect(authorizationUrl(provider as LiveCalendarProvider, redirectUri, state));
  response.cookies.set(`wtw_calendar_state_${provider}`, state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return response;
}
