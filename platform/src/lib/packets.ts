// ============================================================
// Service Packets — the "send the set" share layer.
//
// A packet is one volunteer's personal view of a single Sunday: their
// assignment, the set (with charts they can transpose and print), the leader's
// note, and a way to confirm or decline. Each packet is reached by an
// unguessable token in a link the leader texts them — no account, no login.
//
// Transport: Supabase when configured (real cross-device links — run
// supabase/packets.sql once to create the tables and RPCs), localStorage
// otherwise (single-browser dev/demo). Every method is async so the UI never
// changes when the backend swaps.
//
// The volunteer's side writes back more than yes/no now: opened-at, a
// practice checklist, and a free note to the leader — that's what powers the
// leader's Send board.
// ============================================================

import type { LibrarySong, Service, Person, Profile, Song } from "./types";
import { sectionSongIds } from "./set";
import { supabase } from "./supabase";

// The set's songs in running order (flattened across sections), skipping any
// referenced song that no longer exists. When the library is provided, each
// song is enriched with catalog link data it's missing — a YouTube link added
// to the library AFTER the song landed in a set still reaches the team.
function orderedSongs(service: Service, library?: LibrarySong[]): Song[] {
  const byId = new Map(service.songs.map((s) => [s.id, s]));
  const byLib = new Map((library ?? []).map((l) => [l.id, l]));
  return service.setSections
    .flatMap((sec) => sectionSongIds(sec))
    .map((id) => byId.get(id))
    .filter((s): s is Song => Boolean(s))
    .map((s) => {
      const lib = s.libraryId ? byLib.get(s.libraryId) : undefined;
      if (!lib) return s;
      return {
        ...s,
        multitracksUrl: s.multitracksUrl || lib.multitracksUrl,
        songSelectUrl: s.songSelectUrl || lib.songSelectUrl,
        youtubeUrl: s.youtubeUrl || lib.youtubeUrl,
        spotifyUrl: s.spotifyUrl || lib.spotifyUrl,
        ccli: s.ccli || lib.ccli,
      };
    });
}

// A volunteer either says yes or no. "pending" is the absence of a response.
export type PacketReplyStatus = "confirmed" | "declined";

// The three light practice steps a volunteer can check off. Kept as ids so
// the labels can be tuned without migrating data.
export const PRACTICE_STEPS = [
  { id: "listened", label: "Listened through the set" },
  { id: "charts", label: "Ran my charts" },
  { id: "prayed", label: "Prayed for Sunday" },
] as const;

export interface PacketResponse {
  token: string;
  status?: PacketReplyStatus;
  reason?: string; // optional "why" captured on a decline
  note?: string; // free message back to the leader
  practice?: string[]; // checked PRACTICE_STEPS ids
  openedAt?: string; // ISO — first time the volunteer opened the link
  respondedAt?: string; // ISO
}

// A song as the volunteer receives it — a snapshot, so later edits to the
// leader's set never rewrite a packet already sent. Reuses the Song shape so
// the existing ChartSheet renders it directly.
export type PacketSong = Song;

export interface ServicePacket {
  token: string;
  createdAt: string; // ISO
  // Who it's from / where
  churchName: string;
  leaderName: string;
  ccliNumber?: string; // shown on charts for licensing
  // The service
  service: {
    date: string; // ISO
    title: string;
    season: string;
    serviceTime: string; // e.g. "9:00 AM"
    rehearsalNote?: string;
  };
  // Who it's for
  person: {
    id: string;
    name: string;
    assignment: string; // the position/role they're filling, e.g. "Electric guitar"
  };
  // What the leader wrote
  teamNote?: string; // message to everyone
  personalNote?: string; // this person's note
  // The set, already in running order
  songs: PacketSong[];
}

// ---- token ----
export function newPacketToken(): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `pkt_${rand()}${rand()}`;
}

// ---- build a packet from live app data ----
// Pulls one person's assignment out of the service's teams and snapshots the
// set. `assignment` is resolved from whichever RoleSlot points at this person.
export function buildPacket(
  service: Service,
  person: Person,
  profile: Profile,
  opts?: {
    teamNote?: string;
    personalNote?: string;
    ccliNumber?: string;
    // Pass the song library so packets pick up links (YouTube, Spotify…)
    // added to the catalog after a song was already placed in the set.
    library?: LibrarySong[];
  },
): ServicePacket {
  const assignment =
    service.teams
      .flatMap((t) => t.roles)
      .find((r) => r.personId === person.id || r.person === person.name)?.position ??
    person.mainRole ??
    person.roles[0] ??
    "Team";

  return {
    token: newPacketToken(),
    createdAt: new Date().toISOString(),
    churchName: profile.churchName,
    leaderName: profile.name,
    ccliNumber: opts?.ccliNumber,
    service: {
      date: service.date,
      title: service.title,
      season: service.season,
      serviceTime: profile.serviceTime,
      rehearsalNote: service.rehearsalNotes || undefined,
    },
    person: { id: person.id, name: person.name, assignment },
    teamNote: opts?.teamNote,
    personalNote: opts?.personalNote,
    songs: orderedSongs(service, opts?.library),
  };
}

