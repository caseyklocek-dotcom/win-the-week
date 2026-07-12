"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { Segmented } from "@/components/fields";
import { ChartSheet } from "@/components/ChartSheet";
import { ALL_KEYS } from "@/lib/music";
import type {
  Service,
  Song,
  LibrarySong,
  ChartLine,
  ChartSection,
  ChartSettings,
} from "@/lib/types";

const FONTS = ["Inter", "Open Sans", "Georgia", "Courier New"];

function id(p: string) {
  return p + "-" + Math.random().toString(36).slice(2, 9);
}

const DEFAULT_SETTINGS: ChartSettings = {
  key: "C",
  capo: 0,
  display: "chords",
  chartType: "chords_lyrics",
  columns: 1,
  style: "full",
  font: "Inter",
  color: true,
};

export default function ChartPage() {
  const { activeService, updateService, songLibrary, updateLibrarySong } = useStore();
  const [songId, setSongId] = useState<string | null>(null);
  const [libId, setLibId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSongId(params.get("song"));
    setLibId(params.get("lib"));
  }, []);

  const svc = activeService;
  const serviceSong = songId ? svc.songs.find((s) => s.id === songId) ?? null : null;
  const librarySong = libId ? songLibrary.find((s) => s.id === libId) ?? null : null;

  // The editor works on either a service song or a library song.
  const song: Song | LibrarySong | null = librarySong ?? serviceSong;

  const patchSong = (fields: Partial<Song & LibrarySong>) => {
    if (librarySong) {
      updateLibrarySong(librarySong.id, fields);
    } else if (serviceSong) {
      updateService(svc.id, (s: Service) => ({
        ...s,
        songs: s.songs.map((sg) => (sg.id === serviceSong.id ? { ...sg, ...fields } : sg)),
      }));
    }
  };

  const defaultKey =
    (song && "serviceKey" in song ? song.serviceKey : "") || song?.originalKey || "C";

  // Ensure a chart object exists for builtin songs
  useEffect(() => {
    if (song && song.chartSource === "builtin" && !song.chart) {
      patchSong({
        chart: {
          sections: [
            {
              id: id("sec"),
              label: "Verse 1",
              abbr: "V1",
              lines: [{ lyrics: "", chords: [] }],
            },
          ],
          settings: { ...DEFAULT_SETTINGS, key: defaultKey },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id]);

  if (!song) {
    return (
      <div className="space-y-3">
        <h1 className="headline text-charcoal-900">CHART EDITOR</h1>
        <p className="text-sm text-charcoal-400">No song selected.</p>
        <Link href="/set" className="text-sm font-semibold text-coral-600 hover:underline">
          ← Back to the worship set
        </Link>
      </div>
    );
  }

  if (song.chartSource !== "builtin" || !song.chart) {
    return (
      <div className="space-y-3">
        <h1 className="headline text-charcoal-900">CHART EDITOR</h1>
        <p className="text-sm text-charcoal-400">
          {song.title} uses{" "}
          {song.chartSource === "pdf" ? "an uploaded PDF chart" : "links only"}. The editor
          is for built-in charts. Switch this song to an editable chart on the worship set.
        </p>
        <Link href="/set" className="text-sm font-semibold text-coral-600 hover:underline">
          ← Back to the worship set
        </Link>
      </div>
    );
  }

  const chart = song.chart;
  const settings = chart.settings;

  const setSettings = (fields: Partial<ChartSettings>) =>
    patchSong({ chart: { ...chart, settings: { ...settings, ...fields } } });

  const setSections = (sections: ChartSection[]) =>
    patchSong({ chart: { ...chart, sections } });

  const updateSection = (secId: string, fields: Partial<ChartSection>) =>
    setSections(chart.sections.map((s) => (s.id === secId ? { ...s, ...fields } : s)));

  const updateLine = (secId: string, lineIdx: number, line: ChartLine) =>
    setSections(
      chart.sections.map((s) =>
        s.id === secId
          ? { ...s, lines: s.lines.map((l, i) => (i === lineIdx ? line : l)) }
          : s,
      ),
    );

  const addLine = (secId: string) =>
    setSections(
      chart.sections.map((s) =>
        s.id === secId ? { ...s, lines: [...s.lines, { lyrics: "", chords: [] }] } : s,
      ),
    );

  const removeLine = (secId: string, lineIdx: number) =>
    setSections(
      chart.sections.map((s) =>
        s.id === secId ? { ...s, lines: s.lines.filter((_, i) => i !== lineIdx) } : s,
      ),
    );

  const addSection = () =>
    setSections([
      ...chart.sections,
      { id: id("sec"), label: "Section", abbr: "S", lines: [{ lyrics: "", chords: [] }] },
    ]);

  const removeSection = (secId: string) =>
    setSections(chart.sections.filter((s) => s.id !== secId));

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/set"
            className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-charcoal-400 hover:text-coral-600"
          >
            <Icon name="chevronDown" size={13} className="rotate-90" /> Worship set
          </Link>
          <h1 className="headline text-charcoal-900">{song.title}</h1>
          <p className="mt-1 text-sm text-charcoal-400">
            {song.artist || "Editable chart"} · written in {song.originalKey}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing((e) => !e)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              editing
                ? "border-coral-400 bg-coral-100 text-coral-600"
                : "border-charcoal-200 text-charcoal-600 hover:border-charcoal-300"
            }`}
          >
            <Icon name="file" size={15} /> {editing ? "Done editing" : "Edit content"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-coral-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,107,94,0.35)] transition hover:bg-coral-600"
          >
            <Icon name="printer" size={15} /> Print / Download
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="no-print rounded-xl border border-charcoal-100 bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <Control label="Key">
            <select
              value={settings.key}
              onChange={(e) => setSettings({ key: e.target.value })}
              className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
            >
              {ALL_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Control>

          <Control label="Capo">
            <select
              value={settings.capo}
              onChange={(e) => setSettings({ capo: parseInt(e.target.value, 10) })}
              className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
                <option key={c} value={c}>
                  {c === 0 ? "None" : c}
                </option>
              ))}
            </select>
          </Control>

          <Control label="Notation">
            <Segmented
              value={settings.display}
              onChange={(v) => setSettings({ display: v })}
              options={[
                { value: "chords", label: "Chords" },
                { value: "numbers", label: "Numbers" },
                { value: "numerals", label: "Numerals" },
                { value: "solfege", label: "Solfege" },
              ]}
            />
          </Control>

          <Control label="Chart type">
            <Segmented
              value={settings.chartType}
              onChange={(v) => setSettings({ chartType: v })}
              options={[
                { value: "chords_lyrics", label: "Chords + lyrics" },
                { value: "lyrics", label: "Lyrics" },
                { value: "chords_only", label: "Chords" },
                { value: "song_map", label: "Map" },
              ]}
            />
          </Control>

          <Control label="Columns">
            <Segmented
              value={String(settings.columns)}
              onChange={(v) => setSettings({ columns: v === "2" ? 2 : 1 })}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
              ]}
            />
          </Control>

          <Control label="Spacing">
            <Segmented
              value={settings.style}
              onChange={(v) => setSettings({ style: v })}
              options={[
                { value: "full", label: "Full" },
                { value: "condensed", label: "Condensed" },
              ]}
            />
          </Control>

          <Control label="Font">
            <select
              value={settings.font}
              onChange={(e) => setSettings({ font: e.target.value })}
              className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Control>

          <Control label="Color">
            <Segmented
              value={settings.color ? "color" : "bw"}
              onChange={(v) => setSettings({ color: v === "color" })}
              options={[
                { value: "color", label: "Color" },
                { value: "bw", label: "B & W" },
              ]}
            />
          </Control>
        </div>
      </div>

      {/* Chart preview / print surface */}
      <div className="rounded-xl border border-charcoal-100 bg-white p-8 print-page">
        <ChartSheet song={song} />
      </div>

      {/* Editor */}
      {editing && (
        <div className="no-print rounded-xl border border-coral-300 bg-coral-100/40 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="label text-coral-600">Edit content</div>
            <p className="text-xs text-charcoal-400">
              Type chords on the top line above the words. Written in {song.originalKey}.
            </p>
          </div>
          <div className="space-y-5">
            {chart.sections.map((sec) => (
              <div key={sec.id} className="rounded-lg border border-charcoal-100 bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={sec.label}
                    onChange={(e) => updateSection(sec.id, { label: e.target.value })}
                    placeholder="Section name"
                    className="rounded-md border border-charcoal-200 px-2 py-1 text-sm font-semibold outline-none focus:border-coral-400"
                  />
                  <input
                    value={sec.abbr}
                    onChange={(e) => updateSection(sec.id, { abbr: e.target.value })}
                    placeholder="Abbr"
                    className="w-16 rounded-md border border-charcoal-200 px-2 py-1 text-sm outline-none focus:border-coral-400"
                  />
                  <button
                    onClick={() => removeSection(sec.id)}
                    className="ml-auto text-xs text-charcoal-400 hover:text-error"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  {sec.lines.map((line, i) => (
                    <LineEditor
                      key={i}
                      line={line}
                      onChange={(l) => updateLine(sec.id, i, l)}
                      onRemove={() => removeLine(sec.id, i)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => addLine(sec.id)}
                  className="mt-3 flex items-center gap-1 text-xs font-semibold text-charcoal-500 hover:text-coral-600"
                >
                  <Icon name="plus" size={13} /> Add line
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addSection}
            className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-charcoal-500 hover:text-coral-600"
          >
            <Icon name="plus" size={15} /> Add section
          </button>
        </div>
      )}
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label text-charcoal-400">{label}</span>
      {children}
    </div>
  );
}

function chordLineFromChords(chords: { sym: string; pos: number }[]) {
  const sorted = [...chords].sort((a, b) => a.pos - b.pos);
  let out = "";
  for (const c of sorted) {
    if (out.length < c.pos) out += " ".repeat(c.pos - out.length);
    out += c.sym + " ";
  }
  return out.replace(/\s+$/, "");
}

function chordsFromLine(line: string) {
  const res: { sym: string; pos: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) res.push({ sym: m[0], pos: m.index });
  return res;
}

function LineEditor({
  line,
  onChange,
  onRemove,
}: {
  line: ChartLine;
  onChange: (l: ChartLine) => void;
  onRemove: () => void;
}) {
  const [chordStr, setChordStr] = useState(chordLineFromChords(line.chords));
  const [lyrics, setLyrics] = useState(line.lyrics);

  useEffect(() => {
    setChordStr(chordLineFromChords(line.chords));
    setLyrics(line.lyrics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line]);

  const commit = (nextChordStr: string, nextLyrics: string) =>
    onChange({ lyrics: nextLyrics, chords: chordsFromLine(nextChordStr) });

  const mono =
    "w-full rounded-md border border-charcoal-100 bg-cream-100 px-2 py-1 font-mono text-sm outline-none focus:border-coral-400 focus:bg-white";

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 space-y-1">
        <input
          value={chordStr}
          onChange={(e) => setChordStr(e.target.value)}
          onBlur={() => commit(chordStr, lyrics)}
          placeholder="C       G       Am"
          spellCheck={false}
          className={`${mono} font-bold text-coral-600`}
        />
        <input
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          onBlur={() => commit(chordStr, lyrics)}
          placeholder="Lyrics for this line"
          className={`${mono} text-charcoal-800`}
        />
      </div>
      <button
        onClick={onRemove}
        className="pt-1 text-charcoal-300 transition hover:text-error"
        title="Remove line"
      >
        <Icon name="check" size={14} className="rotate-45" />
      </button>
    </div>
  );
}
