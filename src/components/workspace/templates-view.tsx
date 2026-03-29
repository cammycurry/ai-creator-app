"use client";

import { useState } from "react";
import { templates, categoryLabels } from "@/data/templates";
import type { Template, TemplateCategory } from "@/types/template";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { generateCarousel } from "@/server/actions/carousel-actions";
import { CarouselDetail } from "./carousel-detail";
import { useCreatorStore } from "@/stores/creator-store";
import type { ContentSetItem } from "@/types/content";
import { TemplateCustomize } from "./template-customize";

const categories: TemplateCategory[] = ["fitness", "lifestyle", "aesthetic", "ugc"];

export function TemplatesView() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatingFormatId, setGeneratingFormatId] = useState<string | null>(null);
  const [carouselResult, setCarouselResult] = useState<ContentSetItem | null>(null);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const activeCreatorId = useCreatorStore((s) => s.activeCreatorId);

  async function handleGenerateCarousel(formatId: string, slideCount: number) {
    if (!activeCreatorId) return;
    setGeneratingFormatId(formatId);
    try {
      const result = await generateCarousel(activeCreatorId, formatId, slideCount);
      if (result.success) {
        setCarouselResult(result.contentSet);
        setCarouselOpen(true);
      }
    } finally {
      setGeneratingFormatId(null);
    }
  }

  return (
    <div className="templates-container">
      <div className="template-category">
        <h3 className="template-category-label">CAROUSELS</h3>
        <div className="template-grid">
          {CAROUSEL_FORMATS.map((format) => (
            <div key={format.id} className="template-card carousel-format-card">
              <div className="template-card-body">
                <div className="template-card-name">{format.name}</div>
                <div className="template-card-desc">{format.description}</div>
                <div className="carousel-format-why">{format.whyItWorks}</div>
                <div className="carousel-format-meta">
                  <span className="carousel-format-slides">
                    {format.slideRange[0]}–{format.slideRange[1]} slides
                  </span>
                  <span className="carousel-format-niches">
                    {format.niches.join(" · ")}
                  </span>
                </div>
              </div>
              <button
                className="carousel-format-generate-btn"
                disabled={generatingFormatId === format.id}
                onClick={() => handleGenerateCarousel(format.id, format.slideRange[0])}
              >
                {generatingFormatId === format.id ? "Generating…" : "Generate →"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="template-category">
        <h3 className="template-category-label">SINGLE PHOTOS</h3>
      </div>

      {categories.map((cat) => {
        const catTemplates = templates.filter((t) => t.category === cat);
        if (catTemplates.length === 0) return null;

        return (
          <div key={cat} className="template-category">
            <h3 className="template-category-label">{categoryLabels[cat]}</h3>
            <div className="template-grid">
              {catTemplates.map((template) => (
                <button
                  key={template.id}
                  className="template-card"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="template-card-icon">{template.icon}</div>
                  <div className="template-card-body">
                    <div className="template-card-name">{template.name}</div>
                    <div className="template-card-desc">{template.description}</div>
                  </div>
                  <div className="template-card-cost">
                    {template.creditsCost} credit
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {selectedTemplate && (
        <TemplateCustomize
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}

      <CarouselDetail
        contentSet={carouselResult}
        open={carouselOpen}
        onOpenChange={setCarouselOpen}
      />
    </div>
  );
}
