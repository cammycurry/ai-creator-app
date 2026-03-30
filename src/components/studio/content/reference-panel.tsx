"use client";

import { useState } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { useContentStudioStore } from "@/stores/content-studio-store";
import { ReferenceCard } from "@/components/workspace/reference-card";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
import { REFERENCE_TYPES, REFERENCE_TYPE_LABELS, type ReferenceType } from "@/types/reference";

type Filter = "ALL" | ReferenceType;

export function ReferencePanel() {
  const { references } = useCreatorStore();
  const { slides, attachRef } = useContentStudioStore();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = filter === "ALL"
    ? references
    : references.filter((r) => r.type === filter);

  // Find which slide is "active" for attaching — use the first slide without a ref of this type
  function handleRefClick(ref: typeof references[0]) {
    // Attach to the first slide that doesn't already have this ref
    const target = slides.find((s) => !s.references.some((r) => r.id === ref.id));
    if (target) {
      attachRef(target.position, ref);
    }
  }

  return (
    <div className="cs-ref-panel">
      <div className="cs-ref-panel-header">
        <span className="cs-ref-panel-title">References</span>
        <button
          className="cs-slide-action"
          onClick={() => setAddOpen(true)}
          style={{ fontSize: 12 }}
        >
          + Add
        </button>
      </div>

      <div className="cs-ref-tabs">
        <button
          className={`cs-ref-tab${filter === "ALL" ? " active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          All ({references.length})
        </button>
        {REFERENCE_TYPES.map((t) => {
          const count = references.filter((r) => r.type === t).length;
          if (count === 0) return null;
          return (
            <button
              key={t}
              className={`cs-ref-tab${filter === t ? " active" : ""}`}
              onClick={() => setFilter(t)}
            >
              {REFERENCE_TYPE_LABELS[t]} ({count})
            </button>
          );
        })}
      </div>

      <div className="cs-ref-grid">
        {filtered.map((ref) => (
          <ReferenceCard
            key={ref.id}
            reference={ref}
            compact
            onClick={() => handleRefClick(ref)}
          />
        ))}
        <button className="cs-ref-add-btn" onClick={() => setAddOpen(true)}>
          +
        </button>
      </div>

      <AddReferenceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
