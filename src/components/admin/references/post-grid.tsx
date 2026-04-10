"use client";

import { useState, useMemo } from "react";
import { useAdminStore } from "@/stores/admin-store";

type Post = {
  id: string;
  shortcode: string;
  carouselIndex: number;
  mediaType: string;
  imageUrl: string;
  postUrl: string | null;
  postType: string;
  carouselCount: number | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  likeCount: number | null;
  commentCount: number | null;
  viewCount: number | null;
  postedAt: string | Date | null;
  location: string | null;
  altText: string | null;
  pose: string | null;
  setting: string | null;
  outfit: string | null;
  lighting: string | null;
  composition: string | null;
  quality: number | null;
  isGoodReference: boolean;
  createdAt: string | Date;
};

type SortKey = "newest" | "oldest" | "most-liked" | "most-commented" | "most-viewed";
type FilterType = "all" | "image" | "video" | "carousel" | "reel";

export function PostGrid({
  posts,
  handle,
  onBack,
}: {
  posts: Post[];
  handle: string;
  onBack: () => void;
}) {
  const { openLightbox } = useAdminStore();
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const imageCount = posts.filter((p) => p.mediaType === "image" && p.postType !== "carousel").length;
  const videoCount = posts.filter((p) => p.mediaType === "video" && p.postType !== "carousel").length;
  const carouselCount = posts.filter((p) => p.postType === "carousel" && p.carouselIndex === 0).length;
  const reelCount = posts.filter((p) => p.postType === "reel").length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likeCount || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.commentCount || 0), 0);
  const hasEngagement = posts.some((p) => p.likeCount != null || p.commentCount != null);

  const sorted = useMemo(() => {
    let filtered = posts;
    if (filterType === "image") {
      filtered = posts.filter((p) => p.mediaType === "image" && p.postType !== "carousel");
    } else if (filterType === "video") {
      filtered = posts.filter((p) => p.mediaType === "video" && p.postType !== "carousel");
    } else if (filterType === "carousel") {
      filtered = posts.filter((p) => p.postType === "carousel");
    } else if (filterType === "reel") {
      filtered = posts.filter((p) => p.postType === "reel");
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return toTime(a.postedAt || a.createdAt) - toTime(b.postedAt || b.createdAt);
        case "most-liked":
          return (b.likeCount || 0) - (a.likeCount || 0);
        case "most-commented":
          return (b.commentCount || 0) - (a.commentCount || 0);
        case "most-viewed":
          return (b.viewCount || 0) - (a.viewCount || 0);
        case "newest":
        default:
          return toTime(b.postedAt || b.createdAt) - toTime(a.postedAt || a.createdAt);
      }
    });
  }, [posts, sortBy, filterType]);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            ← Back
          </button>
          <h3 className="text-base font-semibold text-zinc-100">@{handle}</h3>
          <a
            href={`https://instagram.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            ↗ Open Instagram
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
        <span>{posts.length} posts</span>
        {imageCount > 0 && <span>{imageCount} photos</span>}
        {reelCount > 0 && <span>{reelCount} reels</span>}
        {carouselCount > 0 && <span>{carouselCount} carousels</span>}
        {videoCount > 0 && videoCount !== reelCount && <span>{videoCount} videos</span>}
        {hasEngagement && (
          <>
            <span>❤️ {fmtNum(totalLikes)} total likes</span>
            <span>💬 {fmtNum(totalComments)} total comments</span>
          </>
        )}
      </div>

      {/* Sort + Filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {([
            { key: "all", label: "All" },
            { key: "image", label: "Photos" },
            { key: "reel", label: "Reels" },
            { key: "carousel", label: "Carousels" },
            { key: "video", label: "Videos" },
          ] as { key: FilterType; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filterType === f.key
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-zinc-800" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400 outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="most-liked">Most liked</option>
          <option value="most-commented">Most commented</option>
          <option value="most-viewed">Most viewed</option>
        </select>
        <span className="text-[10px] text-zinc-600">
          Showing {sorted.length} of {posts.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-600">
          {posts.length === 0 ? "No posts saved for this account yet." : "No posts match the current filter."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sorted.map((p) => (
            <div key={p.id} className="group">
              <div
                className="relative cursor-pointer overflow-hidden rounded-md bg-zinc-800"
                style={{ aspectRatio: "1" }}
                onClick={() => openLightbox(p.imageUrl, p.mediaType === "video" ? "video" : "image")}
              >
                {p.mediaType === "video" ? (
                  <video
                    src={p.imageUrl}
                    muted
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform hover:scale-[1.03]"
                    loading="lazy"
                  />
                )}
                {/* Top-right badges */}
                <div className="absolute right-1 top-1 flex gap-1">
                  {p.postUrl && (
                    <a
                      href={p.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white hover:bg-black/90"
                    >
                      ↗ IG
                    </a>
                  )}
                  {p.postType === "reel" && (
                    <span className="rounded bg-purple-900/80 px-1.5 py-0.5 text-[10px] text-purple-200">
                      REEL
                    </span>
                  )}
                  {p.postType === "carousel" && p.carouselIndex === 0 && (
                    <span className="rounded bg-blue-900/80 px-1.5 py-0.5 text-[10px] text-blue-200">
                      {p.carouselCount ? `${p.carouselCount} slides` : "CAROUSEL"}
                    </span>
                  )}
                  {p.postType === "carousel" && p.carouselIndex > 0 && (
                    <span className="rounded bg-blue-900/80 px-1.5 py-0.5 text-[10px] text-blue-200">
                      #{p.carouselIndex + 1}
                    </span>
                  )}
                  {p.mediaType === "video" && p.postType !== "reel" && (
                    <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      VIDEO
                    </span>
                  )}
                </div>
                {/* Bottom: shortcode + engagement */}
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-1 pb-1">
                  <div className="flex gap-1">
                    <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      {p.shortcode}{p.carouselIndex > 0 && ` #${p.carouselIndex}`}
                    </span>
                    {(p.pose || p.setting || p.outfit || p.caption || p.altText) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPost(expandedPost === p.id ? null : p.id);
                        }}
                        className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white hover:bg-black/90"
                      >
                        ⓘ
                      </button>
                    )}
                  </div>
                  {/* Inline engagement stats */}
                  <div className="flex gap-1.5">
                    {p.likeCount != null && p.likeCount > 0 && (
                      <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                        ❤️ {fmtNum(p.likeCount)}
                      </span>
                    )}
                    {p.quality != null && (
                      <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-amber-300">
                        Q{p.quality}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Date under tile */}
              {p.postedAt && (
                <div className="mt-0.5 text-[9px] text-zinc-600 px-0.5">
                  {new Date(p.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
              {/* Expanded info panel */}
              {expandedPost === p.id && (
                <div className="mt-1 rounded-md border border-zinc-800 bg-zinc-900 p-2.5 text-[11px]">
                  {/* Engagement stats */}
                  {(p.likeCount != null || p.commentCount != null || p.viewCount != null) && (
                    <div className="flex gap-3 mb-2 text-[10px] text-zinc-500">
                      {p.likeCount != null && <span>❤️ {fmtNum(p.likeCount)}</span>}
                      {p.commentCount != null && <span>💬 {fmtNum(p.commentCount)}</span>}
                      {p.viewCount != null && <span>▶️ {fmtNum(p.viewCount)}</span>}
                      {p.postedAt && (
                        <span className="text-zinc-600">
                          {new Date(p.postedAt).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric", year: "numeric"
                          })}
                        </span>
                      )}
                    </div>
                  )}
                  {p.location && (
                    <div className="text-[10px] text-zinc-500 mb-1.5">📍 {p.location}</div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {p.pose && <Tag label="Pose" value={p.pose} />}
                    {p.setting && <Tag label="Setting" value={p.setting} />}
                    {p.outfit && <Tag label="Outfit" value={p.outfit} />}
                    {p.lighting && <Tag label="Light" value={p.lighting} />}
                    {p.composition && <Tag label="Comp" value={p.composition} />}
                    {p.width && p.height && (
                      <Tag label="Size" value={`${p.width}×${p.height}`} />
                    )}
                  </div>
                  {p.altText && (
                    <div className="line-clamp-2 text-zinc-600 leading-relaxed italic mb-1">
                      {p.altText}
                    </div>
                  )}
                  {p.caption && (
                    <div className="line-clamp-3 text-zinc-500 leading-relaxed">
                      {p.caption}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function toTime(d: string | Date | null): number {
  if (!d) return 0;
  return new Date(d).getTime();
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px]">
      <span className="text-zinc-500">{label}:</span>{" "}
      <span className="text-zinc-300">{value}</span>
    </span>
  );
}
