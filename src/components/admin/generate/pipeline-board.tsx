"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getAdminMediaByStage,
  moveAdminMedia,
  bulkMoveAdminMedia,
  syncAdminMedia,
  updateAdminMediaType,
  tagAdminMedia,
  autoTagAdminMedia,
  batchAutoTag,
  rateAdminMedia,
} from "@/server/actions/admin-generate-actions";
import { useAdminStore } from "@/stores/admin-store";

type MediaItem = {
  id: string;
  s3Key: string;
  signedUrl: string | null;
  source: string;
  mediaType: string;
  starred: boolean;
  prompt: string | null;
  notes: string | null;
  sourceHandle: string | null;
  pipelineStage: string;
  rating: number | null;
  feedback: string | null;
  promptTags: string[];
  createdAt: Date;
};

type Stages = Record<string, MediaItem[]>;

const STAGE_CONFIG = [
  { key: "inbox", label: "Inbox", color: "border-zinc-600", bg: "bg-zinc-900/50" },
  { key: "review", label: "Review", color: "border-amber-600", bg: "bg-amber-900/10" },
  { key: "approved", label: "Approved", color: "border-green-600", bg: "bg-green-900/10" },
  { key: "published", label: "Published", color: "border-blue-600", bg: "bg-blue-900/10" },
  { key: "rejected", label: "Rejected", color: "border-red-900", bg: "bg-zinc-900/30" },
];

const MEDIA_TYPES = [
  { key: "creator", label: "Creator", color: "bg-purple-700" },
  { key: "background", label: "Background", color: "bg-blue-700" },
  { key: "reference", label: "Reference", color: "bg-green-700" },
];

