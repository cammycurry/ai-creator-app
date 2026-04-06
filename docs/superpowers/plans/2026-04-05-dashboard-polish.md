# Dashboard Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the creator dashboard so every element is purposeful — simplified header, all-type input bar, merged filter+search row, and library page without creator header.

**Architecture:** Three focused changes: (1) workspace-header simplified, (2) workspace-canvas floating input + filter bar cleaned up, (3) library page gets no header. All prototype-first CSS.

**Tech Stack:** Next.js 16 App Router, Zustand, prototype-first CSS

---

## File Map

```
MODIFY: src/components/workspace/workspace-header.tsx     — Simplified header, hidden on non-dashboard pages
MODIFY: src/components/workspace/workspace-canvas.tsx     — Clean input bar, merged filter+search row
MODIFY: src/app/workspace/workspace.css                   — CSS for merged filter bar, cleaned input toolbar
```

---

### Task 1: Simplify Creator Header

**Files:**
- Modify: `src/components/workspace/workspace-header.tsx`

The current header has Content/Templates tabs, edit icon, and "..." button. We simplify to: avatar + name + niche + edit icon. On non-dashboard pages (`/workspace/library`, `/workspace/billing`, `/workspace/settings`), the header is hidden entirely (just mobile menu on mobile).

- [ ] **Step 1: Read the current file**

Read `src/components/workspace/workspace-header.tsx` to understand the full current structure.

- [ ] **Step 2: Rewrite workspace-header.tsx**

Replace the entire file with:

```tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCreatorStore } from "@/stores/creator-store";
import { CreatorProfile } from "./creator-profile";

export function WorkspaceHeader({
  onMenuClick,
  isMobile,
}: {
  onMenuClick?: () => void;
  isMobile?: boolean;
}) {
  const { creators, activeCreatorId, loaded } = useCreatorStore();
  const active = creators.find((c) => c.id === activeCreatorId);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();

  const isDashboard = pathname === "/workspace";

  if (!loaded) {
    return (
      <div className="skel-header">
        <div className="skel skel-header-avatar" />
        <div className="skel-header-lines">
          <div className="skel skel-header-line" style={{ width: 120 }} />
          <div className="skel skel-header-line" style={{ width: 80 }} />
        </div>
      </div>
    );
  }

  // Non-dashboard pages: no header (just mobile menu trigger)
  if (!isDashboard) {
    if (isMobile) {
      return (
        <div className="creator-profile" style={{ justifyContent: "flex-start" }}>
          <button onClick={onMenuClick} style={{ color: "#888" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
      );
    }
    return null;
  }

  // No active creator
  if (!active) {
    return (
      <div className="creator-profile">
        {isMobile && (
          <button onClick={onMenuClick} style={{ marginRight: "8px", color: "#888" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}
        <span style={{ fontSize: "14px", color: "#888" }}>Select a Creator</span>
      </div>
    );
  }

  const nicheLabel =
    active.niche?.[0]
      ? active.niche[0].charAt(0).toUpperCase() + active.niche[0].slice(1)
      : "";

  return (
    <>
      <div className="creator-profile">
        {isMobile && (
          <button onClick={onMenuClick} style={{ marginRight: "4px", color: "#888" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}

        <div className="cp-avatar" onClick={() => setProfileOpen(true)}>
          {active.baseImageUrl ? (
            <img
              src={active.baseImageUrl}
              alt={active.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          ) : (
            active.name[0]
          )}
        </div>

        <div className="cp-info">
          <div className="cp-name">{active.name}</div>
          <div className="cp-meta">
            <span>{nicheLabel}</span>
            <span className="cp-meta-dot" />
            <span>{active.contentCount} items</span>
          </div>
        </div>

        <div className="cp-actions">
          <button className="cp-btn" onClick={() => setProfileOpen(true)} title="Edit creator">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </div>

      <CreatorProfile open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
```

Key changes:
- Removed `useUIStore` import and `activeView`/`setActiveView` (no longer needed)
- Added `usePathname` to detect non-dashboard pages
- Non-dashboard pages return `null` (or just mobile menu on mobile)
- Removed Content tab, Templates tab, "..." button
- Kept: avatar, name, niche, item count, edit icon

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

