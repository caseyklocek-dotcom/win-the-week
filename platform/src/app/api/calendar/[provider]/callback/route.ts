import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, sealCalendarSession, sessionCookieName, type LiveCalendarProvider } from "@/lib/calendarServer";

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const returnUrl = new URL("/calendar", request.url);
  if (provider !== "google" && provider !== "microsoft") return NextResponse.redirect(returnUrl);
  const expected = request.cookies.get(`wtw_calendar_state_${provider}`)?.value;
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!expected || !state || expected !== state || !code) {
    returnUrl.searchParams.set("calendar_notice", "authorization-failed");
    return NextResponse.redirect(returnUrl);
  }
  try {
    const redirectUri = new URL(`/api/calendar/${provider}/callback`, request.url).toString();
    const session = await exchangeCode(provider as LiveCalendarProvider, code, redirectUri);
    returnUrl.searchParams.set("calendar_connected", provider);
    const response = NextResponse.redirect(returnUrl);
    response.cookies.set(sessionCookieName(provider), sealCalendarSession(session), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 90, path: "/" });
    response.cookies.delete(`wtw_calendar_state_${provider}`);
    return response;
  } catch {
    returnUrl.searchParams.set("calendar_notice", "authorization-failed");
    return NextResponse.redirect(returnUrl);
  }
}
