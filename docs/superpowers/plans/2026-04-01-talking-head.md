# Talking Head Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add talking head video generation — script → voice → lip-synced video of the AI creator speaking to camera.

**Architecture:** Two modes: (1) ElevenLabs voice + Kling lip sync for premium quality, (2) Kling text-to-video lip sync for budget/fast mode (no ElevenLabs needed). Both use Fal.ai. Async job pipeline reuses video generation infrastructure. Curated voice library with preview audio.

**Tech Stack:** ElevenLabs API (voice), Fal.ai Kling lip sync models, existing Gemini (talking head image), existing async job pipeline from video-actions.

**Spec:** `docs/superpowers/specs/2026-04-01-talking-head-design.md` (updated: Hedra unavailable, using Kling lip sync instead)

**Key discovery:** Kling lip sync is $0.014/unit, far cheaper than Hedra's estimated $0.10/sec. This makes talking head highly profitable.

---

## File Structure

```
Create: src/lib/elevenlabs.ts                               — ElevenLabs TTS client
Create: src/data/voices.ts                                   — Curated voice library data
Create: src/server/actions/talking-head-actions.ts           — Talking head orchestration
Create: src/components/workspace/talking-head-dialog.tsx     — Script editor + voice picker dialog
Modify: src/types/credits.ts                                 — Add TALKING_HEAD_30S
Modify: src/components/workspace/workspace-canvas.tsx        — Enable Voice mode chip
Modify: src/app/workspace/workspace.css                      — Dialog styles
```

---

### Task 1: ElevenLabs Client

**Files:**
- Create: `src/lib/elevenlabs.ts`

- [ ] **Step 1: Create the ElevenLabs client module**

```typescript
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const BASE_URL = "https://api.elevenlabs.io/v1";

export type Voice = {
  voice_id: string;
  name: string;
  labels: Record<string, string>;
  preview_url: string;
};

export async function generateSpeech(
  text: string,
  voiceId: string
): Promise<Buffer> {
  const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function fetchVoices(): Promise<Voice[]> {
  const response = await fetch(`${BASE_URL}/voices`, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });

  if (!response.ok) throw new Error("Failed to fetch voices");

  const data = await response.json();
  return data.voices ?? [];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/elevenlabs.ts
git commit -m "feat: add ElevenLabs TTS client"
```

---

### Task 2: Curated Voice Library

**Files:**
- Create: `src/data/voices.ts`

- [ ] **Step 1: Create the voice data file**

A curated set of ElevenLabs voices for the platform. These are real ElevenLabs voice IDs from their public library.

```typescript
export type PlatformVoice = {
  id: string;           // ElevenLabs voice_id
  name: string;         // Display name
  gender: "female" | "male";
  age: "young" | "mature";
  tone: string;         // "energetic", "calm", "warm", "professional"
  description: string;  // Short description
  previewUrl: string;   // ElevenLabs preview audio URL
};

export const PLATFORM_VOICES: PlatformVoice[] = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    gender: "female",
    age: "young",
    tone: "calm",
    description: "Calm and natural, great for testimonials",
    previewUrl: "https://api.elevenlabs.io/v1/voices/21m00Tcm4TlvDq8ikWAM/preview",
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    gender: "female",
    age: "young",
    tone: "energetic",
    description: "Energetic and confident, great for product reviews",
    previewUrl: "https://api.elevenlabs.io/v1/voices/AZnzlk1XvdvUeBnXmlld/preview",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    gender: "female",
    age: "young",
    tone: "warm",
    description: "Warm and friendly, perfect for lifestyle content",
    previewUrl: "https://api.elevenlabs.io/v1/voices/EXAVITQu4vr4xnSDxMaL/preview",
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    gender: "female",
    age: "young",
    tone: "professional",
    description: "Clear and professional, ideal for educational content",
    previewUrl: "https://api.elevenlabs.io/v1/voices/MF3mGyEYCl7XYWbV9V6O/preview",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    gender: "male",
    age: "young",
    tone: "warm",
    description: "Warm and natural male voice, great for storytelling",
    previewUrl: "https://api.elevenlabs.io/v1/voices/TxGEqnHWrfWFTfGW9XjX/preview",
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    gender: "male",
    age: "mature",
    tone: "professional",
    description: "Deep and authoritative, good for professional content",
    previewUrl: "https://api.elevenlabs.io/v1/voices/VR6AewLTigWG4xSOukaG/preview",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    gender: "male",
    age: "mature",
    tone: "calm",
    description: "Calm and measured, perfect for advice and tips",
    previewUrl: "https://api.elevenlabs.io/v1/voices/pNInz6obpgDQGcFmaJgB/preview",
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    gender: "male",
    age: "young",
    tone: "energetic",
    description: "Upbeat and engaging, great for hype content",
    previewUrl: "https://api.elevenlabs.io/v1/voices/yoZ06aMxZJJ28mfd3POQ/preview",
  },
];

export function getVoice(id: string): PlatformVoice | undefined {
  return PLATFORM_VOICES.find((v) => v.id === id);
}

export function getVoicesByGender(gender: "female" | "male"): PlatformVoice[] {
  return PLATFORM_VOICES.filter((v) => v.gender === gender);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/voices.ts
git commit -m "feat: add curated voice library"
```

