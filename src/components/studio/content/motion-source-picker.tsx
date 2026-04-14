"use client";

import { useState, useMemo } from "react";
import { MediaPickerDialog, type PickerItem } from "./media-picker-dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { createVideoReferenceFromUrl } from "@/server/actions/reference-actions";
import type { ReferenceItem } from "@/types/reference";
import type { ContentItem } from "@/types/content";

function refToPickerItem(r: ReferenceItem): PickerItem {
  return {
    id: r.id,
    kind: "reference",
    name: r.name,
    description: r.description,
    thumbnailUrl: r.imageUrl,
    mediaUrl: r.imageUrl,
    sourceLabel: "Motion ref",
    isVideo: true,
    createdAt: r.createdAt,
    tags: r.tags,
  };
}

function contentToPickerItem(c: ContentItem): PickerItem {
  return {
    id: c.id,
    kind: "content",
    name: c.userInput ?? c.prompt ?? "Generated video",
    thumbnailUrl: c.thumbnailUrl ?? c.url,
    mediaUrl: c.url,
    sourceLabel: "Generated video",
    isVideo: true,
    createdAt: c.createdAt,
    tags: [],
  };
}

export function MotionSourcePicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, refId?: string) => void;
}) {
  const references = useCreatorStore((s) => s.references);
  const content = useCreatorStore((s) => s.content);
  const addReference = useCreatorStore((s) => s.addReference);
  const updateReferenceInStore = useCreatorStore((s) => s.updateReferenceInStore);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Motion references — use purpose field, fall back to tags for legacy data
  const motionRefs = useMemo(
    () => references.filter((r) => r.purpose === "motion" || r.tags.some((t) => t === "video" || t === "motion")),
    [references]
  );

  // Generated videos
  const generatedVideos = useMemo(
    () => content.filter((c) => (c.type === "VIDEO" || c.type === "TALKING_HEAD") && c.status === "COMPLETED" && c.url),
    [content]
  );

  // Map to picker items — refs first, then generated
  const allItems = useMemo(() => {
    const refs = motionRefs.map(refToPickerItem);
    const vids = generatedVideos.map(contentToPickerItem);
    return [...refs, ...vids];
  }, [motionRefs, generatedVideos]);

  // Filter
  let displayItems = allItems;
  if (filter === "recently-uploaded") {
    displayItems = [...allItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (filter === "refs") {
    displayItems = allItems.filter((i) => i.kind === "reference");
  } else if (filter === "videos") {
    displayItems = allItems.filter((i) => i.kind === "content");
  }

  // Search
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    displayItems = displayItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        (i.tags ?? []).some((t) => t.includes(q))
    );
  }

  const selectedItem = allItems.find((i) => i.id === selectedId);

  async function handleUpload(file: File) {
    // Upload video to S3 via API route
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload-video", { method: "POST", body: formData });
    if (!res.ok) return;
    const { key } = await res.json();

    // Auto-save as motion reference
    const name = `Motion ref ${new Date().toLocaleDateString()}`;
    const result = await createVideoReferenceFromUrl(name, "", key, ["motion", "video"], "motion");
    if (result.success) {
      addReference(result.reference);
      // Auto-select the new ref
      setSelectedId(result.reference.id);
    }
  }

  function handleConfirm() {
    if (!selectedItem) return;
    const url = selectedItem.mediaUrl ?? selectedItem.thumbnailUrl;
    if (!url) return;
    onSelect(url, selectedItem.kind === "reference" ? selectedItem.id : undefined);
    onOpenChange(false);
  }

  return (
    <MediaPickerDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) { setSelectedId(null); setSearch(""); setFilter("all"); }
        onOpenChange(o);
      }}
      title="Choose Motion Source"
      subtitle="Pick a video — your creator will copy the movements"
      items={displayItems}
      filters={[
        { label: "All", value: "all" },
        { label: "Recently Uploaded", value: "recently-uploaded" },
        { label: "Motion Refs", value: "refs" },
        { label: "My Videos", value: "videos" },
      ]}
      activeFilter={filter}
      onFilterChange={setFilter}
      searchQuery={search}
      onSearchChange={setSearch}
      selectedId={selectedId}
      onSelect={(item) => setSelectedId(item.id)}
      onUpload={handleUpload}
      cardAspect="v9x16"
      primaryAction="Use Selected"
      onPrimaryAction={handleConfirm}
      allowEdit
      onEditSave={(id, updates) => updateReferenceInStore(id, updates)}
      emptyMessage="No motion sources yet."
      emptyHint="Upload a video reference or generate a video first."
      uploadAccept="video/*"
      uploadLabel="Drop a video to use as motion source"
    />
  );
}
