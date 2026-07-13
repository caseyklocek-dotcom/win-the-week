"use client";

// ============================================================
// Reports — what a year of faithful planning says.
//
// Four honest reads, computed from the leader's own services (no setup):
//   · Song rotation health — what's worn, what's rested
//   · Team serving load — who's carrying too many Sundays (burnout flags)
//   · Prep consistency — the streak, kept kindly
//   · The Pastor Report — a quarter of ministry on one printable page
// Plus exports: CSV for everything, a calendar feed, and a song-list CSV
// import that welcomes Planning Center exports.
// ============================================================

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { resolveName, nameKey } from "@/lib/people";
import { sectionSongIds, serviceSetDurationSec } from "@/lib/set";
import { fmtDuration } from "@/lib/music";
import { toCsv, downloadCsv, parseCsv, findColumn } from "@/lib/csv";
import { planTimeSec } from "@/lib/plan";
import { buildServicesIcs, downloadIcs } from "@/lib/ics";
import { dedupeKey, blankLibrarySong } from "@/lib/library";
import { ALL_KEYS } from "@/lib/music";
import type { Service } from "@/lib/types";

function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function weeksAgo(iso: string, todayIso: string): number {
  return Math.floor(
    (new Date(todayIso + "T00:00:00").getTime() - new Date(iso + "T00:00:00").getTime()) /
      (7 * 86_400_000),
  );
}

function quarterOf(d: Date): { label: string; startIso: string; endIso: string } {
  const q = Math.floor(d.getMonth() / 3);
  const start = new Date(d.getFullYear(), q * 3, 1);
  const end = new Date(d.getFullYear(), q * 3 + 3, 0);
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { label: `Q${q + 1} ${d.getFullYear()}`, startIso: iso(start), endIso: iso(end) };
}

