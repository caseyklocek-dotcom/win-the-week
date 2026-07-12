import { renderChord } from "@/lib/music";
import type { ChartLine, ChartSettings, Song, LibrarySong } from "@/lib/types";

// The chart editor renders charts for both per-service songs and library songs;
// both carry the same chart-relevant fields.
type ChartSong = Song | LibrarySong;

function lineSegments(line: ChartLine) {
  const chords = [...line.chords].sort((a, b) => a.pos - b.pos);
  const lyr = line.lyrics ?? "";
  if (chords.length === 0) return [{ chord: null as string | null, text: lyr || "" }];
  const segs: { chord: string | null; text: string }[] = [];
  if (chords[0].pos > 0) segs.push({ chord: null, text: lyr.slice(0, chords[0].pos) });
  chords.forEach((c, i) => {
    const end = i + 1 < chords.length ? chords[i + 1].pos : Math.max(lyr.length, c.pos);
    let text = lyr.slice(c.pos, end);
    if (text.length === 0) text = "\u00A0\u00A0";
    segs.push({ chord: c.sym, text });
  });
  return segs;
}

function ChartLineView({
  line,
  song,
  settings,
}: {
  line: ChartLine;
  song: ChartSong;
  settings: ChartSettings;
}) {
  const chordClass = settings.color ? "text-coral-600" : "text-charcoal-900";
  const showChords =
    settings.chartType === "chords_lyrics" || settings.chartType === "chords_only";
  const showLyrics =
    settings.chartType === "chords_lyrics" || settings.chartType === "lyrics";
  const hasLyrics = (line.lyrics ?? "").trim().length > 0;

  if (!showChords) {
    return <div className="text-charcoal-800">{line.lyrics || "\u00A0"}</div>;
  }

  const render = (sym: string) =>
    renderChord(sym, song.originalKey, settings.key, settings.capo, settings.display);

  if (!hasLyrics) {
    const chords = [...line.chords].sort((a, b) => a.pos - b.pos);
    return (
      <div className={`flex flex-wrap gap-4 text-sm font-bold ${chordClass}`}>
        {chords.map((c, i) => (
          <span key={i}>{render(c.sym)}</span>
        ))}
      </div>
    );
  }

  const segs = lineSegments(line);
  return (
    <div className="flex flex-wrap items-end leading-tight">
      {segs.map((s, i) => (
        <span key={i} className="inline-flex flex-col">
          <span
            className={`whitespace-pre text-sm font-bold ${chordClass}`}
            style={{ minHeight: "1.1em" }}
          >
            {s.chord ? render(s.chord) : "\u00A0"}
          </span>
          <span className={`whitespace-pre ${showLyrics ? "text-charcoal-800" : "invisible"}`}>
            {s.text}
          </span>
        </span>
      ))}
    </div>
  );
}

export function ChartSheet({ song }: { song: ChartSong }) {
  if (song.chartSource !== "builtin" || !song.chart) return null;
  const { sections, settings } = song.chart;

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between border-b border-charcoal-100 pb-3">
        <div>
          <h2 className="text-2xl font-bold text-charcoal-900">{song.title}</h2>
          {song.artist && <p className="text-sm text-charcoal-400">{song.artist}</p>}
        </div>
        <div className="text-right text-sm text-charcoal-500">
          <div>
            Key of <span className="font-bold text-charcoal-900">{settings.key}</span>
            {settings.capo > 0 && ` · Capo ${settings.capo}`}
          </div>
          {song.ccli && <div className="text-xs text-charcoal-400">CCLI #{song.ccli}</div>}
        </div>
      </div>

      {settings.chartType === "song_map" ? (
        <div className="flex flex-wrap gap-2">
          {sections.map((sec) => (
            <span
              key={sec.id}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-bold ${
                settings.color
                  ? "bg-coral-100 text-coral-600"
                  : "bg-cream-200 text-charcoal-800"
              }`}
            >
              {sec.abbr || sec.label}
            </span>
          ))}
        </div>
      ) : (
        <div
          style={{ fontFamily: settings.font }}
          className={settings.columns === 2 ? "gap-8 md:columns-2 chart-cols-2" : ""}
        >
          {sections.map((sec) => (
            <div
              key={sec.id}
              className={`break-inside-avoid ${
                settings.style === "condensed" ? "mb-4" : "mb-7"
              }`}
            >
              <div className="label mb-2 text-coral-600">{sec.label}</div>
              <div className={settings.style === "condensed" ? "space-y-1" : "space-y-2.5"}>
                {sec.lines.map((line, i) => (
                  <ChartLineView key={i} line={line} song={song} settings={settings} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
