"use client";

import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore, type BrowserItem } from "@/stores/unified-studio-store";
import { toggleStar } from "@/server/actions/reference-actions";
import { deleteContent } from "@/server/actions/content-actions";
import { deleteReference } from "@/server/actions/reference-actions";
import { useTemplate } from "@/server/actions/template-actions";
import { useState } from "react";

export function CanvasActions({ item }: { item: BrowserItem }) {
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const { prefillVideoFromPhoto, prefillFromTemplate, prefillMotionTransfer, selectItem, setContentType, setSourceContentId } = useUnifiedStudioStore();
  const { removeReference, toggleStarInStore } = useCreatorStore();
  const [deleting, setDeleting] = useState(false);

  const creatorName = creator?.name ?? "your creator";

  // --- Content actions ---
  if (item.kind === "content") {
    return (
      <div className="sv3-canvas-actions">
        {item.type === "IMAGE" && (
          <button className="sv3-canvas-action primary" onClick={() => prefillVideoFromPhoto(item.id)}>
            Make Video &rarr;
          </button>
        )}
        {item.type === "IMAGE" && (
          <button className="sv3-canvas-action" onClick={() => {
            setContentType("carousel");
            setSourceContentId(item.id);
          }}>
            Make Carousel &rarr;
          </button>
        )}
        {(item.type === "VIDEO" || item.type === "TALKING_HEAD") && item.mediaUrl && (
          <button className="sv3-canvas-action primary" onClick={() => prefillMotionTransfer(item.mediaUrl!)}>
            Use as Motion Source
          </button>
        )}
        <button className="sv3-canvas-action" onClick={() => {
          // Save as reference — placeholder for future dialog integration
        }}>
          Save as Reference
        </button>
        {item.mediaUrl && (
          <a className="sv3-canvas-action" href={item.mediaUrl} download={`${creatorName}-${item.type.toLowerCase()}.jpg`} target="_blank" rel="noopener">
            Download
          </a>
        )}
        <button
          className="sv3-canvas-action danger"
          disabled={deleting}
          onClick={async () => {
            if (!confirm("Delete this content?")) return;
            setDeleting(true);
            await deleteContent(item.id);
            selectItem(null);
            setDeleting(false);
          }}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    );
  }

  // --- Reference actions ---
  if (item.kind === "reference") {
    return (
      <div className="sv3-canvas-actions">
        <button className="sv3-canvas-action primary" onClick={() => {
          // Attach as ref to creation panel
          const ref = useCreatorStore.getState().references.find((r) => r.id === item.id);
          if (ref) useUnifiedStudioStore.getState().attachRef(ref);
        }}>
          Use in Generation
        </button>
        <button className="sv3-canvas-action" onClick={async () => {
          await toggleStar(item.id);
          toggleStarInStore(item.id);
        }}>
          {item.starred ? "\u2605 Unstar" : "\u2606 Star"}
        </button>
        <button
          className="sv3-canvas-action danger"
          disabled={deleting}
          onClick={async () => {
            if (!confirm("Delete this reference?")) return;
            setDeleting(true);
            await deleteReference(item.id);
            removeReference(item.id);
            selectItem(null);
            setDeleting(false);
          }}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    );
  }

  // --- Template actions ---
  if (item.kind === "template") {
    return (
      <div className="sv3-canvas-actions">
        <button className="sv3-canvas-action primary" onClick={async () => {
          const result = await useTemplate(item.id);
          if (result.success && result.config) {
            prefillFromTemplate(result.config);
          }
        }}>
          Generate with {creatorName} &rarr;
        </button>
        {item.type === "VIDEO" && item.sourceVideoUrl && (
          <button className="sv3-canvas-action" onClick={() => prefillMotionTransfer(item.sourceVideoUrl!)}>
            Motion Transfer &rarr;
          </button>
        )}
        <button className="sv3-canvas-action" onClick={async () => {
          // Save template media as personal reference — placeholder
        }}>
          Save as Reference
        </button>
      </div>
    );
  }

  return null;
}