export default function ReportsPage() {
  const { state, songLibrary, people, addLibrarySong } = useStore();
  const todayIso = new Date().toISOString().slice(0, 10);

  const byDateDesc = useMemo(
    () => [...state.services].sort((a, b) => b.date.localeCompare(a.date)),
    [state.services],
  );

  // ---- Song rotation ----
  const rotation = useMemo(() => {
    const times: Record<string, number> = {};
    const last: Record<string, string> = {};
    for (const svc of state.services) {
      for (const song of svc.songs) {
        if (!song.libraryId) continue;
        times[song.libraryId] = (times[song.libraryId] ?? 0) + 1;
        if (!last[song.libraryId] || svc.date > last[song.libraryId])
          last[song.libraryId] = svc.date;
      }
    }
    const rows = songLibrary.map((lib) => ({
      lib,
      times: times[lib.id] ?? 0,
      last: last[lib.id],
    }));
    const top = [...rows].sort((a, b) => b.times - a.times).slice(0, 5);
    const resting = rows.filter(
      (r) => r.times > 0 && r.last && weeksAgo(r.last, todayIso) >= 10,
    );
    const maxTimes = Math.max(1, ...top.map((r) => r.times));
    return { top, resting, maxTimes };
  }, [state.services, songLibrary, todayIso]);

  // ---- Serving load (recent 8 services) ----
  const recent8 = useMemo(() => byDateDesc.slice(0, 8).reverse(), [byDateDesc]);
  const load = useMemo(() => {
    const perPerson = new Map<string, { name: string; served: boolean[] }>();
    recent8.forEach((svc, idx) => {
      const seen = new Set<string>();
      for (const team of svc.teams) {
        for (const slot of team.roles) {
          const name = resolveName(slot, people).trim();
          if (!name || slot.status === "no") continue;
          const key = slot.personId ?? nameKey(name);
          if (seen.has(key)) continue;
          seen.add(key);
          let entry = perPerson.get(key);
          if (!entry) {
            entry = { name, served: new Array(recent8.length).fill(false) };
            perPerson.set(key, entry);
          }
          entry.served[idx] = true;
        }
      }
    });
    const rows = [...perPerson.values()].map((p) => {
      let streak = 0;
      for (let i = p.served.length - 1; i >= 0 && p.served[i]; i--) streak++;
      return { ...p, total: p.served.filter(Boolean).length, streak };
    });
    const sorted = rows.sort((a, b) => b.streak - a.streak || b.total - a.total).slice(0, 8);
    // Burnout flags only mean something RELATIVE to the team's rhythm. In a
    // small church where everyone serves weekly, flagging the whole roster is
    // noise — so flag only people clearly above the team's median streak, and
    // fall back to one gentle team-wide line when serving-weekly is the norm.
    const streaks = sorted.map((r) => r.streak).sort((a, b) => a - b);
    const median = streaks.length ? streaks[Math.floor(streaks.length / 2)] : 0;
    const flagged = new Set(
      sorted.filter((r) => r.streak >= 4 && r.streak >= median + 2).map((r) => r.name),
    );
    const wholeTeamRuns = flagged.size === 0 && median >= Math.min(6, recent8.length) && sorted.length > 1;
    return { rows: sorted, flagged, wholeTeamRuns };
  }, [recent8, people]);

  // ---- Prep consistency (past 12) ----
  const prep = useMemo(() => {
    const past = byDateDesc.filter((s) => s.date < todayIso).slice(0, 12).reverse();
    const dots = past.map((s) => ({
      date: s.date,
      done: s.status.pray === "done" && s.status.plan === "done" && s.status.prep === "done",
    }));
    let streak = 0;
    for (let i = dots.length - 1; i >= 0 && dots[i].done; i--) streak++;
    return { dots, doneCount: dots.filter((d) => d.done).length, streak };
  }, [byDateDesc, todayIso]);

  // ---- Time to plan (the leader's own metric: how long a service takes) ----
  const planTimes = useMemo(() => {
    const tracked = byDateDesc
      .map((s) => ({ date: s.date, title: s.title, sec: planTimeSec(s) }))
      .filter((s) => s.sec > 0)
      .slice(0, 6)
      .reverse();
    const avg = tracked.length
      ? Math.round(tracked.reduce((a, b) => a + b.sec, 0) / tracked.length)
      : 0;
    const max = Math.max(1, ...tracked.map((t) => t.sec));
    return { tracked, avg, max };
  }, [byDateDesc]);

  // ---- Pastor report (this quarter) ----
  const quarter = quarterOf(new Date());
  const pastor = useMemo(() => {
    const inQ = state.services.filter(
      (s) => s.date >= quarter.startIso && s.date <= quarter.endIso,
    );
    const songIds = new Set<string>();
    const vols = new Set<string>();
    for (const svc of inQ) {
      for (const song of svc.songs) songIds.add(song.libraryId ?? dedupeKey(song.title, song.artist));
      for (const team of svc.teams)
        for (const slot of team.roles) {
          const name = resolveName(slot, people).trim();
          if (name && slot.status !== "no") vols.add(slot.personId ?? nameKey(name));
        }
    }
    return { services: inQ.length, songs: songIds.size, volunteers: vols.size };
  }, [state.services, people, quarter.startIso, quarter.endIso]);

  const printPastor = () => window.print();

  // ---- exports ----
  const exportSongs = () => {
    const rows = songLibrary.map((lib) => {
      const r = rotation.top.find((t) => t.lib.id === lib.id);
      return [
        lib.title,
        lib.artist,
        lib.originalKey,
        lib.tempo ?? "",
        lib.timeSignature ?? "",
        lib.ccli ?? "",
        (lib.tags ?? []).join("; "),
        r?.times ?? "",
        r?.last ?? "",
      ];
    });
    downloadCsv(
      "wtw-songs",
      toCsv(
        ["Title", "Artist", "Key", "Tempo", "Time signature", "CCLI", "Themes", "Times used", "Last used"],
        rows,
      ),
    );
  };
  const exportServices = () => {
    const rows = [...state.services]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => [
        s.date,
        s.title,
        s.theme,
        s.scripture,
        s.songs.length,
        fmtDuration(serviceSetDurationSec(s)),
        s.status.pray === "done" && s.status.plan === "done" && s.status.prep === "done"
          ? "fully prepped"
          : "",
        planTimeSec(s) > 0 ? Math.round(planTimeSec(s) / 60) : "",
      ]);
    downloadCsv(
      "wtw-services",
      toCsv(
        ["Date", "Title", "Theme", "Scripture", "Songs", "Set length", "Prep", "Minutes to plan"],
        rows,
      ),
    );
  };
  const exportTeam = () => {
    const rows = people.map((p) => [
      p.name,
      p.mainRole ?? "",
      p.roles.join("; "),
      p.email ?? "",
      p.phone ?? "",
      p.active ? "active" : "inactive",
    ]);
    downloadCsv("wtw-team", toCsv(["Name", "Main role", "Roles", "Email", "Phone", "Status"], rows));
  };
  const exportCalendar = () => {
    const upcoming = state.services
      .filter((s) => s.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        dateIso: s.date,
        title: `${state.profile.churchName || "Service"}${s.title ? ` · ${s.title}` : ""}`,
        description: s.theme || undefined,
      }));
    downloadIcs("wtw-services", buildServicesIcs(upcoming, state.profile.serviceTime));
  };

  // ---- song CSV import (Planning Center friendly) ----
  const importRef = useRef<HTMLInputElement>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      setImportNote("That file looks empty.");
      return;
    }
    const headers = rows[0];
    const iTitle = findColumn(headers, ["title", "name", "song", "song title"]);
    const iArtist = findColumn(headers, ["artist", "author", "authors", "by"]);
    const iKey = findColumn(headers, ["key", "default key", "original key"]);
    const iCcli = findColumn(headers, ["ccli", "ccli #", "ccli number", "ccli song number"]);
    if (iTitle === -1) {
      setImportNote("Couldn't find a title column. Export the song list as CSV and try again.");
      return;
    }
    const existing = new Set(songLibrary.map((l) => dedupeKey(l.title, l.artist)));
    let added = 0;
    let skipped = 0;
    for (const row of rows.slice(1)) {
      const title = (row[iTitle] ?? "").trim();
      if (!title) continue;
      const artist = iArtist !== -1 ? (row[iArtist] ?? "").trim() : "";
      if (existing.has(dedupeKey(title, artist))) {
        skipped++;
        continue;
      }
      const keyRaw = iKey !== -1 ? (row[iKey] ?? "").trim() : "";
      const key = ALL_KEYS.find((k) => k.toLowerCase() === keyRaw.toLowerCase());
      const lib = {
        ...blankLibrarySong(),
        title,
        artist,
        ...(key ? { originalKey: key } : {}),
        ...(iCcli !== -1 && row[iCcli]?.trim()
          ? { ccli: row[iCcli].replace(/\D/g, "") || undefined }
          : {}),
      };
      addLibrarySong(lib);
      existing.add(dedupeKey(title, artist));
      added++;
    }
    setImportNote(
      `Imported ${added} song${added === 1 ? "" : "s"}${skipped ? ` · ${skipped} already in your library` : ""}.`,
    );
  };

  const chip =
    "inline-flex items-center gap-1.5 rounded-full border border-charcoal-100 px-3.5 py-2 text-xs font-semibold text-charcoal-600 transition hover:border-coral-300 hover:text-coral-600";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="no-print">
        <p className="label text-coral-600">Reports · {quarter.label}</p>
        <h1 className="headline mt-1.5 text-3xl text-charcoal-900 lg:text-4xl">
          What your planning says
        </h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-400">
          Read straight from your own Sundays. Nothing to set up, everything exportable.
        </p>

        <div className="mt-8 grid gap-y-9 border-t border-charcoal-100 pt-7 lg:grid-cols-2 lg:gap-x-10">
          {/* Rotation */}
          <section>
            <h2 className="label text-charcoal-400">Song rotation health</h2>
            <div className="mt-3 space-y-2.5">
              {rotation.top.map((r) => (
                <div key={r.lib.id} className="grid grid-cols-[minmax(120px,160px)_1fr_44px] items-center gap-3 text-sm">
                  <span className="truncate font-semibold text-charcoal-800">{r.lib.title}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-cream-200">
                    <span
                      className="block h-full rounded-full bg-coral-500"
                      style={{ width: `${(r.times / rotation.maxTimes) * 100}%` }}
                    />
                  </span>
                  <span className="text-right text-xs tabular-nums text-charcoal-400">
                    {r.times}×
                  </span>
                </div>
              ))}
              {rotation.top.every((r) => r.times === 0) && (
                <p className="text-sm text-charcoal-400">No songs scheduled yet.</p>
              )}
            </div>
            {rotation.resting.length > 0 && (
              <p className="mt-4 text-xs">
                <span className="rounded-full bg-wait-tint px-3 py-1.5 font-bold text-wait-ink">
                  {rotation.resting.length} song{rotation.resting.length === 1 ? "" : "s"} resting
                  10+ weeks
                </span>
                <span className="ml-2 text-charcoal-400">
                  {rotation.resting
                    .slice(0, 3)
                    .map((r) => r.lib.title)
                    .join(" · ")}
                </span>
              </p>
            )}
          </section>

          {/* Serving load */}
          <section>
            <h2 className="label text-charcoal-400">
              Team serving load · recent {recent8.length} services
            </h2>
            <div className="mt-2">
              {load.rows.map((p) => {
                const hot = load.flagged.has(p.name);
                return (
                  <div
                    key={p.name}
                    className="flex items-center gap-3 border-b border-cream-200 py-2.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold text-charcoal-800">
                      {p.name}
                    </span>
                    {hot && (
                      <span
                        className="rounded-full bg-wait-tint px-2.5 py-1 text-[10.5px] font-bold text-wait-ink"
                        title="Serving well beyond the team's rhythm — worth a rest soon"
                      >
                        {p.streak} straight · protect them
                      </span>
                    )}
                    <span className="flex gap-1">
                      {p.served.map((on, i) => (
                        <span
                          key={i}
                          className={`h-2.5 w-2.5 rounded-[3px] ${
                            on
                              ? hot && i >= p.served.length - p.streak
                                ? "bg-wait-bar"
                                : "bg-teal-500"
                              : "bg-cream-200"
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                );
              })}
              {load.rows.length === 0 && (
                <p className="py-2 text-sm text-charcoal-400">No one scheduled recently.</p>
              )}
              {load.wholeTeamRuns && (
                <p className="mt-3 text-xs text-charcoal-500">
                  <span className="rounded-full bg-wait-tint px-2.5 py-1 font-bold text-wait-ink">
                    The whole team serves nearly every week
                  </span>
                  <span className="ml-2 text-charcoal-400">
                    Normal for a small church — a planned off-week blesses everyone at once.
                  </span>
                </p>
              )}
            </div>
          </section>

          {/* Prep consistency */}
          <section>
            <h2 className="label text-charcoal-400">Prep consistency · past {prep.dots.length} Sundays</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {prep.dots.map((d) => (
                <span
                  key={d.date}
                  title={`${fmtShort(d.date)} — ${d.done ? "fully prepped" : "partly prepped"}`}
                  className={`h-4 w-4 rounded-full ${
                    d.done ? "bg-ok-bar" : "border-2 border-dashed border-charcoal-200"
                  }`}
                />
              ))}
              {prep.dots.length === 0 && (
                <p className="text-sm text-charcoal-400">No past Sundays yet — they'll show here.</p>
              )}
            </div>
            {prep.dots.length > 0 && (
              <p className="mt-3 text-sm text-charcoal-600">
                <b>{prep.doneCount}</b> of {prep.dots.length} fully prepped
                {prep.streak >= 2 && (
                  <span className="text-charcoal-400"> · {prep.streak} in a row right now</span>
                )}
              </p>
            )}
          </section>

          {/* Time to plan */}
          <section>
            <h2 className="label text-charcoal-400">Time to plan a service</h2>
            {planTimes.tracked.length === 0 ? (
              <p className="mt-3 text-sm text-charcoal-400">
                Finish a plan in the 15-minute flow (or with the guided coach) and your actual
                planning time lands here.
              </p>
            ) : (
              <>
                <div className="mt-3 space-y-2.5">
                  {planTimes.tracked.map((t) => (
                    <div
                      key={t.date}
                      className="grid grid-cols-[minmax(90px,120px)_1fr_52px] items-center gap-3 text-sm"
                    >
                      <span className="truncate font-semibold text-charcoal-800">
                        {fmtShort(t.date)}
                      </span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-cream-200">
                        <span
                          className="block h-full rounded-full bg-teal-500"
                          style={{ width: `${(t.sec / planTimes.max) * 100}%` }}
                        />
                      </span>
                      <span className="text-right text-xs tabular-nums text-charcoal-400">
                        {fmtDuration(t.sec)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-charcoal-600">
                  Average: <b>{fmtDuration(planTimes.avg)}</b>
                  <span className="text-charcoal-400">
                    {" "}
                    · the goal is a planned service in one honest sitting
                  </span>
                </p>
              </>
            )}
          </section>

          {/* Pastor report */}
          <section>
            {/* A committed dark artifact in BOTH themes — raw hex only, since
                theme tokens (white, cream, charcoal) flip under .dark. */}
            <div className="rounded-2xl bg-[#2e2e2e] p-6 text-[#b0aca6]">
              <h2 className="label text-[#8d877e]">Pastor report · {quarter.label}</h2>
              <p className="mt-3 text-[15px] leading-relaxed">
                <b className="text-lg text-[#ffffff]">{pastor.services}</b> services planned
                &nbsp;·&nbsp; <b className="text-lg text-[#ffffff]">{pastor.songs}</b> songs
                stewarded
                <br />
                <b className="text-lg text-[#ffffff]">{pastor.volunteers}</b> volunteers served
                &nbsp;·&nbsp; <b className="text-lg text-[#ffffff]">{prep.streak}</b>-week prep
                streak
              </p>
              <button
                onClick={printPastor}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#ff6b5e] px-4 py-2 text-xs font-bold text-[#ffffff] shadow-[var(--shadow-coral)] transition hover:bg-[#e85a4d]"
              >
                <Icon name="printer" size={13} /> Print / save as PDF
              </button>
            </div>
            <p className="mt-2 text-xs text-charcoal-400">
              One page your senior pastor actually reads — proof of a faithful quarter.
            </p>
          </section>
        </div>

        {/* Exports */}
        <div className="mt-9 border-t border-charcoal-100 pt-6">
          <h2 className="label text-charcoal-400">Take your data anywhere</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={exportSongs} className={chip}>
              <Icon name="music" size={13} /> Songs CSV
            </button>
            <button onClick={exportServices} className={chip}>
              <Icon name="calendar" size={13} /> Services CSV
            </button>
            <button onClick={exportTeam} className={chip}>
              <Icon name="users" size={13} /> Team CSV
            </button>
            <button onClick={exportCalendar} className={chip}>
              <Icon name="calendar" size={13} /> Calendar file (.ics)
            </button>
            <span className="mx-1 h-5 w-px bg-charcoal-100" />
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                importCsv(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button onClick={() => importRef.current?.click()} className={chip}>
              <Icon name="upload" size={13} /> Import songs from CSV
            </button>
            <span className="text-xs text-charcoal-400">
              Planning Center song exports drop right in.
            </span>
          </div>
          {importNote && (
            <p className="mt-2 text-xs font-semibold text-teal-600">{importNote}</p>
          )}
        </div>
      </div>

      {/* ---- print-only: the Pastor Report page ---- */}
      <div className="print-page hidden print:block">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-600">
          {state.profile.churchName || "Worship ministry"}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase text-charcoal-900">
          Worship ministry · {quarter.label}
        </h1>
        <p className="mt-1 text-sm text-charcoal-600">
          Prepared by {state.profile.name} · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-6">
          {[
            [pastor.services, "services planned and led"],
            [pastor.songs, "songs stewarded in rotation"],
            [pastor.volunteers, "volunteers scheduled and served"],
            [`${prep.streak} weeks`, "current full-prep streak"],
          ].map(([n, label]) => (
            <div key={String(label)} className="border-t-2 border-charcoal-900 pt-3">
              <div className="text-4xl font-extrabold text-charcoal-900">{n}</div>
              <div className="mt-1 text-sm text-charcoal-600">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm leading-relaxed text-charcoal-700">
          Every service this quarter was planned through the Pray · Plan · Prep loop: the heart of
          the service set first, the team confirmed early, and the details closed before Saturday.
          {prep.doneCount > 0 &&
            ` ${prep.doneCount} of the last ${prep.dots.length} Sundays were fully prepared before the weekend.`}
        </p>
        <p className="mt-6 text-xs text-charcoal-400">Prepared with Win the Week · wintheweek.com</p>
      </div>
    </div>
  );
}
