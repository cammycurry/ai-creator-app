"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getAdminMediaByStage,
  rateAdminMedia,
  moveAdminMedia,
} from "@/server/actions/admin-generate-actions";
import { useAdminStore } from "@/stores/admin-store";

type CreatorItem = {
  id: string;
  s3Key: string;
  signedUrl: string | null;
  prompt: string | null;
  notes: string | null;
  sourceHandle: string | null;
  pipelineStage: string;
  rating: number | null;
  feedback: string | null;
  promptTags: string[];
  starred: boolean;
  createdAt: Date;
};

const PROMPT_TAG_OPTIONS = [
  "natural-hair", "warm-smile", "good-lighting", "realistic-skin",
  "good-body", "c-cup", "curly", "freckles", "great-face", "perfect-crop",
];

const STAGES = ["inbox", "review", "approved", "published", "rejected"];

export function CreatorGallery() {
  const [creators, setCreators] = useState<CreatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { openLightbox } = useAdminStore();

  const loadCreators = async () => {
    setLoading(true);
    const stages = await getAdminMediaByStage({ mediaType: "creator" });
    const all = Object.values(stages).flat() as unknown as CreatorItem[];
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setCreators(all);
    setLoading(false);
  };

  useEffect(() => { loadCreators(); }, []);

  const filtered = creators.filter((c) => {
    if (filterStage !== "all" && c.pipelineStage !== filterStage) return false;
    if (filterRating > 0 && (c.rating || 0) < filterRating) return false;
    return true;
  });

  const handleRate = (id: string, rating: number) => {
    setCreators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, rating: c.rating === rating ? null : rating } : c))
    );
    startTransition(async () => {
      const current = creators.find((c) => c.id === id);
      await rateAdminMedia(id, { rating: current?.rating === rating ? undefined : rating });
    });
  };

  const handleFeedback = (id: string, feedback: string) => {
    startTransition(async () => {
      await rateAdminMedia(id, { feedback });
    });
  };

  const handleToggleTag = (id: string, tag: string) => {
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const tags = c.promptTags.includes(tag)
          ? c.promptTags.filter((t) => t !== tag)
          : [...c.promptTags, tag];
        return { ...c, promptTags: tags };
      })
    );
    startTransition(async () => {
      const item = creators.find((c) => c.id === id);
      if (!item) return;
      const newTags = item.promptTags.includes(tag)
        ? item.promptTags.filter((t) => t !== tag)
        : [...item.promptTags, tag];
      await rateAdminMedia(id, { promptTags: newTags });
    });
  };

  const handleMove = (id: string, stage: string) => {
    setCreators((prev) => prev.map((c) => (c.id === id ? { ...c, pipelineStage: stage } : c)));
    startTransition(async () => { await moveAdminMedia(id, stage); });
  };

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = creators.filter((c) => c.pipelineStage === s).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="py-16 text-center text-sm text-zinc-600">Loading creators...</div>;
  }

  return (
    <div>
      {/* Stats */}
      <div className="mb-3 flex items-center gap-4 text-[11px] text-zinc-500">
        <span>{creators.length} total creators</span>
        {STAGES.map((s) => stageCounts[s] > 0 && (
          <span key={s}>{s}: {stageCounts[s]}</span>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <button
            onClick={() => setFilterStage("all")}
            className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${filterStage === "all" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:bg-zinc-800"}`}
          >
            All
          </button>
          {STAGES.filter((s) => stageCounts[s] > 0).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStage(s)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium capitalize ${filterStage === s ? "bg-zinc-700 text-white" : "text-zinc-500 hover:bg-zinc-800"}`}
            >
              {s} ({stageCounts[s]})
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-zinc-800" />
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          Min rating:
          {[0, 3, 4, 5].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRating(r)}
              className={`rounded px-1.5 py-0.5 ${filterRating === r ? "bg-zinc-700 text-white" : "text-zinc-600 hover:bg-zinc-800"}`}
            >
              {r === 0 ? "Any" : `${r}★+`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-600">
          {creators.length === 0 ? "No creators generated yet." : "No creators match the current filters."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-600"
            >
              {/* Image */}
              {c.signedUrl && (
                <div
                  className="relative cursor-pointer"
                  onClick={() => openLightbox(c.signedUrl!)}
                >
                  <img
                    src={c.signedUrl}
                    alt=""
                    className="aspect-[3/4] w-full object-cover"
                    loading="lazy"
                  />
                  {/* Stage badge */}
                  <div className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-[9px] font-medium text-white capitalize ${
                    c.pipelineStage === "approved" ? "bg-green-700" :
                    c.pipelineStage === "published" ? "bg-blue-700" :
                    c.pipelineStage === "rejected" ? "bg-red-800" :
                    c.pipelineStage === "review" ? "bg-amber-700" :
                    "bg-zinc-700"
                  }`}>
                    {c.pipelineStage}
                  </div>
                  {/* Star */}
                  {c.starred && <span className="absolute top-2 right-2 text-sm">⭐</span>}
                  {/* Rating */}
                  {c.rating && (
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-amber-300">
                      {"★".repeat(c.rating)}
                    </div>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="p-3">
                {/* Source + date */}
                <div className="flex items-center justify-between">
                  {c.sourceHandle && (
                    <span className="text-[10px] text-zinc-500">@{c.sourceHandle}</span>
                  )}
                  <span className="text-[9px] text-zinc-700">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Rating stars */}
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRate(c.id, star)}
                      className={`text-base transition-colors ${
                        c.rating && star <= c.rating ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                {/* Feedback */}
                {c.feedback && (
                  <div className="mt-1.5 text-[10px] text-zinc-500 italic line-clamp-2">
                    &ldquo;{c.feedback}&rdquo;
                  </div>
                )}

                {/* Prompt tags */}
                {c.promptTags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.promptTags.map((tag) => (
                      <span key={tag} className="rounded bg-green-900/30 px-1.5 py-0.5 text-[8px] text-green-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  className="mt-2 w-full text-[10px] text-zinc-600 hover:text-zinc-400"
                >
                  {expandedId === c.id ? "▲ Less" : "▼ More"}
                </button>

                {expandedId === c.id && (
                  <div className="mt-2 space-y-2">
                    {/* Feedback input */}
                    <input
                      type="text"
                      placeholder="What worked? What didn't?"
                      defaultValue={c.feedback || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (c.feedback || "")) {
                          handleFeedback(c.id, e.target.value);
                        }
                      }}
                      className="w-full rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 placeholder-zinc-600 outline-none"
                    />

                    {/* Prompt tag toggles */}
                    <div className="flex flex-wrap gap-1">
                      {PROMPT_TAG_OPTIONS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleToggleTag(c.id, tag)}
                          className={`rounded px-1.5 py-0.5 text-[8px] transition-colors ${
                            c.promptTags.includes(tag) ? "bg-green-800 text-green-300" : "bg-zinc-800 text-zinc-600 hover:text-zinc-400"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    {/* Move buttons */}
                    <div className="flex flex-wrap gap-1">
                      {STAGES.filter((s) => s !== c.pipelineStage).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleMove(c.id, s)}
                          disabled={isPending}
                          className={`rounded px-2 py-0.5 text-[9px] font-medium capitalize ${
                            s === "approved" ? "bg-green-900/30 text-green-400" :
                            s === "published" ? "bg-blue-900/30 text-blue-400" :
                            s === "rejected" ? "bg-red-900/30 text-red-400" :
                            "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          → {s}
                        </button>
                      ))}
                    </div>

                    {/* Full prompt */}
                    {c.prompt && (
                      <details className="text-[9px]">
                        <summary className="cursor-pointer text-zinc-600 hover:text-zinc-400">Prompt</summary>
                        <div className="mt-1 rounded bg-zinc-800 p-2 text-zinc-500 leading-relaxed">
                          {c.prompt}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
