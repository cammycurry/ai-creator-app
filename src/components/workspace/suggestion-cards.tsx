"use client";

import { CAROUSEL_FORMATS } from "@/data/carousel-formats";

export type Suggestion = {
  type: "carousel" | "photo";
  formatId?: string;
  title: string;
  description: string;
  slideCount?: number;
};

export function SuggestionCards({
  suggestions,
  onGenerate,
  loading,
}: {
  suggestions: Suggestion[];
  onGenerate: (suggestion: Suggestion) => void;
  loading?: boolean;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggestion-cards">
      {suggestions.map((s, i) => {
        const format = s.formatId ? CAROUSEL_FORMATS.find((f) => f.id === s.formatId) : null;
        return (
          <div key={i} className="suggestion-card">
            <div className="suggestion-card-icon">
              {s.type === "carousel" ? "📸" : "🖼️"}
            </div>
            <div className="suggestion-card-body">
              <div className="suggestion-card-title">{s.title}</div>
              <div className="suggestion-card-meta">
                {s.slideCount ? `${s.slideCount} slides · ` : ""}
                {format?.niches?.[0] ?? "Photo"}
              </div>
              <div className="suggestion-card-desc">{s.description}</div>
            </div>
            <button
              className="suggestion-card-btn"
              onClick={() => onGenerate(s)}
              disabled={loading}
            >
              Generate →
            </button>
          </div>
        );
      })}
    </div>
  );
}
