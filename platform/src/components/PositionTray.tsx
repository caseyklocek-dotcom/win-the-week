"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import type { PositionDef, PositionGroup } from "@/lib/types";

// One group's row of add-to-team position chips (Band / Tech / Teaching).
// A stacking chip (BGV, AG, CAM...) adds the next instance and the caller keeps
// the family numbered; a non-stacking chip (Drums, Pastor...) just adds it. A
// trailing "Custom" chip opens a one-line inline form that saves a new position
// to the library so it's a click, not a type, from then on.
export function PositionTray({
  group,
  onAdd,
}: {
  group: PositionGroup;
  onAdd: (def: PositionDef) => void;
}) {
  const { positionLibrary, addCustomPosition, removeCustomPosition } = useStore();
  const [addingCustom, setAddingCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");

  const chips = positionLibrary.filter((p) => p.group === group);

  const tap = (defId: string) => {
    const def = chips.find((c) => c.id === defId);
    if (def) onAdd(def);
  };

  const submitCustom = () => {
    const label = customLabel.trim();
    if (!label) {
      setAddingCustom(false);
      return;
    }
    const def = addCustomPosition(label, group);
    onAdd(def);
    setCustomLabel("");
    setAddingCustom(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((def) => (
        <span key={def.id} className="group relative inline-flex">
          <button
            onClick={() => tap(def.id)}
            className="rounded-full border border-charcoal-200 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-700 transition hover:border-coral-400 hover:bg-coral-50 hover:text-coral-600"
          >
            {def.label}
          </button>
          {def.custom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeCustomPosition(def.id);
              }}
              aria-label={`Remove ${def.label} from the tray`}
              title="Remove from tray"
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-charcoal-400 text-white group-hover:flex"
            >
              <Icon name="x" size={9} />
            </button>
          )}
        </span>
      ))}

      {addingCustom ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCustom();
              if (e.key === "Escape") { setAddingCustom(false); setCustomLabel(""); }
            }}
            onBlur={submitCustom}
            placeholder="Position name"
            className="w-32 rounded-full border border-coral-300 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-800 outline-none"
          />
        </span>
      ) : (
        <button
          onClick={() => setAddingCustom(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-charcoal-300 px-3 py-1.5 text-xs font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600"
        >
          <Icon name="plus" size={12} /> Custom
        </button>
      )}
    </div>
  );
}
