"use client";

import { useAdminStore } from "@/stores/admin-store";

type TestRun = {
  id: string;
  label: string;
  prompt: string;
  images: string[];
};

export function CompareView({ runs }: { runs: TestRun[] }) {
  const { compareIds, clearCompare, openLightbox } = useAdminStore();

  const selectedRuns = compareIds
    .map((id) => runs.find((r) => r.id === id))
    .filter(Boolean) as TestRun[];

  if (selectedRuns.length < 2) {
    return (
      <div className="py-12 text-center text-sm text-zinc-600">
        Select 2 test runs to compare. Click &quot;Compare&quot; on any run.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Side-by-Side Compare</h2>
        <button
          onClick={clearCompare}
          className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
        >
          Clear Selection
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {selectedRuns.map((run) => (
          <div
            key={run.id}
            className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
          >
            <div className="border-b border-zinc-800/50 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                {run.label}
              </h3>
              <p className="mt-1 text-[11px] text-zinc-600">
                {run.prompt.substring(0, 120)}...
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1 p-2">
              {run.images.map((img) => (
                <img
                  key={img}
                  src={`/api/admin/img/${run.id}/${img}`}
                  alt=""
                  className="cursor-pointer rounded-md"
                  loading="lazy"
                  onClick={() =>
                    openLightbox(`/api/admin/img/${run.id}/${img}`)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
