import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { CalendarProvider } from "./types";

export type LiveCalendarProvider = "google" | "microsoft";
export type CalendarSession = { accessToken: string; refreshToken?: string; expiresAt: number };

export const providerEnv = (provider: LiveCalendarProvider) => {
  const prefix = provider === "google" ? "GOOGLE_CALENDAR" : "MICROSOFT_CALENDAR";
  return { clientId: process.env[`${prefix}_CLIENT_ID`], clientSecret: process.env[`${prefix}_CLIENT_SECRET`] };
};

export const providerConfigured = (provider: CalendarProvider) => {
  if (provider === "apple") return false;
  if (provider !== "google" && provider !== "microsoft") return false;
  const config = providerEnv(provider);
  return Boolean(config.clientId && config.clientSecret && process.env.CALENDAR_SESSION_SECRET);
};

const key = () => createHash("sha256").update(process.env.CALENDAR_SESSION_SECRET || "local-calendar-session-disabled").digest();

export function sealCalendarSession(value: CalendarSession) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function openCalendarSession(value?: string): CalendarSession | null {
  if (!value) return null;
  try {
    const payload = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString());
  } catch {
    return null;
  }
}

export const sessionCookieName = (provider: LiveCalendarProvider) => `wtw_calendar_${provider}`;

export async function exchangeCode(provider: LiveCalendarProvider, code: string, redirectUri: string): Promise<CalendarSession> {
  const config = providerEnv(provider);
  const endpoint = provider === "google" ? "https://oauth2.googleapis.com/token" : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const body = new URLSearchParams({ client_id: config.clientId!, client_secret: config.clientSecret!, code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (provider === "microsoft") body.set("scope", "offline_access User.Read Calendars.ReadWrite");
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
  if (!response.ok) throw new Error(`Calendar authorization failed (${response.status})`);
  const token = await response.json();
  return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000 };
}

export async function refreshCalendarSession(
  provider: LiveCalendarProvider,
  session: CalendarSession,
): Promise<CalendarSession> {
  if (!session.refreshToken) throw new Error("Calendar connection needs to be renewed");
  const config = providerEnv(provider);
  const endpoint = provider === "google"
    ? "https://oauth2.googleapis.com/token"
    : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const body = new URLSearchParams({
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
    refresh_token: session.refreshToken,
    grant_type: "refresh_token",
  });
  if (provider === "microsoft") body.set("scope", "offline_access User.Read Calendars.ReadWrite");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Calendar refresh failed (${response.status})`);
  const token = await response.json();
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token || session.refreshToken,
    expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
  };
}

export function authorizationUrl(provider: LiveCalendarProvider, redirectUri: string, state: string) {
  const config = providerEnv(provider);
  if (provider === "google") {
    const params = new URLSearchParams({ client_id: config.clientId!, redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", scope: "openid email https://www.googleapis.com/auth/calendar", state });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  const params = new URLSearchParams({ client_id: config.clientId!, redirect_uri: redirectUri, response_type: "code", response_mode: "query", scope: "offline_access User.Read Calendars.ReadWrite", state });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}
