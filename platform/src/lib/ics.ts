// ============================================================
// Tiny .ics builder — "Add to calendar" with zero dependencies.
//
// Builds a single-event ICS file (floating local time, so 10:00am means
// 10:00am wherever the volunteer is — right for a local church service)
// and hands it to the browser as a download.
// ============================================================

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// "10:00am" / "9:30 PM" / "10:00" → [h, m] (24h). Defaults to 10:00.
export function parseServiceTime(t: string): [number, number] {
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return [10, 0];
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return [Math.min(23, h), Math.min(59, min)];
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildServiceIcs(opts: {
  dateIso: string; // "2026-06-21"
  serviceTime: string; // "10:00am"
  title: string;
  description?: string;
  location?: string;
  durationMinutes?: number;
  uid?: string;
}): string {
  const [h, m] = parseServiceTime(opts.serviceTime);
  const [y, mo, d] = opts.dateIso.split("-").map(Number);
  const start = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`;
  const dur = opts.durationMinutes ?? 90;
  const endMinutes = h * 60 + m + dur;
  const end = `${y}${pad(mo)}${pad(d)}T${pad(Math.floor(endMinutes / 60) % 24)}${pad(endMinutes % 60)}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Win the Week//Service//EN",
    "BEGIN:VEVENT",
    `UID:${opts.uid ?? `wtw-${start}-${Math.random().toString(36).slice(2, 8)}`}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    ...(opts.description ? [`DESCRIPTION:${icsEscape(opts.description)}`] : []),
    ...(opts.location ? [`LOCATION:${icsEscape(opts.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** A whole season of services as one calendar file (multiple VEVENTs). */
export function buildServicesIcs(
  services: { dateIso: string; title: string; description?: string }[],
  serviceTime: string,
  durationMinutes = 90,
): string {
  const [h, m] = parseServiceTime(serviceTime);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const events = services.flatMap((s) => {
    const [y, mo, d] = s.dateIso.split("-").map(Number);
    const start = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`;
    const endMinutes = h * 60 + m + durationMinutes;
    const end = `${y}${pad(mo)}${pad(d)}T${pad(Math.floor(endMinutes / 60) % 24)}${pad(endMinutes % 60)}00`;
    return [
      "BEGIN:VEVENT",
      `UID:wtw-${s.dateIso}-${Math.random().toString(36).slice(2, 8)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${icsEscape(s.title)}`,
      ...(s.description ? [`DESCRIPTION:${icsEscape(s.description)}`] : []),
      "END:VEVENT",
    ];
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Win the Week//Services//EN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(href);
}
