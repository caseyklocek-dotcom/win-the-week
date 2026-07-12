"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

interface AuthApi {
  // True when a Supabase project is wired up. When false, the app runs in
  // local-only mode (no accounts) exactly as it did before the backend.
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  // Send a magic-link sign-in email. Returns an error message on failure.
  signInWithEmail: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // When auth is disabled, there's nothing to load — start ready.
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string): Promise<string | null> => {
    if (!supabase) return "Sign-in isn't configured yet.";
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Magic link lands back on /login, which forwards to the app once the
        // session is detected from the URL.
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      },
    });
    if (!error) return null;
    // Surface something useful even when Supabase returns an empty/opaque body.
    console.error("Magic link sign-in error:", error);
    const msg = (error.message ?? "").trim();
    if (!msg || msg === "{}") {
      return `Couldn't send the link${
        error.status ? ` (status ${error.status})` : ""
      }. This is almost always the email/SMTP setup in Supabase — check Authentication → Emails.`;
    }
    return msg;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        enabled: isSupabaseConfigured,
        loading,
        session,
        user: session?.user ?? null,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
