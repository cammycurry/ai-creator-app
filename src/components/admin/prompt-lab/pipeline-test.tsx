"use client";

import { useState, useTransition } from "react";
import { generateContent } from "@/server/actions/content-actions";
import { useAdminStore } from "@/stores/admin-store";

type CreatorOption = {
  id: string;
  name: string;
  baseImageUrl: string | null;
};

type PipelineStage = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  output?: string;
};

export function PipelineTest({ creators }: { creators: CreatorOption[] }) {
  const [prompt, setPrompt] = useState("");
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [imageCount, setImageCount] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const { openLightbox } = useAdminStore();

  const handleGenerate = () => {
    if (!prompt.trim() || !creatorId) return;

    setStages([
      { name: "Input", status: "done", output: prompt },
      { name: "Enhance + Generate", status: "running" },
      { name: "Strip Metadata", status: "pending" },
      { name: "Upload to S3", status: "pending" },
      { name: "Save to DB", status: "pending" },
    ]);
    setResultUrls([]);

    startTransition(async () => {
      try {
        const result = await generateContent(creatorId, prompt, imageCount);

        if (result.success) {
          const urls = result.content.map((c) => c.url).filter(Boolean) as string[];
          setResultUrls(urls);
          setStages([
            { name: "Input", status: "done", output: prompt },
            { name: "Enhance + Generate", status: "done", output: `${result.content.length} images` },
            { name: "Strip Metadata", status: "done" },
            { name: "Upload to S3", status: "done" },
            { name: "Save to DB", status: "done", output: `${result.content.length} Content records created` },
          ]);
        } else {
          setStages((prev) =>
            prev.map((s) =>
              s.status === "running" || s.status === "pending"
                ? { ...s, status: "error", output: result.error }
                : s
            )
          );
        }
      } catch (err) {
        setStages((prev) =>
          prev.map((s) =>
            s.status === "running" || s.status === "pending"
              ? { ...s, status: "error", output: err instanceof Error ? err.message : String(err) }
              : s
          )
        );
      }
    });
  };

  return (
    <div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Pipeline Test
        </h2>
        <p className="mb-4 text-xs text-zinc-600">
          Runs through the real app pipeline: enhance → generate → strip → S3 → DB. Uses real credits.
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a content prompt (e.g., 'coffee shop morning, cream sweater')"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#C4603A] focus:outline-none"
          rows={3}
        />

        <div className="mt-3 flex items-end gap-3">
          <div className="w-48">
            <label className="mb-1 block text-xs text-zinc-500">Creator</label>
            <select
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.baseImageUrl ? "" : "(no base image)"}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="mb-1 block text-xs text-zinc-500">Count</label>
            <input
              type="number"
              value={imageCount}
              onChange={(e) => setImageCount(parseInt(e.target.value) || 1)}
              min={1}
              max={4}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isPending || !prompt.trim() || !creatorId}
            className="rounded-md bg-[#C4603A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d4704a] disabled:opacity-50"
          >
            {isPending ? "Running Pipeline..." : "Run Pipeline"}
          </button>
        </div>
      </div>

      {stages.length > 0 && (
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="mb-3 text-sm font-semibold">Pipeline Stages</h3>
          <div className="space-y-2">
            {stages.map((stage, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-0.5 h-2 w-2 rounded-full ${
                  stage.status === "done" ? "bg-green-500" :
                  stage.status === "running" ? "animate-pulse bg-yellow-500" :
                  stage.status === "error" ? "bg-red-500" :
                  "bg-zinc-700"
                }`} />
                <div>
                  <span className="text-sm text-zinc-300">{stage.name}</span>
                  {stage.output && (
                    <p className={`mt-0.5 text-xs ${
                      stage.status === "error" ? "text-red-400" : "text-zinc-500"
                    }`}>
                      {stage.output}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resultUrls.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold">Generated Images</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {resultUrls.map((url, i) => (
              <div
                key={i}
                className="cursor-pointer overflow-hidden rounded-md bg-zinc-800"
                style={{ aspectRatio: "3/4" }}
                onClick={() => openLightbox(url)}
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
