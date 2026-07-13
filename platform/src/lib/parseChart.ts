import { supabase } from "./supabase";
import { chartPdfUrl } from "./storage";
import type { ChartSection, ChartSettings } from "./types";

// Client helper: send a chord chart — a PDF, a photo/screenshot, or pasted
// text — to /api/parse-chart and get back an editable chart plus every song
// detail the model could read off the page (tempo, CCLI, themes, flow).

export type ParsedMeta = {
  title: string | null;
  artist: string | null;
  originalKey: string | null;
  tempo: number | null;
  timeSignature: string | null;
  ccli: string | null;
  themes: string[];
  suggestedFlow: string | null;
};

export type ParsedChart = {
  chart: { sections: ChartSection[]; settings: ChartSettings };
  meta: ParsedMeta;
};

type ParseResult = { ok: true; data: ParsedChart } | { ok: false; error: string };

export const CHART_FILE_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];
export const CHART_FILE_ACCEPT = "application/pdf,.pdf,image/png,image/jpeg,image/webp";

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fileToBase64(file: File): Promise<string> {
  return bufferToBase64(await file.arrayBuffer());
}

async function pathToBase64(pdfPath: string): Promise<string | null> {
  const url = await chartPdfUrl(pdfPath);
  if (!url) return null;
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  return bufferToBase64(buf);
}

async function post(body: {
  fileBase64?: string;
  mimeType?: string;
  textContent?: string;
}): Promise<ParseResult> {
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  let res: Response;
  try {
    res = await fetch("/api/parse-chart", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "Couldn't reach the chart reader." };
  }
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: errBody.error ?? "Couldn't read that chart." };
  }
  const data = (await res.json()) as ParsedChart;
  return { ok: true, data };
}

export async function parseChartFromFile(file: File): Promise<ParseResult> {
  if (!CHART_FILE_MIMES.includes(file.type)) {
    return { ok: false, error: "Use a PDF or an image (PNG, JPG, WebP)." };
  }
  return post({ fileBase64: await fileToBase64(file), mimeType: file.type });
}

export async function parseChartFromPath(pdfPath: string): Promise<ParseResult> {
  const b64 = await pathToBase64(pdfPath);
  if (!b64) return { ok: false, error: "Couldn't open the stored PDF." };
  return post({ fileBase64: b64, mimeType: "application/pdf" });
}

export async function parseChartFromText(text: string): Promise<ParseResult> {
  if (!text.trim()) return { ok: false, error: "Paste the chart text first." };
  return post({ textContent: text });
}
