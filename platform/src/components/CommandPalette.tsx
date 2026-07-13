"use client";

// ============================================================
// ⌘K Command Palette — run anything from anywhere.
//
// One box that answers "where do I find ___?" forever: type a page, a song,
// a Sunday, or an action and hit Enter. Opens with ⌘K / Ctrl+K, the pill in
// the top nav, or a `wtw:cmdk` window event from any component.
//
// Items come from three places:
//   - static routes (every page in the app, with search keywords)
//   - live data (upcoming services to switch to, songs in the library)
//   - actions (mode + theme switches — more get registered as V2 grows)
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { profileMode } from "@/lib/mode";
import { Icon } from "./Icon";

export const CMDK_EVENT = "wtw:cmdk";

/** Any component can open the palette without prop-drilling. */
export function openPalette() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CMDK_EVENT));
}

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string; // right-aligned context (e.g. artist, date, "page")
  icon: string;
  keywords: string; // extra search terms, lowercase
  run: () => void;
}

function fmtServiceDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Every-page routes. `keywords` catch the words a leader would actually type.
const ROUTES: { href: string; label: string; icon: string; keywords: string; hint?: string }[] = [
  { href: "/", label: "This Sunday", icon: "home", keywords: "home dashboard today overview" },
  { href: "/quick", label: "The 15-minute plan", icon: "sparkle", keywords: "quick plan fast fifteen 15 minute wizard flow" },
  { href: "/plan", label: "Plan the service", icon: "check", keywords: "plan pray prep loop service" },
  { href: "/set", label: "Worship set", icon: "music", keywords: "set songs order setlist build" },
  { href: "/team", label: "Team for this Sunday", icon: "users", keywords: "team roster assign roles fill" },
  { href: "/rehearse", label: "Rehearsal", icon: "check", keywords: "rehearse rehearsal practice run" },
  { href: "/send", label: "Send the week", icon: "users", keywords: "send comms links packets team text nudge confirm" },
  { href: "/packet", label: "Service packet", icon: "printer", keywords: "packet print pdf charts export send" },
  { href: "/calendar", label: "Calendar & runway", icon: "calendar", keywords: "calendar runway weeks 8 four three two one schedule" },
  { href: "/songs", label: "Song library", icon: "music", keywords: "songs library catalog music charts" },
  { href: "/people", label: "People", icon: "users", keywords: "people team members contacts volunteers" },
  { href: "/reports", label: "Reports", icon: "target", keywords: "reports rotation serving load burnout pastor export csv insights analytics import" },
  { href: "/invest", label: "Invest your week", icon: "target", keywords: "invest grow growth long game develop" },
  { href: "/invest/compass", label: "Leader Compass", icon: "target", keywords: "compass assessment eight areas leadership invest" },
  { href: "/invest/leaders", label: "Leaders On Deck", icon: "users", keywords: "leaders on deck bench develop raise track invest" },
  { href: "/invest/goals", label: "Quarterly goals", icon: "target", keywords: "goals quarter targets invest" },
  { href: "/tools", label: "Tools", icon: "tool", keywords: "tools templates rehearsal team" },
  { href: "/community", label: "Community", icon: "community", keywords: "community posts leaders feed messages" },
  { href: "/profile", label: "Profile & settings", icon: "settings", keywords: "profile settings church account photo service time" },
];

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, setState, songLibrary, setActiveService } = useStore();
  const { setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const mode = profileMode(state.profile);

  // ---- open/close wiring ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(CMDK_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(CMDK_EVENT, onOpen);
    };
  }, []);

  // Reset + focus on open; close on route change.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSel(0);
      // after the overlay paints
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  // ---- build the item list ----
  const items = useMemo<PaletteItem[]>(() => {
    const out: PaletteItem[] = [];

    for (const r of ROUTES) {
      out.push({
        id: `route:${r.href}`,
        group: "Go to",
        label: r.label,
        hint: r.hint,
        icon: r.icon,
        keywords: r.keywords,
        run: () => go(r.href),
      });
    }

    // Upcoming services — switch which Sunday you're working on.
    const todayIso = new Date().toISOString().slice(0, 10);
    const upcoming = [...state.services]
      .filter((s) => s.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
    for (const svc of upcoming) {
      const active = svc.id === state.activeServiceId;
      out.push({
        id: `svc:${svc.id}`,
        group: "Sundays",
        label: `${fmtServiceDate(svc.date)} · ${svc.title || "Untitled service"}`,
        hint: active ? "current" : "switch to",
        icon: "calendar",
        keywords: `sunday service switch ${svc.title.toLowerCase()} ${svc.season?.toLowerCase() ?? ""}`,
        run: () => {
          setActiveService(svc.id);
          go("/plan");
        },
      });
    }

    // Songs — jump straight into the library filtered to the song.
    for (const song of songLibrary.slice(0, 60)) {
      out.push({
        id: `song:${song.id}`,
        group: "Songs",
        label: song.title,
        hint: song.artist || undefined,
        icon: "music",
        keywords: `song ${song.title.toLowerCase()} ${song.artist.toLowerCase()}`,
        run: () => go(`/songs?q=${encodeURIComponent(song.title)}`),
      });
    }

    // Actions
    out.push({
      id: "act:mode",
      group: "Actions",
      label: mode === "guided" ? "Switch to Fast mode" : "Switch to Guided mode",
      hint: mode === "guided" ? "keyboard-first, no hand-holding" : "step-by-step with coaching",
      icon: "sparkle",
      keywords: "mode fast guided switch experience coach speed",
      run: () => {
        setState((s) => ({
          ...s,
          profile: { ...s.profile, mode: mode === "guided" ? "fast" : "guided" },
        }));
        setOpen(false);
      },
    });
    for (const t of ["light", "dark", "system"] as const) {
      out.push({
        id: `act:theme-${t}`,
        group: "Actions",
        label: `Theme: ${t[0].toUpperCase()}${t.slice(1)}`,
        icon: "settings",
        keywords: `theme ${t} dark light mode appearance`,
        run: () => {
          setTheme(t);
          setOpen(false);
        },
      });
    }

    return out;
  }, [state.services, state.activeServiceId, songLibrary, mode, go, setActiveService, setState, setTheme]);

  // ---- filter ----
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // At rest: the core places + the mode action, no song noise.
      return items.filter(
        (it) => (it.group === "Go to" && !it.id.includes("/invest/")) || it.id === "act:mode",
      );
    }
    const words = q.split(/\s+/);
    const scored = items
      .map((it) => {
        const hay = `${it.label.toLowerCase()} ${it.keywords} ${(it.hint ?? "").toLowerCase()}`;
        if (!words.every((w) => hay.includes(w))) return null;
        // earlier + label matches rank higher
        const inLabel = it.label.toLowerCase().includes(words[0]) ? 0 : 1;
        return { it, rank: inLabel };
      })
      .filter((x): x is { it: PaletteItem; rank: number } => x !== null)
      .sort((a, b) => a.rank - b.rank);
    return scored.map((x) => x.it).slice(0, 12);
  }, [items, query]);

  // Clamp selection when the list changes.
  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(0, shown.length - 1)));
  }, [shown.length]);

  // Keep the selected row in view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
    >
      <div className="anim-fade-in absolute inset-0 bg-charcoal-900/30 backdrop-blur-[2px]" />
      <div
        className="anim-page-in relative w-full max-w-xl overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-charcoal-100 px-4">
          <Icon name="sparkle" size={16} className="shrink-0 text-coral-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              // "Down"/"Up"/"Return" are legacy aliases some browsers and
              // automation layers still emit — accept both spellings.
              if (e.key === "ArrowDown" || e.key === "Down") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, shown.length - 1));
              } else if (e.key === "ArrowUp" || e.key === "Up") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter" || e.key === "Return") {
                e.preventDefault();
                shown[sel]?.run();
              }
            }}
            placeholder="Type a page, a song, a Sunday, or an action…"
            className="w-full bg-transparent py-3.5 text-[15px] text-charcoal-800 outline-none placeholder:text-charcoal-400"
            aria-label="Search commands"
          />
          <kbd className="shrink-0 rounded-md border border-charcoal-100 px-1.5 py-0.5 text-[10px] font-semibold text-charcoal-400">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="scroll-thin max-h-[46vh] overflow-y-auto py-2">
          {shown.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-charcoal-400">
              Nothing matches &ldquo;{query}&rdquo; yet. Try a page name, a song, or
              &ldquo;fast&rdquo;.
            </div>
          )}
          {shown.map((it, i) => {
            const prev = shown[i - 1];
            const newGroup = !prev || prev.group !== it.group;
            return (
              <div key={it.id}>
                {newGroup && (
                  <div className="label px-4 pb-1 pt-3 text-[0.6rem] text-charcoal-300">
                    {it.group}
                  </div>
                )}
                <button
                  data-idx={i}
                  onClick={it.run}
                  onMouseMove={() => setSel(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    i === sel ? "bg-coral-50 text-charcoal-900" : "text-charcoal-700"
                  }`}
                >
                  <Icon
                    name={it.icon}
                    size={15}
                    className={i === sel ? "text-coral-600" : "text-charcoal-400"}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
                  {it.hint && (
                    <span className="max-w-[40%] truncate text-xs text-charcoal-400">{it.hint}</span>
                  )}
                  {i === sel && (
                    <kbd className="rounded border border-charcoal-100 px-1 text-[10px] text-charcoal-400">
                      ↵
                    </kbd>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-charcoal-100 px-4 py-2 text-[11px] text-charcoal-400">
          <span>
            <kbd className="font-semibold">↑↓</kbd> move
          </span>
          <span>
            <kbd className="font-semibold">↵</kbd> open
          </span>
          <span className="ml-auto">Anything in the app, one box away</span>
        </div>
      </div>
    </div>
  );
}
