"use client";

import { useState } from "react";
import { SourceSelector } from "@/components/admin/generate/source-selector";
import { GenerationWorkspace } from "@/components/admin/generate/generation-workspace";
import { LibraryBrowser } from "@/components/admin/generate/library-browser";
import { CreatorGallery } from "@/components/admin/generate/creator-gallery";
import { MediaTriage } from "@/components/admin/generate/media-triage";
import { PipelineBoard } from "@/components/admin/generate/pipeline-board";

type SourcePost = {
  id: string;
  shortcode: string;
  imageUrl: string;
  handle: string;
  setting: string | null;
  outfit: string | null;
  lighting: string | null;
};

type Tab = "generate" | "pipeline" | "triage" | "creators" | "library";

export default function GeneratePage() {
  const [activeTab, setActiveTab] = useState<Tab>("creators");
  const [selectedSource, setSelectedSource] = useState<SourcePost | null>(null);

  return (
    <div className="px-10 py-10">
      <h1 className="text-2xl font-bold">Generate</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Generate references, AI creators, and manage the public library.
      </p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-zinc-800 pb-px">
        {([
          { key: "creators" as Tab, label: "Creators" },
          { key: "pipeline" as Tab, label: "Pipeline" },
          { key: "generate" as Tab, label: "New" },
          { key: "triage" as Tab, label: "Tag Refs" },
          { key: "library" as Tab, label: "Published" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab.key
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "generate" ? (
        <div className="mt-6 flex gap-6">
          <div className="w-[340px] flex-shrink-0">
            <SourceSelector
              selected={selectedSource}
              onSelect={setSelectedSource}
            />
          </div>
          <div className="flex-1 min-w-0">
            <GenerationWorkspace
              source={selectedSource}
              onClearSource={() => setSelectedSource(null)}
            />
          </div>
        </div>
      ) : activeTab === "pipeline" ? (
        <div className="mt-6">
          <PipelineBoard />
        </div>
      ) : activeTab === "triage" ? (
        <div className="mt-6">
          <MediaTriage />
        </div>
      ) : activeTab === "creators" ? (
        <div className="mt-6">
          <CreatorGallery />
        </div>
      ) : (
        <div className="mt-6">
          <LibraryBrowser />
        </div>
      )}
    </div>
  );
}
