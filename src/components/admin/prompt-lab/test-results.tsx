"use client";

import { useAdminStore } from "@/stores/admin-store";

type TestRun = {
  id: string;
  timestamp: string;
  label: string;
  prompt: string;
  model: string | null;
  images: string[];
  imageCount: number;
};

export function TestResults({ runs }: { runs: TestRun[] }) {
  const { compareIds, toggleCompare, openLightbox } = useAdminStore();

  if (runs.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-600">
        No test runs yet. Generate some images above.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {runs.map((run) => (
        <div
          key={run.id}
          className={`overflow-hidden rounded-lg border ${
            compareIds.includes(run.id)
              ? "border-[#C4603A]"
              : "border-zinc-800"
          } bg-zinc-900`}
        >
          <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-100">
                {run.label}
              </span>
              <span className="text-xs text-zinc-600">{run.timestamp}</span>
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {run.imageCount} images
              </span>
              {run.model && (
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {run.model.includes("flash") ? "NB2" : "NBPro"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleCompare(run.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  compareIds.includes(run.id)
                    ? "bg-[#C4603A] text-white"
                    : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {compareIds.includes(run.id) ? "✓ Comparing" : "Compare"}
              </button>
            </div>
          </div>

          <div
            className="max-h-14 cursor-pointer overflow-hidden bg-zinc-950/50 px-4 py-2 text-xs leading-relaxed text-zinc-500 transition-all hover:max-h-96"
          >
            {run.prompt}
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {run.images.map((img, i) => (
              <div
                key={img}
                className="relative cursor-pointer overflow-hidden rounded-md bg-zinc-800"
                style={{ aspectRatio: "3/2" }}
                onClick={() =>
                  openLightbox(`/api/admin/img/${run.id}/${img}`)
                }
              >
                <img
                  src={`/api/admin/img/${run.id}/${img}`}
                  alt=""
                  className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                  loading="lazy"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  #{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
