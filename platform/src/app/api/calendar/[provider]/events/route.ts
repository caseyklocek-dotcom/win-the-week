import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { openCalendarSession, sessionCookieName, type LiveCalendarProvider } from "@/lib/calendarServer";

type RemoteCalendar = { id: string; name: string; primary?: boolean; color?: string; writable?: boolean };
type GoogleEvent = { id?: string; status?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } };
type MicrosoftEvent = { id?: string; subject?: string; start?: { dateTime?: string }; end?: { dateTime?: string }; isAllDay?: boolean };

const sessionFor = async (provider: LiveCalendarProvider) => openCalendarSession((await cookies()).get(sessionCookieName(provider))?.value);

async function googleCalendars(token: string): Promise<RemoteCalendar[]> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Google calendar request failed");
  const data = await response.json();
  return (data.items ?? []).slice(0, 8).map((item: Record<string, unknown>) => ({ id: String(item.id), name: String(item.summary || "Calendar"), primary: Boolean(item.primary), color: String(item.backgroundColor || "#8b7bb7"), writable: item.accessRole === "owner" || item.accessRole === "writer" }));
}

async function microsoftCalendars(token: string): Promise<RemoteCalendar[]> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/calendars?$select=id,name,color,canEdit,isDefaultCalendar", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Microsoft calendar request failed");
  const data = await response.json();
  const palette: Record<string, string> = { lightBlue: "#6c9bd2", lightGreen: "#69a77c", lightOrange: "#d18b72", lightGray: "#8a8a8a", auto: "#8b7bb7" };
  return (data.value ?? []).slice(0, 8).map((item: Record<string, unknown>) => ({ id: String(item.id), name: String(item.name || "Calendar"), primary: Boolean(item.isDefaultCalendar), color: palette[String(item.color)] || "#8b7bb7", writable: Boolean(item.canEdit) }));
}

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (provider !== "google" && provider !== "microsoft") return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  const session = await sessionFor(provider);
  if (!session) return NextResponse.json({ error: "Calendar is not connected" }, { status: 401 });
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "A date range is required" }, { status: 400 });
  try {
    const calendars = provider === "google" ? await googleCalendars(session.accessToken) : await microsoftCalendars(session.accessToken);
    const events = (await Promise.all(calendars.map(async (calendar) => {
      if (provider === "google") {
        const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`);
        url.searchParams.set("timeMin", start); url.searchParams.set("timeMax", end); url.searchParams.set("singleEvents", "true"); url.searchParams.set("orderBy", "startTime");
        const response = await fetch(url, { headers: { authorization: `Bearer ${session.accessToken}` }, cache: "no-store" });
        if (!response.ok) return [];
        const data = await response.json();
        return (data.items ?? []).filter((item: GoogleEvent) => item.status !== "cancelled").map((item: GoogleEvent) => ({ id: String(item.id), title: String(item.summary || "Busy"), start: item.start?.dateTime || `${item.start?.date}T00:00:00`, end: item.end?.dateTime || `${item.end?.date}T00:00:00`, allDay: Boolean(item.start?.date), provider, calendarId: calendar.id, color: calendar.color }));
      }
      const url = new URL(`https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendar.id)}/calendarView`);
      url.searchParams.set("startDateTime", start); url.searchParams.set("endDateTime", end); url.searchParams.set("$select", "id,subject,start,end,isAllDay");
      const response = await fetch(url, { headers: { authorization: `Bearer ${session.accessToken}`, Prefer: 'outlook.timezone="UTC"' }, cache: "no-store" });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.value ?? []).map((item: MicrosoftEvent) => ({ id: String(item.id), title: String(item.subject || "Busy"), start: item.start?.dateTime?.endsWith("Z") ? item.start.dateTime : `${item.start?.dateTime}Z`, end: item.end?.dateTime?.endsWith("Z") ? item.end.dateTime : `${item.end?.dateTime}Z`, allDay: Boolean(item.isAllDay), provider, calendarId: calendar.id, color: calendar.color }));
    }))).flat();
    return NextResponse.json({ provider, calendars: calendars.map((calendar) => ({ ...calendar, provider })), events });
  } catch {
    return NextResponse.json({ error: "The calendar could not be refreshed. Reconnect and try again." }, { status: 502 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (provider !== "google" && provider !== "microsoft") return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  const session = await sessionFor(provider);
  if (!session) return NextResponse.json({ error: "Calendar is not connected" }, { status: 401 });
  const { calendarId, blocks } = await request.json();
  if (!calendarId || !Array.isArray(blocks) || blocks.length > 20) return NextResponse.json({ error: "Invalid calendar update" }, { status: 400 });
  const created: { blockId: string; externalEventId: string }[] = [];
  let updated = 0;
  for (const block of blocks) {
    const baseUrl = provider === "google" ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`;
    const url = block.externalEventId ? `${baseUrl}/${encodeURIComponent(block.externalEventId)}` : baseUrl;
    const body = provider === "google" ? { summary: block.label, description: "Protected preparation time from Win the Week", start: { dateTime: block.start }, end: { dateTime: block.end } } : { subject: block.label, body: { contentType: "text", content: "Protected preparation time from Win the Week" }, start: { dateTime: block.start, timeZone: "UTC" }, end: { dateTime: block.end, timeZone: "UTC" } };
    const response = await fetch(url, { method: block.externalEventId ? "PATCH" : "POST", headers: { authorization: `Bearer ${session.accessToken}`, "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "Some protected times could not be added." }, { status: 502 });
    if (block.externalEventId) {
      updated++;
    } else {
      const event = await response.json();
      created.push({ blockId: block.id, externalEventId: event.id });
    }
  }
  return NextResponse.json({ created, updated });
}
