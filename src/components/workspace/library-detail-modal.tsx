"use client";

import { useState } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { updateReference, toggleStar, deleteReference } from "@/server/actions/reference-actions";
import { REFERENCE_TYPES, REFERENCE_TYPE_LABELS, type ReferenceItem, type ReferenceType, type ReferencePurpose, type ReferenceMode } from "@/types/reference";

export function LibraryDetailModal({
  item,
  onClose,
}: {
  item: ReferenceItem;
  onClose: () => void;
}) {
  const { updateReferenceInStore, removeReference, toggleStarInStore } = useCreatorStore();

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [type, setType] = useState<ReferenceType>(item.type);
  const [purpose, setPurpose] = useState<ReferencePurpose | undefined>(item.purpose);
  const [mode, setMode] = useState<ReferenceMode | undefined>(item.mode);
  const [tags, setTags] = useState(item.tags.join(", "));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const result = await updateReference(item.id, {
      name: name.trim(),
      description: description.trim(),
      type,
      tags: tagList,
      purpose,
      mode: mode ?? null,
    });
    if (result.success) {
      updateReferenceInStore(item.id, {
        name: name.trim(),
        description: description.trim(),
        type,
        tags: tagList,
        purpose,
        mode,
      });
    }
    setSaving(false);
    onClose();
  }

  async function handleToggleStar() {
    toggleStarInStore(item.id);
    await toggleStar(item.id);
  }

  async function handleDelete() {
    if (!confirm("Delete this reference? This cannot be undone.")) return;
    const result = await deleteReference(item.id);
    if (result.success) {
      removeReference(item.id);
    }
    onClose();
  }

  const sourceLabel =
    item.source === "UPLOAD" ? "Uploaded" :
    item.source === "PUBLIC_SAVE" ? "Saved from public library" :
    item.source === "GENERATION_SAVE" ? "Saved from generation" : "Unknown";

  return (
    <div className="lib-detail-backdrop" onClick={onClose}>
      <div className="lib-detail" onClick={(e) => e.stopPropagation()}>
        {item.imageUrl && (
          <img className="lib-detail-image" src={item.imageUrl} alt={item.name} />
        )}

        <div className="lib-detail-body">
          <input
            className="lib-detail-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Reference name"
          />

          <textarea
            className="lib-detail-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={2}
          />

          <div className="lib-detail-row">
            <span className="lib-detail-label">Type</span>
            <select
              className="lib-detail-select"
              value={type}
              onChange={(e) => setType(e.target.value as ReferenceType)}
            >
              {REFERENCE_TYPES.map((t) => (
                <option key={t} value={t}>{REFERENCE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="lib-detail-row">
            <span className="lib-detail-label">Purpose</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className={`sv2-cfg-pill${purpose === "scene" ? " on" : ""}`}
                onClick={() => { setPurpose("scene"); }}
              >
                Scene
              </button>
              <button
                className={`sv2-cfg-pill${purpose === "product" ? " on" : ""}`}
                onClick={() => { setPurpose("product"); setMode("exact"); }}
              >
                Product
              </button>
              <button
                className={`sv2-cfg-pill${purpose === "motion" ? " on" : ""}`}
                onClick={() => { setPurpose("motion"); setMode(undefined); }}
              >
                Motion
              </button>
            </div>
          </div>

          {purpose === "scene" && (
            <div className="lib-detail-row">
              <span className="lib-detail-label">Mode</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className={`sv2-cfg-pill${mode === "exact" ? " on" : ""}`}
                  onClick={() => setMode("exact")}
                >
                  Exact
                </button>
                <button
                  className={`sv2-cfg-pill${mode === "inspired" ? " on" : ""}`}
                  onClick={() => setMode("inspired")}
                >
                  Inspired
                </button>
              </div>
            </div>
          )}

          <div className="lib-detail-row">
            <span className="lib-detail-label">Tags</span>
            <input
              className="lib-detail-tags-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma-separated tags"
            />
          </div>

          {item.tags.length > 0 && (
            <div className="lib-detail-meta">
              {item.tags.map((tag) => (
                <span key={tag} className="lib-detail-tag">{tag}</span>
              ))}
            </div>
          )}

          <div className="lib-detail-stats">
            Used {item.usageCount} time{item.usageCount !== 1 ? "s" : ""}
            {" \u00B7 "}
            {sourceLabel}
          </div>

          <div className="lib-detail-actions">
            <button
              className={`lib-detail-btn star${item.starred ? " starred" : ""}`}
              onClick={handleToggleStar}
              title={item.starred ? "Unstar" : "Star"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={item.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
            <button className="lib-detail-btn danger" onClick={handleDelete}>
              Delete
            </button>
            <button className="lib-detail-btn primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
