"use client";

// ============================================================
// BrandIcon — recognizable marks for the places leaders already
// look songs up: CCLI SongSelect, MultiTracks, YouTube, Spotify.
//
// MultiTracks and CCLI are drawn from the actual marks Casey provided:
// MultiTracks is the black disc with white track bars sweeping in from the
// left; CCLI is the two-blue swirl of arcs around a navy "C". YouTube and
// Spotify use their real simplified badge marks (both brands' guidelines
// encourage exactly this next to an "open on X" link). All colors are raw
// hex on purpose — brand marks never flip with the app theme.
// ============================================================

import { useId } from "react";

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
  // Unique per-instance clip id — several icons can render on one page.
  const uid = useId();
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    "aria-hidden": true,
  } as const;

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

    case "multitracks": {
      // The real mark: a black disc, white track bars of varying length
      // sweeping in flush from the left, clipped by the circle.
      const clipId = `mt-clip-${uid}`;
      return (
        <svg {...common}>
          <defs>
            <clipPath id={clipId}>
              <circle cx="12" cy="12" r="11" />
            </clipPath>
          </defs>
          <circle cx="12" cy="12" r="11" fill="#000000" />
          <g clipPath={`url(#${clipId})`}>
            <rect x="-2" y="5.2" width="13" height="1.9" rx="0.95" fill="#FFFFFF" />
            <rect x="-2" y="8.1" width="17.7" height="1.9" rx="0.95" fill="#FFFFFF" />
            <rect x="-2" y="11" width="22.7" height="1.9" rx="0.95" fill="#FFFFFF" />
            <rect x="-2" y="13.9" width="20.7" height="1.9" rx="0.95" fill="#FFFFFF" />
            <rect x="-2" y="16.8" width="16" height="1.9" rx="0.95" fill="#FFFFFF" />
          </g>
        </svg>
      );
    }

    case "ccli":
      // The real mark: nested light-blue arcs sweeping above and below a
      // navy stroke that curls into the central "C".
      return (
        <svg {...common} fill="none" strokeLinecap="round">
          {/* top sweeps — light blue */}
          <path d="M2.6 9.5 A9.7 9.7 0 0 1 21.4 9.5" stroke="#29A9E0" strokeWidth="2.1" />
          <path d="M5.3 10.6 A6.9 6.9 0 0 1 18.7 10.6" stroke="#29A9E0" strokeWidth="2" />
          {/* the navy C, entering from the upper right */}
          <path
            d="M20.6 6.3 Q16.8 7.5 14.5 9.1 A3.7 3.7 0 1 0 14.5 14.9"
            stroke="#1D4E89"
            strokeWidth="2.2"
          />
          {/* navy tail at the lower left */}
          <path d="M3.3 17.9 L7.3 15.7" stroke="#1D4E89" strokeWidth="2.2" />
          {/* bottom sweeps — light blue */}
          <path d="M5.3 13.4 A6.9 6.9 0 0 0 18.7 13.4" stroke="#29A9E0" strokeWidth="2" />
          <path d="M2.6 14.5 A9.7 9.7 0 0 0 21.4 14.5" stroke="#29A9E0" strokeWidth="2.1" />
        </svg>
      );
  }
}
