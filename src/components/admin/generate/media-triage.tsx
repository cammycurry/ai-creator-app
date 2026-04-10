"use client";

import { useState, useEffect, useCallback } from "react";
import { getRefAccounts, getRefPosts } from "@/server/actions/admin-actions";
import { tagReferencePost } from "@/server/actions/admin-generate-actions";
import { useAdminStore } from "@/stores/admin-store";

type Post = {
  id: string;
  shortcode: string;
  imageUrl: string;
  mediaType: string;
  postUrl: string | null;
  caption: string | null;
  altText: string | null;
  likeCount: number | null;
  setting: string | null;
  outfit: string | null;
  pose: string | null;
  quality: number | null;
  isGoodReference: boolean;
  // triage fields
  triageLabels: string[];
  triageStarred: boolean;
};

type Account = {
  id: string;
  handle: string;
  savedPosts: number;
};

const LABELS = [
  { key: "creator", label: "Creator", color: "bg-purple-700", hotkey: "1", desc: "Good for generating AI creators from" },
  { key: "background", label: "Background", color: "bg-blue-700", hotkey: "2", desc: "Good scene/location to extract" },
  { key: "reference", label: "Reference", color: "bg-green-700", hotkey: "3", desc: "Outfit, pose, product, mood — any useful ref" },
  { key: "skip", label: "Skip", color: "bg-zinc-700", hotkey: "0", desc: "Not useful" },
];

