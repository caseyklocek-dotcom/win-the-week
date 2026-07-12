"use client";

import { useState } from "react";
import { Icon } from "./Icon";

// Common worship-team positions. Leaders can still add a custom one.
const PRESETS = [
  "Worship Leader",
  "Vocals",
  "Acoustic Gtr",
  "Electric Gtr",
  "Bass",
  "Keys",
  "Drums",
  "Percussion",
  "Audio",
  "ProPresenter",
  "Lighting",
  "Director",
];

// Tap chips to pick every role a person can fill, then tap a star to mark their
// main one. Easy on a phone, no typing required.
export function RolePicker({
  roles,
  main,
  onChange,
}: {
  roles: string[];
  main?: string;
  onChange: (roles: string[], main: string | undefined) => void;
}) {
  const [custom, setCustom] = useState("");

  const toggle = (role: string) => {
    if (roles.includes(role)) {
      const next = roles.filter((r) => r !== role);
      onChange(next, main === role ? next[0] : main);
    } else {
      const next = [...roles, role];
      onChange(next, main ?? role); // first one selected becomes main by default
    }
  };

  const setMain = (role: string) => onChange(roles, role);

  const addCustom = () => {
    const v = custom.trim();
    if (!v || roles.includes(v)) {
      setCustom("");
      return;
    }
    onChange([...roles, v], main ?? v);
    setCustom("");
  };

  // Presets plus any custom roles already chosen, de-duped.
  const all = [...PRESETS, ...roles.filter((r) => !PRESETS.includes(r))];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {all.map((role) => {
          const on = roles.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => toggle(role)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                on
                  ? "border-coral-400 bg-coral-100 text-coral-700"
                  : "border-charcoal-200 bg-white text-charcoal-600 hover:border-coral-300"
              }`}
            >
              {role}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add another role…"
          className="min-w-0 flex-1 rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
        />
        <button
          type="button"
          onClick={addCustom}
          className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-coral-400 hover:text-coral-600"
        >
          Add
        </button>
      </div>

      {roles.length > 0 && (
        <div>
          <div className="label mb-1.5 text-charcoal-400">Tap their main role</div>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const isMain = main === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setMain(role)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    isMain
                      ? "border-charcoal-800 bg-charcoal-800 text-white dark:border-coral-500 dark:bg-coral-500"
                      : "border-charcoal-200 bg-white text-charcoal-500 hover:border-charcoal-300"
                  }`}
                >
                  <Icon name="star" size={13} />
                  {role}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
