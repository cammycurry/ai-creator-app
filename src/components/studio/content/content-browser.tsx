"use client";

import { useState, useEffect } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { useUnifiedStudioStore, type BrowserItem } from "@/stores/unified-studio-store";
import { getCreatorContent } from "@/server/actions/content-actions";
import { getContentTemplates } from "@/server/actions/template-actions";
import { AddReferenceDialog } from "@/components/workspace/add-reference-dialog";
import type { ContentItem } from "@/types/content";
import type { ReferenceItem } from "@/types/reference";
import type { ContentTemplateItem } from "@/types/template";
import { TEMPLATE_CATEGORY_LABELS } from "@/types/template";

function contentToBrowserItem(c: ContentItem): BrowserItem {
  return {
    id: c.id,
    kind: "content",
    type: c.type,
    name: c.userInput ?? c.prompt ?? c.type,
    thumbnailUrl: c.thumbnailUrl ?? c.url,
    mediaUrl: c.url,
    prompt: c.userInput ?? c.prompt,
    createdAt: c.createdAt,
    contentSetId: c.contentSetId,
  };
}

function refToBrowserItem(r: ReferenceItem): BrowserItem {
  return {
    id: r.id,
    kind: "reference",
    type: r.type,
    name: r.name,
    thumbnailUrl: r.imageUrl,
    mediaUrl: r.imageUrl,
    createdAt: r.createdAt,
    tags: r.tags,
    starred: r.starred,
  };
}

function templateToBrowserItem(t: ContentTemplateItem): BrowserItem {
  return {
    id: t.id,
    kind: "template",
    type: t.type,
    name: t.name,
    thumbnailUrl: t.thumbnailUrl ?? t.mediaUrl,
    mediaUrl: t.mediaUrl,
    createdAt: t.createdAt,
    trend: t.trend,
    category: t.category,
    generationConfig: t.generationConfig,
    sourceVideoUrl: t.sourceVideoUrl,
    tags: t.tags,
  };
}

