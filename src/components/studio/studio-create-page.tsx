"use client";

import { useStudioStore } from "@/stores/studio-store";
import { ReferenceUpload } from "./reference-upload";
import { premadeCreators } from "@/data/premade-creators";
import { useState } from "react";

// Build presets from the premade creators library — easy to expand by editing premade-creators.ts
const PRESETS = premadeCreators.map((c) => ({
  id: c.id,
  label: c.name,
  gender: c.settings.gender as string,
  desc: c.description,
  vibe: c.vibe,
  settings: c.settings,
}));

const ETHNICITIES = ["European", "Latina", "East Asian", "South Asian", "Black", "Middle Eastern", "Mixed"];
const AGE_RANGES = ["18-22", "23-27", "28-35", "36+"];

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

const CHEST_SIZES = ["Small", "Medium", "Medium-Large", "Large"];

const VIBES_FEMALE = [
  { label: "Girl Next Door", emoji: "🌻" },
  { label: "Glamorous", emoji: "✨" },
  { label: "Sultry", emoji: "🔥" },
  { label: "Fitness", emoji: "💪" },
  { label: "Baddie", emoji: "💅" },
  { label: "Soft & Sweet", emoji: "🌸" },
  { label: "Sophisticated", emoji: "🍷" },
  { label: "Natural Beauty", emoji: "🌿" },
];

const VIBES_MALE = [
  { label: "Clean Cut", emoji: "✨" },
  { label: "Rugged", emoji: "🪵" },
  { label: "Athletic", emoji: "💪" },
  { label: "Street", emoji: "🔥" },
  { label: "Sophisticated", emoji: "🍷" },
  { label: "Bad Boy", emoji: "😈" },
  { label: "Chill", emoji: "🌊" },
  { label: "Creative", emoji: "🎨" },
];

const MAX_VIBES = 3;

export function StudioCreatePage() {
  const {
    description, setDescription,
    traits, pickTrait, toggleArrayTrait,
    fineTuneOpen, setFineTuneOpen,
  } = useStudioStore();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [customVibe, setCustomVibe] = useState("");

  const isMale = traits.gender === "Male";
  const builds = isMale ? BUILDS_MALE : BUILDS_FEMALE;
  const vibes = isMale ? VIBES_MALE : VIBES_FEMALE;

  function applyPreset(preset: typeof PRESETS[number]) {
    if (activePreset === preset.id) {
      // Deselect
      setActivePreset(null);
      setDescription("");
      return;
    }
    setActivePreset(preset.id);
    setDescription(preset.desc);
    // Apply settings as traits
    if (preset.settings.gender) pickTrait("gender", preset.settings.gender as string);
    if (preset.settings.ethnicity) pickTrait("ethnicity", preset.settings.ethnicity as string);
    if (preset.settings.build) pickTrait("build", preset.settings.build as string);
    if (preset.settings.age) pickTrait("age", preset.settings.age as string);
  }

  return (
    <div className="studio-create-page">
      {/* Quick Start Presets */}
      <div className="studio-section">
        <div className="studio-section-label">Quick start</div>
        <div className="studio-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`studio-preset${activePreset === p.id ? " active" : ""}`}
              onClick={() => applyPreset(p)}
              title={`${p.vibe} — ${p.desc}`}
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
          onChange={(e) => { setDescription(e.target.value); setActivePreset(null); }}
          rows={3}
        />
      </div>

      {/* Reference Upload — near the top for easy access */}
      <ReferenceUpload />

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

      {/* Age — visible by default */}
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

      {/* Vibe — gender-specific */}
      <div className="studio-section">
        <div className="studio-section-label">
          Vibe <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted, #BBB)" }}>(up to {MAX_VIBES})</span>
        </div>
        <div className="studio-vibe-cards">
          {vibes.map((v) => {
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
        {/* Custom vibe input */}
        <div className="studio-custom-vibe">
          <input
            className="studio-custom-vibe-input"
            placeholder="Or type a custom vibe..."
            value={customVibe}
            onChange={(e) => setCustomVibe(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customVibe.trim() && traits.vibes.length < MAX_VIBES) {
                toggleArrayTrait("vibes", customVibe.trim());
                setCustomVibe("");
              }
            }}
          />
          {customVibe.trim() && traits.vibes.length < MAX_VIBES && (
            <button
              className="studio-custom-vibe-add"
              onClick={() => { toggleArrayTrait("vibes", customVibe.trim()); setCustomVibe(""); }}
            >
              Add
            </button>
          )}
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
          {/* Chest Size (female only) */}
          {!isMale && (
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
    </div>
  );
}
