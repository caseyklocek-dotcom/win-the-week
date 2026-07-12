import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client for the client-only (localStorage-phase) app.
//
// Auth is OPTIONAL until the project is configured: if the env vars aren't set,
// `supabase` is null and the app keeps running on localStorage exactly as before.
// Once NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are present
// (in .env.local for dev, or Vercel project env for prod), real accounts turn on.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's newer "publishable" key (sb_publishable_…) is preferred; the legacy
// "anon" JWT key still works as a fallback. Either is safe in the browser.
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, publishableKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