export function ContentBrowser({ onItemSelect }: { onItemSelect?: () => void }) {
  const creator = useCreatorStore((s) => s.getActiveCreator());
  const references = useCreatorStore((s) => s.references);
  const {
    browserTab, setBrowserTab,
    browserSubFilter, setBrowserSubFilter,
    browserSearch, setBrowserSearch,
    selectedItem, selectItem,
    showResults,
  } = useUnifiedStudioStore();

  const [contentItems, setContentItems] = useState<BrowserItem[]>([]);
  const [templateItems, setTemplateItems] = useState<BrowserItem[]>([]);
  const [templateTrends, setTemplateTrends] = useState<Map<string, BrowserItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [addRefOpen, setAddRefOpen] = useState(false);

  // Load content on mount and after results are dismissed
  useEffect(() => {
    if (!creator?.id) return;
    setLoading(true);
    getCreatorContent(creator.id).then((items) => {
      // Filter out carousel slides (they belong to sets)
      const standalone = items.filter((c) => !c.contentSetId);
      setContentItems(standalone.map(contentToBrowserItem));
      setLoading(false);
    });
  }, [creator?.id, showResults]);

  // Load templates
  useEffect(() => {
    getContentTemplates().then((templates) => {
      const items = templates.map(templateToBrowserItem);
      setTemplateItems(items);
      // Group by trend
      const groups = new Map<string, BrowserItem[]>();
      for (const item of items) {
        const key = item.trend ?? "other";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }
      setTemplateTrends(groups);
    });
  }, []);

  // Convert refs to browser items
  const refItems = references.map(refToBrowserItem);

  function handleSelect(item: BrowserItem) {
    selectItem(item);
    onItemSelect?.();
  }

  // Filter logic
  const query = browserSearch.toLowerCase().trim();

  let displayItems: BrowserItem[] = [];
  if (browserTab === "my-content") {
    displayItems = contentItems;
    if (browserSubFilter === "photos") displayItems = displayItems.filter((i) => i.type === "IMAGE");
    else if (browserSubFilter === "videos") displayItems = displayItems.filter((i) => i.type === "VIDEO" || i.type === "TALKING_HEAD");
    else if (browserSubFilter === "carousels") displayItems = displayItems.filter((i) => i.type === "CAROUSEL");
  } else {
    if (browserSubFilter === "my-refs") displayItems = refItems;
    else if (browserSubFilter === "templates") displayItems = templateItems;
    else displayItems = [...refItems, ...templateItems];
  }

  if (query) {
    displayItems = displayItems.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        (i.prompt ?? "").toLowerCase().includes(query) ||
        (i.tags ?? []).some((t) => t.includes(query))
    );
  }

  const myContentFilters = [
    { label: "All", value: "all" },
    { label: "Photos", value: "photos" },
    { label: "Videos", value: "videos" },
    { label: "Carousels", value: "carousels" },
  ];

  const refsTemplateFilters = [
    { label: "All", value: "all" },
    { label: "My Refs", value: "my-refs" },
    { label: "Templates", value: "templates" },
  ];

  const activeFilters = browserTab === "my-content" ? myContentFilters : refsTemplateFilters;

  function getBadgeText(item: BrowserItem): string {
    if (item.kind === "template") return "TEMPLATE";
    if (item.type === "IMAGE") return "PHOTO";
    if (item.type === "VIDEO") return "VIDEO";
    if (item.type === "TALKING_HEAD") return "VOICE";
    if (item.type === "CAROUSEL") return "CAROUSEL";
    if (item.type === "BACKGROUND") return "BG";
    return "REF";
  }

  // Template trend display (only when on templates sub-filter)
  const showTrends = browserTab === "refs-templates" && (browserSubFilter === "templates" || browserSubFilter === "all") && !query;

  return (
    <div className="sv3-browser">
      {/* Tabs */}
      <div className="sv3-browser-tabs">
        <button
          className={`sv3-browser-tab${browserTab === "my-content" ? " active" : ""}`}
          onClick={() => { setBrowserTab("my-content"); setBrowserSubFilter("all"); }}
        >
          My Content
        </button>
        <button
          className={`sv3-browser-tab${browserTab === "refs-templates" ? " active" : ""}`}
          onClick={() => { setBrowserTab("refs-templates"); setBrowserSubFilter("all"); }}
        >
          Refs & Templates
        </button>
      </div>

      {/* Search */}
      <div className="sv3-browser-search">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          placeholder="Search..."
          value={browserSearch}
          onChange={(e) => setBrowserSearch(e.target.value)}
        />
      </div>

      {/* Sub-filters */}
      <div className="sv3-browser-filters">
        {activeFilters.map((f) => (
          <button
            key={f.value}
            className={`sv3-browser-chip${browserSubFilter === f.value ? " active" : ""}`}
            onClick={() => setBrowserSubFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        {browserTab === "refs-templates" && (
          <button className="sv3-browser-chip" onClick={() => setAddRefOpen(true)}>+ Upload</button>
        )}
      </div>

      {/* Grid or trend groups */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div className="sv3-browser-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sv3-browser-item" style={{ background: "#F0F0F0", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : showTrends && templateTrends.size > 0 ? (
          // Grouped by trend
          <>
            {browserTab === "refs-templates" && browserSubFilter === "all" && refItems.length > 0 && (
              <>
                <div className="sv3-browser-group">My References</div>
                <div className="sv3-browser-grid">
                  {refItems.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className={`sv3-browser-item${selectedItem?.id === item.id ? " selected" : ""}`}
                      onClick={() => handleSelect(item)}
                    >
                      {item.thumbnailUrl && <img src={item.thumbnailUrl} alt={item.name} />}
                      <span className="sv3-browser-badge">{getBadgeText(item)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {Array.from(templateTrends.entries()).map(([trend, items]) => (
              <div key={trend}>
                <div className="sv3-browser-group">
                  {TEMPLATE_CATEGORY_LABELS[items[0]?.category ?? ""] ?? trend.replace(/-/g, " ")}
                  {" \u00b7 "}
                  {trend.replace(/-/g, " ")}
                </div>
                <div className="sv3-browser-grid">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`sv3-browser-item${selectedItem?.id === item.id ? " selected" : ""}`}
                      onClick={() => handleSelect(item)}
                    >
                      {item.thumbnailUrl && <img src={item.thumbnailUrl} alt={item.name} />}
                      <span className="sv3-browser-badge template">{getBadgeText(item)}</span>
                      {item.type === "VIDEO" && (
                        <div className="sv3-browser-play">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" opacity={0.9}><polygon points="5 3 19 12 5 21" /></svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : displayItems.length === 0 ? (
          <div className="sv3-browser-empty">
            {browserTab === "my-content"
              ? "Your content will appear here.\nGenerate your first photo \u2192"
              : browserSubFilter === "my-refs"
              ? "No references yet.\nUpload backgrounds, outfits, and poses."
              : "Templates coming soon.\nCheck back for trending content ideas."}
          </div>
        ) : (
          <div className="sv3-browser-grid">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className={`sv3-browser-item${selectedItem?.id === item.id ? " selected" : ""}`}
                onClick={() => handleSelect(item)}
              >
                {item.thumbnailUrl && <img src={item.thumbnailUrl} alt={item.name} />}
                <span className={`sv3-browser-badge${item.kind === "template" ? " template" : ""}`}>
                  {getBadgeText(item)}
                </span>
                {(item.type === "VIDEO" || item.type === "TALKING_HEAD") && (
                  <div className="sv3-browser-play">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" opacity={0.9}><polygon points="5 3 19 12 5 21" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddReferenceDialog open={addRefOpen} onOpenChange={setAddRefOpen} />
    </div>
  );
}
