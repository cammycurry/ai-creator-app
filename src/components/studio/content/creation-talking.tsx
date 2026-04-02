"use client";

import { useRef, useState } from "react";
import { useUnifiedStudioStore } from "@/stores/unified-studio-store";
import { useCreatorStore } from "@/stores/creator-store";
import { PLATFORM_VOICES } from "@/data/voices";
import { CREDIT_COSTS } from "@/types/credits";

export function CreationTalking() {
  const {
    voiceId,
    setVoiceId,
    talkingDuration,
    setTalkingDuration,
    talkingSetting,
    setTalkingSetting,
  } = useUnifiedStudioStore();

  const creator = useCreatorStore((s) => s.getActiveCreator());
  const creatorGender = (creator?.settings?.gender as string | undefined)?.toLowerCase();
  const gender = creatorGender === "male" ? "male" : "female";
  const voices = PLATFORM_VOICES.filter((v) => v.gender === gender);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  function handlePlay(voice: typeof PLATFORM_VOICES[0]) {
    if (!audioRef.current) return;
    if (playingId === voice.id) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current.src = voice.previewUrl;
    audioRef.current.play().catch(() => {});
    setPlayingId(voice.id);
  }

  function handleAudioEnded() {
    setPlayingId(null);
  }

  return (
    <div className="sv2-config sv2-config-talking">
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      <div className="sv2-voice-grid">
        {voices.map((voice) => (
          <div
            key={voice.id}
            className={`sv2-voice${voiceId === voice.id ? " on" : ""}`}
            onClick={() => setVoiceId(voice.id)}
          >
            <button
              className="sv2-voice-play"
              onClick={(e) => { e.stopPropagation(); handlePlay(voice); }}
              title={playingId === voice.id ? "Stop" : "Preview"}
            >
              {playingId === voice.id ? "■" : "▶"}
            </button>
            <div className="sv2-voice-info">
              <span className="sv2-voice-name">{voice.name}</span>
              <span className="sv2-voice-tone">{voice.tone}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="sv2-config-row">
        <span className="sv2-config-label">Duration</span>
        <div className="sv2-cfg-pills">
          <button
            className={`sv2-cfg-pill${talkingDuration === 15 ? " on" : ""}`}
            onClick={() => setTalkingDuration(15)}
          >
            15s · {CREDIT_COSTS.TALKING_HEAD}cr
          </button>
          <button
            className={`sv2-cfg-pill${talkingDuration === 30 ? " on" : ""}`}
            onClick={() => setTalkingDuration(30)}
          >
            30s · {CREDIT_COSTS.TALKING_HEAD_30S}cr
          </button>
        </div>
      </div>

      <div className="sv2-config-row">
        <input
          className="sv2-cfg-input"
          type="text"
          placeholder="Background setting (optional)"
          value={talkingSetting}
          onChange={(e) => setTalkingSetting(e.target.value)}
        />
      </div>
    </div>
  );
}
