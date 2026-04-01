"use client";

import { useRef, useState } from "react";

export function VideoPlayer({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className={`video-player ${className ?? ""}`} onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        onEnded={() => setPlaying(false)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {!playing && (
        <div className="video-play-overlay">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      )}
      <div className="video-controls">
        <button
          className="video-mute-btn"
          onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
        >
          {muted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
