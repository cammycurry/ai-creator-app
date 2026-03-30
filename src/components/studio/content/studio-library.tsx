"use client";

import { useState } from "react";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { useContentStudioStore } from "@/stores/content-studio-store";

type NicheFilter = "all" | "Fitness" | "Lifestyle" | "Fashion" | "Beauty" | "Travel";

export function StudioLibrary() {
  const { selectFormat } = useContentStudioStore();
  const [nicheFilter, setNicheFilter] = useState<NicheFilter>("all");

  const filtered = nicheFilter === "all"
    ? CAROUSEL_FORMATS
    : CAROUSEL_FORMATS.filter((f) => f.niches.includes(nicheFilter));

  const niches: NicheFilter[] = ["all", "Fitness", "Lifestyle", "Fashion", "Beauty", "Travel"];

  return (
    <div className="cs-library">
      <div className="cs-library-header">
        <h2 className="cs-library-title">What do you want to create?</h2>
        <p className="cs-library-subtitle">
          Pick a template to get started, or describe what you want.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="cs-filter-bar">
        {niches.map((n) => (
          <button
            key={n}
            className={`filter-pill${nicheFilter === n ? " active" : ""}`}
            onClick={() => setNicheFilter(n)}
          >
            {n === "all" ? "All" : n}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="cs-template-grid">
        {filtered.map((format) => (
          <div
            key={format.id}
            className="cs-template-card"
            onClick={() => selectFormat(format)}
          >
            <div className="cs-template-name">{format.name}</div>
            <div className="cs-template-meta">
              {format.slideRange[0]}–{format.slideRange[1]} slides
            </div>
            <div className="cs-template-desc">{format.description}</div>
            <div className="cs-template-niches">
              {format.niches.map((n) => (
                <span key={n} className="cs-niche-tag">{n}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
