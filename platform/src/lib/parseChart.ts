import { supabase } from "./supabase";
import { chartPdfUrl } from "./storage";
import type { ChartSection, ChartSettings } from "./types";

// Client helper: send a chord-chart PDF to /api/parse-chart and get back an
// editable chart. Works from a freshly dropped File or from an already-stored
// pdfPath (it fetches the stored file via a signed URL first).

export type ParsedChart = {
  chart: { sections: ChartSection[]; settings: ChartSettings };
  meta: { title: string | null; artist: string | null; originalKey: string | null };
};

type ParseResult = { ok: true; data: ParsedChart } | { ok: false; error: string };

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

async function post(pdfBase64: string): Promise<ParseResult> {
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  let res: Response;
  try {
    res = await fetch("/api/parse-chart", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ pdfBase64 }),
    });
  } catch {
    return { ok: false, error: "Couldn't reach the chart reader." };
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? "Couldn't read that chart." };
  }
  const data = (await res.json()) as ParsedChart;
  return { ok: true, data };
}

export async function parseChartFromFile(file: File): Promise<ParseResult> {
  if (file.type !== "application/pdf") return { ok: false, error: "Please choose a PDF file." };
  return post(await fileToBase64(file));
}

export async function parseChartFromPath(pdfPath: string): Promise<ParseResult> {
  const b64 = await pathToBase64(pdfPath);
  if (!b64) return { ok: false, error: "Couldn't open the stored PDF." };
  return post(b64);
}
