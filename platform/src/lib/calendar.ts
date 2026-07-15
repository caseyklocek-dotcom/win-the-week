import type { CalendarEventRecord, CalendarProvider, CalendarSource, PreparationBlock, Service, WeeklyAvailability } from "./types";

const DAY = 86_400_000;

export function startOfLocalDay(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function daysUntilService(iso: string, today = new Date()): number {
  return Math.round((startOfLocalDay(iso).getTime() - startOfLocalDay(today).getTime()) / DAY);
}

export function weeksUntilService(iso: string, today = new Date()): number {
  return Math.max(0, Math.ceil(daysUntilService(iso, today) / 7));
}

export function eventsForServiceWeek(events: CalendarEventRecord[], serviceDate: string) {
  const service = startOfLocalDay(serviceDate);
  const start = new Date(service);
  start.setDate(start.getDate() - 6);
  const end = new Date(service);
  end.setDate(end.getDate() + 1);
  return events
    .filter((event) => new Date(event.end) > start && new Date(event.start) < end)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function serviceWeekDays(serviceDate: string): Date[] {
  const service = startOfLocalDay(serviceDate);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(service);
    day.setDate(day.getDate() - 6 + index);
    return day;
  });
}

export function blocksConflict(block: PreparationBlock, events: CalendarEventRecord[]) {
  return events.filter(
    (event) => !event.allDay && new Date(event.end) > new Date(block.start) && new Date(event.start) < new Date(block.end),
  );
}

export function previewCalendar(serviceDate: string): { calendars: CalendarSource[]; events: CalendarEventRecord[] } {
  const days = serviceWeekDays(serviceDate);
  const calendars: CalendarSource[] = [
    { id: "preview-personal", name: "Personal", provider: "manual", color: "#8b7bb7", writable: true },
    { id: "preview-work", name: "Work", provider: "manual", color: "#6c8098" },
    { id: "preview-church", name: "Church", provider: "manual", color: "#d18b72" },
  ];
  const event = (id: string, calendarId: string, day: number, hour: number, duration: number, title: string) => {
    const start = new Date(days[day]);
    start.setHours(hour, 0, 0, 0);
    const source = calendars.find((item) => item.id === calendarId)!;
    return {
      id,
      calendarId,
      provider: "manual" as const,
      color: source.color,
      title,
      start: start.toISOString(),
      end: new Date(start.getTime() + duration * 60_000).toISOString(),
    };
  };
  return {
    calendars,
    events: [
      event("preview-1", "preview-work", 0, 9, 180, "Work block"),
      event("preview-2", "preview-personal", 1, 17, 60, "Family dinner"),
      event("preview-3", "preview-work", 2, 10, 60, "Team meeting"),
      event("preview-4", "preview-church", 3, 18, 90, "Midweek gathering"),
      event("preview-5", "preview-personal", 4, 15, 60, "Appointment"),
      event("preview-6", "preview-church", 6, 8, 180, "Sunday service"),
    ],
  };
}

function parseIcsDate(raw: string): Date | null {
  const value = raw.trim();
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?Z?)?$/);
  if (!match) return null;
  const [, y, m, d, hh = "00", mm = "00", ss = "00"] = match;
  const utc = value.endsWith("Z");
  return utc
    ? new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss))
    : new Date(+y, +m - 1, +d, +hh, +mm, +ss);
}

export function parseIcs(text: string, provider: CalendarProvider = "ics"): CalendarEventRecord[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  return blocks.flatMap((block, index) => {
    const lines = block.split(/\r?\n/);
    const valueFor = (name: string) => {
      const line = lines.find((item) => item.startsWith(name + ":") || item.startsWith(name + ";"));
      return line?.slice((line.indexOf(":") || 0) + 1).trim();
    };
    const startRaw = valueFor("DTSTART");
    const endRaw = valueFor("DTEND");
    const start = startRaw ? parseIcsDate(startRaw) : null;
    const end = endRaw ? parseIcsDate(endRaw) : null;
    if (!start || !end) return [];
    return [{
      id: valueFor("UID") || `imported_${index}_${start.getTime()}`,
      title: (valueFor("SUMMARY") || "Busy").replace(/\\,/g, ",").replace(/\\n/g, " "),
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: !startRaw?.includes("T"),
      provider,
    }];
  });
}

const minutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

export const defaultAvailability = (): WeeklyAvailability[] =>
  Array.from({ length: 7 }, (_, day) => ({ day, enabled: true, start: "09:00", end: "17:00" }));

function openSlot(day: Date, duration: number, events: CalendarEventRecord[], availability: WeeklyAvailability[]) {
  const window = availability.find((item) => item.day === day.getDay() && item.enabled);
  if (!window || minutes(window.end) - minutes(window.start) < duration) return null;
  const earliest = minutes(window.start);
  const latest = minutes(window.end) - duration;
  for (let offset = earliest; offset <= latest; offset += 15) {
    const start = new Date(day);
    start.setHours(Math.floor(offset / 60), offset % 60, 0, 0);
    const end = new Date(start.getTime() + duration * 60_000);
    if (!events.some((event) => new Date(event.end) > start && new Date(event.start) < end)) return { start, end };
  }
  return null;
}

export function suggestPreparationBlocks(service: Service, events: CalendarEventRecord[], availability = defaultAvailability()): PreparationBlock[] {
  const serviceDay = startOfLocalDay(service.date);
  const suggestions = [
    { daysBefore: 5, hour: 19, duration: 45, label: "Pray and name the heart", kind: "pray" as const },
    { daysBefore: 4, hour: 19, duration: 75, label: "Build the set", kind: "plan" as const },
    { daysBefore: 3, hour: 12, duration: 30, label: "Confirm the team", kind: "team" as const },
    { daysBefore: 2, hour: 19, duration: 60, label: "Personal rehearsal", kind: "rehearse" as const },
    { daysBefore: 1, hour: 10, duration: 30, label: "Final preparation", kind: "prep" as const },
  ];

  return suggestions.flatMap((suggestion) => {
    const day = new Date(serviceDay);
    day.setDate(day.getDate() - suggestion.daysBefore);
    const slot = openSlot(day, suggestion.duration, events, availability);
    if (!slot) return [];
    return [{
      id: `${service.id}_${suggestion.kind}`,
      label: suggestion.label,
      kind: suggestion.kind,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
    }];
  });
}

function icsStamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function preparationBlocksToIcs(blocks: PreparationBlock[], service: Service) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Win the Week//Preparation Plan//EN"];
  for (const block of blocks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${block.id}@wintheweek.local`,
      `DTSTAMP:${icsStamp(new Date().toISOString())}`,
      `DTSTART:${icsStamp(block.start)}`,
      `DTEND:${icsStamp(block.end)}`,
      `SUMMARY:${block.label.replace(/[,;\\]/g, " ")}`,
      `DESCRIPTION:Protected preparation time for ${(
        service.title || service.season || "the upcoming service"
      ).replace(/[,;\\]/g, " ")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
