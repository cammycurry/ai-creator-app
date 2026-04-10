"use client";

import { useState } from "react";

const TYPES = ["BACKGROUND", "REFERENCE"];
const CATEGORIES = ["fitness", "lifestyle", "fashion", "beauty", "travel", "general"];
const QUICK_TAGS = ["outfit", "pose", "product", "gym", "beach", "coffee shop", "street", "mirror selfie", "golden hour", "indoor", "outdoor", "studio", "casual", "athletic", "formal"];

export function PublishForm({
  onPublish,
  onCancel,
  sourceMetadata,
}: {
  onPublish: (data: {
    type: string;
    name: string;
    description: string;
    tags: string[];
    category: string;
    autoTag: boolean;
  }) => void;
  onCancel: () => void;
  sourceMetadata?: { setting?: string | null; outfit?: string | null };
}) {
  const [type, setType] = useState("BACKGROUND");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [category, setCategory] = useState("general");
  const [autoTag, setAutoTag] = useState(true);

  const handleSubmit = () => {
    if (!name.trim() && !autoTag) return;
    onPublish({
      type,
      name: name.trim(),
      description: description.trim(),
      tags: tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      category,
      autoTag,
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h4 className="mb-4 text-sm font-semibold text-zinc-200">Publish to Library</h4>

      <div className="space-y-3">
        {/* Type */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-500">Type</label>
          <div className="flex gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  type === t
                    ? "bg-[#C4603A] text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Modern Gym, Cozy Bedroom, etc."
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-500">
            Description <span className="text-zinc-600">(used in prompt building)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              sourceMetadata?.setting
                ? sourceMetadata.setting
                : "Modern gym with mirrors and weights, overhead fluorescent lighting"
            }
            rows={2}
            className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-500">
            Tags <span className="text-zinc-600">(click to add, or type custom)</span>
          </label>
          <div className="mb-2 flex flex-wrap gap-1">
            {QUICK_TAGS.map((tag) => {
              const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
              const isActive = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      setTagsStr(tags.filter((t) => t !== tag).join(", "));
                    } else {
                      setTagsStr([...tags, tag].join(", "));
                    }
                  }}
                  className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${
                    isActive ? "bg-[#C4603A] text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <input
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="custom tags, comma separated"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600"
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-500">Category</label>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  category === c
                    ? "bg-[#C4603A] text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-tag */}
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoTag}
            onChange={(e) => setAutoTag(e.target.checked)}
            className="rounded"
          />
          AI auto-fill missing fields (name, tags, description)
        </label>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!name.trim() && !autoTag}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-40"
          >
            Publish to Library
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
