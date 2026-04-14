"use client";

import { useState } from "react";
import { QuickTest } from "@/components/admin/prompt-lab/quick-test";
import { PipelineTest } from "@/components/admin/prompt-lab/pipeline-test";
import { MotionTransferTest } from "@/components/admin/prompt-lab/motion-transfer-test";

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

type CreatorOption = {
  id: string;
  name: string;
  baseImageUrl: string | null;
};

export function PromptLabTabs({
  initialRuns,
  creators,
}: {
  initialRuns: TestRun[];
  creators: CreatorOption[];
}) {
  const [mode, setMode] = useState<"quick" | "pipeline" | "motion">("quick");

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => setMode("quick")}
          className={`rounded-md px-4 py-1.5 text-sm ${
            mode === "quick"
              ? "bg-[#C4603A] text-white"
              : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Quick Test
        </button>
        <button
          onClick={() => setMode("pipeline")}
          className={`rounded-md px-4 py-1.5 text-sm ${
            mode === "pipeline"
              ? "bg-[#C4603A] text-white"
              : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Pipeline Test
        </button>
        <button
          onClick={() => setMode("motion")}
          className={`rounded-md px-4 py-1.5 text-sm ${
            mode === "motion"
              ? "bg-[#C4603A] text-white"
              : "border border-zinc-700 text-zinc-400"
          }`}
        >
          Motion Transfer
        </button>
      </div>

      <div className="mt-4">
        {mode === "quick" ? (
          <QuickTest initialRuns={initialRuns} />
        ) : mode === "pipeline" ? (
          <PipelineTest creators={creators} />
        ) : (
          <MotionTransferTest creators={creators} />
        )}
      </div>
    </div>
  );
}
