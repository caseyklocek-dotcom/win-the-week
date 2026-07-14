"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { nameKey, resolveName } from "@/lib/people";
import { makeServiceFromTemplate } from "@/lib/seed";
import { fmtDuration } from "@/lib/music";
import {
  rowDurationSec,
  rowTitle,
  sectionDurationSec,
  serviceSetDurationSec,
} from "@/lib/set";
import type { Person, Service } from "@/lib/types";

function fmtFullDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

// iPadOS 13+ reports itself as "Macintosh", so a Mac UA with a touch screen
// is treated as iOS too.
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) &&
      typeof document !== "undefined" &&
      "ontouchend" in document)
  );
}

interface Recipient {
  name: string;
  email?: string;
  phone?: string;
}

// One row per distinct person assigned anywhere on this service's teams.
function serviceRecipients(svc: Service, people: Person[]): Recipient[] {
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const team of svc.teams) {
    for (const slot of team.roles) {
      const name = resolveName(slot, people).trim();
      if (!name) continue;
      const person = slot.personId
        ? people.find((p) => p.id === slot.personId)
        : undefined;
      const key = person?.id ?? nameKey(name);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name, email: person?.email, phone: person?.phone });
    }
  }
  return out;
}

// A plain-text run sheet the team can read in an email, a text, or a paste.
function buildSummary(svc: Service, people: Person[]): string {
  const lines: string[] = [];
  lines.push(`${fmtFullDate(svc.date)}${svc.title ? ` · ${svc.title}` : ""}`);
  if (svc.theme) lines.push(`Theme: ${svc.theme}`);
  if (svc.scripture) lines.push(`Scripture: ${svc.scripture}`);
  if (svc.oneThing) lines.push(`The one thing: ${svc.oneThing}`);

  const total = serviceSetDurationSec(svc);
  lines.push("");
  lines.push(`ORDER OF SERVICE (${fmtDuration(total)})`);
  for (const sec of svc.setSections) {
    const rows = sec.rows ?? [];
    if (rows.length === 0) continue;
    lines.push("");
    lines.push(`${sec.label} · ${fmtDuration(sectionDurationSec(sec, svc))}`);
    for (const row of rows) {
      const title = rowTitle(row, svc);
      if (!title) continue;
      let detail = "";
      let song;
      if (row.kind === "song") {
        song = svc.songs.find((s) => s.id === row.refId);
        if (song?.serviceKey) detail = ` (${song.serviceKey})`;
      }
      lines.push(`  - ${title}${detail} · ${fmtDuration(rowDurationSec(row, svc))}`);
      // Practice links ride along so the team can watch or listen right
      // from the email/text — YouTube and Spotify only (MultiTracks and
      // SongSelect are leader-side tools).
      if (song?.youtubeUrl) lines.push(`      Watch: ${song.youtubeUrl}`);
      if (song?.spotifyUrl) lines.push(`      Listen: ${song.spotifyUrl}`);
    }
  }

  const team = serviceRecipients(svc, people);
  if (team.length > 0) {
    lines.push("");
    lines.push("TEAM");
    for (const r of team) lines.push(`  - ${r.name}`);
  }

  return lines.join("\n");
}

