// ============================================================
// Smart song links — meet leaders where they already look things up.
//
// Most worship leaders live in CCLI SongSelect, MultiTracks, and YouTube.
// These helpers build one-tap search links from a song's own title/artist,
// so every song card can jump straight to the places they already trust.
// No API keys, no partnerships — just well-formed search URLs.
// ============================================================

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

export interface SongLink {
  label: string;
  href: string;
}

/** The links a song card shows: saved URLs first, searches for the rest. */
export function songLinks(song: {
  title: string;
  artist?: string;
  songSelectUrl?: string;
  multitracksUrl?: string;
}): SongLink[] {
  return [
    {
      label: "SongSelect",
      href: song.songSelectUrl || songSelectSearchUrl(song.title, song.artist),
    },
    {
      label: "MultiTracks",
      href: song.multitracksUrl || multiTracksSearchUrl(song.title, song.artist),
    },
    { label: "YouTube", href: youTubeSearchUrl(song.title, song.artist) },
  ];
}
