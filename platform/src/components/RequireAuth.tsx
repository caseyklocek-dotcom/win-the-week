"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Gates the app group. When Supabase is configured, a session is required —
// signed-out visitors land on the public welcome page (what Win the Week is,
// plans, beta application) instead of a bare login form. When it's NOT
// configured, the app runs in local-only mode exactly as before (no gate),
// so nothing breaks before Casey wires up the project keys.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { enabled, loading, session } = useAuth();

  const blocked = enabled && !loading && !session;

  useEffect(() => {
    if (blocked) router.replace("/welcome");
  }, [blocked, router]);

  if (!enabled) return <>{children}</>;

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 text-charcoal-400">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
