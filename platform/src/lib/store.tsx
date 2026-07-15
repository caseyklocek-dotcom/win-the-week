"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type {
  AppState,
  Service,
  LibrarySong,
  Person,
  PositionDef,
  PositionGroup,
  RehearsalTemplate,
  TeamTemplate,
  CommunityState,
  CommunityPost,
  CommunityComment,
} from "./types";
import { autoSchedule } from "./teamTemplate";
import { SELF_ID, newThreadId, newMessageId } from "./community";
import { makeSeed, makeFreshSeed, migrateSchedule, migrateServiceTypes, SEED_VERSION } from "./seed";
import { migrateLibrary } from "./library";
import { migratePeople } from "./people";
import { migrateSet } from "./set";
import { migrateRehearsal } from "./rehearsal";
import { migrateCommunity } from "./community";
import { migrateTeamTemplates } from "./teamTemplate";
import { migratePositions, ensureCanonicalTeams } from "./positions";
import { migrateLeaders } from "./leaders";
import { migratePlan } from "./plan";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

const STORAGE_KEY = "wtw_state_v1";

// Apply every lazy migration to a stored/loaded AppState.
function hydrate(s: AppState): AppState {
  return migrateServiceTypes(
    ensureCanonicalTeams(
      migratePositions(
        migratePlan(
          migrateSchedule(
            migrateLeaders(
              migrateTeamTemplates(
                migrateCommunity(migrateRehearsal(migrateSet(migratePeople(migrateLibrary(s))))),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
function freshSeedState(): AppState {
  return migrateServiceTypes(
    ensureCanonicalTeams(
      migratePositions(
        migratePlan(migrateLeaders(migrateCommunity(migrateRehearsal(makeFreshSeed())))),
      ),
    ),
  );
}
function demoSeedState(): AppState {
  return migrateServiceTypes(
    ensureCanonicalTeams(
      migratePositions(
        migratePlan(migrateLeaders(migrateCommunity(migrateRehearsal(makeSeed())))),
      ),
    ),
  );
}

interface StoreApi {
  state: AppState;
  ready: boolean;
  activeService: Service;
  songLibrary: LibrarySong[];
  people: Person[];
  community: CommunityState;
  addCommunityPost: (post: CommunityPost) => void;
  addCommunityComment: (postId: string, comment: CommunityComment) => void;
  toggleLikePost: (postId: string) => void;
  toggleLikeComment: (postId: string, commentId: string) => void;
  toggleSharePost: (postId: string) => void;
  toggleSavePost: (postId: string) => void;
  toggleSaveContact: (memberId: string) => void;
  sendDirectMessage: (memberId: string, body: string) => void;
  markThreadRead: (memberId: string) => void;
  rehearsalTemplates: RehearsalTemplate[];
  addRehearsalTemplate: (tpl: RehearsalTemplate) => void;
  updateRehearsalTemplate: (id: string, fields: Partial<RehearsalTemplate>) => void;
  removeRehearsalTemplate: (id: string) => void;
  starRehearsalTemplate: (id: string) => void;
  teamTemplates: TeamTemplate[];
  addTeamTemplate: (tpl: TeamTemplate) => void;
  updateTeamTemplate: (id: string, fields: Partial<TeamTemplate>) => void;
  removeTeamTemplate: (id: string) => void;
  starTeamTemplate: (id: string) => void;
  applyTeamTemplate: (serviceId: string, templateId: string) => void;
  setState: (updater: (s: AppState) => AppState) => void;
  updateService: (id: string, updater: (svc: Service) => Service) => void;
  addService: (svc: Service) => void;
  setActiveService: (id: string) => void;
  addLibrarySong: (lib: LibrarySong) => void;
  updateLibrarySong: (id: string, fields: Partial<LibrarySong>) => void;
  removeLibrarySong: (id: string) => void;
  addPerson: (person: Person) => void;
  updatePerson: (id: string, fields: Partial<Person>) => void;
  removePerson: (id: string) => void;
  positionLibrary: PositionDef[];
  addCustomPosition: (label: string, group: PositionGroup) => PositionDef;
  removeCustomPosition: (id: string) => void;
  resetDemo: () => void;
  resetFresh: () => void;
  setOnboarded: (v: boolean) => void;
  checkpoint: (label: string) => void;
  undo: () => void;
  undoAction: { label: string } | null;
  saveStatus: "saving" | "saved";
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { enabled, user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setStateRaw] = useState<AppState | null>(null);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved">("saved");
  const [undoAction, setUndoAction] = useState<{ label: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoSnapshot = useRef<AppState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load when the persistence target changes.
  // - No backend (auth disabled): localStorage, per-browser (legacy behavior).
  // - Backend + signed in: this user's row in Supabase (or a fresh seed for a
  //   brand-new account). localStorage is NOT read here, so accounts never
  //   share data and new accounts start fresh.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setStateRaw(null);

    const loadLocal = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as AppState) : null;
        if (parsed && parsed.version === SEED_VERSION) {
          setStateRaw(hydrate(parsed));
        } else {
          const seed = freshSeedState();
          setStateRaw(seed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        }
      } catch {
        setStateRaw(freshSeedState());
      }
      setReady(true);
    };

    const loadDb = async (uid: string) => {
      try {
        const { data, error } = await supabase!
          .from("app_state")
          .select("data")
          .eq("user_id", uid)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data?.data) {
          setStateRaw(hydrate(data.data as AppState));
        } else {
          const seed = freshSeedState();
          setStateRaw(seed);
          await supabase!
            .from("app_state")
            .upsert({ user_id: uid, data: seed, updated_at: new Date().toISOString() });
        }
      } catch {
        if (!cancelled) setStateRaw(freshSeedState());
      }
      if (!cancelled) setReady(true);
    };

    if (!enabled) loadLocal();
    else if (userId && supabase) loadDb(userId);
    // enabled but no user: StoreProvider only mounts for signed-in users, so
    // this shouldn't happen; leave state null (shows the loading gate).

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  // Debounced persistence to whichever target is active.
  useEffect(() => {
    if (!state || !ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!enabled) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
          /* storage full or blocked */
        }
        setSaveStatus("saved");
      } else if (userId && supabase) {
        supabase
          .from("app_state")
          .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() })
          .then(
            () => setSaveStatus("saved"),
            () => setSaveStatus("saved"),
          );
      }
    }, 400);
  }, [state, ready, enabled, userId]);

  const checkpoint = (label: string) => {
    undoSnapshot.current = state;
    setUndoAction({ label });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      undoSnapshot.current = null;
      setUndoAction(null);
    }, 8000);
  };

  const undo = () => {
    if (!undoSnapshot.current) return;
    setStateRaw(undoSnapshot.current);
    undoSnapshot.current = null;
    setUndoAction(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const setState = (updater: (s: AppState) => AppState) => {
    setSaveStatus("saving");
    setStateRaw((prev) => (prev ? updater(prev) : prev));
  };

  const updateService = (id: string, updater: (svc: Service) => Service) => {
    setSaveStatus("saving");
    setStateRaw((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        services: prev.services.map((s) => (s.id === id ? updater(s) : s)),
      };
    });
  };

  const addService = (svc: Service) => {
    setSaveStatus("saving");
    setStateRaw((prev) =>
      prev
        ? { ...prev, services: [...prev.services, svc], activeServiceId: svc.id }
        : prev,
    );
  };

  const setActiveService = (id: string) => {
    setSaveStatus("saving");
    setStateRaw((prev) => (prev ? { ...prev, activeServiceId: id } : prev));
  };

  const addLibrarySong = (lib: LibrarySong) => {
    setStateRaw((prev) =>
      prev ? { ...prev, songLibrary: [...(prev.songLibrary ?? []), lib] } : prev,
    );
  };

  const updateLibrarySong = (id: string, fields: Partial<LibrarySong>) => {
    setStateRaw((prev) =>
      prev
        ? {
            ...prev,
            songLibrary: (prev.songLibrary ?? []).map((l) =>
              l.id === id ? { ...l, ...fields } : l,
            ),
          }
        : prev,
    );
  };

  const removeLibrarySong = (id: string) => {
    setStateRaw((prev) =>
      prev
        ? { ...prev, songLibrary: (prev.songLibrary ?? []).filter((l) => l.id !== id) }
        : prev,
    );
  };

  const addPerson = (person: Person) => {
    setStateRaw((prev) =>
      prev ? { ...prev, people: [...(prev.people ?? []), person] } : prev,
    );
  };

  const updatePerson = (id: string, fields: Partial<Person>) => {
    setStateRaw((prev) =>
      prev
        ? {
            ...prev,
            people: (prev.people ?? []).map((p) =>
              p.id === id ? { ...p, ...fields } : p,
            ),
          }
        : prev,
    );
  };

  const removePerson = (id: string) => {
    setStateRaw((prev) =>
      prev
        ? { ...prev, people: (prev.people ?? []).filter((p) => p.id !== id) }
        : prev,
    );
  };

  // ---- Position library (stock + custom role labels for team building) ----
  const addCustomPosition = (label: string, group: PositionGroup): PositionDef => {
    const def: PositionDef = {
      id: `pos_${Math.random().toString(36).slice(2, 9)}`,
      label: label.trim(),
      group,
      stacks: false,
      custom: true,
    };
    setStateRaw((prev) =>
      prev ? { ...prev, positionLibrary: [...(prev.positionLibrary ?? []), def] } : prev,
    );
    return def;
  };

  const removeCustomPosition = (id: string) => {
    setStateRaw((prev) =>
      prev
        ? {
            ...prev,
            positionLibrary: (prev.positionLibrary ?? []).filter(
              (p) => p.id !== id || !p.custom,
            ),
          }
        : prev,
    );
  };

  const withCommunity = (
    prev: AppState | null,
    fn: (c: CommunityState) => CommunityState,
  ): AppState | null => {
    if (!prev || !prev.community) return prev;
    return { ...prev, community: fn(prev.community) };
  };

  const addCommunityPost = (post: CommunityPost) => {
    setStateRaw((prev) =>
      withCommunity(prev, (c) => ({ ...c, posts: [post, ...c.posts] })),
    );
  };

  const addCommunityComment = (postId: string, comment: CommunityComment) => {
    setStateRaw((prev) =>
      withCommunity(prev, (c) => ({
        ...c,
        posts: c.posts.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, comment] } : p,
        ),
      })),
    );
  };

  const toggleLikePost = (postId: string) => {
    setStateRaw((prev) =>
      withCommunity(prev, (c) => ({
        ...c,
        posts: c.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedByMe: !p.likedByMe,
                likes: p.likes + (p.likedByMe ? -1 : 1),
              }
            : p,
        ),
      })),
    );
  };

  const toggleLikeComment = (postId: string, commentId: string) => {
    setStateRaw((prev) =>
      withCommunity(prev, (c) => ({
        ...c,
        posts: c.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map((cm) =>
                  cm.id === commentId
                    ? {
                        ...cm,
                        likedByMe: !cm.likedByMe,
                        likes: cm.likes + (cm.likedByMe ? -1 : 1),
                      }
                    : cm,
                ),
              }
            : p,
        ),
      })),
    );
  };

  const toggleSharePost = (postId: string) => {
    setStateRaw((prev) =>
      withCommunity(prev, (c) => ({
        ...c,
        posts: c.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                sharedByMe: !p.sharedByMe,
                shares: p.shares + (p.sharedByMe ? -1 : 1),
              }
            : p,
        ),
      })),
    );
  };

  const toggleSavePost = (postId: string) => {
    setStateRaw((prev) =>
      withCommunity(prev, (c) => ({
        ...c,
        posts: c.posts.map((p) =>
          p.id === postId ? { ...p, savedByMe: !p.savedByMe } : p,
        ),
      })),
    );
  };

  const toggleSaveContact = (memberId: string) => {
    setStateRaw((prev) =>
      withCommunity(prev, (c) => ({
        ...c,
        savedContactIds: c.savedContactIds.includes(memberId)
          ? c.savedContactIds.filter((m) => m !== memberId)
          : [...c.savedContactIds, memberId],
      })),
    );
  };

  const sendDirectMessage = (memberId: string, body: string) => {
    setStateRaw((prev) =>
      withCommunity(prev, (c) => {
        const msg = {
          id: newMessageId(),
          fromId: SELF_ID,
          body,
          createdAt: new Date().toISOString(),
        };
        const existing = c.threads.find((t) => t.memberId === memberId);
        if (existing) {
          return {
            ...c,
            threads: c.threads.map((t) =>
              t.memberId === memberId
                ? { ...t, messages: [...t.messages, msg] }
                : t,
            ),
          };
        }
        return {
          ...c,
          threads: [
            { id: newThreadId(), memberId, unread: 0, messages: [msg] },
            ...c.threads,
          ],
        };
      }),
    );
  };

  const markThreadRead = (memberId: string) => {
    setStateRaw((prev) =>
      withCommunity(prev, (c) => ({
        ...c,
        threads: c.threads.map((t) =>
          t.memberId === memberId ? { ...t, unread: 0 } : t,
        ),
      })),
    );
  };

  const addRehearsalTemplate = (tpl: RehearsalTemplate) => {
    setStateRaw((prev) =>
      prev
        ? { ...prev, rehearsalTemplates: [...(prev.rehearsalTemplates ?? []), tpl] }
        : prev,
    );
  };

  const updateRehearsalTemplate = (id: string, fields: Partial<RehearsalTemplate>) => {
    setStateRaw((prev) =>
      prev
        ? {
            ...prev,
            rehearsalTemplates: (prev.rehearsalTemplates ?? []).map((t) =>
              t.id === id ? { ...t, ...fields } : t,
            ),
          }
        : prev,
    );
  };

  const removeRehearsalTemplate = (id: string) => {
    setStateRaw((prev) => {
      if (!prev) return prev;
      const remaining = (prev.rehearsalTemplates ?? []).filter((t) => t.id !== id);
      // Never leave the account with zero templates; keep at least one starred.
      if (remaining.length > 0 && !remaining.some((t) => t.starred)) {
        remaining[0] = { ...remaining[0], starred: true };
      }
      return { ...prev, rehearsalTemplates: remaining };
    });
  };

  const starRehearsalTemplate = (id: string) => {
    setStateRaw((prev) =>
      prev
        ? {
            ...prev,
            rehearsalTemplates: (prev.rehearsalTemplates ?? []).map((t) => ({
              ...t,
              starred: t.id === id,
            })),
          }
        : prev,
    );
  };

  // ---- Team templates ----
  const addTeamTemplate = (tpl: TeamTemplate) => {
    setStateRaw((prev) =>
      prev
        ? { ...prev, teamTemplates: [...(prev.teamTemplates ?? []), tpl] }
        : prev,
    );
  };

  const updateTeamTemplate = (id: string, fields: Partial<TeamTemplate>) => {
    setStateRaw((prev) =>
      prev
        ? {
            ...prev,
            teamTemplates: (prev.teamTemplates ?? []).map((t) =>
              t.id === id ? { ...t, ...fields } : t,
            ),
          }
        : prev,
    );
  };

  const removeTeamTemplate = (id: string) => {
    setStateRaw((prev) => {
      if (!prev) return prev;
      const remaining = (prev.teamTemplates ?? []).filter((t) => t.id !== id);
      if (remaining.length > 0 && !remaining.some((t) => t.starred)) {
        remaining[0] = { ...remaining[0], starred: true };
      }
      return { ...prev, teamTemplates: remaining };
    });
  };

  const starTeamTemplate = (id: string) => {
    setStateRaw((prev) =>
      prev
        ? {
            ...prev,
            teamTemplates: (prev.teamTemplates ?? []).map((t) => ({
              ...t,
              starred: t.id === id,
            })),
          }
        : prev,
    );
  };

  const applyTeamTemplate = (serviceId: string, templateId: string) => {
    setStateRaw((prev) => {
      if (!prev) return prev;
      const template = (prev.teamTemplates ?? []).find((t) => t.id === templateId);
      const service = prev.services.find((s) => s.id === serviceId);
      if (!template || !service) return prev;

      const grouped = autoSchedule(template, prev.people ?? [], prev.services, service.date);

      // A template IS the roster: rebuild every canonical section to exactly
      // the template's slots for that group (empty if it defines none), so a
      // section the template doesn't cover is cleared rather than left behind.
      // Idempotent — applying the same template again never stacks.
      const updatedTeams = service.teams.map((t) =>
        t.group ? { ...t, roles: grouped[t.group] ?? [] } : t,
      );

      return {
        ...prev,
        services: prev.services.map((s) =>
          s.id === serviceId
            ? { ...s, teams: updatedTeams, appliedTemplateId: templateId }
            : s,
        ),
      };
    });
  };

  // Reset the active store (DB row when signed in, else localStorage). The
  // debounced save effect writes the new state to whichever target is active.
  const resetDemo = () => setStateRaw(demoSeedState());
  const resetFresh = () => setStateRaw(freshSeedState());

  const setOnboarded = (v: boolean) => {
    setStateRaw((prev) => (prev ? { ...prev, onboarded: v } : prev));
  };

  if (!state) {
    return (
      <StoreContext.Provider value={null}>
        <div className="flex min-h-screen items-center justify-center text-charcoal-400">
          Loading…
        </div>
      </StoreContext.Provider>
    );
  }

  const activeService =
    state.services.find((s) => s.id === state.activeServiceId) || state.services[0];
  const songLibrary = state.songLibrary ?? [];
  const people = state.people ?? [];
  const positionLibrary = state.positionLibrary ?? [];
  const community = state.community ?? {
    version: 0,
    members: [],
    posts: [],
    threads: [],
    savedContactIds: [],
  };
  const rehearsalTemplates = state.rehearsalTemplates ?? [];
  const teamTemplates = state.teamTemplates ?? [];

  return (
    <StoreContext.Provider
      value={{
        state,
        ready,
        activeService,
        songLibrary,
        people,
        community,
        addCommunityPost,
        addCommunityComment,
        toggleLikePost,
        toggleLikeComment,
        toggleSharePost,
        toggleSavePost,
        toggleSaveContact,
        sendDirectMessage,
        markThreadRead,
        rehearsalTemplates,
        addRehearsalTemplate,
        updateRehearsalTemplate,
        removeRehearsalTemplate,
        starRehearsalTemplate,
        teamTemplates,
        addTeamTemplate,
        updateTeamTemplate,
        removeTeamTemplate,
        starTeamTemplate,
        applyTeamTemplate,
        setState,
        updateService,
        addService,
        setActiveService,
        addLibrarySong,
        updateLibrarySong,
        removeLibrarySong,
        addPerson,
        updatePerson,
        removePerson,
        positionLibrary,
        addCustomPosition,
        removeCustomPosition,
        resetDemo,
        resetFresh,
        setOnboarded,
        checkpoint,
        undo,
        undoAction,
        saveStatus,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used inside <StoreProvider> after it is ready");
  }
  return ctx;
}
