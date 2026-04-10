"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getPublicReferences,
  togglePublicReference,
  deletePublicReference,
} from "@/server/actions/admin-generate-actions";

type PublicRef = {
  id: string;
  type: string;
  name: string;
  description: string;
  signedUrl: string | null;
  tags: string[];
  category: string;
  popularity: number;
  isActive: boolean;
  sourcePost: { shortcode: string; account: { handle: string } } | null;
  generationPrompt: string | null;
  createdAt: Date;
};

const TYPES = ["ALL", "BACKGROUND", "REFERENCE"];
const CATEGORIES = ["all", "fitness", "lifestyle", "fashion", "beauty", "travel", "general"];

export function LibraryBrowser() {
  const [refs, setRefs] = useState<PublicRef[]>([]);
  const [filterType, setFilterType] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadRefs = async () => {
    setLoading(true);
    const data = await getPublicReferences();
    setRefs(data as unknown as PublicRef[]);
    setLoading(false);
  };

  useEffect(() => { loadRefs(); }, []);

  const filtered = refs.filter((r) => {
    if (filterType !== "ALL" && r.type !== filterType) return false;
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    return true;
  });

  const handleToggle = (id: string) => {
    startTransition(async () => {
      await togglePublicReference(id);
      setRefs((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
      );
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this reference?")) return;
    startTransition(async () => {
      await deletePublicReference(id);
      setRefs((prev) => prev.filter((r) => r.id !== id));
    });
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-zinc-600">Loading library...</div>;
  }

  return (
    <div>
      {/* Stats */}
      <div className="mb-3 text-[11px] text-zinc-500">
        {refs.length} references ({refs.filter((r) => r.isActive).length} active)
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex gap-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filterType === t
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              {t === "ALL" ? "All types" : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                filterCategory === c
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              {c === "all" ? "All categories" : c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-600">
          {refs.length === 0
            ? "No references in the library yet. Generate some!"
            : "No references match the current filters."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`rounded-lg border bg-zinc-900 overflow-hidden transition-all ${
                r.isActive ? "border-zinc-800" : "border-zinc-800/50 opacity-50"
              }`}
            >
              {r.signedUrl && (
                <img
                  src={r.signedUrl}
                  alt={r.name}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">{r.name}</div>
                    <div className="mt-0.5 flex gap-1">
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">
                        {r.type}
                      </span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 capitalize">
                        {r.category}
                      </span>
                    </div>
                  </div>
                </div>
                {r.description && (
                  <div className="mt-1.5 line-clamp-2 text-[10px] text-zinc-600">
                    {r.description}
                  </div>
                )}
                {r.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {r.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-zinc-800/50 px-1 py-0.5 text-[9px] text-zinc-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {r.sourcePost && (
                  <div className="mt-1 text-[9px] text-zinc-600">
                    From @{r.sourcePost.account.handle}
                  </div>
                )}
                {/* Actions */}
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => handleToggle(r.id)}
                    disabled={isPending}
                    className={`rounded px-2 py-1 text-[10px] font-medium ${
                      r.isActive
                        ? "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        : "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                    }`}
                  >
                    {r.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={isPending}
                    className="rounded px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
