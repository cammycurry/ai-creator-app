"use client";

import { useState } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { updateCreator, deleteCreator } from "@/server/actions/creator-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function CreatorProfile({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    creators,
    activeCreatorId,
    removeCreator,
    setActiveCreator,
    setCreators,
    setCredits,
  } = useCreatorStore();

  const creator = creators.find((c) => c.id === activeCreatorId);
  const [name, setName] = useState(creator?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!creator) return null;

  const handleSaveName = async () => {
    if (!name.trim() || name === creator.name) return;
    setSaving(true);
    const result = await updateCreator(creator.userId, creator.id, { name: name.trim() });
    if (result.success) {
      const data = await getWorkspaceData();
      setCreators(data.creators);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteCreator(creator.userId, creator.id);
    if (result.success) {
      removeCreator(creator.id);
      const remaining = creators.filter((c) => c.id !== creator.id);
      if (remaining.length > 0) {
        setActiveCreator(remaining[0].id);
      }
      onOpenChange(false);
      const data = await getWorkspaceData();
      setCredits(data.balance);
    }
    setDeleting(false);
  };

  const nicheLabel = creator.niche?.[0]
    ? creator.niche[0].charAt(0).toUpperCase() + creator.niche[0].slice(1)
    : "General";

  const createdDate = new Date(creator.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="creator-profile-sheet">
        <SheetHeader>
          <SheetTitle className="sr-only">Creator Profile</SheetTitle>
        </SheetHeader>

        <div className="cps-header">
          <div className="cps-avatar">
            {creator.baseImageUrl ? (
              <img src={creator.baseImageUrl} alt={creator.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", borderRadius: "inherit" }} />
            ) : (
              creator.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
            )}
          </div>
          <div className="cps-header-info">
            <input
              className="cps-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
              }}
              disabled={saving}
            />
            <div className="cps-niche">{nicheLabel}</div>
          </div>
        </div>

        <div className="cps-section">
          <div className="cps-section-label">Stats</div>
          <div className="cps-stats">
            <div className="cps-stat">
              <div className="cps-stat-value">{creator.contentCount}</div>
              <div className="cps-stat-label">Content</div>
            </div>
            <div className="cps-stat">
              <div className="cps-stat-value">{createdDate}</div>
              <div className="cps-stat-label">Created</div>
            </div>
          </div>
        </div>

        <div className="cps-section">
          <div className="cps-section-label">Settings</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {creator.isPreMade ? "Pre-made creator" : "Custom creator"}
          </div>
        </div>

        <div className="cps-danger-zone">
          <div className="cps-section-label">Danger Zone</div>
          <AlertDialog>
            <AlertDialogTrigger className="cps-delete-btn" disabled={deleting}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              {deleting ? "Deleting..." : "Delete Creator"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {creator.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this creator and all their generated content.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  style={{ background: "#e53e3e" }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
