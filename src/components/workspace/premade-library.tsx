"use client";

import { useState } from "react";
import { premadeCreators, type PreMadeCreator } from "@/data/premade-creators";
import { useCreatorStore } from "@/stores/creator-store";
import { adoptPreMade } from "@/server/actions/creator-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { NICHES } from "@/data/niches";

const NICHE_FILTERS = ["All", ...NICHES];

function PreMadeContent({
  onDone,
}: {
  onDone?: () => void;
}) {
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<PreMadeCreator | null>(null);
  const [adopting, setAdopting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setCreators, setActiveCreator, setCredits } = useCreatorStore();

  const filtered = filter === "All"
    ? premadeCreators
    : premadeCreators.filter((c) => c.niche.includes(filter));

  const handleAdopt = async (creator: PreMadeCreator) => {
    setAdopting(true);
    setError(null);

    const result = await adoptPreMade(
      "",
      creator.id,
      {
        name: creator.name,
        niche: creator.niche,
        settings: creator.settings,
      }
    );

    if (result.success) {
      const refreshed = await getWorkspaceData();
      setCreators(refreshed.creators);
      setCredits(refreshed.balance);
      if (result.data) {
        setActiveCreator(result.data.id);
      }
      onDone?.();
      setSelected(null);
    } else {
      setError(result.error);
    }
    setAdopting(false);
  };

  return (
    <>
      {/* Niche filters */}
      <div className="premade-filters">
        {NICHE_FILTERS.map((niche) => (
          <button
            key={niche}
            className={`premade-filter${filter === niche ? " active" : ""}`}
            onClick={() => setFilter(niche)}
          >
            {niche}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#e53e3e", padding: "0 4px" }}>{error}</div>
      )}

      {/* Creator grid */}
      <div className="premade-grid">
        {filtered.map((creator) => (
          <button
            key={creator.id}
            className={`premade-card${selected?.id === creator.id ? " selected" : ""}`}
            onClick={() => setSelected(creator)}
          >
            <div className="premade-card-avatar">
              {creator.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="premade-card-name">{creator.name}</div>
            <div className="premade-card-niche">{creator.niche.join(" · ")}</div>
            <div className="premade-card-desc">{creator.description}</div>
            <div className="premade-card-vibe">{creator.vibe}</div>
          </button>
        ))}
      </div>

      {/* Adopt button */}
      {selected && (
        <div className="premade-footer">
          <span style={{ fontSize: 14, fontWeight: 600 }}>{selected.name}</span>
          <button
            className="premade-adopt-btn"
            onClick={() => handleAdopt(selected)}
            disabled={adopting}
          >
            {adopting ? "Adding..." : "Use This Creator"}
          </button>
        </div>
      )}
    </>
  );
}

/* ── Full-screen version for onboarding ── */
export function PreMadeScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="premade-screen">
      <div className="premade-screen-header">
        <button className="premade-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
      <div className="premade-screen-body">
        <h1 className="premade-screen-title">Pick a Pre-Made Creator</h1>
        <p className="premade-screen-subtitle">
          Choose a ready-made AI influencer and start creating content immediately.
        </p>
        <PreMadeContent />
      </div>
    </div>
  );
}

/* ── Dialog version for workspace (after onboarding) ── */
export function PreMadeLibrary({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="premade-dialog">
        <DialogHeader>
          <DialogTitle>Pre-Made Creators</DialogTitle>
          <DialogDescription>
            Pick a ready-made AI influencer and start creating content immediately.
          </DialogDescription>
        </DialogHeader>
        <PreMadeContent onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
