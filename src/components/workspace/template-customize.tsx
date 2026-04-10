"use client";

import { useState, useCallback } from "react";
import type { Template } from "@/types/template";
import { useCreatorStore } from "@/stores/creator-store";
import { generateContent } from "@/server/actions/content-actions";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { useUIStore } from "@/stores/ui-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  template: Template;
  onClose: () => void;
};

export function TemplateCustomize({ template, onClose }: Props) {
  const { activeCreatorId, addContent, setCredits } = useCreatorStore();

  // Initialize field values from defaults
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of template.customizableFields) {
      init[f.key] = f.default ?? f.options?.[0] ?? "";
    }
    return init;
  });

  const [imageCount, setImageCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCost = imageCount * template.creditsCost;

  const updateField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const buildPrompt = useCallback(() => {
    let prompt = template.scenePrompt;
    for (const [key, value] of Object.entries(fields)) {
      prompt = prompt.replace(`{${key}}`, value);
    }
    return prompt;
  }, [template.scenePrompt, fields]);

  const handleGenerate = useCallback(async () => {
    if (!activeCreatorId || generating) return;
    setGenerating(true);
    setError(null);

    const prompt = buildPrompt();
    const result = await generateContent(activeCreatorId, prompt, imageCount);

    if (result.success) {
      addContent(result.content);
      const data = await getWorkspaceData();
      setCredits(data.balance);
      // Switch to library view to see results
      useUIStore.getState().setActiveView("library");
      onClose();
    } else {
      setError(result.error);
    }
    setGenerating(false);
  }, [activeCreatorId, generating, buildPrompt, imageCount, addContent, setCredits, onClose]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span style={{ marginRight: 8 }}>{template.icon}</span>
            {template.name}
          </DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="template-customize-fields">
          {template.customizableFields.map((field) => (
            <div key={field.key} className="template-field">
              <label className="template-field-label">{field.label}</label>
              {field.type === "select" && field.options ? (
                <select
                  className="template-field-select"
                  value={fields[field.key] ?? ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="template-field-input"
                  value={fields[field.key] ?? ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.default}
                />
              )}
            </div>
          ))}

          <div className="template-field">
            <label className="template-field-label">Images</label>
            <div className="template-count-control">
              <button
                className="template-count-btn"
                onClick={() => setImageCount(Math.max(1, imageCount - 1))}
              >
                −
              </button>
              <span className="template-count-value">{imageCount}</span>
              <button
                className="template-count-btn"
                onClick={() => setImageCount(Math.min(4, imageCount + 1))}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="template-error">{error}</div>
        )}

        <div className="template-customize-footer">
          <span className="template-cost">
            {totalCost} credit{totalCost !== 1 ? "s" : ""}
          </span>
          <button
            className="template-generate-btn"
            onClick={handleGenerate}
            disabled={generating || !activeCreatorId}
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
