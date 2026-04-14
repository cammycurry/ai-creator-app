"use client";

import { useState, useRef, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { updateReference } from "@/server/actions/reference-actions";
import "./media-picker.css";

export type PickerItem = {
  id: string;
  kind: "reference" | "content";
  name: string;
  description?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  sourceLabel: string;
  duration?: string;
  isVideo?: boolean;
  createdAt: string;
  tags?: string[];
};

type FilterDef = { label: string; value: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  items: PickerItem[];
  filters: FilterDef[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedId: string | null;
  onSelect: (item: PickerItem) => void;
  onUpload?: (file: File) => Promise<void>;
  cardAspect: "v9x16" | "v3x4" | "v1x1";
  primaryAction: string;
  primaryDisabled?: boolean;
  onPrimaryAction: () => void;
  secondaryAction?: string;
  onSecondaryAction?: () => void;
  allowEdit?: boolean;
  onEditSave?: (id: string, updates: { name: string; description: string }) => void;
  renderBadge?: (item: PickerItem) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  emptyHint?: string;
  uploadAccept?: string;
  uploadLabel?: string;
};

export function MediaPickerDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  items,
  filters,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  selectedId,
  onSelect,
  onUpload,
  cardAspect,
  primaryAction,
  primaryDisabled,
  onPrimaryAction,
  secondaryAction,
  onSecondaryAction,
  allowEdit = false,
  onEditSave,
  renderBadge,
  loading = false,
  emptyMessage = "Nothing here yet.",
  emptyHint,
  uploadAccept = "video/*",
  uploadLabel = "Drop a file or click to upload",
}: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit side panel
  const [editingItem, setEditingItem] = useState<PickerItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function handleOpenEdit(item: PickerItem) {
    setEditingItem(item);
    setEditName(item.name);
    setEditDesc(item.description ?? "");
  }

  async function handleSaveEdit() {
    if (!editingItem || editingItem.kind !== "reference") return;
    setEditSaving(true);
    const updates = {
      name: editName.trim() || editingItem.name,
      description: editDesc.trim(),
    };
    await updateReference(editingItem.id, updates);
    onEditSave?.(editingItem.id, updates);
    setEditSaving(false);
    setEditingItem(null);
  }

  async function handleUploadFile(file: File) {
    if (!onUpload) return;
    setUploading(true);
    try {
      await onUpload(file);
    } catch {
      // Upload failed — fall through to reset state
    }
    setUploading(false);
    setShowUpload(false);
  }

  // Reset state when dialog closes
  function handleOpenChange(open: boolean) {
    if (!open) {
      setShowUpload(false);
      setEditingItem(null);
      setUploading(false);
    }
    onOpenChange(open);
  }

  const hasPanel = editingItem !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="mp-dialog" showCloseButton={false} style={{ maxWidth: 560, padding: 0, gap: 0 }}>
        {/* Header */}
        <div className="mp-header">
          <div className="mp-title">{title}</div>
          <div className="mp-subtitle">{subtitle}</div>

          {/* Search */}
          <div className="mp-search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              placeholder="Search by name, tags..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Filter pills */}
          <div className="mp-pills">
            {filters.map((f) => (
              <button
                key={f.value}
                className={`mp-pill${activeFilter === f.value ? " active" : ""}`}
                onClick={() => { onFilterChange(f.value); setShowUpload(false); }}
              >
                {f.label}
              </button>
            ))}
            {onUpload && (
              <button
                className={`mp-pill upload${showUpload ? " active" : ""}`}
                onClick={() => setShowUpload(!showUpload)}
              >
                + Upload
              </button>
            )}
          </div>
        </div>

        {/* Body — upload zone OR grid + optional edit panel */}
        {showUpload ? (
          <div
            className={`mp-upload-zone${dragging ? " dragging" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleUploadFile(f);
            }}
          >
            {uploading ? (
              <div className="mp-upload-progress">
                <div className="studio-gen-spinner" style={{ width: 16, height: 16 }} />
                Uploading...
              </div>
            ) : (
              <>
                <div className="mp-upload-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </div>
                <div className="mp-upload-text">{uploadLabel}</div>
                <div className="mp-upload-hint">Will be saved to your reference library</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={uploadAccept}
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadFile(f);
              }}
            />
          </div>
        ) : (
          <div className={`mp-body${hasPanel ? " has-panel" : ""}`}>
            {/* Grid */}
            <div className="mp-grid-area">
              {loading ? (
                <div className="mp-loading">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`mp-loading-card ${cardAspect}`} />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="mp-empty">
                  <div>{emptyMessage}</div>
                  {emptyHint && <div className="mp-empty-hint">{emptyHint}</div>}
                </div>
              ) : (
                <div className="mp-grid">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`mp-card${selectedId === item.id ? " selected" : ""}`}
                      onClick={() => onSelect(item)}
                    >
                      <div className={`mp-card-thumb ${cardAspect}`}>
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.name} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "#E8E8E8" }} />
                        )}

                        {/* Play icon for videos */}
                        {item.isVideo && (
                          <div className="mp-card-play">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                              <polygon points="5 3 19 12 5 21" />
                            </svg>
                          </div>
                        )}

                        {/* Duration badge */}
                        {item.duration && (
                          <span className="mp-card-duration">{item.duration}</span>
                        )}

                        {/* Edit pencil icon */}
                        {allowEdit && item.kind === "reference" && (
                          <button
                            className="mp-card-edit"
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Info */}
                      <div className="mp-card-info">
                        <div className="mp-card-name">{item.name}</div>
                        <div className="mp-card-label">
                          {renderBadge ? renderBadge(item) : item.sourceLabel}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edit side panel */}
            {editingItem && (
              <div className="mp-edit-panel">
                <div className="mp-edit-title">Edit Reference</div>

                <div className="mp-edit-preview">
                  {editingItem.thumbnailUrl && (
                    <img src={editingItem.thumbnailUrl} alt={editingItem.name} />
                  )}
                </div>

                <div>
                  <div className="mp-edit-label">Name</div>
                  <input
                    className="mp-edit-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Reference name"
                  />
                </div>

                <div>
                  <div className="mp-edit-label">Description</div>
                  <textarea
                    className="mp-edit-input"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Describe this reference..."
                    rows={2}
                  />
                </div>

                <div className="mp-edit-actions">
                  <button
                    className="mp-edit-btn cancel"
                    onClick={() => setEditingItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="mp-edit-btn save"
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                  >
                    {editSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mp-footer">
          {secondaryAction && (
            <button className="mp-footer-btn secondary" onClick={onSecondaryAction}>
              {secondaryAction}
            </button>
          )}
          <button
            className="mp-footer-btn secondary"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className="mp-footer-btn primary"
            disabled={primaryDisabled ?? !selectedId}
            onClick={onPrimaryAction}
          >
            {primaryAction}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
