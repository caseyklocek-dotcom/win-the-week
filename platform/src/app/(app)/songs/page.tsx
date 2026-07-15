"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { Label } from "@/components/ui";
import { EditableText } from "@/components/fields";
import { Icon } from "@/components/Icon";
import { PdfChartControl } from "@/components/PdfChartControl";
import { LibraryImport } from "@/components/LibraryImport";
import { songLinks } from "@/lib/links";
import { BrandIcon } from "@/components/BrandIcon";
import { ALL_KEYS, countLabel, fmtDuration } from "@/lib/music";
import { blankLibrarySong, libraryPatchFromParsedMeta, songFromLibrary } from "@/lib/library";
import { sectionSongIds } from "@/lib/set";
import type { LibrarySong, Service } from "@/lib/types";

const FLOWS = ["Opener", "Adoration", "Communion", "Response", "Sending", "Special"];

function NewSongModal({
  onDone,
  onCancel,
}: {
  onDone: (fields: { title: string; artist: string; originalKey: string; defaultFlow: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("G");
  const [flow, setFlow] = useState("Opener");
  const titleRef = useRef<HTMLInputElement>(null);

  const handleDone = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      titleRef.current?.focus();
      return;
    }
    onDone({ title: trimmed, artist: artist.trim(), originalKey: key, defaultFlow: flow });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-charcoal-100 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-800">
            New Song
          </h2>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <Label>Title *</Label>
            <input
              ref={titleRef}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDone()}
              placeholder="Song title"
              className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
            />
          </div>
          <div>
            <Label>Artist</Label>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist or songwriter"
              className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Chart key</Label>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none focus:border-coral-400"
              >
                {ALL_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Usual flow</Label>
              <select
                value={flow}
                onChange={(e) => setFlow(e.target.value)}
                className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none focus:border-coral-400"
              >
                {FLOWS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-charcoal-100 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const CHART_META: Record<string, { label: string; tone: string }> = {
  builtin: { label: "Editable chart", tone: "bg-coral-100 text-coral-600" },
  pdf: { label: "PDF chart", tone: "bg-ok-tint text-ok-ink" },
  none: { label: "No chart", tone: "bg-cream-200 text-charcoal-400" },
};

// A selection is keyed by "serviceId::sectionId" so we can span multiple services.
type SectionKey = string; // `${serviceId}::${sectionId}`

function fmtServiceDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function UseInSetModal({
  lib,
  onClose,
}: {
  lib: LibrarySong;
  onClose: () => void;
}) {
  const { state, updateService } = useStore();
  const services = state?.services ?? [];
  const [selected, setSelected] = useState<Set<SectionKey>>(new Set());
  const [key, setKey] = useState(lib.originalKey);

  const toggle = (k: SectionKey) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const handleDone = () => {
    if (selected.size === 0) { onClose(); return; }
    // Group selections by service so we only call updateService once per service.
    const byService: Record<string, string[]> = {};
    for (const k of selected) {
      const [svcId, secId] = k.split("::");
      if (!byService[svcId]) byService[svcId] = [];
      byService[svcId].push(secId);
    }
    for (const [svcId, sectionIds] of Object.entries(byService)) {
      // Each section gets its own song instance with a unique id.
      updateService(svcId, (svc: Service) => {
        let next = { ...svc, songs: [...svc.songs] };
        for (const secId of sectionIds) {
          const song = { ...songFromLibrary(lib), serviceKey: key };
          next = {
            ...next,
            songs: [...next.songs, song],
            setSections: next.setSections.map((sec) =>
              sec.id === secId
                ? { ...sec, rows: [...sec.rows, { kind: "song", refId: song.id }] }
                : sec,
            ),
          };
        }
        return next;
      });
    }
    onClose();
  };

  const hasAnySections = services.some((s) => s.setSections.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-charcoal-100 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-800">
            Use in a set
          </h2>
          <p className="mt-0.5 truncate text-xs text-charcoal-400">{lib.title}</p>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Key picker */}
          <div>
            <Label>Sunday key</Label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none focus:border-coral-400"
            >
              {ALL_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Services + sections */}
          <div>
            <Label>Add to set</Label>
            {!hasAnySections ? (
              <p className="mt-2 text-xs text-charcoal-400">
                No set sections yet. Build a set first on the Set page.
              </p>
            ) : (
              <div className="mt-2 space-y-4">
                {services.map((svc) => {
                  if (svc.setSections.length === 0) return null;
                  return (
                    <div key={svc.id}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-400">
                        {fmtServiceDate(svc.date)}
                      </p>
                      <div className="space-y-0.5">
                        {svc.setSections.map((sec) => {
                          const k: SectionKey = `${svc.id}::${sec.id}`;
                          return (
                            <label
                              key={sec.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-cream-100"
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(k)}
                                onChange={() => toggle(k)}
                                className="h-4 w-4 rounded border-charcoal-200 text-coral-500 focus:ring-coral-400"
                              />
                              <span className="flex-1 text-sm font-semibold text-charcoal-700">
                                {sec.label}
                              </span>
                              <span className="text-xs text-charcoal-400">
                                {countLabel(sectionSongIds(sec).length, "song")}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-charcoal-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            disabled={selected.size === 0}
            className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600 disabled:opacity-40 disabled:cursor-default"
          >
            Done{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SongsPage() {
  // useSearchParams (inside) requires a Suspense boundary for prerendering.
  return (
    <Suspense fallback={null}>
      <SongsPageInner />
    </Suspense>
  );
}

function SongsPageInner() {
  const { state, songLibrary, addLibrarySong, updateLibrarySong, removeLibrarySong, checkpoint } =
    useStore();
  const [q, setQ] = useState("");
  // ?q= lets the command palette (and any link) land here pre-filtered.
  // Read reactively — on client-side nav the page can mount before the URL
  // commits, so a one-shot read misses the param.
  const searchParams = useSearchParams();
  useEffect(() => {
    const v = searchParams.get("q");
    if (v) setQ(v);
  }, [searchParams]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [useInSetSong, setUseInSetSong] = useState<LibrarySong | null>(null);

  // How many seeded/active services currently use each catalog song.
  const usage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const svc of state.services) {
      for (const song of svc.songs) {
        if (song.libraryId) counts[song.libraryId] = (counts[song.libraryId] ?? 0) + 1;
      }
    }
    return counts;
  }, [state.services]);

  const results = useMemo(() => {
    const sorted = [...songLibrary].sort((a, b) => a.title.localeCompare(b.title));
    const term = q.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter((l) => (l.title + " " + l.artist).toLowerCase().includes(term));
  }, [q, songLibrary]);

  const handleModalDone = (fields: {
    title: string;
    artist: string;
    originalKey: string;
    defaultFlow: string;
  }) => {
    const lib = { ...blankLibrarySong(), ...fields };
    addLibrarySong(lib);
    setQ("");
    setOpenId(lib.id);
    setShowModal(false);
  };

  const totalSec = songLibrary.reduce((n, l) => n + (l.durationSec || 0), 0);

  return (
    <>
    {showModal && (
      <NewSongModal
        onDone={handleModalDone}
        onCancel={() => setShowModal(false)}
      />
    )}
    {useInSetSong && (
      <UseInSetModal
        lib={useInSetSong}
        onClose={() => setUseInSetSong(null)}
      />
    )}
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label text-coral-600">Your library</p>
          <h1 className="headline mt-1.5 text-3xl text-charcoal-900 lg:text-4xl">SONGS</h1>
          <p className="mt-1 text-sm text-charcoal-400">
            Your reusable library. Every song in one place, ready to drop into any set.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-charcoal-500">
          <span className="flex items-center gap-1.5">
            <Icon name="music" size={16} /> {countLabel(songLibrary.length, "song")}
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="clock" size={16} /> {fmtDuration(totalSec)} total
          </span>
        </div>
      </div>

      {/* Search + add */}
      <div data-tour="songs" className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-charcoal-100 bg-white px-3 py-2 focus-within:border-coral-400">
          <Icon name="music" size={16} className="text-charcoal-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your library…"
            className="w-full bg-transparent text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-4 py-2 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition-colors hover:bg-coral-600"
        >
          <Icon name="plus" size={16} /> New song
        </button>
      </div>

      {/* Bring-your-binder import: files or pasted text → complete songs */}
      <LibraryImport />

      {songLibrary.length === 0 ? (
        <div className="border-t border-charcoal-100 py-10 text-center">
          <p className="text-sm font-semibold text-charcoal-500">Your library is empty — for now.</p>
          <p className="mt-1 text-sm text-charcoal-400">
            Drop a chart above and it becomes a song in seconds, or start one by hand.
          </p>
        </div>
      ) : results.length === 0 ? (
        <p className="border-t border-charcoal-100 py-8 text-center text-sm text-charcoal-400">
          No songs match that search.
        </p>
      ) : (
        <div className="border-t border-charcoal-100">
          {results.map((lib) => (
            <LibraryRow
              key={lib.id}
              lib={lib}
              uses={usage[lib.id] ?? 0}
              open={openId === lib.id}
              onToggle={() => setOpenId((id) => (id === lib.id ? null : lib.id))}
              onUpdate={(fields) => updateLibrarySong(lib.id, fields)}
              onRemove={() => {
                checkpoint(`${lib.title} removed from the song library`);
                removeLibrarySong(lib.id);
                setOpenId(null);
              }}
              onUseInSet={() => setUseInSetSong(lib)}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}

function LibraryRow({
  lib,
  uses,
  open,
  onToggle,
  onUpdate,
  onRemove,
  onUseInSet,
}: {
  lib: LibrarySong;
  uses: number;
  open: boolean;
  onToggle: () => void;
  onUpdate: (fields: Partial<LibrarySong>) => void;
  onRemove: () => void;
  onUseInSet: () => void;
}) {
  const meta = CHART_META[lib.chartSource];
  return (
    <div>
      {/* Whole row is the target — hover tints it, the chevron shows the state.
          The editor below is a SIBLING (never nested in this button). */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`group flex w-full items-center gap-3 border-b border-cream-200 py-3 pl-2 pr-1 text-left transition-colors active:scale-100 ${
          open ? "bg-cream-200/50" : "hover:bg-cream-200/50"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-100 text-coral-600 transition-colors group-hover:bg-coral-200/70">
          <Icon name="music" size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-charcoal-800 transition-colors group-hover:text-coral-700">
              {lib.title}
            </span>
            {lib.artist && <span className="text-xs text-charcoal-400">{lib.artist}</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-charcoal-400">
            <span>Key {lib.originalKey}</span>
            <span>·</span>
            <span>{fmtDuration(lib.durationSec)}</span>
            <span>·</span>
            <span>{lib.defaultFlow}</span>
            {lib.tempo ? (
              <>
                <span>·</span>
                <span>{lib.tempo} bpm</span>
              </>
            ) : null}
            <span>·</span>
            <span>
              {uses > 0 ? `In ${uses} service${uses === 1 ? "" : "s"}` : "Not scheduled"}
            </span>
          </span>
        </span>
        <span
          className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline ${meta.tone}`}
        >
          {meta.label}
        </span>
        <span className="flex shrink-0 items-center gap-1 pr-1 text-xs font-semibold text-charcoal-400 transition-colors group-hover:text-coral-600">
          {open ? "Close" : "Edit"}
          <Icon
            name="chevronDown"
            size={14}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="anim-page-in space-y-4 border-b border-cream-200 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <EditableText value={lib.title} onCommit={(v) => onUpdate({ title: v })} />
            </Field>
            <Field label="Artist">
              <EditableText value={lib.artist} onCommit={(v) => onUpdate({ artist: v })} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-charcoal-400">
              Chart key
              <select
                value={lib.originalKey}
                onChange={(e) => onUpdate({ originalKey: e.target.value })}
                className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
              >
                {ALL_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-charcoal-400">
              Usual flow
              <select
                value={lib.defaultFlow}
                onChange={(e) => onUpdate({ defaultFlow: e.target.value })}
                className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
              >
                {FLOWS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-charcoal-400">
              Length
              <input
                type="text"
                defaultValue={fmtDuration(lib.durationSec)}
                onBlur={(e) => onUpdate({ durationSec: parseDuration(e.target.value) })}
                placeholder="4:00"
                className="w-16 rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
              />
            </label>
          </div>

          <Field label="Chart">
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {([
                ["builtin", "Editable chart"],
                ["pdf", "PDF upload"],
                ["none", "Links only"],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onUpdate({ chartSource: val })}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    lib.chartSource === val
                      ? "border-coral-400 bg-coral-100 text-coral-700"
                      : "border-charcoal-200 bg-white text-charcoal-600 hover:border-coral-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {lib.chartSource === "builtin" && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={`/chart?lib=${lib.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-3 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
                >
                  <Icon name="pencil" size={13} />{" "}
                  {lib.chart ? "Edit chart" : "Create a chart"}
                </Link>
                <span className="text-xs text-charcoal-400">
                  Build a chord chart you can transpose to any key and print.
                </span>
              </div>
            )}
            {lib.chartSource === "pdf" && (
              <PdfChartControl
                songId={lib.id}
                pdfPath={lib.pdfPath}
                pdfName={lib.pdfName}
                onChange={({ meta, ...chartFields }) =>
                  onUpdate({
                    ...chartFields,
                    ...(meta ? libraryPatchFromParsedMeta(lib, meta) : {}),
                  })
                }
              />
            )}
          </Field>

          <Field label="CCLI #">
            <EditableText
              value={lib.ccli ?? ""}
              onCommit={(v) => onUpdate({ ccli: v })}
              placeholder="e.g. 7016161"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Multitracks link">
              <EditableText
                value={lib.multitracksUrl ?? ""}
                onCommit={(v) => onUpdate({ multitracksUrl: v })}
                placeholder="https://www.multitracks.com/..."
              />
            </Field>
            <Field label="SongSelect link">
              <EditableText
                value={lib.songSelectUrl ?? ""}
                onCommit={(v) => onUpdate({ songSelectUrl: v })}
                placeholder="https://songselect.ccli.com/..."
              />
            </Field>
            <Field label="YouTube link">
              <EditableText
                value={lib.youtubeUrl ?? ""}
                onCommit={(v) => onUpdate({ youtubeUrl: v })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </Field>
            <Field label="Spotify link">
              <EditableText
                value={lib.spotifyUrl ?? ""}
                onCommit={(v) => onUpdate({ spotifyUrl: v })}
                placeholder="https://open.spotify.com/track/..."
              />
            </Field>
          </div>

          {/* One-tap jumps to where leaders already look songs up, with the
              real logo for each — saved links win; otherwise these are
              prefilled searches on title + artist. */}
          <div>
            <span className="text-xs font-semibold text-charcoal-400">Find it on</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {songLinks(lib).map((l) => (
                <a
                  key={l.brand}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={l.saved ? `Open your ${l.label} link` : `Search ${l.label} for this song`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-charcoal-100 py-1 pl-1 pr-3 text-xs font-semibold text-charcoal-600 transition hover:border-coral-300 hover:text-coral-600"
                >
                  <BrandIcon brand={l.brand} size={20} className="shrink-0 rounded-full" />
                  {l.label}
                  {!l.saved && (
                    <span className="text-charcoal-300 group-hover:text-coral-400">search</span>
                  )}
                </a>
              ))}
            </div>
          </div>

          <Field label="Notes">
            <EditableText
              value={lib.notes ?? ""}
              onCommit={(v) => onUpdate({ notes: v })}
              multiline
              placeholder="Arrangement notes, who leads it best, when you've used it…"
            />
          </Field>

          <div className="flex items-center justify-between">
            <button
              onClick={onUseInSet}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:underline"
            >
              Use it in a set <Icon name="arrowRight" size={13} />
            </button>
            <button
              onClick={onRemove}
              className="text-xs font-semibold text-charcoal-400 transition hover:text-error"
            >
              Remove from library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}


function parseDuration(v: string): number {
  const t = v.trim();
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    return (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
  }
  return (parseInt(t, 10) || 0) * 60;
}
