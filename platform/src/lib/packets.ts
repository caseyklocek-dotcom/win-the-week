// ============================================================
// Service Packets — the "send the set" share layer.
//
// A packet is one volunteer's personal view of a single Sunday: their
// assignment, the set (with charts they can transpose and print), the leader's
// note, and a way to confirm or decline. Each packet is reached by an
// unguessable token in a link the leader texts them — no account, no login.
//
// PROTOTYPE: localStorage phase. Packets and responses are stored per-browser
// so the whole flow is clickable on one device before the Supabase backend
// exists. The transport is a thin async adapter (publish / read / respond) so
// the move to a shared backend — public read by token, anon write for a
// confirm/decline — is a data-source swap, not a rewrite. See the SAME pattern
// note in community.ts.
// ============================================================

import type { Service, Person, Profile, Song } from "./types";
import { sectionSongIds } from "./set";

// The set's songs in running order (flattened across sections), skipping any
// referenced song that no longer exists.
function orderedSongs(service: Service): Song[] {
  const byId = new Map(service.songs.map((s) => [s.id, s]));
  return service.setSections
    .flatMap((sec) => sectionSongIds(sec))
    .map((id) => byId.get(id))
    .filter((s): s is Song => Boolean(s));
}

// A volunteer either says yes or no. "pending" is the absence of a response.
export type PacketReplyStatus = "confirmed" | "declined";

export interface PacketResponse {
  token: string;
  status: PacketReplyStatus;
  reason?: string; // optional "why" captured on a decline
  respondedAt: string; // ISO
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
  opts?: { teamNote?: string; personalNote?: string; ccliNumber?: string },
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
    songs: orderedSongs(service),
  };
}

// ============================================================
// Transport adapter. localStorage today; Supabase later. Every method is async
// so the UI never has to change when the backend lands.
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

// Leader side: publish one person's packet. Returns the link path to text.
export async function publishPacket(packet: ServicePacket): Promise<string> {
  const map = readMap<ServicePacket>(PACKET_KEY);
  map[packet.token] = packet;
  writeMap(PACKET_KEY, map);
  return packetPath(packet.token);
}

// Volunteer side: load a packet by token (null if it doesn't exist).
export async function readPacket(token: string): Promise<ServicePacket | null> {
  const map = readMap<ServicePacket>(PACKET_KEY);
  return map[token] ?? null;
}

// Volunteer side: record a confirm/decline, then return the saved response.
export async function recordResponse(
  token: string,
  status: PacketReplyStatus,
  reason?: string,
): Promise<PacketResponse> {
  const map = readMap<PacketResponse>(RESPONSE_KEY);
  const response: PacketResponse = {
    token,
    status,
    reason: reason?.trim() || undefined,
    respondedAt: new Date().toISOString(),
  };
  map[token] = response;
  writeMap(RESPONSE_KEY, map);
  return response;
}

// Either side: read the response for one packet (null = still pending).
export async function readResponse(token: string): Promise<PacketResponse | null> {
  const map = readMap<PacketResponse>(RESPONSE_KEY);
  return map[token] ?? null;
}

// Leader side: read responses for a batch of tokens at once (for the dashboard).
export async function readResponses(
  tokens: string[],
): Promise<Record<string, PacketResponse>> {
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
