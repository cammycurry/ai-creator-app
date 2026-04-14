"use client";

import { useState, useMemo } from "react";
import { MediaPickerDialog, type PickerItem } from "./media-picker-dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { analyzeReferenceImage, createReference } from "@/server/actions/reference-actions";
import type { ReferenceItem, ReferenceType } from "@/types/reference";

function resizeImage(file: File, maxSize: number = 1200): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function refToPickerItem(r: ReferenceItem): PickerItem {
  const sourceLabel = r.purpose === "scene" ? "Scene" : r.purpose === "product" ? "Product" : "Reference";
  return {
    id: r.id,
    kind: "reference",
    name: r.name,
    description: r.description,
    thumbnailUrl: r.imageUrl,
    mediaUrl: r.imageUrl,
    sourceLabel,
    isVideo: r.purpose === "motion",
    createdAt: r.createdAt,
    tags: r.tags,
  };
}

export function ReferencePicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (ref: ReferenceItem) => void;
}) {
  const references = useCreatorStore((s) => s.references);
  const addReference = useCreatorStore((s) => s.addReference);
  const updateReferenceInStore = useCreatorStore((s) => s.updateReferenceInStore);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Exclude motion/video refs — those go in the motion picker
  // Exclude motion refs — those go in the motion picker
  const imageRefs = useMemo(
    () => references.filter((r) => r.purpose !== "motion"),
    [references]
  );

  let displayItems = useMemo(() => imageRefs.map(refToPickerItem), [imageRefs]);

  if (filter === "scene") {
    displayItems = displayItems.filter((i) => i.sourceLabel === "Scene");
  } else if (filter === "product") {
    displayItems = displayItems.filter((i) => i.sourceLabel === "Product");
  }

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    displayItems = displayItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        (i.tags ?? []).some((t) => t.includes(q))
    );
  }

  const selectedRef = references.find((r) => r.id === selectedId);

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    const base64 = await resizeImage(file);

    // AI analysis for auto-fill
    let name = "New Reference";
    let description = "";
    let tags: string[] = [];
    let refType: ReferenceType = "REFERENCE";
    let purpose: string = "product";
    try {
      const analysis = await analyzeReferenceImage(base64);
      name = analysis.name;
      description = analysis.description;
      tags = analysis.tags;
      if (analysis.type === "BACKGROUND") { refType = "BACKGROUND"; purpose = "scene"; }
    } catch { /* use defaults */ }

    const result = await createReference(refType, name, description, base64, tags, purpose);
    if (result.success) {
      addReference(result.reference);
      setSelectedId(result.reference.id);
    }
  }

  function handleConfirm() {
    if (!selectedRef) return;
    onSelect(selectedRef);
    onOpenChange(false);
  }

  function renderBadge(item: PickerItem) {
    // Find the original ref to read purpose/mode from DB fields
    const ref = references.find((r) => r.id === item.id);
    const isScene = ref?.purpose === "scene";
    const isProduct = ref?.purpose === "product";
    const refMode = ref?.mode;

    return (
      <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {isScene && <span className="mp-card-badge scene">Scene</span>}
        {isProduct && <span className="mp-card-badge product">Product</span>}
        {refMode && <span className={`mp-card-badge ${refMode}`}>{refMode}</span>}
        {!isScene && !isProduct && <span className="mp-card-badge">Ref</span>}
      </span>
    );
  }

  return (
    <MediaPickerDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) { setSelectedId(null); setSearch(""); setFilter("all"); }
        onOpenChange(o);
      }}
      title="Add Reference"
      subtitle="Attach a scene or product reference to guide your generation"
      items={displayItems}
      filters={[
        { label: "All", value: "all" },
        { label: "Scene", value: "scene" },
        { label: "Product", value: "product" },
      ]}
      activeFilter={filter}
      onFilterChange={setFilter}
      searchQuery={search}
      onSearchChange={setSearch}
      selectedId={selectedId}
      onSelect={(item) => setSelectedId(item.id)}
      onUpload={handleUpload}
      cardAspect="v1x1"
      primaryAction="Attach Selected"
      onPrimaryAction={handleConfirm}
      allowEdit
      onEditSave={(id, updates) => updateReferenceInStore(id, updates)}
      renderBadge={renderBadge}
      emptyMessage="No references yet."
      emptyHint="Upload backgrounds, outfits, and products."
      uploadAccept="image/*"
      uploadLabel="Drop an image to add as reference"
    />
  );
}
