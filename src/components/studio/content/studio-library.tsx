"use client";

import { useState } from "react";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { templates, categoryLabels } from "@/data/templates";
import { useContentStudioStore } from "@/stores/content-studio-store";

type CategoryFilter = "all" | "carousels" | "photos" | "Fitness" | "Lifestyle" | "Fashion" | "Beauty" | "Travel";

export function StudioLibrary() {
  const { selectFormat, startFreeform, startSingleTemplate } = useContentStudioStore();
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [freeformText, setFreeformText] = useState("");

  const showCarousels = filter === "all" || filter === "carousels" ||
    ["Fitness", "Lifestyle", "Fashion", "Beauty", "Travel"].includes(filter);
  const showPhotos = filter === "all" || filter === "photos" ||
    ["Fitness", "Lifestyle", "Fashion", "Beauty", "Travel"].includes(filter);

  const filteredFormats = ["Fitness", "Lifestyle", "Fashion", "Beauty", "Travel"].includes(filter)
    ? CAROUSEL_FORMATS.filter((f) => f.niches.includes(filter))
    : CAROUSEL_FORMATS;

  const filteredTemplates = ["Fitness", "Lifestyle", "Fashion", "Beauty", "Travel"].includes(filter)
    ? templates.filter((t) => {
        const nicheMap: Record<string, string[]> = {
          "Fitness": ["fitness"],
          "Lifestyle": ["lifestyle", "aesthetic"],
          "Fashion": ["aesthetic", "lifestyle"],
          "Beauty": ["aesthetic"],
          "Travel": ["lifestyle"],
        };
        return (nicheMap[filter] ?? []).includes(t.category);
      })
    : templates;

  const filters: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "carousels", label: "Carousels" },
    { key: "photos", label: "Single Photos" },
    { key: "Fitness", label: "Fitness" },
    { key: "Lifestyle", label: "Lifestyle" },
    { key: "Fashion", label: "Fashion" },
  ];

  return (
    <div className="cs-library">
      <div className="cs-library-header">
        <h2 className="cs-library-title">What do you want to create?</h2>
        <p className="cs-library-subtitle">
          Pick a template, describe what you want, or let AI help you plan content.
        </p>
      </div>

      {/* Freeform creation bar */}
      <div className="cs-ai-bar">
        <span style={{ fontSize: 16 }}>&#10024;</span>
        <input
          className="cs-ai-input"
          placeholder="Describe anything... &quot;gym selfie in my bathroom mirror&quot; or &quot;beach carousel with sunset&quot;"
          value={freeformText}
          onChange={(e) => setFreeformText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && freeformText.trim()) {
              startFreeform(freeformText.trim());
            }
          }}
          style={{ fontSize: 16 }}
        />
        <button
          className="cs-ai-btn"
          disabled={!freeformText.trim()}
          onClick={() => freeformText.trim() && startFreeform(freeformText.trim())}
        >
          Create &rarr;
        </button>
      </div>

      {/* Filter tabs */}
      <div className="cs-filter-bar">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-pill${filter === f.key ? " active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Carousel templates */}
      {showCarousels && filteredFormats.length > 0 && (
        <>
          {filter === "all" && (
            <div className="cs-section-label">Carousels</div>
          )}
          <div className="cs-template-grid">
            {filteredFormats.map((format) => (
              <div
                key={format.id}
                className="cs-template-card"
                onClick={() => selectFormat(format)}
              >
                <div className="cs-template-name">{format.name}</div>
                <div className="cs-template-meta">
                  {format.slideRange[0]}–{format.slideRange[1]} slides · {format.slideRange[0]} credits
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
        </>
      )}

      {/* Single photo templates */}
      {showPhotos && filteredTemplates.length > 0 && (
        <>
          {filter === "all" && (
            <div className="cs-section-label" style={{ marginTop: 24 }}>Single Photos</div>
          )}
          <div className="cs-template-grid">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="cs-template-card"
                onClick={() => startSingleTemplate(template)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{template.icon}</span>
                  <div className="cs-template-name">{template.name}</div>
                </div>
                <div className="cs-template-meta">
                  1 photo · {template.creditsCost} credit
                </div>
                <div className="cs-template-desc">{template.description}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