Expected: Clean build. If there are compile errors about `useUIStore` being unused elsewhere, those are separate files.

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/workspace-header.tsx
git commit -m "fix: simplify creator header — remove tabs, hide on standalone pages"
```

---

### Task 2: Clean Up Floating Input Bar

**Files:**
- Modify: `src/components/workspace/workspace-canvas.tsx`

The floating input currently has suggestion chips, image count control, attach button, settings button, and mode chips that only partially work. We clean it to: prompt input + 4 content type chips + "Open studio" link.

- [ ] **Step 1: Read the current file**

Read `src/components/workspace/workspace-canvas.tsx` fully to understand the ContentArea component structure.

- [ ] **Step 2: Replace the floating input section**

In `ContentArea`, find the floating input section (starts with `{/* Floating input */}` comment, the `<div className="floating-input">` block). Replace the entire floating input block (from `<div className="floating-input">` through its closing `</div>` and the "Open full studio" button div below it) with:

```tsx
      {/* Floating input */}
      <div className="floating-input">
        <div className="float-card">
          <div className="compose-area">
            <textarea
              rows={1}
              placeholder={`What should ${creator.name} do next?`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button
              className="send-btn"
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGeneratingContent}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>

          <div className="input-toolbar">
            <div className="tool-left">
              <button className={`mode-chip${contentMode === "photo" ? " active" : ""}`} onClick={() => setContentMode("photo")}>
                Photo
              </button>
              <button className={`mode-chip${contentMode === "video" ? " active" : ""}`} onClick={() => setContentMode("video")}>
                Video
              </button>
              <button className="mode-chip" onClick={() => {
                useUnifiedStudioStore.getState().setContentType("carousel");
                useUIStore.getState().setContentStudioOpen(true);
              }}>
                Carousel
              </button>
              <button className="mode-chip" onClick={() => {
                useUnifiedStudioStore.getState().setContentType("talking-head");
                useUIStore.getState().setContentStudioOpen(true);
              }}>
                Voice
              </button>
            </div>
            <div className="tool-right">
              <button
                className="studio-link"
                onClick={() => useUIStore.getState().setContentStudioOpen(true)}
              >
                Open studio →
              </button>
            </div>
          </div>
        </div>
      </div>
```

This removes: suggestion chips (`quick-ideas` div), image count control (`count-control` div), attach reference button, settings button, SVG icons on mode chips. The separate "Open full studio" div below the float-card is now inside the toolbar.

- [ ] **Step 3: Update handleSubmit for video mode**

The current `handleSubmit` handles video mode by opening the studio. Update it so video mode generates inline (same as photo but calls video action). Find the `handleSubmit` function and update the video mode section:

```tsx
    // Video mode — generate inline via video pipeline
    if (contentMode === "video") {
      setSuggestions([]);
      setIsGeneratingContent(true);
      setContentError(null);

      const { generateVideoFromText, checkVideoStatus } = await import("@/server/actions/video-actions");
      const result = await generateVideoFromText(creator.id, prompt.trim(), 5, "9:16");

      if (result.success) {
        setPrompt("");
        // Poll for completion
        const poll = setInterval(async () => {
          const status = await checkVideoStatus(result.jobId);
          if (status.status === "COMPLETED") {
            clearInterval(poll);
            // Reload content to show the video
            getCreatorContent(creator.id).then(setContent);
            setIsGeneratingContent(false);
            const data = await getWorkspaceData();
            setCredits(data.balance);
          } else if (status.status === "FAILED") {
            clearInterval(poll);
            setContentError(status.error ?? "Video generation failed");
            setIsGeneratingContent(false);
          }
        }, 5000);
      } else {
        setContentError(result.error);
        setIsGeneratingContent(false);
      }
      return;
    }
```

Replace the existing video mode block that just opens the studio.

- [ ] **Step 4: Remove the SuggestionCards section**

Remove the suggestion cards overlay. Find and delete the block:

```tsx
      {suggestions.length > 0 && (
        <div style={{ position: "fixed", bottom: 140, left: "50%", transform: "translateX(-50%)", zIndex: 10, width: "100%", maxWidth: 680, padding: "0 16px" }}>
          <SuggestionCards
            suggestions={suggestions}
            onGenerate={handleSuggestionGenerate}
            loading={isGeneratingContent}
          />
        </div>
      )}
