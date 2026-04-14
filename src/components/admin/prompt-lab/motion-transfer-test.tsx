"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  adminTestMotionTransfer,
  adminCheckMotionStatus,
  getCreatorVideos,
} from "@/server/actions/admin-actions";

type CreatorOption = {
  id: string;
  name: string;
  baseImageUrl: string | null;
};

type VideoOption = {
  id: string;
  label: string;
  signedUrl: string;
  source: "content" | "reference";
};

type JobState = {
  requestId: string;
  falModel: string;
  model: string;
  creatorId: string;
  creatorName: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  videoUrl?: string | null;
  error?: string;
  startedAt: number;
};

export function MotionTransferTest({
  creators,
}: {
  creators: CreatorOption[];
}) {
  const [creatorId, setCreatorId] = useState(creators[0]?.id ?? "");
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [model, setModel] = useState<"kling" | "dreamactor">("dreamactor");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [jobs, setJobs] = useState<JobState[]>([]);
  const jobsRef = useRef<JobState[]>([]);
  jobsRef.current = jobs;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load videos when creator changes
  useEffect(() => {
    if (!creatorId) return;
    setLoadingVideos(true);
    setSelectedVideoUrl("");
    getCreatorVideos(creatorId).then((vids) => {
      setVideos(vids);
      if (vids.length > 0) setSelectedVideoUrl(vids[0].signedUrl);
      setLoadingVideos(false);
    });
  }, [creatorId]);

  const drivingVideoUrl = selectedVideoUrl === "__manual__" ? manualUrl : selectedVideoUrl;

  const pollJobs = useCallback(async () => {
    const current = jobsRef.current;
    const active = current.filter(
      (j) => j.status === "QUEUED" || j.status === "PROCESSING"
    );
    if (active.length === 0 && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    for (const job of active) {
      try {
        const result = await adminCheckMotionStatus(job.requestId, job.falModel, job.creatorId, job.model === "dreamactor" ? "DreamActor V2" : "Kling Motion");
        setJobs((curr) =>
          curr.map((j) =>
            j.requestId === job.requestId
              ? {
                  ...j,
                  status: result.status,
                  videoUrl:
                    result.status === "COMPLETED"
                      ? result.videoUrl
                      : j.videoUrl,
                  error:
                    result.status === "FAILED" ? result.error : j.error,
                }
              : j
          )
        );
      } catch {
        // transient error, will retry next poll
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (!drivingVideoUrl.trim() || !creatorId) return;
    setSubmitting(true);

    try {
      const result = await adminTestMotionTransfer({
        creatorId,
        videoUrl: drivingVideoUrl.trim(),
        model,
        prompt: prompt.trim() || undefined,
      });

      const newJob: JobState = {
        ...result,
        creatorId,
        status: "QUEUED",
        startedAt: Date.now(),
      };

      setJobs((prev) => [newJob, ...prev]);

      if (!pollRef.current) {
        pollRef.current = setInterval(pollJobs, 5000);
      }
    } catch (err) {
      const errorJob: JobState = {
        requestId: `error-${Date.now()}`,
        falModel: "",
        model,
        creatorId,
        creatorName: creators.find((c) => c.id === creatorId)?.name ?? "",
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
        startedAt: Date.now(),
      };
      setJobs((prev) => [errorJob, ...prev]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Motion Transfer Test
        </h2>
        <p className="mb-4 text-xs text-zinc-600">
          Test DreamActor V2 and Kling motion transfer with existing creators.
          No credits charged.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
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
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Model</label>
            <select
              value={model}
              onChange={(e) =>
                setModel(e.target.value as "kling" | "dreamactor")
              }
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="dreamactor">
                DreamActor V2 — $0.05/s (face + lip sync)
              </option>
              <option value="kling">
                Kling V3 Motion — $0.168/s (full body + dance)
              </option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs text-zinc-500">
            Driving Video
          </label>
          {loadingVideos ? (
            <div className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-500">
              Loading videos...
            </div>
          ) : videos.length > 0 ? (
            <select
              value={selectedVideoUrl}
              onChange={(e) => setSelectedVideoUrl(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              {videos.map((v) => (
                <option key={v.id} value={v.signedUrl}>
                  {v.label} ({v.source})
                </option>
              ))}
              <option value="__manual__">Paste a URL instead...</option>
            </select>
          ) : (
            <select
              value="__manual__"
              onChange={() => {}}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="__manual__">No videos found — paste a URL</option>
            </select>
          )}
        </div>

        {(selectedVideoUrl === "__manual__" || videos.length === 0) && (
          <div className="mt-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://example.com/dance.mp4"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#C4603A] focus:outline-none"
            />
          </div>
        )}

        {model === "kling" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs text-zinc-500">
              Prompt (Kling only, optional)
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="@Element1. Replicate the movement naturally."
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[#C4603A] focus:outline-none"
            />
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || !drivingVideoUrl.trim() || !creatorId}
            className="rounded-md bg-[#C4603A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d4704a] disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Run Motion Transfer"}
          </button>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="mt-6 space-y-4">
          {jobs.map((job) => (
            <div
              key={job.requestId}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full ${
                    job.status === "COMPLETED"
                      ? "bg-green-500"
                      : job.status === "FAILED"
                        ? "bg-red-500"
                        : "animate-pulse bg-yellow-500"
                  }`}
                />
                <span className="text-sm font-medium text-zinc-200">
                  {job.creatorName} —{" "}
                  {job.model === "dreamactor"
                    ? "DreamActor V2"
                    : "Kling Motion"}
                </span>
                <span className="text-xs text-zinc-500">{job.status}</span>
              </div>

              {job.status === "FAILED" && job.error && (
                <p className="mt-2 text-xs text-red-400">{job.error}</p>
              )}

              {job.status === "COMPLETED" && job.videoUrl && (
                <div className="mt-3">
                  <video
                    src={job.videoUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    className="max-h-[500px] rounded-md"
                  />
                  <a
                    href={job.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-[#C4603A] hover:underline"
                  >
                    Open video in new tab
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
