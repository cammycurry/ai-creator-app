"use client";

import { useEffect, useState } from "react";
import { useStudioStore } from "@/stores/studio-store";
import { NICHES } from "@/data/niches";
import { suggestCreatorDetails } from "@/server/actions/suggest-actions";

export function StudioFinishing() {
  const {
    creatorName, setCreatorName,
    niche, addNiche, removeNiche,
    traits, description,
    generatedImages, selectedImageIndex,
  } = useStudioStore();
  const [suggesting, setSuggesting] = useState(false);

  const selectedImage = selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null;

  // Auto-suggest name + niches when finishing phase loads
  useEffect(() => {
    // Only suggest if name is empty (fresh entry, not coming back from picking)
    if (creatorName) return;

    setSuggesting(true);
    suggestCreatorDetails({
      gender: traits.gender,
      ethnicity: traits.ethnicity,
      vibes: traits.vibes,
      description,
    }).then(({ name, niches }) => {
      // Only apply if still empty (user might have started typing)
      const state = useStudioStore.getState();
      if (!state.creatorName) setCreatorName(name);
      if (state.niche.length === 0) {
        niches.forEach((n) => addNiche(n));
      }
    }).finally(() => setSuggesting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="studio-finishing-form">
      {/* Selected image preview */}
      {selectedImage && (
        <div className="studio-finishing-preview">
          <img src={selectedImage} alt="Your creator" />
        </div>
      )}

      <h3 className="studio-finishing-title">Name your creator</h3>
      <p className="studio-finishing-hint">
        This is their reference look — all future content will match this face.
        {suggesting ? " Suggesting a name..." : " Review and hit Create."}
      </p>

      <div className="studio-section">
        <div className="studio-section-label">Name</div>
        <input
          type="text"
          placeholder={suggesting ? "Thinking..." : "e.g. Mia Strong, Luna Glow..."}
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          className="studio-finish-input"
          autoFocus
        />
      </div>

      <div className="studio-section">
        <div className="studio-section-label">Niche</div>
        <div className="studio-chips">
          {NICHES.map((n) => {
            const selected = niche.includes(n);
            return (
              <button
                key={n}
                onClick={() => selected ? removeNiche(n) : addNiche(n)}
                className={`studio-chip${selected ? " active" : ""}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