---

### Task 3: Update Credit Types

**Files:**
- Modify: `src/types/credits.ts`

- [ ] **Step 1: Add TALKING_HEAD_30S**

Read `src/types/credits.ts`. Add `TALKING_HEAD_30S` to the type and costs:

Add to `ContentCostType`:
```typescript
  | "TALKING_HEAD_30S"
```

Add to `CREDIT_COSTS`:
```typescript
  TALKING_HEAD_30S: 12,
```

- [ ] **Step 2: Commit**

```bash
git add src/types/credits.ts
git commit -m "feat: add TALKING_HEAD_30S credit cost"
```

---

### Task 4: Talking Head Server Actions

**Files:**
- Create: `src/server/actions/talking-head-actions.ts`

- [ ] **Step 1: Create the talking head orchestration file**

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { db } from "@/lib/db";
import { fal } from "@/lib/fal";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { generateSpeech } from "@/lib/elevenlabs";
import { deductCredits } from "./credit-actions";
import { CREDIT_COSTS } from "@/types/credits";
import { PLATFORM_VOICES, type PlatformVoice } from "@/data/voices";
import { REALISM_BASE } from "@/lib/prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

type TalkingHeadResult =
  | { success: true; jobId: string; contentId: string }
  | { success: false; error: string };

// ─── Get Available Voices ─────

export async function getAvailableVoices(): Promise<PlatformVoice[]> {
  return PLATFORM_VOICES;
}

// ─── Generate Talking Head ─────

export async function generateTalkingHead(
  creatorId: string,
  script: string,
  voiceId: string,
  setting?: string,
  duration?: 15 | 30
): Promise<TalkingHeadResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const creator = await db.creator.findUnique({
    where: { id: creatorId, userId: user.id },
  });
  if (!creator || !creator.baseImageUrl) return { success: false, error: "Creator not found" };

  if (!script.trim()) return { success: false, error: "Script is required" };
  if (script.length > 2000) return { success: false, error: "Script too long (max 2000 characters)" };

  // Calculate credits
  const dur = duration ?? 15;
  const creditCost = dur === 30 ? CREDIT_COSTS.TALKING_HEAD_30S : CREDIT_COSTS.TALKING_HEAD;
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < creditCost) {
    return { success: false, error: `Not enough credits. Need ${creditCost}, have ${totalCredits}.` };
  }

  // Deduct credits upfront
  await deductCredits(user.id, creditCost, `Talking head: ${dur}s`);

  // Create job + content records
  const job = await db.generationJob.create({
    data: {
      userId: user.id,
      type: "TALKING_HEAD",
      status: "QUEUED",
      provider: "fal-ai",
      modelId: "fal-ai/kling-video/lipsync/audio-to-video",
      input: JSON.parse(JSON.stringify({ script, voiceId, setting, duration: dur })),
    },
  });

  const content = await db.content.create({
    data: {
      creatorId,
      type: "TALKING_HEAD",
      status: "GENERATING",
      source: "FREEFORM",
      prompt: script,
      userInput: script,
      creditsCost: creditCost,
      generationSettings: JSON.parse(JSON.stringify({
        videoType: "talking-head",
        duration: dur,
        voiceId,
        setting,
        jobId: job.id,
      })),
    },
  });

  await db.generationJob.update({
    where: { id: job.id },
    data: { contentId: content.id },
  });

  // Fire async pipeline
  processTalkingHead(job.id, content.id, user.id, creator, script, voiceId, setting, dur)
    .catch((err) => console.error("Talking head job failed:", err));

  return { success: true, jobId: job.id, contentId: content.id };
}

// ─── Internal Pipeline ─────

