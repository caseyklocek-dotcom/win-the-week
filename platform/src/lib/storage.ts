import { supabase } from "./supabase";

// PDF chart uploads live in the Supabase Storage bucket "charts", under a folder
// per user (so row-level security can keep each leader's files private). Files
// are kept OUT of the app-state row — only the storage path is stored on the song.

const BUCKET = "charts";

type UploadResult =
  | { ok: true; path: string; name: string }
  | { ok: false; error: string };

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

const CHART_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function uploadChartPdf(songId: string, file: File): Promise<UploadResult> {
  if (!supabase) return { ok: false, error: "File storage isn't set up yet." };
  const ext = CHART_EXT[file.type];
  if (!ext) return { ok: false, error: "Use a PDF or an image (PNG, JPG, WebP)." };
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: "You need to be signed in to upload." };

  const path = `${uid}/${songId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path, name: file.name };
}

// A short-lived signed URL to view/print the PDF (bucket is private).
export async function chartPdfUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

export async function removeChartPdf(path: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

// Merge several uploaded chart PDFs into one file and download it. pdf-lib is
// loaded on demand so it doesn't weigh down the rest of the app.
export async function downloadMergedChartPdfs(
  items: { pdfPath: string }[],
  filename: string,
): Promise<string | null> {
  if (items.length === 0) return "No PDF charts to combine.";
  try {
    const { PDFDocument } = await import("pdf-lib");
    const out = await PDFDocument.create();
    for (const it of items) {
      const url = await chartPdfUrl(it.pdfPath);
      if (!url) continue;
      const bytes = await fetch(url).then((r) => r.arrayBuffer());
      const src = await PDFDocument.load(bytes);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    if (out.getPageCount() === 0) return "Couldn't read those PDFs.";
    const data = await out.save();
    const blob = new Blob([data as BlobPart], { type: "application/pdf" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Couldn't build the combined PDF.";
  }
}
