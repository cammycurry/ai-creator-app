// Model expected duration map + expectation messaging for GENERATING cards.
//
// This is the source of truth for "how long should X take" — drives the
// reassurance line on generating content cards. When a new video/talking-head
// model is added, add an entry here.
//
// Durations come from production observations + docs/reference/updated/FAL-AI-VIDEO-API-SPECS.md

export const TIMEOUT_SEC = 600; // Mirrors checkVideoStatus timeout in video-actions.ts

type ModelDuration = {
  label: string; // Debug name only — never shown in UI
  typicalMin: number; // seconds — lower bound of normal band
  typicalMax: number; // seconds — upper bound of normal band
};

export const MODEL_DURATIONS: Record<string, ModelDuration> = {
  // Video — Premium (Veo 3.1 Fast)
  "fal-ai/veo3.1/fast": { label: "Veo 3.1 Fast T2V", typicalMin: 30, typicalMax: 90 },
  "fal-ai/veo3.1/fast/image-to-video": { label: "Veo 3.1 Fast I2V", typicalMin: 30, typicalMax: 90 },

  // Video — Standard (Kling)
  "fal-ai/kling-video/v3/standard/image-to-video": { label: "Kling V3 Std I2V", typicalMin: 30, typicalMax: 120 },
  "fal-ai/kling-video/o3/pro/reference-to-video": { label: "Kling O3 Pro R2V", typicalMin: 60, typicalMax: 180 },
  "fal-ai/kling-video/v3/pro/motion-control": { label: "Kling V3 Motion", typicalMin: 90, typicalMax: 240 },

  // Talking head (lip sync step)
  "fal-ai/kling-video/lipsync/audio-to-video": { label: "Kling LipSync A2V", typicalMin: 60, typicalMax: 180 },
};

const FALLBACK: ModelDuration = { label: "Generating", typicalMin: 30, typicalMax: 180 };

function minutesLabel(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)} min`;
}

// Return the message shown on a GENERATING card, based on elapsed time and
// which model is running. Progression: reassuring → honest → urgent. Never lies.
export function getExpectationMessage(
  falModel: string | undefined,
  elapsedMs: number,
): string {
  const spec: ModelDuration = falModel ? (MODEL_DURATIONS[falModel] ?? FALLBACK) : FALLBACK;
  const elapsed = Math.floor(elapsedMs / 1000);
  const { typicalMin, typicalMax } = spec;

  if (elapsed < typicalMin * 0.1) return "Just started";
  if (elapsed < typicalMin) return `Usually ${minutesLabel(typicalMin)}–${minutesLabel(typicalMax)}`;
  if (elapsed < typicalMax) return "Still working — this is normal";
  if (elapsed < TIMEOUT_SEC * 0.8) return "Taking longer than usual";
  return "Almost at timeout — credits refund if it fails";
}
