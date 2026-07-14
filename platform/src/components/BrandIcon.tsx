// ============================================================
// BrandIcon — small recognizable marks for the places leaders already
// look songs up: CCLI SongSelect, MultiTracks, YouTube, Spotify.
//
// YouTube and Spotify use their real, simplified badge marks (both
// brands' own guidelines encourage exactly this — a small mark next to an
// "open on X" link). CCLI and MultiTracks don't have a comparable public
// glyph-only badge, so those two are clean monogram badges in the brand's
// familiar color rather than an attempt at their wordmark.
// ============================================================

export type BrandKey = "ccli" | "multitracks" | "youtube" | "spotify";

export function BrandIcon({
  brand,
  size = 20,
  className = "",
}: {
  brand: BrandKey;
  size?: number;
  className?: string;
}) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", className, "aria-hidden": true } as const;

  switch (brand) {
    case "youtube":
      return (
        <svg {...common}>
          <rect x="1" y="4.5" width="22" height="15" rx="5" fill="#FF0000" />
          <path d="M10 8.5v7l6.5-3.5Z" fill="#FFFFFF" />
        </svg>
      );
    case "spotify":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill="#1ED760" />
          <path
            d="M6.5 9.8c3.4-1 7.6-.7 10.7 1.1"
            fill="none"
            stroke="#0B140C"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M7 13.2c2.8-.85 6.3-.6 8.9.9"
            fill="none"
            stroke="#0B140C"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M7.5 16.4c2.3-.65 5-.45 7.1.75"
            fill="none"
            stroke="#0B140C"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "multitracks":
      // A monogram badge (not the company's wordmark) — a waveform of
      // staggered bars reads as "multiple tracks" at a glance.
      return (
        <svg {...common}>
          <rect x="1" y="1" width="22" height="22" rx="6" fill="#1A1A1A" />
          <rect x="5.5" y="10" width="2.4" height="4" rx="1.2" fill="#FF6B5E" />
          <rect x="9.8" y="6.5" width="2.4" height="11" rx="1.2" fill="#FF6B5E" />
          <rect x="14.1" y="9" width="2.4" height="6" rx="1.2" fill="#FF6B5E" />
          <rect x="18.4" y="7" width="2.4" height="8" rx="1.2" fill="#FF6B5E" />
        </svg>
      );
    case "ccli":
      // A monogram badge in CCLI's familiar blue — clean and identifiable
      // without reproducing their trademarked wordmark.
      return (
        <svg {...common}>
          <rect x="1" y="1" width="22" height="22" rx="6" fill="#0B5FA5" />
          <text
            x="12"
            y="16.5"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
            fill="#FFFFFF"
          >
            CCLI
          </text>
        </svg>
      );
  }
}
