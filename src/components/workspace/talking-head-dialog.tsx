"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { generateTalkingHead } from "@/server/actions/talking-head-actions";
import { checkVideoStatus } from "@/server/actions/video-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { PLATFORM_VOICES, type PlatformVoice } from "@/data/voices";
import { CREDIT_COSTS } from "@/types/credits";

export function TalkingHeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [script, setScript] = useState("");
  const [voiceId, setVoiceId] = useState(PLATFORM_VOICES[0]?.id ?? "");
  const [setting, setSetting] = useState("");
  const [duration, setDuration] = useState<15 | 30>(15);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { activeCreatorId, setCredits } = useCreatorStore();
  const creator = useCreatorStore((s) => s.getActiveCreator());

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const creditCost = duration === 30 ? CREDIT_COSTS.TALKING_HEAD_30S : CREDIT_COSTS.TALKING_HEAD;
  const creatorGender = ((creator?.settings as Record<string, string>)?.gender ?? "Female").toLowerCase();
  const genderVoices = PLATFORM_VOICES.filter((v) => v.gender === (creatorGender === "male" ? "male" : "female"));

  function playPreview(voice: PlatformVoice) {
    if (playingPreview === voice.id) {
      audioRef.current?.pause();
      setPlayingPreview(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = voice.previewUrl;
      audioRef.current.play().catch(() => {});
      setPlayingPreview(voice.id);
    }
  }

  async function handleGenerate() {
    if (!activeCreatorId || !script.trim() || !voiceId || generating) return;
    setGenerating(true);
    setError(null);
    setProgress("Starting...");

    const result = await generateTalkingHead(
      activeCreatorId,
      script,
      voiceId,
      setting || undefined,
      duration
    );

    if (!result.success) {
      setError(result.error);
      setGenerating(false);
      return;
    }

    setProgress("Generating voice...");
    const jobId = result.jobId;
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;
      if (attempts > 5) setProgress("Generating lip-synced video...");
      if (attempts > 20) setProgress("Almost done...");

      const status = await checkVideoStatus(jobId);

      if (status.status === "COMPLETED") {
        clearInterval(poll);
        const data = await getWorkspaceData();
        setCredits(data.balance);
        setGenerating(false);
        onOpenChange(false);
        window.location.reload();
      } else if (status.status === "FAILED") {
        clearInterval(poll);
        setError(status.error ?? "Generation failed");
        setGenerating(false);
      } else if (attempts >= 180) {
        clearInterval(poll);
        setError("Generation timed out.");
        setGenerating(false);
      }
    }, 5000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!generating) onOpenChange(o); }}>
      <DialogContent style={{ maxWidth: 520 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Talking Head Video</h3>
        <p style={{ fontSize: 12, color: "var(--text-secondary, #888)", margin: "0 0 16px" }}>
          {creator?.name ?? "Your creator"} will speak this script to camera
        </p>

        {/* Script */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)" }}>Script</label>
            <span style={{ fontSize: 11, color: wordCount > 125 ? "#e53e3e" : "var(--text-muted, #BBB)" }}>
              {wordCount} words {duration === 15 ? "(~60 max)" : "(~125 max)"}
            </span>
          </div>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={"Write what they should say...\n\nExample: Hey guys! So I've been using this protein powder for the past month and honestly? Game changer. The chocolate flavor actually tastes good and I'm seeing real results. Link in bio if you want to try it."}
            rows={5}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--border, #EBEBEB)", fontSize: 16,
              fontFamily: "inherit", color: "var(--text-primary, #111)",
              background: "var(--surface, #fff)", resize: "vertical", outline: "none",
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Voice picker */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", display: "block", marginBottom: 6 }}>
            Voice
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {genderVoices.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoiceId(v.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                  border: voiceId === v.id ? "1px solid var(--accent, #C4603A)" : "1px solid var(--border, #EBEBEB)",
                  background: voiceId === v.id ? "rgba(196,96,58,0.05)" : "var(--card, #F5F5F5)",
                  textAlign: "left",
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); playPreview(v); }}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", border: "none",
                    background: playingPreview === v.id ? "var(--accent, #C4603A)" : "var(--border, #EBEBEB)",
                    color: playingPreview === v.id ? "#fff" : "var(--text-secondary, #888)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: 10,
                  }}
                >
                  {playingPreview === v.id ? "■" : "▶"}
                </button>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #111)" }}>{v.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted, #BBB)" }}>{v.tone}</div>
                </div>
              </button>
            ))}
          </div>
          <audio ref={audioRef} onEnded={() => setPlayingPreview(null)} style={{ display: "none" }} />
        </div>

        {/* Setting */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)", display: "block", marginBottom: 4 }}>
            Background <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>optional</span>
          </label>
          <input
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            placeholder="Office, kitchen, outdoor café, gym..."
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: "1px solid var(--border, #EBEBEB)", fontSize: 16,
              fontFamily: "inherit", color: "var(--text-primary, #111)",
              background: "var(--surface, #fff)", outline: "none",
            }}
          />
        </div>

        {/* Duration */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {([15, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: "pointer", border: "1px solid",
                borderColor: duration === d ? "var(--accent, #C4603A)" : "var(--border, #EBEBEB)",
                background: duration === d ? "var(--accent, #C4603A)" : "var(--card, #F5F5F5)",
                color: duration === d ? "#fff" : "var(--text-primary, #111)",
              }}
            >
              {d}s — {d === 15 ? CREDIT_COSTS.TALKING_HEAD : CREDIT_COSTS.TALKING_HEAD_30S} credits
            </button>
          ))}
        </div>

        {error && <div style={{ padding: "6px 0", color: "#e53e3e", fontSize: 13 }}>{error}</div>}

        {generating && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, color: "var(--text-secondary, #888)" }}>
            <div className="studio-gen-spinner" />
            {progress}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{creditCost} credits</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="studio-btn secondary" onClick={() => onOpenChange(false)} disabled={generating}>Cancel</button>
            <button
              className="studio-btn primary"
              onClick={handleGenerate}
              disabled={generating || !script.trim() || !voiceId}
              style={{ minWidth: 160 }}
            >
              {generating ? "Generating..." : "Generate Talking Head"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
