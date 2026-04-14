"use client";

import { REFERENCE_TYPE_LABELS, type ReferenceItem } from "@/types/reference";

export function ReferenceCard({
  reference,
  onClick,
  onDelete,
  compact,
}: {
  reference: ReferenceItem;
  onClick?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`ref-card${compact ? " ref-card-compact" : ""}`}
      onClick={onClick}
    >
      <div className="ref-card-image">
        {reference.imageUrl ? (
          <img src={reference.imageUrl} alt={reference.name} />
        ) : (
          <div className="ref-card-placeholder" />
        )}
      </div>
      <div className="ref-card-info">
        <div className="ref-card-name">{reference.name}</div>
        <div className="ref-card-type">
          {reference.purpose === "scene" ? "Scene" : reference.purpose === "product" ? "Product" : reference.purpose === "motion" ? "Motion" : REFERENCE_TYPE_LABELS[reference.type]}
          {reference.mode ? ` · ${reference.mode}` : ""}
        </div>
        {!compact && reference.usageCount > 0 && (
          <div className="ref-card-usage">Used in {reference.usageCount} post{reference.usageCount !== 1 ? "s" : ""}</div>
        )}
      </div>
      {onDelete && (
        <button
          className="ref-card-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete reference"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
