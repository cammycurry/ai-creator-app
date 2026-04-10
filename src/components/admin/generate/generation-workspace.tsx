"use client";

import { useState, useTransition } from "react";
import {
  adminGenerateReference,
  adminGenerateCreator,
  publishPublicReference,
} from "@/server/actions/admin-generate-actions";
import { PublishForm } from "./publish-form";

type SourcePost = {
  id: string;
  shortcode: string;
  imageUrl: string;
  handle: string;
  setting: string | null;
  outfit: string | null;
  lighting: string | null;
};

type GeneratedImage = {
  base64: string;
  s3Key: string;
};

type Mode = "reference" | "creator";

const QUICK_ACTIONS = [
  {
    label: "Extract Background",
    type: "BACKGROUND",
    buildPrompt: (s: SourcePost) =>
      `Generate a clean reference photo of this location/scene without any people. ${s.setting ? `Setting: ${s.setting}.` : ""} ${s.lighting ? `Lighting: ${s.lighting}.` : ""} Natural lighting, empty space, suitable as a background reference. High quality, photorealistic.`,
  },
  {
    label: "Extract Outfit",
    type: "REFERENCE",
    buildPrompt: (s: SourcePost) =>
      `Generate a photo of this outfit/clothing style on a plain neutral background. ${s.outfit ? `Outfit: ${s.outfit}.` : ""} Clean product-style shot, no person visible, just the clothing. High quality.`,
  },
  {
    label: "Generate Inspired",
    type: "REFERENCE",
    buildPrompt: (s: SourcePost) =>
      `Generate a similar scene inspired by this reference image. ${s.setting ? `Setting: ${s.setting}.` : ""} ${s.outfit ? `Outfit style: ${s.outfit}.` : ""} ${s.lighting ? `Lighting: ${s.lighting}.` : ""} Photorealistic, high quality.`,
  },
];