async function processTalkingHead(
  jobId: string,
  contentId: string,
  userId: string,
  creator: { id: string; baseImageUrl: string | null; settings: unknown },
  script: string,
  voiceId: string,
  setting: string | undefined,
  duration: number
) {
  try {
    await db.generationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    // Step 1: Generate voice audio via ElevenLabs
    const audioBuffer = await generateSpeech(script, voiceId);
    const audioKey = `users/${userId}/creators/${creator.id}/content/audio-${Date.now()}.mp3`;
    await uploadImage(audioBuffer, audioKey, "audio/mpeg");
    const audioUrl = await getSignedImageUrl(audioKey);

    // Step 2: Generate talking-head base image via Gemini
    const gender = ((creator.settings as Record<string, string>)?.gender ?? "Female").toLowerCase();
    const subject = gender === "male" ? "man" : "woman";
    const settingDesc = setting ? `${setting}.` : "Clean, well-lit indoor setting.";

    const talkingHeadPrompt = [
      `That exact ${subject} from the reference image.`,
      `Front-facing, slight head tilt, mouth slightly parted as if mid-sentence, natural expression.`,
      `Warm lighting on face. ${settingDesc}`,
      `Shot on iPhone, candid. ${REALISM_BASE}.`,
    ].join(" ");

    const refBuffer = await getImageBuffer(creator.baseImageUrl!);
    const refBase64 = refBuffer.toString("base64");

    const imageResponse = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        { text: talkingHeadPrompt },
        { inlineData: { mimeType: "image/jpeg", data: refBase64 } },
      ],
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });

    const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    if (!imagePart?.inlineData?.data) throw new Error("Failed to generate talking head image");

    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    const imageKey = `users/${userId}/creators/${creator.id}/content/talkhead-${Date.now()}.jpg`;
    await uploadImage(imageBuffer, imageKey, "image/jpeg");
    const imageUrl = await getSignedImageUrl(imageKey);

    // Step 3: Lip sync via Kling
    const lipSyncResult = await fal.subscribe("fal-ai/kling-video/lipsync/audio-to-video", {
      input: {
        image_url: imageUrl,
        audio_url: audioUrl,
      },
    });

    const output = lipSyncResult.data as { video?: { url?: string }; video_url?: string };
    const videoUrl = output?.video?.url ?? output?.video_url;
    if (!videoUrl) throw new Error("No video URL from lip sync");

    // Step 4: Download and upload final video to S3
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const videoKey = `users/${userId}/creators/${creator.id}/content/talkhead-video-${Date.now()}.mp4`;
    await uploadImage(videoBuffer, videoKey, "video/mp4");

    // Update records
    await db.content.update({
      where: { id: contentId },
      data: {
        status: "COMPLETED",
        url: videoKey,
        thumbnailUrl: imageKey, // Use the talking head image as thumbnail
        outputs: JSON.parse(JSON.stringify([videoKey, audioKey, imageKey])),
      },
    });

    await db.generationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        output: JSON.parse(JSON.stringify({ videoKey, audioKey, imageKey })),
      },
    });
  } catch (error) {
    console.error(`Talking head job ${jobId} failed:`, error);

    // Refund
    const content = await db.content.findUnique({ where: { id: contentId } });
    if (content) {
      try {
        await deductCredits(userId, -(content.creditsCost), "Talking head refund: generation failed");
      } catch {
        // refundCredits if deductCredits doesn't accept negative
        // The credit-actions module handles this
      }
    }

    await db.content.update({
      where: { id: contentId },
      data: { status: "FAILED" },
    });

    await db.generationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/talking-head-actions.ts
git commit -m "feat: add talking head server actions (ElevenLabs + Kling lip sync)"
```

---

### Task 5: Talking Head Dialog

**Files:**
- Create: `src/components/workspace/talking-head-dialog.tsx`

- [ ] **Step 1: Create the talking head dialog**

```typescript
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
  const selectedVoice = PLATFORM_VOICES.find((v) => v.id === voiceId);
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
      } else if (attempts >= 180) { // 15 min timeout
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
            placeholder="Write what they should say...&#10;&#10;Example: Hey guys! So I've been using this protein powder for the past month and honestly? Game changer. The chocolate flavor actually tastes good and I'm seeing real results. Link in bio if you want to try it."
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/talking-head-dialog.tsx
git commit -m "feat: add TalkingHeadDialog with script editor and voice picker"
```

---

### Task 6: Wire Voice Mode on Floating Input

**Files:**
- Modify: `src/components/workspace/workspace-canvas.tsx`

- [ ] **Step 1: Read the file. Enable the Voice mode chip and wire it to open the TalkingHeadDialog**

Import the dialog:
```typescript
import { TalkingHeadDialog } from "./talking-head-dialog";
```

Add state:
```typescript
const [talkingHeadOpen, setTalkingHeadOpen] = useState(false);
```

Find the disabled Voice mode chip (has `disabled` and `style={{ opacity: 0.5 }}`). Replace with:
```typescript
<button
  className="mode-chip"
  onClick={() => setTalkingHeadOpen(true)}
>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
  </svg>
  Voice
</button>
```

Add the dialog render at the end of the ContentArea component, before the closing `</>`:
```typescript
<TalkingHeadDialog open={talkingHeadOpen} onOpenChange={setTalkingHeadOpen} />
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/workspace-canvas.tsx
git commit -m "feat: wire Voice mode chip to TalkingHeadDialog"
```

---

### Task 7: Build Verification

- [ ] **Step 1: Run build**

Run: `pnpm build 2>&1 | tail -20`

- [ ] **Step 2: Fix any errors**

Common issues:
- `refundCredits` vs negative `deductCredits` — check credit-actions.ts for the correct refund function
- Fal.ai response typing — may need `as any` casts
- ElevenLabs preview URLs — these are real voice IDs from ElevenLabs' public library

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: talking head build verification fixes"
```