```

Also remove the `suggestions` state, `suggestLoading` state, `handleSuggestionGenerate` callback, the idea-keyword detection block in `handleSubmit`, and the `SuggestionCards` import + `suggestContent` import if no longer used.

- [ ] **Step 5: Merge filter bar with search/sort**

In the ContentArea return, merge the gallery toolbar into the filter bar so it's one row. Replace both the filter bar div and the gallery-toolbar div with a single combined bar:

```tsx
      {/* Filter + search bar */}
      <div className="filter-bar">
        <button className={`filter-pill${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
          All<span className="count">{standalonePhotos.length + contentSets.length}</span>
        </button>
        <button className={`filter-pill${filter === "photos" ? " active" : ""}`} onClick={() => setFilter("photos")}>
          Photos<span className="count">{standalonePhotos.filter(c => c.type === "IMAGE").length}</span>
        </button>
        <button className={`filter-pill${filter === "videos" ? " active" : ""}`} onClick={() => setFilter("videos")}>
          Videos<span className="count">{standalonePhotos.filter(c => c.type === "VIDEO" || c.type === "TALKING_HEAD").length}</span>
        </button>
        <button className={`filter-pill${filter === "carousels" ? " active" : ""}`} onClick={() => setFilter("carousels")}>
          Carousels<span className="count">{contentSets.length}</span>
        </button>
        <span className="filter-divider" />
        <div className="gallery-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="gallery-sort">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "type")}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="type">By type</option>
          </select>
        </div>
        <span className="gallery-count">{displayContent.length + (filter === "all" || filter === "carousels" ? filteredSets.length : 0)} items</span>
      </div>
```

Then remove the separate `<div className="gallery-toolbar">` block from inside the content-area div (it's now merged into the filter bar above).

- [ ] **Step 6: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

Expected: Clean build.

- [ ] **Step 7: Commit**

```bash
git add src/components/workspace/workspace-canvas.tsx
git commit -m "fix: clean input bar — all types, merged filter+search, remove clutter"
```

---

### Task 3: CSS Adjustments

**Files:**
- Modify: `src/app/workspace/workspace.css`

- [ ] **Step 1: Read the CSS file**

Read `src/app/workspace/workspace.css` to find the relevant sections.

- [ ] **Step 2: Add studio-link style**

Find the `.mode-chip` styles and add after them:

```css
.studio-link { font-size: 12px; color: var(--accent); font-weight: 500; transition: opacity 150ms; }
.studio-link:hover { opacity: 0.8; }
```

- [ ] **Step 3: Update filter-bar to support inline search**

The filter bar already has `display: flex; align-items: center;` which works. The `gallery-search` and `gallery-sort` styles already exist. Just verify the `filter-divider` style exists (it should as a vertical separator). If not, add:

```css
.filter-divider { width: 1px; height: 16px; background: var(--border); margin: 0 4px; }
```

- [ ] **Step 4: Make gallery-search flex-shrink**

Find `.gallery-search` and ensure it has `flex: 0 1 160px; min-width: 100px;` so it doesn't take too much space in the combined bar. Update:

```css
.gallery-search { display: flex; align-items: center; gap: 6px; flex: 0 1 160px; min-width: 100px; }
.gallery-search input { border: none; outline: none; font-size: 12px; color: var(--text-primary); width: 100%; font-family: inherit; background: transparent; }
```

- [ ] **Step 5: Remove unused CSS**

Remove the `.quick-ideas`, `.idea-chip`, `.count-control`, `.count-btn`, `.count-value` styles if they exist. Search for them and delete. Also remove `.cp-edit-btn` styles since those tab buttons are gone.

- [ ] **Step 6: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 7: Commit**

```bash
git add src/app/workspace/workspace.css
git commit -m "fix: CSS cleanup — studio link, merged filter bar, remove unused styles"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Section 1 (Creator Header): Task 1
- ✅ Section 2 (Filter Bar): Task 2, Step 5
- ✅ Section 3 (Floating Input Bar): Task 2, Steps 2-4
- ✅ Section 4 (Library Page): Task 1 (hides header on non-dashboard pages)
- ✅ Section 5 (Sidebar): No changes needed — already correct
- ✅ Section 6 (Removals): Task 1 removes tabs/"...", Task 2 removes suggestions/count/attach/settings
- ✅ Section 7 (Additions): Task 2 adds all-type chips + "Open studio", Task 3 adds CSS

**2. Placeholder scan:** No TBDs, TODOs, or vague instructions. All code provided.

**3. Type consistency:** `contentMode` is `"photo" | "video"` — stays the same. `filter` includes `"videos"` — consistent with Task 2 code. `usePathname` import in Task 1 — correct Next.js API.
