import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { openCalendarSession, providerConfigured, sessionCookieName } from "@/lib/calendarServer";

export async function GET() {
  const store = await cookies();
  return NextResponse.json({
    google: { configured: providerConfigured("google"), connected: Boolean(openCalendarSession(store.get(sessionCookieName("google"))?.value)) },
    microsoft: { configured: providerConfigured("microsoft"), connected: Boolean(openCalendarSession(store.get(sessionCookieName("microsoft"))?.value)) },
    apple: { configured: false, connected: false },
  });
}
