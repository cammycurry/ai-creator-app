"use client";

import { useState } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { deleteReference } from "@/server/actions/reference-actions";
import { ReferenceCard } from "./reference-card";
import { AddReferenceDialog } from "./add-reference-dialog";
import { REFERENCE_TYPES, REFERENCE_TYPE_LABELS, type ReferenceType } from "@/types/reference";

type FilterValue = "ALL" | ReferenceType;

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "BACKGROUND", label: "Backgrounds" },
  { value: "PRODUCT", label: "Products" },
  { value: "OUTFIT", label: "Outfits" },
  { value: "POSE", label: "Poses" },
  { value: "CUSTOM", label: "Custom" },
];

export function ReferenceLibrary() {
  const { getActiveCreator, references, removeReference } = useCreatorStore();
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [addOpen, setAddOpen] = useState(false);

  const creator = getActiveCreator();

  const filtered = filter === "ALL"
    ? references
    : references.filter((r) => r.type === filter);

  const countFor = (value: FilterValue) =>
    value === "ALL" ? references.length : references.filter((r) => r.type === value).length;

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteReference(id);
    if (result.success) {
      removeReference(id);
    }
    setDeletingId(null);
  }

  return (
    <div className="ref-library">
      <div className="ref-library-header">
        <div className="ref-library-title">
          <span className="ref-library-creator">{creator?.name ?? "References"}</span>
          <span className="ref-library-count">{references.length}</span>
        </div>
        <button className="studio-btn primary" onClick={() => setAddOpen(true)}>
          Add Reference
        </button>
      </div>

      <div className="ref-filter-bar">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`filter-pill${filter === tab.value ? " active" : ""}`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
            <span className="count">{countFor(tab.value)}</span>
          </button>
        ))}
      </div>

      {references.length === 0 ? (
        <div className="ref-empty">
          <div className="ref-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <div className="ref-empty-title">No references yet</div>
          <div className="ref-empty-desc">
            Add backgrounds, products, outfits, and poses to use in your content.
          </div>
          <button className="studio-btn primary" onClick={() => setAddOpen(true)}>
            Add Your First Reference
          </button>
        </div>
      ) : (
        <div className="ref-grid">
          {filtered.map((ref) => (
            <ReferenceCard
              key={ref.id}
              reference={ref}
              onDelete={() => handleDelete(ref.id)}
            />
          ))}
          <button className="ref-add-card" onClick={() => setAddOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      )}

      <AddReferenceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
