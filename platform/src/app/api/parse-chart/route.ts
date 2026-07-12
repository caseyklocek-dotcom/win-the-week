import { NextResponse } from "next/server";
import { ALL_KEYS } from "@/lib/music";

// POST /api/parse-chart
// Body: { pdfBase64: string, filename?: string }
// Returns: { chart: { sections, settings }, meta: { title, artist, originalKey } }
//
// Reads a dropped chord-chart PDF with an AI model and returns it in the app's
// editable-chart shape. The model call is isolated in callModel() so the backend
// (Claude today; an OpenAI-compatible host or local Ollama later) is a one-line
// swap driven by env vars — no other code changes.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROVIDER = process.env.CHART_PARSE_PROVIDER ?? "gemini";
const MODEL =
  process.env.CHART_PARSE_MODEL ??
  (PROVIDER === "gemini" ? "gemini-2.5-flash" : "claude-sonnet-4-6");
const MAX_PDF_BYTES = 12 * 1024 * 1024; // 12MB cap (base64-decoded)

const DEFAULT_SETTINGS = {
  key: "C",
  capo: 0,
  display: "chords" as const,
  chartType: "chords_lyrics" as const,
  columns: 1 as const,
  style: "full" as const,
  font: "Inter",
  color: true,
};

const PROMPT = `You are converting a worship/song chord chart (provided as a PDF) into structured JSON for a chart editor.

Read the chart and return ONLY a JSON object (no markdown, no commentary) with this exact shape:

{
  "title": string | null,
  "artist": string | null,
  "originalKey": string | null,
  "sections": [
    {
      "label": string,        // e.g. "Verse 1", "Chorus", "Bridge", "Intro", "Tag"
      "abbr": string,         // short tag: "V1", "C", "B", "I", "T"
      "lines": [
        {
          "lyrics": string,   // the lyric line; "" for chord-only / instrumental lines
          "chords": [ { "sym": string, "pos": number } ]
        }
      ]
    }
  ]
}

Rules:
- "sym" is the chord symbol exactly as written (e.g. "G", "D/F#", "Em7", "Asus4").
- "pos" is the 0-based CHARACTER INDEX into that line's "lyrics" where the chord sits above. Read the horizontal position of each chord over the words and map it to the closest character. For chord-only lines (no lyrics), set lyrics to "" and space chords out using pos as evenly increasing indices (e.g. 0, 8, 16).
- Keep the section order as printed. Split repeated sections (Verse 1, Verse 2) into separate sections.
- "originalKey" must be one of: ${ALL_KEYS.join(", ")}. Infer it from the key label on the chart or the first/most-common chord. Use null only if truly indeterminate.
- Do not invent lyrics or chords that aren't on the page. Preserve line breaks as separate line objects.
- Return the JSON and nothing else.`;

type RawLine = { lyrics?: unknown; chords?: unknown };
type RawSection = { label?: unknown; abbr?: unknown; lines?: unknown };
type RawChart = {
  title?: unknown;
  artist?: unknown;
  originalKey?: unknown;
  sections?: unknown;
};

function rid(p: string) {
  return p + "-" + Math.random().toString(36).slice(2, 9);
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeKey(v: unknown): string | null {
  const s = str(v).trim();
  if (!s) return null;
  // exact match first, then case-insensitive
  if (ALL_KEYS.includes(s)) return s;
  const hit = ALL_KEYS.find((k) => k.toLowerCase() === s.toLowerCase());
  return hit ?? null;
}

function normalizeChords(v: unknown): { sym: string; pos: number }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => {
      const sym = str((c as { sym?: unknown })?.sym).trim();
      const posRaw = (c as { pos?: unknown })?.pos;
      const pos = typeof posRaw === "number" && isFinite(posRaw) ? Math.max(0, Math.round(posRaw)) : 0;
      return { sym, pos };
    })
    .filter((c) => c.sym.length > 0);
}

