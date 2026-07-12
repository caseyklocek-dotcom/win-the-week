"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";
export const THEME_KEY = "wtw_theme";

// Resolve a preference to the actual mode, consulting the OS for "system".
function resolve(pref: ThemePref): "light" | "dark" {
  if (pref === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

function apply(mode: "light" | "dark") {
  const el = document.documentElement;
  el.classList.toggle("dark", mode === "dark");
}

interface ThemeApi {
  theme: ThemePref; // the user's preference
  resolved: "light" | "dark"; // what's actually showing
  setTheme: (t: ThemePref) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Read the saved preference once on mount.
  useEffect(() => {
    const saved =
      (localStorage.getItem(THEME_KEY) as ThemePref | null) ?? "system";
    setThemeState(saved);
    const r = resolve(saved);
    setResolved(r);
    apply(r);
  }, []);

  // When following the system, react to OS changes live.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = resolve("system");
      setResolved(r);
      apply(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (t: ThemePref) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    const r = resolve(t);
    setResolved(r);
    apply(r);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

// Runs before paint to set the correct class and avoid a flash of the
// wrong theme. Injected as an inline script in the document head.
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
