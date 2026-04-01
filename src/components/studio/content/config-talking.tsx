"use client";

import { useRef, useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { PLATFORM_VOICES } from "@/data/voices";
import { CREDIT_COSTS } from "@/types/credits";

export function ConfigTalking() {
  const { voiceId, talkingSetting, talkingDuration, setVoiceId, setTalkingSetting, setTalkingDuration } =
    useUnifiedStudioStore();
  const creator = useCreatorStore((s) => s.getActiveCreator());

  const gender = (creator?.settings?.gender as string | undefined)?.toLowerCase();
  const creatorGender = gender === "male" ? "male" : "female";
  const voices = PLATFORM_VOICES.filter((v) => v.gender === creatorGender);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  function handlePlay(voice: (typeof PLATFORM_VOICES)[0]) {
    if (playingId === voice.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(voice.previewUrl);
    audioRef.current = audio;
    audio.play();
    setPlayingId(voice.id);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
  }

  return (
    <div className="us-config-section">
      <div className="us-config-label">Voice</div>
      <div className="us-voice-grid">
        {voices.map((voice) => (
          <div
            key={voice.id}
            className={`us-voice-card${voiceId === voice.id ? " active" : ""}`}
            onClick={() => setVoiceId(voice.id)}
          >
            <div className="us-voice-card-main">
              <div className="us-voice-name">{voice.name}</div>
              <div className="us-voice-tone">{voice.tone}</div>
            </div>
            <button
              className="us-voice-play"
              onClick={(e) => {
                e.stopPropagation();
                handlePlay(voice);
              }}
              aria-label={playingId === voice.id ? "Stop preview" : "Play preview"}
            >
              {playingId === voice.id ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="us-config-label" style={{ marginTop: 16 }}>Duration</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          className={`us-duration-btn${talkingDuration === 15 ? " active" : ""}`}
          onClick={() => setTalkingDuration(15)}
        >
          15s · {CREDIT_COSTS.TALKING_HEAD} credits
        </button>
        <button
          className={`us-duration-btn${talkingDuration === 30 ? " active" : ""}`}
          onClick={() => setTalkingDuration(30)}
        >
          30s · {CREDIT_COSTS.TALKING_HEAD_30S} credits
        </button>
      </div>

      <div className="us-config-label" style={{ marginTop: 16 }}>Background / Setting</div>
      <input
        className="us-config-input"
        type="text"
        placeholder="e.g. cozy bedroom, professional studio, outdoor café"
        value={talkingSetting}
        onChange={(e) => setTalkingSetting(e.target.value)}
      />
    </div>
  );
}