export function PipelineBoard() {
  const [stages, setStages] = useState<Stages>({ inbox: [], review: [], approved: [], published: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { openLightbox } = useAdminStore();

  const loadBoard = async () => {
    setLoading(true);
    const data = await getAdminMediaByStage(
      filterType !== "all" ? { mediaType: filterType } : undefined
    );
    setStages(data as unknown as Stages);
    setLoading(false);
  };

  useEffect(() => { loadBoard(); }, [filterType]);

  const handleSync = async () => {
    setSyncing(true);
    const res = await syncAdminMedia();
    await loadBoard();
    setSyncing(false);
    alert(`Synced ${res.synced} new images (${res.total} total in S3)`);
  };

  const handleMove = (itemId: string, fromStage: string, toStage: string) => {
    // Optimistic update
    setStages((prev) => {
      const item = prev[fromStage]?.find((i) => i.id === itemId);
      if (!item) return prev;
      return {
        ...prev,
        [fromStage]: prev[fromStage].filter((i) => i.id !== itemId),
        [toStage]: [{ ...item, pipelineStage: toStage }, ...prev[toStage]],
      };
    });
    startTransition(async () => {
      await moveAdminMedia(itemId, toStage);
    });
  };

  const handleBulkMove = (fromStage: string, toStage: string) => {
    const items = stages[fromStage] || [];
    if (items.length === 0) return;
    if (!confirm(`Move all ${items.length} items from ${fromStage} to ${toStage}?`)) return;

    setStages((prev) => ({
      ...prev,
      [fromStage]: [],
      [toStage]: [...items.map((i) => ({ ...i, pipelineStage: toStage })), ...prev[toStage]],
    }));
    startTransition(async () => {
      await bulkMoveAdminMedia(items.map((i) => i.id), toStage);
    });
  };

  const handleTypeChange = (itemId: string, mediaType: string) => {
    setStages((prev) => {
      const updated: Stages = {};
      for (const [stage, items] of Object.entries(prev)) {
        updated[stage] = items.map((i) => i.id === itemId ? { ...i, mediaType } : i);
      }
      return updated;
    });
    startTransition(async () => {
      await updateAdminMediaType(itemId, mediaType);
    });
  };

  const handleStar = (itemId: string, currentStarred: boolean) => {
    setStages((prev) => {
      const updated: Stages = {};
      for (const [stage, items] of Object.entries(prev)) {
        updated[stage] = items.map((i) => i.id === itemId ? { ...i, starred: !currentStarred } : i);
      }
      return updated;
    });
    startTransition(async () => {
      await tagAdminMedia(itemId, { starred: !currentStarred });
    });
  };

  const totalCount = Object.values(stages).reduce((s, items) => s + items.length, 0);

  if (loading) {
    return <div className="py-16 text-center text-sm text-zinc-600">Loading pipeline...</div>;
  }

  return (
    <div>
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "↻ Sync from S3"}
          </button>
          <button
            onClick={async () => {
              const res = await batchAutoTag();
              alert(`Auto-tagged ${res.tagged} items`);
              await loadBoard();
            }}
            disabled={isPending}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            🏷️ Auto-tag Inbox
          </button>
          <span className="text-[11px] text-zinc-500">{totalCount} total items</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterType("all")}
            className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${
              filterType === "all" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:bg-zinc-800"
            }`}
          >
            All
          </button>
          {MEDIA_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${
                filterType === t.key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGE_CONFIG.map((stage, stageIdx) => {
          const items = stages[stage.key] || [];
          const nextStage = STAGE_CONFIG[stageIdx + 1];

          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-[220px] rounded-xl border-t-2 ${stage.color} ${stage.bg} flex flex-col`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">{stage.label}</span>
                  <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{items.length}</span>
                </div>
                {nextStage && items.length > 0 && (
                  <button
                    onClick={() => handleBulkMove(stage.key, nextStage.key)}
                    disabled={isPending}
                    className="text-[9px] text-zinc-600 hover:text-zinc-400"
                    title={`Move all to ${nextStage.label}`}
                  >
                    All →
                  </button>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 max-h-[65vh]">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`group rounded-lg border bg-zinc-900 overflow-hidden transition-all ${
                      expandedCard === item.id ? "border-zinc-500" : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {/* Thumbnail */}
                    {item.signedUrl && (
                      <div
                        className="relative cursor-pointer"
                        onClick={() => openLightbox(item.signedUrl!)}
                      >
                        <img
                          src={item.signedUrl}
                          alt=""
                          className="w-full aspect-[3/4] object-cover"
                          loading="lazy"
                        />
                        {/* Badges */}
                        <div className="absolute top-1 left-1 flex gap-1">
                          <span className={`rounded px-1.5 py-0.5 text-[8px] font-medium text-white ${
                            MEDIA_TYPES.find((t) => t.key === item.mediaType)?.color || "bg-zinc-700"
                          }`}>
                            {item.mediaType}
                          </span>
                        </div>
                        {item.starred && (
                          <span className="absolute top-1 right-1 text-xs">⭐</span>
                        )}
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-1.5">
                      {item.sourceHandle && (
                        <div className="text-[9px] text-zinc-600 truncate">@{item.sourceHandle}</div>
                      )}
                      {item.notes && (
                        <div className="text-[9px] text-zinc-500 truncate">{item.notes}</div>
                      )}

                      {/* Move buttons */}
                      <div className="mt-1 flex gap-1">
                        {STAGE_CONFIG.filter((s) => s.key !== stage.key && s.key !== "rejected").map((s) => (
                          <button
                            key={s.key}
                            onClick={(e) => { e.stopPropagation(); handleMove(item.id, stage.key, s.key); }}
                            disabled={isPending}
                            className="rounded px-1.5 py-0.5 text-[8px] text-zinc-500 bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-300"
                          >
                            {s.label}
                          </button>
                        ))}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMove(item.id, stage.key, "rejected"); }}
                          disabled={isPending}
                          className="rounded px-1.5 py-0.5 text-[8px] text-red-600 bg-zinc-800 hover:bg-red-900/30"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                        className="mt-1 w-full text-[9px] text-zinc-600 hover:text-zinc-400"
                      >
                        {expandedCard === item.id ? "▲ Less" : "▼ More"}
                      </button>

                      {/* Expanded details */}
                      {expandedCard === item.id && (
                        <div className="mt-1.5 space-y-1.5">
                          {/* Type selector */}
                          <div className="flex gap-1">
                            {MEDIA_TYPES.map((t) => (
                              <button
                                key={t.key}
                                onClick={() => handleTypeChange(item.id, t.key)}
                                className={`rounded px-1.5 py-0.5 text-[8px] font-medium text-white ${t.color} ${
                                  item.mediaType === t.key ? "ring-1 ring-white/50" : "opacity-50"
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                          {/* Star + Auto-tag */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStar(item.id, item.starred)}
                              className="text-[9px] text-zinc-500 hover:text-zinc-300"
                            >
                              {item.starred ? "⭐ Starred" : "☆ Star"}
                            </button>
                            <button
                              onClick={async () => {
                                const res = await autoTagAdminMedia(item.id);
                                if (res.success) {
                                  await loadBoard();
                                }
                              }}
                              className="text-[9px] text-zinc-500 hover:text-zinc-300"
                            >
                              🏷️ Auto-tag
                            </button>
                          </div>
                          {/* Rating */}
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => {
                                  const newRating = item.rating === star ? null : star;
                                  setStages((prev) => {
                                    const updated: Stages = {};
                                    for (const [s, items] of Object.entries(prev)) {
                                      updated[s] = items.map((i) => i.id === item.id ? { ...i, rating: newRating } : i);
                                    }
                                    return updated;
                                  });
                                  rateAdminMedia(item.id, { rating: newRating ?? undefined });
                                }}
                                className={`text-sm ${
                                  item.rating && star <= item.rating ? "text-amber-400" : "text-zinc-700"
                                }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>

                          {/* Feedback input */}
                          <input
                            type="text"
                            placeholder="What worked? What didn't?"
                            defaultValue={item.feedback || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (item.feedback || "")) {
                                rateAdminMedia(item.id, { feedback: e.target.value });
                              }
                            }}
                            className="w-full rounded bg-zinc-800 px-1.5 py-1 text-[9px] text-zinc-300 placeholder-zinc-600 outline-none"
                          />

                          {/* Prompt tags */}
                          <div className="flex flex-wrap gap-0.5">
                            {["natural-hair", "warm-smile", "good-lighting", "realistic-skin", "good-body", "c-cup", "curly", "freckles"].map((tag) => {
                              const active = item.promptTags?.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  onClick={() => {
                                    const newTags = active
                                      ? (item.promptTags || []).filter((t) => t !== tag)
                                      : [...(item.promptTags || []), tag];
                                    setStages((prev) => {
                                      const updated: Stages = {};
                                      for (const [s, items] of Object.entries(prev)) {
                                        updated[s] = items.map((i) => i.id === item.id ? { ...i, promptTags: newTags } : i);
                                      }
                                      return updated;
                                    });
                                    rateAdminMedia(item.id, { promptTags: newTags });
                                  }}
                                  className={`rounded px-1 py-0.5 text-[8px] ${
                                    active ? "bg-green-800 text-green-300" : "bg-zinc-800 text-zinc-600"
                                  }`}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>

                          {/* Prompt */}
                          {item.prompt && (
                            <div className="text-[9px] text-zinc-600 line-clamp-3 leading-relaxed">
                              {item.prompt}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="py-8 text-center text-[10px] text-zinc-700">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
