"use client";

import { useStudioStore } from "@/stores/studio-store";
import { ReferenceUpload } from "./reference-upload";

const PRESETS = [
  { label: "Blonde Fitness", desc: "23 year old blonde, athletic build, toned abs, bright confident smile, fitness influencer energy" },
  { label: "Brunette Glam", desc: "25 year old brunette, long dark wavy hair, glamorous, sultry confident gaze, model vibes" },
  { label: "Asian Beauty", desc: "24 year old East Asian woman, sleek black hair, slim elegant, sophisticated natural beauty" },
  { label: "Latina Baddie", desc: "22 year old latina, long dark hair, slim thick, bold confident, baddie energy" },
  { label: "Redhead Sweet", desc: "26 year old redhead, fair skin, light freckles, soft sweet smile, girl next door vibes" },
  { label: "Dark Skin Queen", desc: "24 year old Black woman, athletic, glowing dark skin, confident fierce expression, natural beauty" },
];

const ETHNICITIES = ["European", "Latina", "East Asian", "South Asian", "Black", "Middle Eastern", "Mixed"];

const BUILDS_FEMALE = [
  { label: "Slim", desc: "Lean & toned" },
  { label: "Athletic", desc: "Fit & defined" },
  { label: "Slim Thick", desc: "Narrow waist, full hips" },
  { label: "Full Figure", desc: "Soft & natural" },
];

const BUILDS_MALE = [
  { label: "Slim", desc: "Lean" },
  { label: "Athletic", desc: "Toned" },
  { label: "Muscular", desc: "Built" },
  { label: "Average", desc: "Natural" },
];

const AGE_RANGES = ["18-22", "23-27", "28-35", "36+"];
const CHEST_SIZES = ["Small", "Medium", "Medium-Large", "Large"];

const VIBES = [
  { label: "Girl Next Door", emoji: "🌻" },
  { label: "Glamorous", emoji: "✨" },
  { label: "Sultry", emoji: "🔥" },
  { label: "Fitness", emoji: "💪" },
  { label: "Baddie", emoji: "💅" },
  { label: "Soft & Sweet", emoji: "🌸" },
  { label: "Sophisticated", emoji: "🍷" },
  { label: "Natural Beauty", emoji: "🌿" },
];

const MAX_VIBES = 3;

export function StudioCreatePage() {
  const {
    description, setDescription,
    traits, pickTrait, toggleArrayTrait,
    fineTuneOpen, setFineTuneOpen,
  } = useStudioStore();

  const isFemale = traits.gender !== "Male";
  const builds = traits.gender === "Male" ? BUILDS_MALE : BUILDS_FEMALE;

  return (
    <div className="studio-create-page">
      {/* Quick Start Presets */}
      <div className="studio-section">
        <div className="studio-section-label">Quick start</div>
        <div className="studio-presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className={`studio-preset${description === p.desc ? " active" : ""}`}
              onClick={() => setDescription(description === p.desc ? "" : p.desc)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Describe */}
      <div className="studio-section">
        <div className="studio-section-label">Or describe them</div>
        <textarea
          className="studio-describe-input"
          placeholder="25 year old latina, long dark wavy hair, athletic, warm fitness influencer vibe..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Gender */}
      <div className="studio-section">
        <div className="studio-section-label">Gender</div>
        <div className="studio-chips">
          {["Female", "Male"].map((g) => (
            <button
              key={g}
              onClick={() => pickTrait("gender", g)}
              className={`studio-chip${traits.gender === g ? " active" : ""}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Ethnicity */}
      <div className="studio-section">
        <div className="studio-section-label">Ethnicity</div>
        <div className="studio-chips">
          {ETHNICITIES.map((e) => (
            <button
              key={e}
              onClick={() => pickTrait("ethnicity", e)}
              className={`studio-chip${traits.ethnicity === e ? " active" : ""}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Build */}
      <div className="studio-section">
        <div className="studio-section-label">Build</div>
        <div className="studio-chips">
          {builds.map((b) => (
            <button
              key={b.label}
              onClick={() => pickTrait("build", b.label)}
              className={`studio-chip${traits.build === b.label ? " active" : ""}`}
              title={b.desc}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vibe */}
      <div className="studio-section">
        <div className="studio-section-label">
          Vibe <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted, #BBB)" }}>(up to {MAX_VIBES})</span>
        </div>
        <div className="studio-vibe-cards">
          {VIBES.map((v) => {
            const selected = traits.vibes.includes(v.label);
            const disabled = !selected && traits.vibes.length >= MAX_VIBES;
            return (
              <button
                key={v.label}
                onClick={() => {
                  if (selected || traits.vibes.length < MAX_VIBES) {
                    toggleArrayTrait("vibes", v.label);
                  }
                }}
                disabled={disabled}
                className={`studio-vibe-card${selected ? " active" : ""}`}
                style={disabled ? { opacity: 0.4, pointerEvents: "none" } : undefined}
              >
                <div className="studio-vibe-emoji">{v.emoji}</div>
                <div className="studio-vibe-label">{v.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* More Options (collapsible) */}
      <button
        className="studio-finetune-toggle"
        onClick={() => setFineTuneOpen(!fineTuneOpen)}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: fineTuneOpen ? "rotate(90deg)" : "none", transition: "transform 150ms" }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        More options
      </button>

      {fineTuneOpen && (
        <div className="studio-finetune-body">
          {/* Age */}
          <div className="studio-section">
            <div className="studio-section-label">Age</div>
            <div className="studio-chips">
              {AGE_RANGES.map((a) => (
                <button
                  key={a}
                  onClick={() => pickTrait("age", a)}
                  className={`studio-chip${traits.age === a ? " active" : ""}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Chest Size (female only) */}
          {isFemale && (
            <div className="studio-section">
              <div className="studio-section-label">Chest Size</div>
              <div className="studio-chips">
                {CHEST_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => pickTrait("chestSize", size)}
                    className={`studio-chip${traits.chestSize === size ? " active" : ""}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reference Upload — compact, at the bottom */}
      <ReferenceUpload />
    </div>
  );
}
