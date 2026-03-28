"use client";

import { useState, useTransition } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { adminQuickGenerate, getTestRuns } from "@/server/actions/admin-actions";
import { TestResults } from "./test-results";
import { CompareView } from "./compare-view";

const PRESETS: Record<string, string> = {
  "base-female": `A photorealistic upper-body portrait photograph of a 24-year-old woman with warm olive skin, light freckles across her nose, brown eyes, and long wavy brown hair, confident expression with subtle catchlights in her eyes. She is wearing a fitted white scoop-neck sports bra, revealing a naturally athletic upper body with relaxed shoulders. Set against a pure white seamless studio backdrop. Illuminated by soft diffused studio lighting from camera-left with a subtle hair light from behind. Shot on Canon EOS R5 with 85mm f/1.4 lens, shallow depth of field, smooth background bokeh. Natural skin texture with visible pores, warm neutral color palette, photorealistic.`,
  "base-male": `A photorealistic upper-body portrait photograph of a 26-year-old man with light tan skin, brown eyes, and short dark brown hair, confident expression with subtle catchlights in his eyes. He is shirtless, revealing a naturally athletic upper body with relaxed shoulders. Set against a pure white seamless studio backdrop. Illuminated by soft diffused studio lighting from camera-left with a subtle hair light from behind. Shot on Canon EOS R5 with 85mm f/1.4 lens, shallow depth of field, smooth background bokeh. Natural skin texture with visible pores, warm neutral color palette, photorealistic.`,
};

type TestRun = {
  id: string;
  timestamp: string;
  label: string;
  prompt: string;
  model: string | null;
  images: string[];
  imageCount: number;
  refPath: string | null;
};

export function QuickTest({ initialRuns }: { initialRuns: TestRun[] }) {
  const {
    promptText, setPromptText,
    selectedModel, setSelectedModel,
    imageCount, setImageCount,
    testLabel, setTestLabel,
    compareIds,
  } = useAdminStore();

  const [runs, setRuns] = useState(initialRuns);
  const [refPath, setRefPath] = useState("");
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"runs" | "compare">("runs");

  const handlePreset = (preset: string) => {
    if (preset && PRESETS[preset]) {
      setPromptText(PRESETS[preset]);
      setTestLabel(preset);
    }
  };

  const handleGenerate = () => {
    if (!promptText.trim()) return;

    setStatus({ type: "running", message: `Generating ${imageCount} image(s) with ${selectedModel}...` });

    startTransition(async () => {
      try {
        const result = await adminQuickGenerate({
          prompt: promptText,
          model: selectedModel,
          count: imageCount,
          label: testLabel || "quick-test",
          refImageUrl: refPath || undefined,
        });

        if (result.success) {
          setStatus({
            type: "done",
            message: `Done! ${result.imageCount} images in ${result.elapsed}s → ${result.folder}`,
          });
          const updated = await getTestRuns();
          setRuns(updated);
        }
      } catch (err) {
        setStatus({
          type: "error",
          message: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    });
  };

  return (
    <div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Quick Test
        </h2>

        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Enter your prompt or pick a preset..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#C4603A] focus:outline-none"
          rows={4}
        />

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="w-36">
            <label className="mb-1.5 block text-xs text-zinc-500">Preset</label>
            <select
              onChange={(e) => handlePreset(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">Custom</option>
              <option value="base-female">Base Female</option>
              <option value="base-male">Base Male</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">Model</label>
            <div className="flex rounded-md border border-zinc-700 bg-zinc-800 p-1">
              {[
                { id: "gemini-3-pro-image-preview", label: "NBPro" },
                { id: "gemini-3.1-flash-image-preview", label: "NB2" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`rounded px-4 py-1.5 text-xs font-medium transition-colors ${
                    selectedModel === m.id
                      ? "bg-[#C4603A] text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-20">
            <label className="mb-1.5 block text-xs text-zinc-500">Count</label>
            <input
              type="number"
              value={imageCount}
              onChange={(e) => setImageCount(parseInt(e.target.value) || 4)}
              min={1}
              max={8}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="w-36">
            <label className="mb-1.5 block text-xs text-zinc-500">Label</label>
            <input
              type="text"
              value={testLabel}
              onChange={(e) => setTestLabel(e.target.value)}
              placeholder="test-name"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="min-w-48 flex-1">
            <label className="mb-1.5 block text-xs text-zinc-500">Reference Image (optional)</label>
            <input
              type="text"
              value={refPath}
              onChange={(e) => setRefPath(e.target.value)}
              placeholder="path/to/image.jpg"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isPending || !promptText.trim()}
            className="rounded-md bg-[#C4603A] px-6 py-2 text-sm font-semibold text-white hover:bg-[#d4704a] disabled:opacity-50"
          >
            {isPending ? "Generating..." : "Generate"}
          </button>
        </div>

        {status && (
          <div
            className={`mt-3 rounded-md px-3 py-2 text-xs ${
              status.type === "running"
                ? "border border-yellow-900 bg-yellow-950/30 text-yellow-400"
                : status.type === "done"
                  ? "border border-green-900 bg-green-950/30 text-green-400"
                  : "border border-red-900 bg-red-950/30 text-red-400"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setActiveTab("runs")}
          className={`rounded-md px-4 py-1.5 text-sm ${
            activeTab === "runs"
              ? "bg-[#C4603A] text-white"
              : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Test Runs
        </button>
        <button
          onClick={() => setActiveTab("compare")}
          className={`rounded-md px-4 py-1.5 text-sm ${
            activeTab === "compare"
              ? "bg-[#C4603A] text-white"
              : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Compare {compareIds.length === 2 && "✓"}
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "runs" ? (
          <TestResults runs={runs} />
        ) : (
          <CompareView runs={runs} />
        )}
      </div>
    </div>
  );
}
