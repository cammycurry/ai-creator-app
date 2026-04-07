"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getReferences, getRecentReferences, getStarredReferences, toggleStar } from "@/server/actions/reference-actions";
import { getPublicReferences, savePublicReference } from "@/server/actions/public-reference-actions";
import { AddReferenceDialog } from "./add-reference-dialog";
import { LibraryDetailModal } from "./library-detail-modal";
import { LIBRARY_FILTERS, PUBLIC_CATEGORIES, type ReferenceItem, type PublicReferenceItem } from "@/types/reference";
import { useCreatorStore } from "@/stores/creator-store";

type Tab = "my" | "public" | "starred";
type SortBy = "newest" | "oldest" | "most-used" | "name";

export function ContentLibrary() {
  const router = useRouter();
  const { references, setReferences, toggleStarInStore, removeReference } = useCreatorStore();

  const [tab, setTab] = useState<Tab>("my");
  const [addOpen, setAddOpen] = useState(false);

  // My Library state
  const [recentRefs, setRecentRefs] = useState<ReferenceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [activeFilter, setActiveFilter] = useState<number>(0);
  const [detailItem, setDetailItem] = useState<ReferenceItem | null>(null);

  // Public Library state
  const [publicRefs, setPublicRefs] = useState<PublicReferenceItem[]>([]);
  const [publicSearch, setPublicSearch] = useState("");
  const [publicCategory, setPublicCategory] = useState<string>("all");
  const [publicLoading, setPublicLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Starred state
  const [starredRefs, setStarredRefs] = useState<ReferenceItem[]>([]);

  // Load data on mount
  useEffect(() => {
    getReferences().then(setReferences);
    getRecentReferences(10).then(setRecentRefs);
  }, [setReferences]);

  // Load public refs when switching to public tab or changing filters
  const loadPublicRefs = useCallback(async () => {
    setPublicLoading(true);
    const refs = await getPublicReferences(
      publicCategory !== "all" ? publicCategory : undefined,
      publicSearch || undefined,
    );
    setPublicRefs(refs);
    setSavedIds(new Set(refs.filter((r) => r.saved).map((r) => r.id)));
    setPublicLoading(false);
  }, [publicCategory, publicSearch]);

  useEffect(() => {
    if (tab === "public") loadPublicRefs();
  }, [tab, loadPublicRefs]);

  // Load starred refs when switching to starred tab
  useEffect(() => {
    if (tab === "starred") {
      getStarredReferences().then(setStarredRefs);
    }
  }, [tab]);

  // Filter + sort my library
  const filterDef = LIBRARY_FILTERS[activeFilter];
  let filtered = references;

  if (filterDef && "filter" in filterDef && filterDef.filter) {
    const f = filterDef.filter;
    if ("type" in f) {
      filtered = filtered.filter((r) => r.type === f.type);
    } else if ("tag" in f) {
      filtered = filtered.filter((r) => r.tags.includes(f.tag));
    }
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q)),
    );
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "most-used") return b.usageCount - a.usageCount;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  async function handleToggleStar(id: string) {
    toggleStarInStore(id);
    await toggleStar(id);
  }

  async function handleSavePublic(publicRefId: string) {
    const result = await savePublicReference(publicRefId);
    if (result.success) {
      setSavedIds((prev) => new Set([...prev, publicRefId]));
      if (result.reference) {
        useCreatorStore.getState().addReference(result.reference);
      }
    }
  }

  return (
    <div className="lib-overlay">
      {/* Header */}
      <div className="lib-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="lib-head-x" onClick={() => router.push("/workspace")}>&times;</button>
          <span className="lib-head-title">Library</span>
        </div>
      </div>
      <div className="lib-page">
      {/* Tab bar */}
      <div className="lib-tab-bar">
        <button className={`lib-tab${tab === "my" ? " active" : ""}`} onClick={() => setTab("my")}>
          My Library
        </button>
        <button className={`lib-tab${tab === "public" ? " active" : ""}`} onClick={() => setTab("public")}>
          Public Library
        </button>
        <button className={`lib-tab${tab === "starred" ? " active" : ""}`} onClick={() => setTab("starred")}>
          Starred
        </button>
        <div className="lib-tab-spacer" />
        <button className="lib-upload-btn" onClick={() => setAddOpen(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Upload
        </button>
      </div>

      {/* ─── My Library Tab ─── */}
      {tab === "my" && (
        <>
          {/* Recently used */}
          {recentRefs.length > 0 && (
            <div className="lib-recent">
              <div className="lib-recent-label">Recently Used</div>
              <div className="lib-recent-strip">
                {recentRefs.map((ref) => (
                  <div
                    key={ref.id}
                    className="lib-recent-thumb"
                    onClick={() => setDetailItem(ref)}
                    title={ref.name}
                  >
                    {ref.imageUrl && <img src={ref.imageUrl} alt={ref.name} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="lib-toolbar">
            <div className="lib-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search references..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="lib-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most-used">Most used</option>
              <option value="name">Name</option>
            </select>
          </div>

          {/* Filter chips */}
          <div className="lib-filters">
            {LIBRARY_FILTERS.map((f, i) => (
              <button
                key={f.label}
                className={`lib-filter-chip${activeFilter === i ? " active" : ""}`}
                onClick={() => setActiveFilter(i)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Count */}
          <div className="lib-count">{sorted.length} reference{sorted.length !== 1 ? "s" : ""}</div>

          {/* Grid or empty */}
          {sorted.length === 0 && references.length === 0 ? (
            <div className="lib-empty">
              <div className="lib-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <div className="lib-empty-title">No references yet</div>
              <div className="lib-empty-desc">
                Upload backgrounds, outfits, products, and poses to use when generating content.
              </div>
              <button className="lib-upload-btn" onClick={() => setAddOpen(true)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Upload Your First Reference
              </button>
              <div style={{ marginTop: 12 }}>
                <button className="lib-empty-link" onClick={() => setTab("public")}>
                  Browse Public Library
                </button>
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="lib-empty">
              <div className="lib-empty-title">No matches</div>
              <div className="lib-empty-desc">Try a different search or filter.</div>
            </div>
          ) : (
            <div className="lib-grid">
              {sorted.map((ref) => (
                <div key={ref.id} className="lib-card" onClick={() => setDetailItem(ref)}>
                  {ref.imageUrl && <img src={ref.imageUrl} alt={ref.name} />}
                  <span className="lib-card-badge">{ref.type === "BACKGROUND" ? "BG" : "REF"}</span>
                  <button
                    className={`lib-card-star${ref.starred ? " starred" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleToggleStar(ref.id); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={ref.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                  <div className="lib-card-overlay">
                    <div className="lib-card-overlay-name">{ref.name}</div>
                    {ref.usageCount > 0 && (
                      <div className="lib-card-overlay-usage">Used {ref.usageCount}x</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Public Library Tab ─── */}
      {tab === "public" && (
        <>
          <div className="lib-toolbar">
            <div className="lib-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search public references..."
                value={publicSearch}
                onChange={(e) => setPublicSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="lib-filters">
            {PUBLIC_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`lib-filter-chip${publicCategory === cat ? " active" : ""}`}
                onClick={() => setPublicCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {publicLoading ? (
            <div className="lib-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="lib-card" style={{ background: "#F0F0F0", animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : publicRefs.length === 0 ? (
            <div className="lib-empty">
              <div className="lib-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <div className="lib-empty-title">No public references found</div>
              <div className="lib-empty-desc">Try a different search or category.</div>
            </div>
          ) : (
            <div className="lib-grid">
              {publicRefs.map((ref) => (
                <div key={ref.id} className="lib-card">
                  {ref.imageUrl && <img src={ref.imageUrl} alt={ref.name} />}
                  <span className="lib-card-badge">{ref.type === "BACKGROUND" ? "BG" : "REF"}</span>
                  {savedIds.has(ref.id) && (
                    <span className="lib-card-saved">Saved</span>
                  )}
                  <div className="lib-card-overlay">
                    <div className="lib-card-overlay-name">{ref.name}</div>
                  </div>
                  {!savedIds.has(ref.id) && (
                    <div className="lib-card-actions">
                      <button
                        className="lib-card-action primary"
                        onClick={() => handleSavePublic(ref.id)}
                      >
                        Save to My Library
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Starred Tab ─── */}
      {tab === "starred" && (
        <>
          {starredRefs.length === 0 ? (
            <div className="lib-empty">
              <div className="lib-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="lib-empty-title">No starred references</div>
              <div className="lib-empty-desc">
                Star your favorite references for quick access.
              </div>
              <button className="lib-empty-link" onClick={() => setTab("my")}>
                Go to My Library
              </button>
            </div>
          ) : (
            <div className="lib-grid">
              {starredRefs.map((ref) => (
                <div key={ref.id} className="lib-card" onClick={() => setDetailItem(ref)}>
                  {ref.imageUrl && <img src={ref.imageUrl} alt={ref.name} />}
                  <span className="lib-card-badge">{ref.type === "BACKGROUND" ? "BG" : "REF"}</span>
                  <button
                    className="lib-card-star starred"
                    onClick={(e) => { e.stopPropagation(); handleToggleStar(ref.id); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                  <div className="lib-card-overlay">
                    <div className="lib-card-overlay-name">{ref.name}</div>
                    {ref.usageCount > 0 && (
                      <div className="lib-card-overlay-usage">Used {ref.usageCount}x</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <LibraryDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}

      {/* Upload Dialog */}
      <AddReferenceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
    </div>
  );
}