export function MediaTriage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterLabel, setFilterLabel] = useState<string | "all" | "untagged">("all");
  const { openLightbox } = useAdminStore();

  useEffect(() => {
    getRefAccounts().then((data) => {
      const mapped = data.map((a) => ({ id: a.id, handle: a.handle, savedPosts: a.savedPosts }));
      setAccounts(mapped);
    });
  }, []);

  const loadPosts = async (accountId: string) => {
    setLoading(true);
    setSelectedAccountId(accountId);
    const data = await getRefPosts(accountId);
    setPosts(
      data.filter((p) => p.mediaType === "image").map((p) => ({
        id: p.id,
        shortcode: p.shortcode,
        imageUrl: p.imageUrl,
        mediaType: p.mediaType,
        postUrl: p.postUrl,
        caption: p.caption,
        altText: p.altText,
        likeCount: p.likeCount,
        setting: p.setting,
        outfit: p.outfit,
        pose: p.pose,
        quality: p.quality,
        isGoodReference: p.isGoodReference,
        triageLabels: (p as unknown as { triageLabels: string[] }).triageLabels ?? [],
        triageStarred: (p as unknown as { triageStarred: boolean }).triageStarred ?? false,
      }))
    );
    setCurrentIndex(0);
    setLoading(false);
  };

  const loadAllPosts = async () => {
    setLoading(true);
    setSelectedAccountId("all");
    const allPosts: Post[] = [];
    for (const account of accounts) {
      const data = await getRefPosts(account.id);
      for (const p of data) {
        if (p.mediaType !== "image") continue;
        allPosts.push({
          id: p.id,
          shortcode: p.shortcode,
          imageUrl: p.imageUrl,
          mediaType: p.mediaType,
          postUrl: p.postUrl,
          caption: p.caption,
          altText: p.altText,
          likeCount: p.likeCount,
          setting: p.setting,
          outfit: p.outfit,
          pose: p.pose,
          quality: p.quality,
          isGoodReference: p.isGoodReference,
          triageLabels: (p as unknown as { triageLabels: string[] }).triageLabels ?? [],
          triageStarred: (p as unknown as { triageStarred: boolean }).triageStarred ?? false,
        });
      }
    }
    // Sort by likes descending
    allPosts.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    setPosts(allPosts);
    setCurrentIndex(0);
    setLoading(false);
  };

  const filtered = posts.filter((p) => {
    if (filterLabel === "all") return true;
    if (filterLabel === "untagged") return p.triageLabels.length === 0;
    return p.triageLabels.includes(filterLabel);
  });

  const current = filtered[currentIndex] || null;
  const untaggedCount = posts.filter((p) => p.triageLabels.length === 0).length;

  const handleTag = async (label: string) => {
    if (!current) return;
    const hasLabel = current.triageLabels.includes(label);

    if (hasLabel) {
      // Remove the label
      await tagReferencePost(current.id, { removeLabel: label });
      setPosts((prev) =>
        prev.map((p) => (p.id === current.id
          ? { ...p, triageLabels: p.triageLabels.filter((l) => l !== label) }
          : p))
      );
    } else {
      // Add the label (and remove "skip" if adding a real label, or remove real labels if adding "skip")
      if (label === "skip") {
        // Skip replaces everything
        await tagReferencePost(current.id, { addLabel: "skip" });
        for (const existing of current.triageLabels) {
          if (existing !== "skip") await tagReferencePost(current.id, { removeLabel: existing });
        }
        setPosts((prev) =>
          prev.map((p) => (p.id === current.id ? { ...p, triageLabels: ["skip"] } : p))
        );
      } else {
        // Remove skip if present, add the new label
        if (current.triageLabels.includes("skip")) {
          await tagReferencePost(current.id, { removeLabel: "skip" });
        }
        await tagReferencePost(current.id, { addLabel: label });
        setPosts((prev) =>
          prev.map((p) => (p.id === current.id
            ? { ...p, triageLabels: [...p.triageLabels.filter((l) => l !== "skip"), label] }
            : p))
        );
      }
      // Don't auto-advance — user hits → or "Next" when done tagging
    }
  };

  const handleStar = async () => {
    if (!current) return;
    await tagReferencePost(current.id, { triageStarred: !current.triageStarred });
    setPosts((prev) =>
      prev.map((p) => (p.id === current.id ? { ...p, triageStarred: !p.triageStarred } : p))
    );
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    switch (e.key) {
      case "ArrowRight": case "d": setCurrentIndex((i) => Math.min(i + 1, filtered.length - 1)); break;
      case "ArrowLeft": case "a": setCurrentIndex((i) => Math.max(i - 1, 0)); break;
      case "1": handleTag("creator"); break;
      case "2": handleTag("background"); break;
      case "3": handleTag("reference"); break;
      case "0": handleTag("skip"); break;
      case "s": handleStar(); break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, currentIndex, filtered.length]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div>
      {/* Account selector */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={selectedAccountId}
          onChange={(e) => e.target.value === "all" ? loadAllPosts() : loadPosts(e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none"
        >
          <option value="">Select account to triage...</option>
          <option value="all">All accounts (sorted by likes)</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>@{a.handle} ({a.savedPosts} posts)</option>
          ))}
        </select>

        {posts.length > 0 && (
          <span className="text-[11px] text-zinc-500">
            {posts.length} images · {untaggedCount} untagged
          </span>
        )}

        {/* Filter */}
        {posts.length > 0 && (
          <div className="ml-auto flex gap-1">
            {[
              { key: "all", label: "All" },
              { key: "untagged", label: "Untagged" },
              ...LABELS,
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilterLabel(f.key); setCurrentIndex(0); }}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  filterLabel === f.key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:bg-zinc-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="py-16 text-center text-sm text-zinc-600">Loading posts...</div>}

      {!loading && posts.length === 0 && selectedAccountId && (
        <div className="py-16 text-center text-sm text-zinc-600">No image posts for this account.</div>
      )}

      {!loading && filtered.length === 0 && posts.length > 0 && (
        <div className="py-16 text-center text-sm text-zinc-600">
          All images are tagged! Switch filter to review.
        </div>
      )}

      {!loading && current && (
        <div className="flex gap-6">
          {/* Main image */}
          <div className="flex-1">
            <div
              className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 cursor-pointer"
              onClick={() => openLightbox(current.imageUrl)}
            >
              <img
                src={current.imageUrl}
                alt=""
                className="w-full max-h-[65vh] object-contain"
              />
              {current.triageLabels.length > 0 && (
                <div className="absolute top-3 left-3 flex gap-1">
                  {current.triageLabels.map((label) => (
                    <div key={label} className={`rounded-md px-2 py-0.5 text-[10px] font-medium text-white ${
                      LABELS.find((l) => l.key === label)?.color || "bg-zinc-700"
                    }`}>
                      {label}
                    </div>
                  ))}
                </div>
              )}
              {current.triageStarred && (
                <div className="absolute top-3 right-3 text-lg">⭐</div>
              )}
              {current.likeCount != null && current.likeCount > 0 && (
                <div className="absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
                  ❤️ {current.likeCount >= 1000 ? (current.likeCount / 1000).toFixed(1) + "K" : current.likeCount}
                </div>
              )}
              <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
                {currentIndex + 1} / {filtered.length}
              </div>
            </div>

            {/* Nav + metadata */}
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                disabled={currentIndex === 0}
                className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
              >
                ← Prev
              </button>
              <div className="text-center">
                <div className="text-xs text-zinc-400">{current.shortcode}</div>
                {current.postUrl && (
                  <a href={current.postUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-600 hover:text-zinc-400">
                    ↗ View on Instagram
                  </a>
                )}
              </div>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(i + 1, filtered.length - 1))}
                disabled={currentIndex >= filtered.length - 1}
                className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
              >
                Next →
              </button>
            </div>

            {/* Post metadata */}
            {(current.setting || current.outfit || current.pose || current.caption || current.altText) && (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-[11px] text-zinc-500">
                {current.setting && <div><span className="text-zinc-600">Setting:</span> {current.setting}</div>}
                {current.outfit && <div><span className="text-zinc-600">Outfit:</span> {current.outfit}</div>}
                {current.pose && <div><span className="text-zinc-600">Pose:</span> {current.pose}</div>}
                {current.altText && <div className="mt-1 italic text-zinc-600">{current.altText}</div>}
                {current.caption && <div className="mt-1 line-clamp-2">{current.caption}</div>}
              </div>
            )}
          </div>

          {/* Right panel — tag buttons */}
          <div className="w-52 flex-shrink-0">
            <div className="mb-3 text-xs font-semibold text-zinc-400">Tag this reference:</div>
            <div className="flex flex-col gap-2">
              {LABELS.map((l) => {
                const isActive = current.triageLabels.includes(l.key);
                return (
                  <button
                    key={l.key}
                    onClick={() => handleTag(l.key)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-all ${l.color} ${
                      isActive ? "ring-2 ring-white/50 opacity-100" : "opacity-60 hover:opacity-90"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isActive && <span>✓</span>}
                        {l.label}
                      </div>
                      <div className="text-[9px] opacity-70 font-normal">{l.desc}</div>
                    </div>
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">{l.hotkey}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <button
                onClick={handleStar}
                className={`w-full rounded-lg px-3 py-2 text-sm transition-all ${
                  current.triageStarred
                    ? "bg-amber-700 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {current.triageStarred ? "⭐ Starred" : "☆ Star"} <span className="text-[10px] ml-1 opacity-60">S</span>
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-zinc-900/50 p-3 text-[10px] text-zinc-600 leading-relaxed">
              <div className="font-semibold text-zinc-500 mb-1">Keyboard shortcuts:</div>
              ← → or A D — Navigate<br/>
              1 — Creator<br/>
              2 — Background<br/>
              3 — Reference<br/>
              0 — Skip<br/>
              S — Star
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