export function GenerationWorkspace({
  source,
  onClearSource,
}: {
  source: SourcePost | null;
  onClearSource: () => void;
}) {
  const [mode, setMode] = useState<Mode>("reference");
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(2);
  const [useMetaPrompt, setUseMetaPrompt] = useState(true);
  const [referenceType, setReferenceType] = useState("BACKGROUND");
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<string | null>(null);
  const [usedPrompt, setUsedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [published, setPublished] = useState(false);

  const handleGenerate = () => {
    setError(null);
    setResults([]);
    setSelectedResult(null);
    setShowPublish(false);
    setPublished(false);
    setUsedPrompt(null);

    startTransition(async () => {
      if (mode === "creator" && source) {
        const res = await adminGenerateCreator({
          sourcePostId: source.id,
          customDescription: prompt.trim() || undefined,
          count,
        });
        if (res.success && res.images.length > 0) {
          setResults(res.images);
          setElapsed(res.elapsed);
          setUsedPrompt(res.prompt);
          if (res.images.length === 1) setSelectedResult(0);
        } else {
          setError("No images generated. Try again.");
        }
      } else {
        if (!prompt.trim() && !useMetaPrompt) {
          setError("Enter a prompt or enable AI meta-prompting.");
          return;
        }
        const res = await adminGenerateReference({
          prompt: prompt.trim() || `Generate a ${referenceType.toLowerCase()} reference image.`,
          sourcePostId: source?.id,
          count,
          useMetaPrompt: useMetaPrompt && !!source,
          referenceType,
        });
        if (res.success && res.images.length > 0) {
          setResults(res.images);
          setElapsed(res.elapsed);
          setUsedPrompt(res.prompt);
          if (res.images.length === 1) setSelectedResult(0);
        } else {
          setError("No images generated. Try a different prompt.");
        }
      }
    });
  };

  const handlePublish = async (data: {
    type: string;
    name: string;
    description: string;
    tags: string[];
    category: string;
    autoTag: boolean;
  }) => {
    if (selectedResult === null || !results[selectedResult]) return;
    const res = await publishPublicReference({
      tempS3Key: results[selectedResult].s3Key,
      type: data.type,
      name: data.name || undefined,
      description: data.description || undefined,
      tags: data.tags.length > 0 ? data.tags : undefined,
      category: data.category,
      sourcePostId: source?.id,
      generationPrompt: usedPrompt || prompt,
      autoTag: data.autoTag,
    });
    if (res.success) {
      setPublished(true);
      setShowPublish(false);
    }
  };

  return (
    <div>
      {/* Mode toggle */}
      <div className="mb-4 flex gap-1 rounded-lg bg-zinc-900 p-1">
        <button
          onClick={() => setMode("reference")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "reference" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Generate Reference
        </button>
        <button
          onClick={() => setMode("creator")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "creator" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Generate Creator
        </button>
      </div>

      {mode === "reference" && (
        <>
          {/* Quick actions (only when source is selected) */}
          {source && (
            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setPrompt(action.buildPrompt(source));
                    setReferenceType(action.type);
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                  {action.label}
                </button>
              ))}
              <button onClick={onClearSource} className="rounded-md px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400">
                Clear source
              </button>
            </div>
          )}

          {/* Meta-prompt toggle + reference type */}
          <div className="mb-3 flex items-center gap-4">
            {source && (
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMetaPrompt}
                  onChange={(e) => setUseMetaPrompt(e.target.checked)}
                  className="rounded"
                />
                AI writes the prompt (meta-prompt via Grok)
              </label>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">Type:</span>
              {["BACKGROUND", "REFERENCE"].map((t) => (
                <button
                  key={t}
                  onClick={() => setReferenceType(t)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    referenceType === t ? "bg-[#C4603A] text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {mode === "creator" && !source && (
        <div className="mb-4 rounded-lg border border-amber-800/30 bg-amber-900/10 px-4 py-3 text-sm text-amber-300">
          Select an Instagram post as source to generate a creator inspired by their look.
        </div>
      )}

      {/* Prompt */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={
          mode === "creator"
            ? "Optional: describe what kind of creator you want (or leave blank for AI to decide)..."
            : source
              ? "Describe what to generate (or let AI meta-prompt from the source)..."
              : "Describe the reference image to generate from scratch..."
        }
        rows={3}
        className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600"
      />

      {/* Controls */}
      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Count:</span>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                count === n ? "bg-[#C4603A] text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending || (mode === "creator" && !source)}
          className="ml-auto rounded-lg bg-[#C4603A] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#D8845F] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "Generating..." : mode === "creator" ? "Generate Creator" : "Generate"}
        </button>
      </div>

      {/* Status */}
      {isPending && (
        <div className="mt-4 rounded-lg border border-amber-800/30 bg-amber-900/10 px-4 py-3 text-sm text-amber-300">
          {mode === "creator" ? "Generating AI creator..." : `Generating ${count} reference(s)...`}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-800/30 bg-red-900/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}
      {published && (
        <div className="mt-4 rounded-lg border border-green-800/30 bg-green-900/10 px-4 py-3 text-sm text-green-300">
          Published to library!
        </div>
      )}

      {/* Used prompt (collapsed by default) */}
      {usedPrompt && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] text-zinc-600 hover:text-zinc-400">
            Prompt used ({usedPrompt.length} chars)
          </summary>
          <div className="mt-1 rounded-md bg-zinc-900 p-2 text-[11px] text-zinc-500 leading-relaxed">
            {usedPrompt}
          </div>
        </details>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {results.length} image(s) in {elapsed}s
            </span>
            <div className="flex gap-2">
              {selectedResult !== null && !showPublish && mode === "reference" && (
                <button
                  onClick={() => setShowPublish(true)}
                  className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                >
                  Publish Selected
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={isPending}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Regenerate
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {results.map((img, i) => (
              <div
                key={i}
                onClick={() => setSelectedResult(i)}
                className={`relative cursor-pointer overflow-hidden rounded-lg ${
                  selectedResult === i ? "ring-2 ring-green-500" : "ring-1 ring-zinc-700 hover:ring-zinc-500"
                }`}
              >
                <img src={`data:image/jpeg;base64,${img.base64}`} alt="" className="w-full" />
                {selectedResult === i && (
                  <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish form */}
      {showPublish && selectedResult !== null && (
        <div className="mt-4">
          <PublishForm
            onPublish={handlePublish}
            onCancel={() => setShowPublish(false)}
            sourceMetadata={{ setting: source?.setting, outfit: source?.outfit }}
          />
        </div>
      )}
    </div>
  );
}