// ============================================================
// Transport. Supabase when configured; localStorage otherwise.
// ============================================================

const PACKET_KEY = "wtw_packets_v1"; // token -> ServicePacket
const RESPONSE_KEY = "wtw_packet_responses_v1"; // token -> PacketResponse

function readMap<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}
function writeMap<T>(key: string, map: Record<string, T>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* storage full or blocked */
  }
}

// Merge a partial response into whatever is stored for the token (local mode).
function mergeLocalResponse(token: string, fields: Partial<PacketResponse>): PacketResponse {
  const map = readMap<PacketResponse>(RESPONSE_KEY);
  const merged: PacketResponse = { ...(map[token] ?? { token }), ...fields, token };
  map[token] = merged;
  writeMap(RESPONSE_KEY, map);
  return merged;
}

type ResponseRow = {
  token: string;
  status: PacketReplyStatus | null;
  reason: string | null;
  note: string | null;
  practice: string[] | null;
  opened_at: string | null;
  responded_at: string | null;
};

function rowToResponse(row: ResponseRow): PacketResponse {
  return {
    token: row.token,
    status: row.status ?? undefined,
    reason: row.reason ?? undefined,
    note: row.note ?? undefined,
    practice: row.practice ?? undefined,
    openedAt: row.opened_at ?? undefined,
    respondedAt: row.responded_at ?? undefined,
  };
}

// Leader side: publish one person's packet. Returns the link path to text.
export async function publishPacket(packet: ServicePacket): Promise<string> {
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const { error } = await supabase.from("packets").upsert({
        token: packet.token,
        owner: uid,
        payload: packet,
      });
      if (!error) return packetPath(packet.token);
    }
    // fall through to local so the demo still works when signed out
  }
  const map = readMap<ServicePacket>(PACKET_KEY);
  map[packet.token] = packet;
  writeMap(PACKET_KEY, map);
  return packetPath(packet.token);
}

// Volunteer side: load a packet by token (null if it doesn't exist).
export async function readPacket(token: string): Promise<ServicePacket | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc("get_packet", { p_token: token });
    if (!error && data) return data as ServicePacket;
  }
  const map = readMap<ServicePacket>(PACKET_KEY);
  return map[token] ?? null;
}

// Volunteer side: first-open ping so the leader can see "seen".
export async function markPacketOpened(token: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.rpc("packet_mark_opened", { p_token: token });
    if (!error) return;
  }
  const existing = readMap<PacketResponse>(RESPONSE_KEY)[token];
  if (!existing?.openedAt) mergeLocalResponse(token, { openedAt: new Date().toISOString() });
}

// Volunteer side: record a confirm/decline, then return the saved response.
export async function recordResponse(
  token: string,
  status: PacketReplyStatus,
  reason?: string,
): Promise<PacketResponse> {
  const respondedAt = new Date().toISOString();
  if (supabase) {
    const { data, error } = await supabase.rpc("packet_respond", {
      p_token: token,
      p_status: status,
      p_reason: reason?.trim() || null,
    });
    if (!error && data) return rowToResponse(data as ResponseRow);
  }
  return mergeLocalResponse(token, { status, reason: reason?.trim() || undefined, respondedAt });
}

// Volunteer side: practice checklist + free note back to the leader.
export async function savePractice(token: string, practice: string[]): Promise<PacketResponse> {
  if (supabase) {
    const { data, error } = await supabase.rpc("packet_practice", {
      p_token: token,
      p_practice: practice,
    });
    if (!error && data) return rowToResponse(data as ResponseRow);
  }
  return mergeLocalResponse(token, { practice });
}

export async function saveNote(token: string, note: string): Promise<PacketResponse> {
  if (supabase) {
    const { data, error } = await supabase.rpc("packet_note", {
      p_token: token,
      p_note: note.trim() || null,
    });
    if (!error && data) return rowToResponse(data as ResponseRow);
  }
  return mergeLocalResponse(token, { note: note.trim() || undefined });
}

// Either side: read the response for one packet (null = nothing yet).
export async function readResponse(token: string): Promise<PacketResponse | null> {
  const all = await readResponses([token]);
  return all[token] ?? null;
}

// Leader side: read responses for a batch of tokens at once (for the board).
export async function readResponses(
  tokens: string[],
): Promise<Record<string, PacketResponse>> {
  if (tokens.length === 0) return {};
  if (supabase) {
    const { data, error } = await supabase
      .from("packet_responses")
      .select("*")
      .in("token", tokens);
    if (!error && data) {
      const out: Record<string, PacketResponse> = {};
      for (const row of data as ResponseRow[]) out[row.token] = rowToResponse(row);
      return out;
    }
  }
  const map = readMap<PacketResponse>(RESPONSE_KEY);
  const out: Record<string, PacketResponse> = {};
  for (const t of tokens) if (map[t]) out[t] = map[t];
  return out;
}

// The link a volunteer opens. Kept relative so it works on any host.
export function packetPath(token: string): string {
  return `/s/${token}`;
}
export function packetUrl(token: string): string {
  if (typeof window === "undefined") return packetPath(token);
  return `${window.location.origin}${packetPath(token)}`;
}