export function ServiceActions() {
  const { activeService: svc, people, addService } = useStore();
  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // We just handed off to mailto:/sms:, which silently does nothing when no
  // handler app is set up — so surface Share as a visible fallback for a bit.
  const [handoff, setHandoff] = useState<null | "email" | "text">(null);
  const handoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recipients = useMemo(
    () => serviceRecipients(svc, people),
    [svc, people],
  );
  const emails = recipients.filter((r) => r.email).map((r) => r.email!);
  const phones = recipients.filter((r) => r.phone).map((r) => r.phone!);

  const subject = `${svc.title || svc.season} · ${fmtFullDate(svc.date)}`;

  const noteHandoff = (kind: "email" | "text") => {
    setHandoff(kind);
    if (handoffTimer.current) clearTimeout(handoffTimer.current);
    handoffTimer.current = setTimeout(() => setHandoff(null), 8000);
  };
  useEffect(
    () => () => {
      if (handoffTimer.current) clearTimeout(handoffTimer.current);
    },
    [],
  );

  const emailTeam = () => {
    if (emails.length === 0) return;
    const body = buildSummary(svc, people);
    const href =
      `mailto:${emails.join(",")}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    noteHandoff("email");
  };

  const textTeam = () => {
    if (phones.length === 0) return;
    const body = buildSummary(svc, people);
    // Platform quirk: iOS Messages breaks on comma-separated sms: recipients
    // (it can open with no recipients at all) and wants ";" between numbers,
    // plus the odd "?&body=" form to pick up the body. Android is the
    // opposite: commas between numbers and a plain "?body=" query.
    const ios = isIOS();
    const href =
      `sms:${phones.join(ios ? ";" : ",")}` +
      `${ios ? "?&" : "?"}body=${encodeURIComponent(body)}`;
    window.location.href = href;
    noteHandoff("text");
  };

  const share = async () => {
    const text = buildSummary(svc, people);
    try {
      if (navigator.share) {
        await navigator.share({ title: subject, text });
        return;
      }
    } catch {
      /* user dismissed or unsupported — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const duplicate = () => {
    const next = makeServiceFromTemplate(svc, addDaysISO(svc.date, 7), svc.season);
    next.title = svc.title;
    next.scripture = svc.scripture;
    next.theme = svc.theme;
    next.oneThing = svc.oneThing;
    addService(next);
  };

  return (
    <>
      {/* Desktop: the four labeled buttons, tooltips explain disabled states. */}
      <div className="no-print hidden flex-wrap items-center gap-2 lg:flex">
        <ActionButton
          icon="mail"
          label="Email team"
          onClick={emailTeam}
          disabled={emails.length === 0}
          title={
            emails.length === 0
              ? "No team emails on file yet"
              : `Email ${emails.length} on the team`
          }
        />
        <ActionButton
          icon="message"
          label="Text team"
          onClick={textTeam}
          disabled={phones.length === 0}
          title={
            phones.length === 0
              ? "No team phone numbers on file yet"
              : `Text ${phones.length} on the team`
          }
        />
        <ActionButton
          icon={copied ? "check" : "share"}
          label={copied ? "Copied" : "Share"}
          onClick={share}
        />
        <ActionButton icon="copy" label="Duplicate" onClick={duplicate} />
        {handoff && (
          <span className="text-xs font-medium text-charcoal-400">
            Nothing opened? Use Share to copy the plan instead.
          </span>
        )}
      </div>

      {/* Phone: one 44px trigger, everything else lives in the sheet below. */}
      <button
        onClick={() => setSheetOpen(true)}
        aria-label="Send and share this service"
        className="no-print flex h-11 w-11 items-center justify-center rounded-lg border border-charcoal-200 bg-white text-charcoal-600 transition hover:border-coral-400 hover:text-coral-600 lg:hidden"
      >
        <Icon name="send" size={18} />
      </button>

      {sheetOpen && (
        <div
          className="no-print fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Send and share this service"
          onClick={() => setSheetOpen(false)}
        >
          <div className="anim-fade-in absolute inset-0 bg-black/40" />
          <div
            className="anim-sheet-up absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-charcoal-100 bg-white p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-cream-200" />
            <div className="label mb-1 px-2 text-[0.65rem] text-charcoal-300">
              Send and share
            </div>

            {emails.length > 0 ? (
              <SheetAction
                icon="mail"
                label="Email team"
                sub={`Opens your mail app with the plan for ${emails.length} ${
                  emails.length === 1 ? "person" : "people"
                }`}
                onClick={emailTeam}
              />
            ) : (
              <SheetUnavailable
                icon="mail"
                label="Email team"
                note="No team emails on file yet."
                linkLabel="Add them on the Team page"
              />
            )}

            {phones.length > 0 ? (
              <SheetAction
                icon="message"
                label="Text team"
                sub={`Opens your messages app for ${phones.length} ${
                  phones.length === 1 ? "person" : "people"
                }`}
                onClick={textTeam}
              />
            ) : (
              <SheetUnavailable
                icon="message"
                label="Text team"
                note="No phone numbers on file yet."
                linkLabel="Add them on the Team page"
              />
            )}

            {handoff && (
              <p className="mx-2 my-1.5 rounded-lg bg-cream-200 px-3 py-2 text-xs leading-relaxed text-charcoal-600">
                Your {handoff === "email" ? "mail" : "messages"} app should be
                open now. If nothing opened, Share below copies the plan so you
                can paste it anywhere.
              </p>
            )}

            <SheetAction
              icon={copied ? "check" : "share"}
              label={copied ? "Copied to clipboard" : "Share or copy"}
              sub="Send the plan through any app"
              onClick={share}
            />
            <SheetAction
              icon="copy"
              label="Duplicate service"
              sub="Start next Sunday from this plan"
              onClick={() => {
                duplicate();
                setSheetOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function SheetAction({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-cream-200"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-coral-100 text-coral-600">
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-charcoal-800">
          {label}
        </span>
        <span className="block text-xs text-charcoal-400">{sub}</span>
      </span>
    </button>
  );
}

// The touch replacement for a disabled button: instead of a dead control with
// a tooltip nobody can see, the row says why it is off and taps through to the
// Team page where the fix lives.
function SheetUnavailable({
  icon,
  label,
  note,
  linkLabel,
}: {
  icon: string;
  label: string;
  note: string;
  linkLabel: string;
}) {
  return (
    <Link
      href="/people"
      className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-cream-200"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-charcoal-400">
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-charcoal-400">
          {label}
        </span>
        <span className="block text-xs text-charcoal-400">
          {note}{" "}
          <span className="font-semibold text-coral-600">{linkLabel}</span>
        </span>
      </span>
    </Link>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1.5 rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-coral-400 hover:text-coral-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-charcoal-200 disabled:hover:text-charcoal-600"
    >
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </button>
  );
}
