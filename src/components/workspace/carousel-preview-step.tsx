"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CAROUSEL_FORMATS } from "@/data/carousel-formats";
import { getScene } from "@/data/scenes";

interface Props {
  formatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (formatId: string, slideCount: number, instructions?: string) => void;
  generating?: boolean;
}

export function CarouselPreviewStep({ formatId, open, onOpenChange, onGenerate, generating }: Props) {
  const format = CAROUSEL_FORMATS.find((f) => f.id === formatId);
  const [instructions, setInstructions] = useState("");

  if (!format) return null;

  const slides = format.slides.filter((s) => s.required || s.position <= format.slideRange[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="carousel-dialog">
        <div className="carousel-dialog-header">
          <div>
            <h3 className="carousel-dialog-title">{format.name}</h3>
            <span className="carousel-dialog-meta">{slides.length} slides · {format.niches.join(", ")}</span>
          </div>
        </div>

        <div className="carousel-dialog-body">
          <p style={{ fontSize: 13, color: "var(--text-secondary, #888)", marginBottom: 16 }}>
            Review the slides below. Add any instructions to customize.
          </p>

          <div className="carousel-preview-slides">
            {slides.map((slide, i) => {
              const scene = getScene(slide.sceneHint);
              return (
                <div key={i} className="carousel-preview-slide">
                  <span className="carousel-preview-num">{slide.position}</span>
                  <div className="carousel-preview-desc">
                    <span className="carousel-preview-role">{slide.role}</span>
                    <span>{scene?.name ?? slide.sceneHint} — {slide.moodHint}</span>
                    <span className="carousel-preview-outfit">{slide.outfitHint}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #BBB)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Add instructions (optional)
            </label>
            <textarea
              className="carousel-caption-input"
              placeholder="e.g. make slide 1 in a black sports bra, more smiles overall..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              style={{ marginTop: 8 }}
            />
          </div>
        </div>

        <div className="carousel-dialog-footer">
          <button
            className="studio-btn secondary"
            onClick={() => onOpenChange(false)}
          >
            Back
          </button>
          <button
            className="studio-btn primary"
            onClick={() => onGenerate(formatId, slides.length, instructions || undefined)}
            disabled={generating}
          >
            {generating ? "Generating..." : `Generate ${slides.length} Slides`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
