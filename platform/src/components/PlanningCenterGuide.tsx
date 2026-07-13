"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

export function PlanningCenterGuide({ onChooseFile }: { onChooseFile: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-semibold text-teal-600 hover:underline"
      >
        How do Planning Center songs come in?
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} className="text-teal-600" />
      </button>

      {open && (
        <div className="anim-page-in mt-4 rounded-2xl border border-charcoal-100 bg-cream-100 p-5">
          <p className="text-sm text-charcoal-700">
            Already have your songs in Planning Center? Bring them over in three steps —
            no retyping.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600">
                  1
                </span>
                <Icon name="upload" size={14} className="text-teal-600" />
              </div>
              <p className="text-sm font-bold text-charcoal-900">Export from Planning Center</p>
              <p className="text-xs text-charcoal-600">
                In Planning Center, open your song list and export it as a CSV.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600">
                  2
                </span>
                <Icon name="music" size={14} className="text-teal-600" />
              </div>
              <p className="text-sm font-bold text-charcoal-900">Drop it in here</p>
              <p className="text-xs text-charcoal-600">Pick that CSV — we read it in seconds.</p>
              <button
                onClick={onChooseFile}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-teal-500 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-600"
              >
                <Icon name="upload" size={13} />
                Choose a CSV file
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600">
                  3
                </span>
                <Icon name="sparkle" size={14} className="text-teal-600" />
              </div>
              <p className="text-sm font-bold text-charcoal-900">Your library fills in</p>
              <p className="text-xs text-charcoal-600">
                Titles, keys, and CCLI numbers land automatically. Add charts anytime — they
                transpose to any key.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-charcoal-100 pt-4">
            <p className="label text-charcoal-400">What comes across</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-charcoal-700">Title</span>
              <Icon name="arrowRight" size={12} className="text-charcoal-200" />
              <span className="text-charcoal-400">Title</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-charcoal-700">Authors</span>
              <Icon name="arrowRight" size={12} className="text-charcoal-200" />
              <span className="text-charcoal-400">Artist</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-charcoal-700">Key</span>
              <Icon name="arrowRight" size={12} className="text-charcoal-200" />
              <span className="text-charcoal-400">Key</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-charcoal-700">CCLI Song Number</span>
              <Icon name="arrowRight" size={12} className="text-charcoal-200" />
              <span className="text-charcoal-400">CCLI number</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
