"use client";

import { useState, useMemo } from "react";
import { MediaPickerDialog, type PickerItem } from "./media-picker-dialog";
import { useCreatorStore } from "@/stores/creator-store";
import type { ContentItem } from "@/types/content";

function contentToPickerItem(c: ContentItem): PickerItem {
  const name = c.userInput ?? c.prompt ?? "Photo";
  return {
    id: c.id,
    kind: "content",
    name: name.length > 40 ? name.slice(0, 40) + "..." : name,
    thumbnailUrl: c.url,
    mediaUrl: c.url,
    sourceLabel: formatRelativeDate(c.createdAt),
    isVideo: false,
    createdAt: c.createdAt,
  };
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function PhotoPicker({
  open,
  onOpenChange,
  onSelect,
  selectedContentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (contentId: string | null) => void;
  selectedContentId: string | null;
}) {
  const content = useCreatorStore((s) => s.content);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(selectedContentId);

  const photos = useMemo(
    () => content.filter((c) => c.type === "IMAGE" && c.status === "COMPLETED" && c.url),
    [content]
  );

  let displayItems = useMemo(() => photos.map(contentToPickerItem), [photos]);

  if (filter === "recent") {
    displayItems = [...displayItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    displayItems = displayItems.filter((i) => i.name.toLowerCase().includes(q));
  }

  return (
    <MediaPickerDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) { setSelectedId(selectedContentId); setSearch(""); setFilter("all"); }
        onOpenChange(o);
      }}
      title="Choose Starting Photo"
      subtitle="This photo will be animated into a video. Leave empty to generate from scratch."
      items={displayItems}
      filters={[
        { label: "All", value: "all" },
        { label: "Recent", value: "recent" },
      ]}
      activeFilter={filter}
      onFilterChange={setFilter}
      searchQuery={search}
      onSearchChange={setSearch}
      selectedId={selectedId}
      onSelect={(item) => setSelectedId(item.id)}
      cardAspect="v3x4"
      primaryAction="Use Selected"
      onPrimaryAction={() => { onSelect(selectedId); onOpenChange(false); }}
      secondaryAction="No Starting Photo"
      onSecondaryAction={() => { onSelect(null); onOpenChange(false); }}
      emptyMessage="No photos yet."
      emptyHint="Generate some photos first."
    />
  );
}