function normalizeChart(raw: RawChart) {
  const sectionsIn = Array.isArray(raw.sections) ? (raw.sections as RawSection[]) : [];
  const sections = sectionsIn
    .map((sec) => {
      const linesIn = Array.isArray(sec.lines) ? (sec.lines as RawLine[]) : [];
      const lines = linesIn.map((l) => ({
        lyrics: str(l.lyrics),
        chords: normalizeChords(l.chords),
      }));
      return {
        id: rid("sec"),
        label: str(sec.label, "Section"),
        abbr: str(sec.abbr, "S"),
        lines: lines.length ? lines : [{ lyrics: "", chords: [] }],
      };
    })
    .filter((s) => s.lines.length > 0);

  const originalKey = normalizeKey(raw.originalKey);
  const settings = { ...DEFAULT_SETTINGS, key: originalKey ?? "C" };

  return {
    chart: { sections, settings },
    meta: {
      title: str(raw.title) || null,
      artist: str(raw.artist) || null,
      originalKey,
    },
    ok: sections.length > 0,
  };
}

function extractJson(text: string): RawChart | null {
  if (!text) return null;
  // strip code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as RawChart;
  } catch {
    return null;
  }
}

// ---- Model call (swappable backend) ----------------------------------------
// Returns the model's raw text reply (expected to be JSON). Backend is chosen by
// CHART_PARSE_PROVIDER so swapping to a local Ollama / other host later is a
// config change, not a code change.
async function callModel(pdfBase64: string): Promise<string> {
  if (PROVIDER === "gemini") return callGemini(pdfBase64);
  if (PROVIDER === "anthropic") return callAnthropic(pdfBase64);
  throw new Error(`Unsupported CHART_PARSE_PROVIDER: ${PROVIDER}`);
}

// Models occasionally return a transient overload (429/5xx). Retry a few times
// with a short backoff so a momentary spike doesn't surface to the user.
const RETRYABLE = [429, 500, 502, 503, 529];
async function fetchRetry(url: string, init: RequestInit, tries = 4): Promise<Response> {
  let res: Response | null = null;
  for (let i = 0; i < tries; i++) {
    res = await fetch(url, init);
    if (res.ok || !RETRYABLE.includes(res.status)) return res;
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 900 * (i + 1)));
  }
  return res as Response;
}

// Google Gemini — free tier, no card, reads PDFs natively. JSON output is forced
// via responseMimeType so we get clean machine-readable replies.
async function callGemini(pdfBase64: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  const res = await fetchRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          maxOutputTokens: 65536,
          // Turn off the model's "thinking" budget — not needed for extraction,
          // and it was consuming the output budget on long charts.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Model request failed (${res.status}). ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  };
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("\n");
  if (!text.trim()) {
    throw new Error(`Model returned no text (finishReason: ${cand?.finishReason ?? "unknown"}).`);
  }
  return text;
}

// Anthropic Claude — paid, kept available behind CHART_PARSE_PROVIDER=anthropic.
async function callAnthropic(pdfBase64: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  const res = await fetchRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Model request failed (${res.status}). ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
}

// ---- Auth: require a valid Supabase session when Supabase is configured -----
async function authorized(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // localStorage phase (no Supabase): allow — dev / single-user beta.
  if (!url || !key) return true;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let pdfBase64 = "";
  try {
    const body = (await req.json()) as { pdfBase64?: string };
    pdfBase64 = (body.pdfBase64 ?? "").replace(/^data:.*;base64,/, "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!pdfBase64) {
    return NextResponse.json({ error: "No PDF provided." }, { status: 400 });
  }
  // rough decoded-size guard (base64 is ~4/3 of bytes)
  if ((pdfBase64.length * 3) / 4 > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "That PDF is too large to read." }, { status: 413 });
  }

  try {
    const reply = await callModel(pdfBase64);
    const raw = extractJson(reply);
    if (!raw) {
      return NextResponse.json({ error: "Couldn't read a chart from that PDF." }, { status: 422 });
    }
    const result = normalizeChart(raw);
    if (!result.ok) {
      return NextResponse.json({ error: "No chart sections found in that PDF." }, { status: 422 });
    }
    return NextResponse.json({ chart: result.chart, meta: result.meta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Couldn't process that PDF.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
