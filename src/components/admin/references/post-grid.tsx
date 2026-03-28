"use client";

import { useAdminStore } from "@/stores/admin-store";

type Post = {
  id: string;
  shortcode: string;
  carouselIndex: number;
  mediaType: string;
  imageUrl: string;
  pose: string | null;
  setting: string | null;
  outfit: string | null;
  lighting: string | null;
  composition: string | null;
  quality: number | null;
};

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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            ← Back
          </button>
          <h3 className="text-base font-semibold text-zinc-100">@{handle}</h3>
        </div>
        <span className="text-xs text-zinc-600">{posts.length} image(s)</span>
      </div>

      {posts.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-600">
          No posts saved for this account yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {posts.map((p) => (
            <div
              key={p.id}
              className="relative cursor-pointer overflow-hidden rounded-md bg-zinc-800"
              style={{ aspectRatio: "1" }}
              onClick={() => openLightbox(p.imageUrl)}
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
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                {p.shortcode}
                {p.carouselIndex > 0 && ` #${p.carouselIndex}`}
              </span>
              {p.mediaType === "video" && (
                <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  VIDEO
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
