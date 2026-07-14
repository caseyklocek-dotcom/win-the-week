// ============================================================
// Smart song links — meet leaders where they already look things up.
//
// Most worship leaders live in CCLI SongSelect, MultiTracks, YouTube, and
// Spotify. These helpers build one-tap search links from a song's own
// title/artist, so every song card can jump straight to the places they
// already trust. No API keys, no partnerships — just well-formed search
// URLs, upgraded to a saved link the moment the leader pastes one in.
// ============================================================

import type { BrandKey } from "@/components/BrandIcon";

function q(parts: (string | undefined)[]): string {
  return encodeURIComponent(parts.filter(Boolean).join(" ").trim());
}

export function songSelectSearchUrl(title: string, artist?: string): string {
  return `https://songselect.ccli.com/search/results?SearchText=${q([title, artist])}`;
}

export function multiTracksSearchUrl(title: string, artist?: string): string {
  return `https://www.multitracks.com/search/?q=${q([title, artist])}`;
}

export function youTubeSearchUrl(title: string, artist?: string): string {
  return `https://www.youtube.com/results?search_query=${q([title, artist])}`;
}

export function spotifySearchUrl(title: string, artist?: string): string {
  return `https://open.spotify.com/search/${q([title, artist])}`;
}

export interface SongLink {
  brand: BrandKey;
  label: string;
  href: string;
  saved: boolean; // true when this is the leader's own link, not a search
}

/** The links a song card shows: saved URLs first, searches for the rest. */
export function songLinks(song: {
  title: string;
  artist?: string;
  songSelectUrl?: string;
  multitracksUrl?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
}): SongLink[] {
  return [
    {
      brand: "ccli",
      label: "CCLI",
      href: song.songSelectUrl || songSelectSearchUrl(song.title, song.artist),
      saved: Boolean(song.songSelectUrl),
    },
    {
      brand: "multitracks",
      label: "MultiTracks",
      href: song.multitracksUrl || multiTracksSearchUrl(song.title, song.artist),
      saved: Boolean(song.multitracksUrl),
    },
    {
      brand: "youtube",
      label: "YouTube",
      href: song.youtubeUrl || youTubeSearchUrl(song.title, song.artist),
      saved: Boolean(song.youtubeUrl),
    },
    {
      brand: "spotify",
      label: "Spotify",
      href: song.spotifyUrl || spotifySearchUrl(song.title, song.artist),
      saved: Boolean(song.spotifyUrl),
    },
  ];
}
